# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Captura de pantalla de Hermes Manager](./docs/images/ss-agents-1.png)

Hermes Manager es un plano de control basado en Next.js para operar de forma centralizada muchos Hermes Agents en un solo host.
A diferencia del dashboard oficial de Hermes, que es una UI para gestionar una sola instalación de Hermes, Hermes Manager no pretende ser un reemplazo con paridad de funciones. Está posicionado para operaciones multi-agent en entornos de trusted-network / intranet. Pone el foco en el aprovisionamiento de agentes, la aplicación de templates/partials, el manejo en capas de variables de entorno por agent, el control de servicios locales y la gestión transversal de configuración, logs e historial de chat entre agentes.

Otro elemento diferenciador central de esta aplicación es la operación con “partial prompt”, que permite mantener el SOUL de múltiples agentes usando componentes compartidos. Cada agent conserva un `SOUL.md` desplegado y compatible con el runtime, mientras que desde el `SOUL.src.md` editable se pueden `embed/include` partials compartidos. Esto permite actualizar en un solo lugar políticas comunes y reglas operativas compartidas por varios agentes, manteniendo por separado solo las diferencias específicas de cada agent.

## Características de esta aplicación

- Un plano de control para la operación centralizada de múltiples agentes en un solo host
- Una base operativa de subagentes que ofrece managed delegation / dispatch entre agentes
- Control de destinos de delegación, prevención de ciclos y límite de hops mediante políticas de delegación por agent
- Modelos de reparto de roles definidos por el operator, como domain agents o specialist agents
- Aprovisionamiento reutilizable mediante templates / partials / memory assets
- SOUL composability para incrustar partial prompts compartidos en el `SOUL.md` de múltiples agentes
- Regeneración automática del `SOUL.md` ensamblado manteniendo la compatibilidad con Hermes runtime
- Un modelo operativo que separa las diferencias por agent de las normas compartidas a nivel de toda la fleet
- Control de servicios locales integrado con launchd / systemd

### Managed Subagent Delegation

![Diagrama de managed subagent delegation](./docs/images/hermes-managed-subagent-delegation-org.png)

Con las funciones de subagentes de Hermes Manager, puedes construir un modelo operativo en el que los agentes colaboran por roles, en lugar de hacer que cada uno resuelva todo por sí solo. En el diagrama, los agentes por dominio de negocio, como Project A / Project B / Client C, actúan como punto de entrada para las solicitudes del usuario y delegan el trabajo necesario a specialist agents como Python Developer, Marketing Analyzer, Web Designer y Flutter Developer.

En este modelo, Hermes Manager no se limita a ofrecer un punto de entrada para la comunicación entre agentes. Actúa como un plano de control en el que el operator puede gestionar qué specialist puede usar cada agent y hasta cuántos niveles de delegación se permiten. Como resultado, incluso si aumentas el número de agentes por dominio de negocio, puedes reutilizar capacidades especializadas como shared resources mientras mantienes un comportamiento consistente en toda la fleet.

El valor de esta función es que el reparto de roles diseñado por el operator puede ejecutarse de forma segura mediante managed delegation y controles de política. Aunque aumente el número de agentes de entrada, los specialist agents siguen siendo fáciles de reutilizar y las reglas de delegación pueden administrarse de forma centralizada, lo que facilita el mantenimiento continuo de flujos de trabajo reales compuestos por múltiples agentes.

### Shared Partial Prompt / SOUL Composability

![Diagrama de partial prompt](./docs/images/hermes-partial-prompts.png)

En esta estructura, los partial prompts comunes se gestionan como shared assets y se `embed/include` desde los `SOUL.src.md` de múltiples agentes para ensamblar el `SOUL.md` final. El operator puede concentrar en el lado de los partials las reglas, políticas de seguridad y convenciones operativas del host que comparten todos los agentes, mientras que cada agent solo necesita escribir las diferencias propias de su rol. Como resultado, se reducen los desajustes en las instrucciones compartidas y el mantenimiento del SOUL de toda la fleet se vuelve más consistente.

## Mapa de documentación

- Definición de requisitos: [`docs/requirements.md`](./docs/requirements.md)
- Arquitectura / diseño de API: [`docs/design.md`](./docs/design.md)
- README en inglés: [`README.md`](./README.md)
- Guía de contribución: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Reporte de seguridad: [`SECURITY.md`](./SECURITY.md)
- Guía para usuarios: [`SUPPORT.md`](./SUPPORT.md)

## Resumen

En Hermes Manager, puedes realizar las siguientes operaciones desde la UI del navegador.

- Operación centralizada de múltiples agentes en un solo host
- Aprovisionamiento, duplicación y eliminación de agentes
- Inicio, detención y reinicio mediante launchd (macOS) / systemd (Linux)
- Edición de `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` y `.env`
- Gestión en capas de variables de entorno globales / por agent con metadatos de visibilidad
- Reutilización de templates / partials y equipamiento de skills desde un catálogo local de skills
- Revisión del control de servicios locales, logs, trabajos de Cron y sesiones de chat

## Seguridad / Límite de confianza

Este proyecto asume operación en una trusted-network / intranet.
No incluye por defecto autenticación para internet público, separación de privilegios para múltiples usuarios ni defensas integradas para exposición externa.
Si lo vas a operar fuera de una intranet, asegúrate de añadir delante tu propia capa de autenticación y control de acceso.

## Capturas de pantalla

### Lista de Agents

![Captura de pantalla de Hermes Manager](./docs/images/ss-agents-1.png)

### Gestión de memoria

![Pantalla de gestión de memoria de Hermes Manager](./docs/images/ss-agent_memory-1.png)

## Cómo contribuir

Consulta [`CONTRIBUTING.md`](./CONTRIBUTING.md) para ver el flujo de propuestas, los controles de calidad y los requisitos previos de implementación.

## Licencia

MIT. Consulta [`LICENSE`](./LICENSE).
