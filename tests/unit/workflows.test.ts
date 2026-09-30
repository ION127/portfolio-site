import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

interface Step {
  name?: string;
  id?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}
interface Job {
  if?: string;
  uses?: string;
  needs?: string | string[];
  permissions?: Record<string, string>;
  env?: Record<string, string>;
  outputs?: Record<string, string>;
  steps?: Step[];
}
interface Workflow {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency?: { group: string; 'cancel-in-progress': boolean };
  env?: Record<string, string | number>;
  jobs: Record<string, Job>;
}

const read = (name: string) => load(readFileSync(`.github/workflows/${name}`, 'utf8')) as Workflow;
const ci = read('ci.yml');
const plan = read('plan.yml');
const deploy = read('deploy.yml');
const script = (job: Job) => (job.steps ?? []).map((s) => s.run ?? '').join('\n');
const roleOf = (job: Job) =>
  job.steps?.find((s) => s.uses?.startsWith('aws-actions/configure-aws-credentials@'))?.with?.['role-to-assume'];
// 재사용되는 워크플로의 작업은 호출한 쪽이 준 권한보다 넓게 요청할 수 없다(요청하면 실행 전에 거부된다).
const rank: Record<string, number> = { none: 0, read: 1, write: 2 };
const within = (granted: Record<string, string>, requested: Record<string, string>) =>
  Object.entries(requested).every(([scope, level]) => rank[granted[scope] ?? 'none'] >= rank[level]);

describe('ci workflow', () => {
  it('runs on pull requests to main and can be reused by deploy', () => {
    expect(ci.on).toEqual({ pull_request: { branches: ['main'] }, workflow_call: null });
    expect(ci.permissions).toEqual({ contents: 'read' });
  });

  it('asks for no more than deploy grants when deploy reuses it', () => {
    const granted = deploy.jobs.checks.permissions ?? deploy.permissions;
    const tooWide = Object.entries(ci.jobs)
      .filter(([, job]) => !within(granted, job.permissions ?? ci.permissions))
      .map(([name]) => name);
    expect(tooWide).toEqual([]);
  });

  it('runs every site check', () => {
    const run = script(ci.jobs.web);
    for (const command of ['npm ci', 'npm run check', 'npm test', 'npm run test:e2e']) expect(run).toContain(command);
  });

  it('formats, validates and tests both terraform stacks and lints the workflows', () => {
    const run = script(ci.jobs.static);
    expect(run).toContain('terraform fmt -check -recursive infra');
    expect(run).toContain('for dir in infra/bootstrap infra/site');
    expect(run).toContain('terraform -chdir="$dir" validate');
    expect(run).toContain('terraform -chdir="$dir" test');
    expect(ci.jobs.static.steps?.some((s) => s.uses?.startsWith('docker://rhysd/actionlint:'))).toBe(true);
  });

});

describe('plan workflow', () => {
  it('runs only on pull requests to main', () => {
    expect(plan.on).toEqual({ pull_request: { branches: ['main'] } });
    expect(plan.permissions).toEqual({ contents: 'read' });
  });

  it('plans only for pull requests from this repository, with the read-only role and no lock', () => {
    const job = plan.jobs['terraform-plan'];
    expect(job.if).toBe('github.event.pull_request.head.repo.full_name == github.repository');
    expect(job.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
    expect(roleOf(job)).toBe('${{ vars.AWS_PLAN_ROLE_ARN }}');
    expect(script(job)).toContain('terraform plan -input=false -lock=false');
  });

  it('pins the same terraform version as ci', () => {
    expect(plan.env?.TF_VERSION).toBe(ci.env?.TF_VERSION);
  });
});

describe('deploy workflow', () => {
  it('deploys on pushes to main or by hand, one run at a time', () => {
    expect(deploy.on).toEqual({ push: { branches: ['main'] }, workflow_dispatch: null });
    expect(deploy.concurrency).toEqual({ group: 'deploy', 'cancel-in-progress': false });
    expect(deploy.permissions).toEqual({ contents: 'read' });
  });

  it('applies only after the shared checks and publishes only after apply', () => {
    expect(deploy.jobs.checks.uses).toBe('./.github/workflows/ci.yml');
    expect(deploy.jobs.apply.needs).toBe('checks');
    expect(deploy.jobs.publish.needs).toBe('apply');
  });

  it('gives the deploy role to the two AWS jobs and nothing else', () => {
    for (const name of ['apply', 'publish']) {
      expect(deploy.jobs[name].permissions).toEqual({ contents: 'read', 'id-token': 'write' });
      expect(roleOf(deploy.jobs[name])).toBe('${{ vars.AWS_DEPLOY_ROLE_ARN }}');
    }
    expect(deploy.jobs.checks.permissions).toBeUndefined();
  });

  it('builds with the url terraform reports', () => {
    expect(deploy.jobs.apply.outputs?.site_url).toBe('${{ steps.out.outputs.site_url }}');
    expect(deploy.jobs.publish.env?.SITE_URL).toBe('${{ needs.apply.outputs.site_url }}');
    expect(script(deploy.jobs.publish)).toContain('npm run build');
  });

  it('uploads new hashed files first and removes stale ones last', () => {
    const run = script(deploy.jobs.publish);
    const assets = run.indexOf('aws s3 sync dist/_astro');
    const pages = run.indexOf('aws s3 sync dist "s3://$BUCKET" --exclude "_astro/*"');
    const cleanup = run.lastIndexOf('aws s3 sync dist/_astro');
    expect(assets).toBeGreaterThanOrEqual(0);
    expect(pages).toBeGreaterThan(assets);
    expect(cleanup).toBeGreaterThan(pages);
    expect(run.slice(assets, pages)).not.toContain('--delete');
    expect(run.slice(cleanup)).toContain('--delete');
    expect(run).toContain('public,max-age=31536000,immutable');
    expect(run).toContain('public,max-age=0,must-revalidate');
  });

  it('waits for the invalidation before the smoke check', () => {
    const run = script(deploy.jobs.publish);
    const invalidate = run.indexOf('aws cloudfront create-invalidation');
    const wait = run.indexOf('aws cloudfront wait invalidation-completed');
    const smoke = run.indexOf('node scripts/smoke.mjs "$SITE_URL"');
    expect(invalidate).toBeGreaterThanOrEqual(0);
    expect(wait).toBeGreaterThan(invalidate);
    expect(smoke).toBeGreaterThan(wait);
  });

  it('pins the same terraform version as ci', () => {
    expect(deploy.env?.TF_VERSION).toBe(ci.env?.TF_VERSION);
  });

  it('stops if terraform cannot report an output instead of passing an empty value on', () => {
    const lines = script(deploy.jobs.apply).split('\n').map((l) => l.trim());
    for (const name of ['site_bucket', 'distribution_id', 'site_url']) {
      expect(lines).toContain(`${name}=$(terraform output -raw ${name})`);
    }
  });

  it('waits a while for a lock left by another run instead of failing at once', () => {
    expect(script(deploy.jobs.apply)).toMatch(/terraform apply .*-lock-timeout=\d+m/);
  });

  it('turns the custom domain on only through the SITE_DOMAIN repository variable', () => {
    expect(plan.jobs['terraform-plan'].env?.TF_VAR_domain_name).toBe('${{ vars.SITE_DOMAIN }}');
    expect(deploy.jobs.apply.env?.TF_VAR_domain_name).toBe('${{ vars.SITE_DOMAIN }}');
  });
});
