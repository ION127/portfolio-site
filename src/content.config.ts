import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { DIAGRAM_IDS, MINI_SCENE_IDS } from './diagrams/ids';

const project = z.enum(['baro', 'stockpulse']);

const projects = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/projects' }),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    // 비우면 카드와 상세 페이지에 기간을 표시하지 않는다.
    period: z.string().optional(),
    team: z.string(),
    role: z.string(),
    summary: z.string(),
    description: z.string(),
    metaChips: z.array(z.string()),
    tags: z.array(z.string()),
    links: z.array(z.object({ label: z.string(), href: z.url() })),
    diagram: z.enum(DIAGRAM_IDS),
    miniScene: z.enum(MINI_SCENE_IDS),
    pipelineScene: z.enum(MINI_SCENE_IDS),
  }),
});

// 상세 페이지 산문. id는 '{locale}/{slug}/{overview|infra|contribution|retrospective}'.
const sections = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/sections' }),
  schema: z.object({}),
});

const incidents = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/incidents' }),
  schema: z.object({
    project,
    order: z.number(),
    highlight: z.boolean().default(false),
    confirmed: z.boolean().default(false),
    title: z.string(),
    symptom: z.string(),
    cause: z.string(),
    fix: z.string(),
    result: z.string().optional(),
    lesson: z.string().optional(),
  }),
});

const decisions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/decisions' }),
  schema: z.object({
    project,
    order: z.number(),
    confirmed: z.boolean().default(false),
    title: z.string(),
    context: z.string(),
    alternatives: z.array(z.string()).min(1),
    rationale: z.string(),
    tradeoff: z.string(),
  }),
});

const home = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/home' }),
  schema: z.object({
    hero: z.object({
      kicker: z.string(),
      titleLines: z.array(z.string()).min(1),
      lead: z.string(),
      miniCaption: z.string(),
    }),
    metrics: z
      .array(
        z.object({
          value: z.string(),
          unit: z.string(),
          lines: z.array(z.string()).min(1),
          project,
          factId: z.string(),
        }),
      )
      .length(4),
    stack: z.array(z.object({ group: z.string(), items: z.array(z.string()).min(1) })).min(1),
    about: z.object({ body: z.string() }),
    contacts: z.object({ github: z.url(), email: z.string(), resume: z.string() }),
  }),
});

export const collections = { projects, sections, incidents, decisions, home };
