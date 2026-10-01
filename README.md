# 신중훈 포트폴리오 사이트

인프라/클라우드 직무용 포트폴리오. Astro 7 + React islands, 정적 출력.

- 사이트: https://jjcloud.dev
- 사실 원장(숫자·주장의 출처): `docs/facts.md`

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm install` | 의존성 설치 (Node 22.12 이상) |
| `npm run dev` | 개발 서버 http://localhost:4321 |
| `npm run build` | 정적 빌드 → `dist/` (배포 시 `SITE_URL=https://도메인` 지정) |
| `npm run preview` | 빌드 결과 미리보기 (4321) |
| `npm run check` | 타입·콘텐츠 스키마 검사 |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:e2e` | 빌드 후 E2E·접근성·링크·모바일 (Playwright, 설치된 Chrome 사용) |
| `npm run test:visual` | 화면 확인용 스크린샷 → `test-results/visual/` |
| `npm run lighthouse` | Lighthouse 점수 검사 (성능 90+, 접근성·권장사항·SEO 95+) |
| `npm run og` | OG 이미지 다시 만들기 (`public/og-*.png`) |
| `node scripts/smoke.mjs <url>` | 배포된 사이트 스모크 확인(홈·영어 상세·301·404·robots, 도메인이면 www) |

## 배포

AWS S3 + CloudFront 정적 호스팅. 인프라는 Terraform(`infra/`), 배포는 GitHub Actions가 한다.

- PR: 사이트 검사(타입·단위·E2E), Terraform 검사(fmt·validate·test), actionlint, `infra/site` plan
- main에 push: 같은 검사 → `terraform apply` → `SITE_URL`로 빌드 → S3 업로드 → CloudFront 무효화 → 스모크 확인
- 도메인: 저장소 변수 `SITE_DOMAIN`을 넣으면 인증서와 DNS 레코드를 붙이고 그 주소로 빌드한다. 비어 있으면 CloudFront 기본 주소
- 처음 설정(bootstrap)과 운영 방법: [`infra/README.md`](infra/README.md)

## 콘텐츠 고치는 곳

| 무엇 | 파일 |
|---|---|
| 홈 문구·숫자·스택·연락처 | `src/content/home/{ko,en}.yaml` |
| 프로젝트 메타(기간·팀·역할·카드 문구) | `src/content/projects/{ko,en}/*.yaml` |
| 개요·인프라·회고 산문 | `src/content/sections/{ko,en}/{baro,stockpulse}/*.mdx` |
| **내 기여** | `src/content/sections/{ko,en}/{baro,stockpulse}/contribution.mdx` (새로 만들면 바로 나타남) |
| 운영 기록 | `src/content/incidents/{ko,en}/*.md` (`highlight: true`면 홈에도 나옴) |
| 설계 결정 | `src/content/decisions/{ko,en}/*.md` |
| 아키텍처 다이어그램 | `src/diagrams/{baro,stockpulse}.ts` (`npm test`가 데이터 일관성을 검사) |

한국어 파일을 추가하거나 지우면 영어 파일도 같은 이름으로 맞춰야 한다(`npm test`가 짝을 검사한다).

## 사용자 확인 목록 (콘텐츠 확정 전)

확인이 끝난 항목은 해당 파일의 `confirmed: true`나 `docs/facts.md`의 `확정`으로 표시한다.

1. StockPulse 기간: 현재 초안 `2026.03`(저장소 커밋 3/16–3/27 기준). 실제로 언제 시작했는지 확인이 필요하다.
2. 공개할 이메일 → `home/{ko,en}.yaml`의 `contacts.email`. 비어 있으면 버튼이 숨겨진다.
3. 이력서 링크 → `contacts.resume`. 선택 사항이다.
4. 운영 기록 7건의 실제 경위·수치. 특히 StockPulse 4건은 코드 주석에서 추정한 초안이다.
5. 설계 결정 12건의 배경과 대안
6. 홈 숫자 4개: `docs/facts.md`의 `확인` 열
7. 한계·회고 섹션을 공개할지와 그 범위
8. **내 기여** 본문: PR·커밋 기록으로 쓴 초안(`contribution.mdx`)을 검토한다. 협업으로 기여한 부분은 기록에 없으니 보탠다.
9. **소개 글**: `home/{ko,en}.yaml`의 `about.body`. 문단은 빈 줄로 구분한다.
10. 영어 이름 표기: 현재 `Joong Hoon Shin`(git 작성자 이름 기준)
11. 영어 번역 전체 검토
12. BARO 운영 기록 후보 "StrongSwan VTI routing table 220 충돌": 경위를 알려주면 추가한다.
13. StockPulse를 "혼자 설계하고 만들고 운영한 개인 프로젝트"로 소개하는 표현
