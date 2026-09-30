# 인프라 (Terraform)

| 묶음 | 적용하는 쪽 | 상태 파일 | 만드는 것 |
|---|---|---|---|
| `bootstrap/` | 사람(PC). 처음 한 번, 그리고 IAM·예산을 바꿀 때 | `s3://<상태 버킷>/bootstrap/terraform.tfstate` | 상태 버킷, GitHub OIDC 공급자, IAM 역할 2개, 월 예산 알림 |
| `site/` | GitHub Actions(`deploy.yml`) | `s3://<상태 버킷>/site/terraform.tfstate` | 사이트 버킷, OAC, CloudFront 배포, 주소 변환 함수. 도메인을 쓰면 ACM 인증서와 Route 53 레코드 |

## 로컬에서는 `scripts/tf.sh`로 실행한다

AWS provider는 800MB가 넘는다. 이 저장소는 OneDrive 폴더에 있어서 `terraform init`이 만드는 `.terraform/`이 그대로 동기화된다. `scripts/tf.sh <bootstrap|site> <terraform 인자...>`는 작업 데이터를 `~/.terraform-data/portfolio-site/<묶음>`에, provider 캐시를 `~/.terraform.d/plugin-cache`에 두고 `terraform -chdir=infra/<묶음>`을 실행한다. CI는 이 래퍼 없이 그냥 `terraform`을 쓴다.

## AWS 없이 검사

```bash
terraform fmt -check -recursive infra
for stack in bootstrap site; do
  scripts/tf.sh "$stack" init -backend=false
  scripts/tf.sh "$stack" validate
  scripts/tf.sh "$stack" test   # mock provider라 AWS에 요청하지 않는다
done
```

## 처음 한 번: bootstrap

준비물: 개인 AWS 계정에 관리자 권한으로 로그인한 AWS CLI, Terraform 1.11 이상, GitHub 저장소 이름.

1. **AWS 로그인.** IAM Identity Center에서 사용자와 `AdministratorAccess` 권한 세트를 만든 뒤, 터미널에서 직접 실행한다(브라우저 로그인이 열린다).
   ```bash
   aws configure sso --profile portfolio-admin   # SSO 시작 URL, 리전 ap-northeast-2
   aws sso login --profile portfolio-admin
   export AWS_PROFILE=portfolio-admin
   aws sts get-caller-identity                   # 개인 계정 ID인지 확인
   ```
2. **변수 파일.** `infra/bootstrap/terraform.tfvars`를 만든다. `*.tfvars`는 커밋되지 않는다.
   ```hcl
   budget_email = "알림 받을 메일 주소"
   # 저장소 이름이 ION127/portfolio-site가 아니면:
   # github_repo = "ION127/다른-이름"
   ```
3. **로컬 상태로 첫 적용.** 상태 버킷이 아직 없으니 잠시 local 백엔드로 덮어쓴다(`*_override.tf`도 커밋되지 않는다).
   ```bash
   printf 'terraform {\n  backend "local" {}\n}\n' > infra/bootstrap/backend_override.tf
   scripts/tf.sh bootstrap init
   scripts/tf.sh bootstrap apply          # Plan: 12 to add
   STATE_BUCKET=$(scripts/tf.sh bootstrap output -raw state_bucket)
   ```
   계정에 GitHub OIDC 공급자가 이미 있어서 `EntityAlreadyExists`가 나면 가져온 뒤 다시 적용한다.
   ```bash
   ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   scripts/tf.sh bootstrap import aws_iam_openid_connect_provider.github \
     "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
   scripts/tf.sh bootstrap apply
   ```
4. **상태를 버킷으로 옮긴다.**
   ```bash
   rm infra/bootstrap/backend_override.tf
   scripts/tf.sh bootstrap init -migrate-state -force-copy -backend-config="bucket=$STATE_BUCKET"
   scripts/tf.sh bootstrap state list     # 버킷의 상태가 읽히는지 확인
   rm -f infra/bootstrap/terraform.tfstate infra/bootstrap/terraform.tfstate.backup
   ```
5. **GitHub 저장소 변수를 등록한다.** 아래 네 값을 저장소 Settings → Secrets and variables → Actions → **Variables** 탭에 같은 이름으로 넣는다. 비밀 값이 아니라 Secrets가 아니라 Variables다.
   ```bash
   scripts/tf.sh bootstrap output github_variables
   ```

## 이후 bootstrap을 바꿀 때

```bash
scripts/tf.sh bootstrap init -backend-config="bucket=<상태 버킷>"
scripts/tf.sh bootstrap plan
scripts/tf.sh bootstrap apply
```

## site를 PC에서 들여다볼 때 (선택)

평소에는 CI가 적용한다. 변경 없이 확인만 할 때:

```bash
scripts/tf.sh site init -backend-config="bucket=<상태 버킷>"
scripts/tf.sh site plan -lock=false
```

## 도메인 붙이기 (선택)

저장소 변수 `SITE_DOMAIN`이 비어 있으면 CloudFront 기본 주소(`https://<배포>.cloudfront.net`)로 서비스한다. 값을 넣으면 다음 배포에서 `infra/site`가 기본 도메인과 `www`를 담은 인증서(ACM, us-east-1)를 DNS로 검증하고, CloudFront 별칭과 A·AAAA 레코드를 만든다. `www`로 들어오면 주소 변환 함수가 기본 도메인으로 301을 보낸다.

비용은 도메인 연 요금과 호스팅 영역 월 $0.50이다. 인증서는 무료다.

1. **도메인 등록.** Route 53 콘솔 → 도메인 → 도메인 등록에서 산다. 연락처 개인정보 보호를 켜 두고, 등록자 확인 메일의 링크를 누른다(누르지 않으면 도메인이 정지된다). 등록이 끝나면 같은 이름의 퍼블릭 호스팅 영역이 자동으로 생긴다. 다른 등록기관에서 샀다면 Route 53에 퍼블릭 호스팅 영역을 만들고, 그 NS 레코드의 네임서버 4개를 등록기관에 넣는다.
2. **호스팅 영역 확인.**
   ```bash
   aws route53 list-hosted-zones-by-name --dns-name <도메인> --max-items 1
   ```
3. **역할 권한.** 배포 역할에 인증서 요청과 DNS 레코드 변경 권한이 있어야 한다. 이 권한이 들어가기 전에 bootstrap을 적용했다면 위의 "이후 bootstrap을 바꿀 때"로 다시 적용한다.
4. **저장소 변수를 넣고 다시 배포한다.** 값은 `https://` 없이 도메인만 쓴다.
   ```bash
   gh variable set SITE_DOMAIN --body <도메인>
   gh workflow run deploy.yml
   ```
   첫 적용은 인증서 검증과 CloudFront 반영을 기다리느라 수십 분까지 걸린다. 끝나면 `site_url`이 `https://<도메인>`이 되고, 사이트도 그 주소로 빌드된다(canonical·hreflang·사이트맵).

도메인을 떼려면 `SITE_DOMAIN`을 지우고 다시 배포한다. 레코드와 인증서가 지워지고 CloudFront 기본 주소로 돌아간다.
