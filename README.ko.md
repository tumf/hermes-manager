# Hermes Agents WebApp

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes Agents WebApp 스크린샷](./docs/images/ss-agents-1.png)

Hermes Agents WebApp은 mini 환경에서 운영되는 Hermes Agent를 웹 UI에서 중앙 관리하기 위한 Next.js 애플리케이션입니다.
에이전트 생성, 복제, 삭제, 시작/중지 제어, 설정 편집, 환경 변수 관리, 스킬 관리, 크론 작업 운영, 채팅 기록 조회, 로그 열람을 통합합니다.

웹 UI는 다음 10개 언어를 지원합니다:

- 일본어 (`ja`)
- 영어 (`en`)
- 중국어 간체 (`zh-CN`)
- 스페인어 (`es`)
- 포르투갈어(브라질) (`pt-BR`)
- 베트남어 (`vi`)
- 한국어 (`ko`)
- 러시아어 (`ru`)
- 프랑스어 (`fr`)
- 독일어 (`de`)

공유 앱 셸의 언어 전환기에서 언어를 변경할 수 있습니다. 선택한 로케일은 `localStorage`에 저장되며, 잘못된 값이나 누락된 값은 일본어로 폴백됩니다.

참고: 애플리케이션 UI만 현지화됩니다. `SOUL.md`, 메모리 파일, 로그, 채팅 기록 등의 운영 콘텐츠는 자동으로 번역되지 않습니다.

> **신뢰 네트워크 애플리케이션** — Hermes Agents WebApp은 신뢰 네트워크/인트라넷 운영을 위해 설계되었습니다. 공용 인터넷 인증이나 멀티테넌트 접근 제어를 포함하지 않습니다. 신뢰 네트워크 외부에 노출하는 경우 직접 인증 및 접근 제어 계층을 추가하십시오.

자세한 운영 규칙과 설계 정책은 다음을 참조하세요:

- 개발자 가이드: [`AGENTS.md`](./AGENTS.md)
- 요구사항: [`docs/requirements.md`](./docs/requirements.md)
- 설계: [`docs/design.md`](./docs/design.md)
- 기여 가이드: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- 보안 보고: [`SECURITY.md`](./SECURITY.md)
- 지원: [`SUPPORT.md`](./SUPPORT.md)

## 주요 기능

- 웹 UI에서 여러 Hermes Agent를 중앙 관리
- 에이전트 생성, 복제, 삭제, 시작, 중지, 재시작
- `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` 편집
- 가시성 메타데이터가 있는 에이전트/전역 환경 변수 관리
- 스킬 디렉토리를 복사하여 스킬 장착/해제
- 크론 작업 관리 및 출력 조회
- 에이전트 API 서버를 통한 채팅 세션 및 기록 조회
- gateway/webapp 로그를 tail/stream으로 열람
- 10개 지원 언어 간 UI 전환

## 스크린샷

### Agent 목록

![Hermes Agents WebApp 스크린샷](./docs/images/ss-agents-1.png)

### 메모리 관리

![Hermes Agents 메모리 관리 화면](./docs/images/ss-agent_memory-1.png)

## 기술 스택

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (API 입력 검증)
- 파일 시스템 기반 데이터 레이어 (`runtime/`이 소스 오브 트루스)

## 설치

전제 조건:

- Node.js 20+
- npm

권장 부트스트랩 진입점:

```bash
./.wt/setup
```

이 스크립트는 필요 시 의존성을 설치하고, 런타임 디렉토리를 준비하며, 사용 가능한 로컬 훅을 설치합니다.

또는 수동으로:

```bash
npm install
npm run build
PORT=18470 npm run start
```

## 개발 명령어

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## 테스트 범위

- `npm run test` (Vitest): `tests/api`, `tests/components`, `tests/hooks`, `tests/lib`, `tests/ui` 하위의 유닛, 컴포넌트, 통합 경향 테스트.
- `npm run test:e2e` (Playwright): `tests/e2e` 하위의 브라우저 E2E 테스트.
- 현재 `tests/e2e`에 커밋된 Playwright 테스트가 없으므로 `npm run test:e2e`는 `--pass-with-no-tests`로 실행 경로만 확인합니다.
- Playwright 테스트는 앱이 사전에 실행 중이어야 합니다 (예: `npm run dev`).

## 디렉토리 구조 (개요)

```text
hermes-agents/
├── app/                    # Next.js App Router (UI / API)
├── components/             # 공유 UI 컴포넌트
├── src/lib/                # 파일 시스템/Env/SkillLink 헬퍼
├── docs/                   # 요구사항 및 설계 문서
├── openspec/changes/       # Conflux 변경 제안
├── tests/
│   ├── api|components|hooks|lib|ui/  # Vitest 유닛/컴포넌트/통합 경향 테스트
│   └── e2e/                         # Playwright 브라우저 E2E 테스트 (앱 실행 필요)
├── runtime/                # 런타임 데이터 (agents/globals/logs)
└── AGENTS.md               # 개발자 필독 가이드
```

## 기여

기여 워크플로우는 [`CONTRIBUTING.md`](./CONTRIBUTING.md)를 참조하세요. 이 문서는 영어로 유지됩니다.

## 버전 관리 및 릴리스

이 프로젝트는 성숙해가면서 SemVer 기반 버전 관리를 사용합니다.

- 버전 소스 오브 트루스: `package.json`
- 릴리스 노트: GitHub Releases (사용자 대상 변경 사항 및 운영자 업그레이드 참고 사항)

자동화된 릴리스 도구가 추가될 때까지 `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`를 통과한 클린 커밋에서 태그된 릴리스를 생성하세요.

## 라이선스

MIT. [`LICENSE`](./LICENSE)를 참조하세요.
