# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Скриншот Hermes Manager](./docs/images/ss-agents-1.png)

Hermes Manager — это control plane на базе Next.js для централизованной эксплуатации множества Hermes Agent на одном хосте.
В отличие от официального Hermes dashboard, который представляет собой UI для управления одной установкой Hermes, Hermes Manager не является заменой с feature parity, а позиционируется как решение для эксплуатации нескольких агентов в trusted-network / intranet-среде. Основной акцент сделан на provisioning агентов, применении templates / partials, послойном управлении переменными окружения для каждого agent, контроле локальных сервисов и сквозном управлении конфигурациями, логами и историей чатов.

Ключевой особенностью приложения также является работа с «partial prompt», позволяющая сопровождать SOUL нескольких агентов через общие компоненты. Каждый agent сохраняет уже собранный `SOUL.md`, совместимый с runtime, и при этом может `embed/include` общие partial из редактируемого `SOUL.src.md`. Это позволяет обновлять общие политики и операционные правила для нескольких агентов в одном месте, сохраняя отдельно только различия между ними.

## Особенности приложения

- Control plane для централизованной эксплуатации нескольких агентов на одном хосте
- Основа для работы с subagent, предоставляющая managed delegation / dispatch между agent
- Управление доступными целями делегирования, предотвращение циклов и ограничение максимального hop через per-agent delegation policy
- Возможность для operator свободно строить модель распределения ролей, например между domain agent и specialist agent
- Переиспользуемый provisioning с помощью templates / partials / memory assets
- SOUL composability, позволяющая встраивать общий partial prompt в `SOUL.md` нескольких агентов
- Автоматическая регенерация собранного `SOUL.md` с сохранением совместимости с Hermes runtime
- Операционная модель, в которой различия между агентами и общие правила всей fleet сопровождаются раздельно
- Контроль локальных сервисов с интеграцией в launchd / systemd

### Managed Subagent Delegation

![Схема managed subagent delegation](./docs/images/hermes-managed-subagent-delegation-org.png)

Функция subagent в Hermes Manager позволяет построить операционную модель, где агенты не замыкаются сами на себе, а взаимодействуют, будучи разделёнными по ролям. На схеме показана конфигурация, в которой agents, разделённые по бизнес-доменам, такие как Project A / Project B / Client C, становятся точкой входа для пользовательских запросов и делегируют необходимые задачи specialist agents, таким как Python Developer, Marketing Analyzer, Web Designer и Flutter Developer.

При этом Hermes Manager не просто предоставляет точку входа для связи между agent, а работает как control plane, в рамках которой operator может управлять тем, какой agent может использовать какого specialist и до скольких уровней допускается делегирование. Благодаря этому даже при увеличении числа ответственных агентов по бизнес-доменам можно переиспользовать специализированные способности как shared resource и при этом сохранять согласованное поведение всей fleet.

Ценность этой функции заключается в том, что спроектированное operator распределение ролей можно безопасно эксплуатировать за счёт managed delegation и policy control. Даже если количество фронтовых agent увеличивается, specialist agent остаются легко переиспользуемыми, а благодаря централизованному управлению правилами делегирования становится проще поддерживать рабочие процессы, построенные из нескольких агентов, на постоянной основе.

### Shared Partial Prompt / SOUL Composability

![Схема partial prompt](./docs/images/hermes-partial-prompts.png)

В этой конфигурации общий partial prompt управляется как shared asset и включается через `embed/include` из `SOUL.src.md` нескольких агентов, чтобы собрать итоговый `SOUL.md`. Operator может сосредоточить на стороне partial правила, политики безопасности и регламенты эксплуатации хоста, общие для всех агентов, а в каждом agent описывать только различия, связанные с его ролью. В результате уменьшается риск рассинхронизации общих инструкций и сопровождение SOUL по всей fleet становится более последовательным.

## Карта документации

- Определение требований: [`docs/requirements.md`](./docs/requirements.md)
- Архитектура / проектирование API: [`docs/design.md`](./docs/design.md)
- README на английском: [`README.md`](./README.md)
- Руководство по участию: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Сообщения о безопасности: [`SECURITY.md`](./SECURITY.md)
- Информация для пользователей: [`SUPPORT.md`](./SUPPORT.md)

## Обзор

В Hermes Manager через браузерный UI доступны следующие действия.

- Централизованная эксплуатация нескольких агентов на одном хосте
- Provisioning, клонирование и удаление агентов
- Запуск, остановка и перезапуск через launchd (macOS) / systemd (Linux)
- Редактирование `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` и `.env`
- Управление global / agent layering переменных окружения с метаданными visibility
- Переиспользование templates / partials и equip навыков из локального каталога skills
- Просмотр управления локальными сервисами, логов, Cron jobs и chat sessions

## Безопасность / граница доверия

Этот проект предполагает эксплуатацию в trusted-network / intranet-среде.
Аутентификация для публичного интернета, разделение прав для большого числа пользователей и механизмы защиты для внешней публикации по умолчанию не включены.
Если вы развёртываете систему вне intranet, обязательно добавьте собственный внешний уровень аутентификации и контроля доступа.

## Скриншоты

### Список Agents

![Скриншот Hermes Manager](./docs/images/ss-agents-1.png)

### Управление памятью

![Экран управления памятью Hermes Manager](./docs/images/ss-agent_memory-1.png)

## Как внести вклад

Процесс предложений, quality gates и предпосылки реализации описаны в [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Лицензия

MIT. См. [`LICENSE`](./LICENSE).
