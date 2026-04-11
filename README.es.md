# Hermes Agents WebApp

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Captura de pantalla de Hermes Agents WebApp](./docs/images/ss-agents-1.png)

Hermes Agents WebApp es una aplicación Next.js para gestionar de forma centralizada los Hermes Agents operados en el entorno mini desde una interfaz web.
Integra la creación, duplicación, eliminación, control de inicio/parada, edición de configuración, gestión de variables de entorno, gestión de habilidades, operaciones de tareas programadas, inspección del historial de chat y visualización de logs.

La interfaz web soporta los siguientes 10 idiomas:

- Japonés (`ja`)
- Inglés (`en`)
- Chino simplificado (`zh-CN`)
- Español (`es`)
- Portugués (Brasil) (`pt-BR`)
- Vietnamita (`vi`)
- Coreano (`ko`)
- Ruso (`ru`)
- Francés (`fr`)
- Alemán (`de`)

Puede cambiar de idioma desde el selector de idiomas en el shell compartido de la aplicación. El idioma seleccionado se almacena en `localStorage`, y los valores inválidos o ausentes vuelven al japonés por defecto.

Nota: solo la interfaz de la aplicación está localizada. El contenido operativo como `SOUL.md`, archivos de memoria, logs y transcripciones de chat no se traduce automáticamente.

> **Aplicación de red confiable** — Hermes Agents WebApp está diseñado para operar en redes confiables/intranet. No incluye autenticación para internet público ni control de acceso multiinquilino. Si lo expone fuera de una red confiable, agregue su propia capa de autenticación y control de acceso.

Para reglas operativas detalladas y políticas de diseño, consulte lo siguiente:

- Guía del desarrollador: [`AGENTS.md`](./AGENTS.md)
- Requisitos: [`docs/requirements.md`](./docs/requirements.md)
- Diseño: [`docs/design.md`](./docs/design.md)
- Guía de contribución: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Informes de seguridad: [`SECURITY.md`](./SECURITY.md)
- Soporte: [`SUPPORT.md`](./SUPPORT.md)

## Características principales

- Gestionar centralmente múltiples Hermes Agents desde la interfaz web
- Crear, duplicar, eliminar, iniciar, detener y reiniciar agents
- Editar `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md` y `config.yaml`
- Gestionar variables de entorno de agent/globales con metadatos de visibilidad
- Equipar/desequipar habilidades copiando directorios de habilidades
- Gestionar tareas programadas e inspeccionar sus resultados
- Inspeccionar sesiones de chat e historial a través del servidor API del agent
- Ver logs de gateway/webapp con tail/stream
- Cambiar la interfaz entre 10 idiomas soportados

## Capturas de pantalla

### Lista de Agents

![Captura de pantalla de Hermes Agents WebApp](./docs/images/ss-agents-1.png)

### Gestión de memoria

![Pantalla de gestión de memoria de Hermes Agents](./docs/images/ss-agent_memory-1.png)

## Stack tecnológico

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (validación de entrada de API)
- Capa de datos basada en sistema de archivos (`runtime/` es la fuente de verdad)

## Instalación

Prerequisitos:

- Node.js 20+
- npm

Punto de entrada de arranque preferido:

```bash
./.wt/setup
```

Este script instala dependencias cuando es necesario, prepara directorios de ejecución e instala hooks locales disponibles.

O manualmente:

```bash
npm install
npm run build
PORT=18470 npm run start
```

## Comandos de desarrollo

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Límites de pruebas

- `npm run test` (Vitest): pruebas unitarias, de componentes e integración en `tests/api`, `tests/components`, `tests/hooks`, `tests/lib` y `tests/ui`.
- `npm run test:e2e` (Playwright): pruebas E2E de navegador en `tests/e2e`.
- Actualmente no hay pruebas Playwright confirmadas en `tests/e2e`, por lo que `npm run test:e2e` solo verifica la ruta de ejecución mediante `--pass-with-no-tests`.
- Las pruebas Playwright asumen que la aplicación ya está en ejecución (por ejemplo, con `npm run dev`).

## Estructura de directorios (resumen)

```text
hermes-agents/
├── app/                    # Next.js App Router (UI / API)
├── components/             # Componentes de UI compartidos
├── src/lib/                # Helpers de sistema de archivos/Env/SkillLink
├── docs/                   # Documentos de requisitos y diseño
├── openspec/changes/       # Propuestas de cambio Conflux
├── tests/
│   ├── api|components|hooks|lib|ui/  # Pruebas unitarias/componentes/integración Vitest
│   └── e2e/                         # Pruebas E2E de navegador Playwright (requiere app en ejecución)
├── runtime/                # Datos de ejecución (agents/globals/logs)
└── AGENTS.md               # Guía obligatoria para desarrolladores
```

## Contribuir

Consulte [`CONTRIBUTING.md`](./CONTRIBUTING.md) para el flujo de contribución. Este documento se mantiene en inglés.

## Versionado y lanzamientos

Este proyecto utiliza versionado basado en SemVer a medida que madura.

- Fuente de verdad de la versión: `package.json`
- Notas de lanzamiento: GitHub Releases (cambios orientados al usuario y notas de actualización para operadores)

Hasta que se agreguen herramientas de lanzamiento automatizadas, cree lanzamientos etiquetados desde commits limpios que pasen `npm run test`, `npm run typecheck`, `npm run lint` y `npm run format:check`.

## Licencia

MIT. Consulte [`LICENSE`](./LICENSE).
