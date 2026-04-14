# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes Manager 스크린샷](./docs/images/ss-agents-1.png)

Hermes Manager는 하나의 호스트에서 많은 Hermes Agent를 통합 운영하기 위한 Next.js 기반 control plane입니다.
공식 Hermes dashboard가 단일 Hermes 설치를 관리하는 UI인 것과 달리, Hermes Manager는 기능 동등성을 목표로 한 대체품이 아니라 trusted-network / 인트라넷 환경에서의 멀티 에이전트 운영을 위한 도구입니다. agent 프로비저닝, template/partial 적용, agent별 환경 변수 레이어링, 로컬 서비스 제어, 설정·로그·채팅 이력의 횡단 관리에 중점을 둡니다.

여러 agent의 SOUL을 공통 부품으로 유지·관리할 수 있는 “partial prompt” 운영도 이 앱의 핵심 차별점입니다. 각 agent는 runtime 호환이 보장된 전개 완료 `SOUL.md`를 유지한 채, 편집용 `SOUL.src.md`에서 공유 partial을 `embed/include`할 수 있습니다. 이를 통해 여러 agent에 걸친 공통 정책과 운영 규칙을 한 곳에서 갱신하면서도, agent별 차이만 개별적으로 유지할 수 있습니다.

## 이 앱의 특징

- 하나의 호스트 위 여러 에이전트를 중앙에서 운영하는 control plane
- agent 간 managed delegation / dispatch를 제공하는 서브에이전트 운영 기반
- agent별 delegation policy를 통한 위임 대상 제어, 순환 방지, 최대 hop 제어
- domain agent / specialist agent 등 운영자가 원하는 역할 분담 모델을 자유롭게 구성 가능
- templates / partials / memory assets를 활용한 재사용 가능한 프로비저닝
- 공유 partial prompt를 여러 agent의 `SOUL.md`에 삽입할 수 있는 SOUL composability
- Hermes runtime 호환성을 유지하는 assembled `SOUL.md` 자동 재생성
- agent별 차이와 fleet 전체의 공통 규칙을 분리해 유지보수할 수 있는 운영 모델
- launchd / systemd와 통합된 로컬 서비스 제어

### Managed Subagent Delegation

![Managed subagent delegation 구성도](./docs/images/hermes-managed-subagent-delegation-org.png)

Hermes Manager의 서브에이전트 기능은 agent를 각각 독립적으로 끝내는 것이 아니라, 역할별로 나누어 협업시키는 운영 모델을 만들 수 있게 합니다. 그림에서는 Project A / Project B / Client C와 같은 비즈니스 도메인별 agent가 사용자 요청의 창구가 되고, 필요한 작업을 Python Developer, Marketing Analyzer, Web Designer, Flutter Developer 등의 specialist agent에게 위임하는 구성을 보여줍니다.

이때 Hermes Manager는 단순히 agent 간 통신 진입점만 제공하는 것이 아니라, 어떤 agent가 어떤 specialist를 사용할 수 있는지, 위임을 몇 단계까지 허용할지를 운영자가 관리할 수 있는 control plane으로 동작합니다. 이를 통해 비즈니스 도메인 담당 agent 수가 늘어나더라도 전문 역량을 shared resource로 재사용하면서 fleet 전체의 동작 일관성을 유지할 수 있습니다.

이 기능의 가치는 운영자가 설계한 역할 분담을 managed delegation과 policy 제어를 통해 안전하게 운영할 수 있다는 데 있습니다. 창구 역할의 agent가 늘어나더라도 specialist agent를 재사용하기 쉽고, 위임 규칙도 중앙에서 관리할 수 있으므로 여러 agent를 조합한 실무 워크플로를 지속적으로 유지보수하기 쉬워집니다.

### Shared Partial Prompt / SOUL Composability

![Partial prompt 구성도](./docs/images/hermes-partial-prompts.png)

이 구조에서는 공통 partial prompt를 shared asset로 관리하고, 여러 agent의 `SOUL.src.md`에서 `embed/include`하여 최종 `SOUL.md`를 조립합니다. 운영자는 모든 agent에 공통으로 적용되는 규칙, 안전 정책, 호스트 운영 규약을 partial 쪽에 모아둘 수 있고, 각 agent에는 역할 고유의 차이만 작성하면 됩니다. 그 결과 공통 지시의 동기화 누락을 줄일 수 있고, fleet 전체의 SOUL 유지보수를 일관된 방식으로 수행할 수 있습니다.

## 문서 맵

- 요구사항 정의: [`docs/requirements.md`](./docs/requirements.md)
- 아키텍처 / API 설계: [`docs/design.md`](./docs/design.md)
- 영어 README: [`README.md`](./README.md)
- 기여 가이드: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- 보안 보고: [`SECURITY.md`](./SECURITY.md)
- 사용자 지원 안내: [`SUPPORT.md`](./SUPPORT.md)

## 개요

Hermes Manager에서는 브라우저 UI를 통해 다음 작업을 수행할 수 있습니다.

- 하나의 호스트에서 여러 agent를 중앙 집중식으로 운영
- agent 프로비저닝, 복제, 삭제
- launchd(macOS) / systemd(Linux)를 통한 시작, 중지, 재시작
- `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml`, `.env` 편집
- visibility 메타데이터가 포함된 global / agent 환경 변수 레이어링 관리
- templates / partials 재사용 및 로컬 skill 카탈로그에서 skills equip
- 로컬 서비스 제어, 로그, Cron 작업, 채팅 세션 확인

## 안전성 / 신뢰 경계

이 프로젝트는 trusted-network / 인트라넷 운영을 전제로 합니다.
공개 인터넷용 인증, 다중 사용자용 권한 분리, 외부 공개를 위한 방어 기능은 기본적으로 포함하지 않습니다.
인트라넷 외부에서 운영할 경우, 반드시 앞단에 자체 인증 및 접근 제어를 추가하십시오.

## 스크린샷

### Agents 목록

![Hermes Manager 스크린샷](./docs/images/ss-agents-1.png)

### 메모리 관리

![Hermes Manager 메모리 관리 화면](./docs/images/ss-agent_memory-1.png)

## 기여 방법

제안 흐름, 품질 게이트, 구현 전제 조건은 [`CONTRIBUTING.md`](./CONTRIBUTING.md)를 참고하세요.

## 라이선스

MIT. [`LICENSE`](./LICENSE)를 참고하세요.
