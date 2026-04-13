# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Снимок экрана Hermes Manager](./docs/images/ss-agents-1.png)

Hermes Manager — это control plane на Next.js для управления множеством Hermes Agents на одном хосте через единый веб-интерфейс.
В отличие от официального Hermes dashboard, ориентированного на управление одной установкой Hermes, Hermes Manager предназначен для multi-agent operations: управления жизненным циклом, provisioning с использованием templates и partials, послойного управления переменными окружения для каждого agent, контроля локальных сервисов и проверки логов и чат-активности между agents. Он не предназначен быть feature-parity заменой официального single-install dashboard.

Веб-интерфейс поддерживает следующие 10 языков:

- Японский (`ja`)
- Английский (`en`)
- Упрощённый китайский (`zh-CN`)
- Испанский (`es`)
- Португальский (Бразилия) (`pt-BR`)
- Вьетнамский (`vi`)
- Корейский (`ko`)
- Русский (`ru`)
- Французский (`fr`)
- Немецкий (`de`)

Вы можете переключить язык через переключатель языков в общей оболочке приложения. Выбранная локаль сохраняется в `localStorage`, а недопустимые или отсутствующие значения возвращают японский язык по умолчанию.

Примечание: локализован только интерфейс приложения. Операционный контент, такой как `SOUL.md`, файлы памяти, логи и расшифровки чатов, не переводится автоматически.

> **Приложение для доверенной сети** — Hermes Manager разработан для работы в доверенных сетях/интранете. Он не включает аутентификацию для публичного интернета или мультиарендный контроль доступа. При размещении за пределами доверенной сети добавьте собственный уровень аутентификации и контроля доступа.

Подробные правила эксплуатации и политики проектирования см. в следующих документах:

- Руководство разработчика: [`AGENTS.md`](./AGENTS.md)
- Требования: [`docs/requirements.md`](./docs/requirements.md)
- Проектирование: [`docs/design.md`](./docs/design.md)
- Руководство по участию: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Отчёт о безопасности: [`SECURITY.md`](./SECURITY.md)
- Поддержка: [`SUPPORT.md`](./SUPPORT.md)

## Основные возможности

- Централизованное управление несколькими Hermes Agents через веб-интерфейс
- Создание, дублирование, удаление, запуск, остановка и перезапуск агентов
- Редактирование `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md` и `config.yaml`
- Управление переменными окружения агента/глобальными с метаданными видимости
- Установка/удаление навыков путём копирования каталогов навыков
- Управление cron-заданиями и просмотр их результатов
- Просмотр сеансов чата и истории через API-сервер агента
- Просмотр логов gateway/webapp с поддержкой tail/stream
- Переключение интерфейса между 10 поддерживаемыми языками

## Снимки экрана

### Список агентов

![Снимок экрана Hermes Manager](./docs/images/ss-agents-1.png)

### Управление памятью

![Экран управления памятью Hermes Manager](./docs/images/ss-agent_memory-1.png)

## Технологический стек

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (валидация входных данных API)
- Слой данных на основе файловой системы (`runtime/` — источник истины)

## Установка

Предварительные требования:

- Node.js 20+
- npm

Предпочтительная точка входа для начальной настройки:

```bash
./.wt/setup
```

Этот скрипт устанавливает зависимости при необходимости, подготавливает каталоги выполнения и устанавливает доступные локальные хуки.

Или вручную:

```bash
npm install
npm run build
PORT=18470 npm run start
```

## Команды разработки

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Границы тестирования

- `npm run test` (Vitest): модульные, компонентные и интеграционные тесты в `tests/api`, `tests/components`, `tests/hooks`, `tests/lib` и `tests/ui`.
- `npm run test:e2e` (Playwright): браузерные E2E-тесты в `tests/e2e`.
- В настоящее время в `tests/e2e` нет закоммиченных тестов Playwright, поэтому `npm run test:e2e` только проверяет путь выполнения через `--pass-with-no-tests`.
- Тесты Playwright предполагают, что приложение уже запущено (например, с помощью `npm run dev`).

## Структура каталогов (обзор)

```text
hermes-manager/
├── app/                    # Next.js App Router (UI / API)
├── components/             # Общие UI-компоненты
├── src/lib/                # Помощники файловой системы/Env/SkillLink
├── docs/                   # Документы требований и проектирования
├── openspec/changes/       # Предложения изменений Conflux
├── tests/
│   ├── api|components|hooks|lib|ui/  # Модульные/компонентные/интеграционные тесты Vitest
│   └── e2e/                         # Браузерные E2E-тесты Playwright (требуется запущенное приложение)
├── runtime/                # Данные выполнения (agents/globals/logs)
└── AGENTS.md               # Обязательное руководство для разработчиков
```

## Участие в проекте

См. [`CONTRIBUTING.md`](./CONTRIBUTING.md) для процесса участия. Этот документ ведётся на английском языке.

## Версионирование и релизы

Этот проект использует версионирование на основе SemVer по мере его развития.

- Источник истины версии: `package.json`
- Примечания к релизам: GitHub Releases (изменения для пользователей и заметки по обновлению для операторов)

До добавления автоматизированных инструментов выпуска создавайте тегированные релизы из чистых коммитов, прошедших `npm run test`, `npm run typecheck`, `npm run lint` и `npm run format:check`.

## Лицензия

MIT. См. [`LICENSE`](./LICENSE).
