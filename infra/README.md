# 인프라 (Terraform)


| 묶음 | 적용하는 쪽 | 상태 파일 | 만드는 것 |
|---|---|---|---|
| `bootstrap/` | 사람(PC). 처음 한 번, 그리고 IAM·예산을 바꿀 때 | `s3://<상태 버킷>/bootstrap/terraform.tfstate` | 상태 버킷, GitHub OIDC 공급자, IAM 역할 2개, 월 예산 알림 |
| `site/` | GitHub Actions(`deploy.yml`) | `s3://<상태 버킷>/site/terraform.tfstate` | 사이트 버킷, OAC, CloudFront 배포, 주소 변환 함수 |

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

## 나중에 도메인 붙이기

설계서 9절을 따른다. 가비아에서 도메인을 사고, Route 53 호스팅 영역의 네임서버로 바꾼 뒤, `infra/site`에 `domain_name` 변수와 ACM 인증서(us-east-1)·CloudFront aliases·ALIAS 레코드를 더한다.
