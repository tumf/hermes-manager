# Hermes Agents WebApp

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Captura de tela do Hermes Agents WebApp](./docs/images/ss-agents-1.png)

Hermes Agents WebApp é uma aplicação Next.js para gerenciar centralmente os Hermes Agents operados no ambiente mini a partir de uma interface web.
Integra criação, duplicação, exclusão, controle de início/parada, edição de configuração, gerenciamento de variáveis de ambiente, gerenciamento de habilidades, operações de tarefas agendadas, inspeção de histórico de chat e visualização de logs.

A interface web suporta os seguintes 10 idiomas:

- Japonês (`ja`)
- Inglês (`en`)
- Chinês simplificado (`zh-CN`)
- Espanhol (`es`)
- Português (Brasil) (`pt-BR`)
- Vietnamita (`vi`)
- Coreano (`ko`)
- Russo (`ru`)
- Francês (`fr`)
- Alemão (`de`)

Você pode trocar de idioma pelo seletor de idiomas no shell compartilhado do aplicativo. O idioma selecionado é armazenado no `localStorage`, e valores inválidos ou ausentes retornam ao japonês por padrão.

Nota: apenas a interface do aplicativo é localizada. Conteúdo operacional como `SOUL.md`, arquivos de memória, logs e transcrições de chat não são traduzidos automaticamente.

> **Aplicação de rede confiável** — Hermes Agents WebApp foi projetado para operação em rede confiável/intranet. Não inclui autenticação para internet pública ou controle de acesso multi-inquilino. Se expuser fora de uma rede confiável, adicione sua própria camada de autenticação e controle de acesso.

Para regras operacionais detalhadas e políticas de design, consulte o seguinte:

- Guia do desenvolvedor: [`AGENTS.md`](./AGENTS.md)
- Requisitos: [`docs/requirements.md`](./docs/requirements.md)
- Design: [`docs/design.md`](./docs/design.md)
- Guia de contribuição: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Relatório de segurança: [`SECURITY.md`](./SECURITY.md)
- Suporte: [`SUPPORT.md`](./SUPPORT.md)

## Recursos principais

- Gerenciar centralmente múltiplos Hermes Agents pela interface web
- Criar, duplicar, excluir, iniciar, parar e reiniciar agents
- Editar `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md` e `config.yaml`
- Gerenciar variáveis de ambiente de agent/globais com metadados de visibilidade
- Equipar/desequipar habilidades copiando diretórios de habilidades
- Gerenciar tarefas agendadas e inspecionar seus resultados
- Inspecionar sessões de chat e histórico pelo servidor API do agent
- Visualizar logs de gateway/webapp com tail/stream
- Alternar a interface entre 10 idiomas suportados

## Capturas de tela

### Lista de Agents

![Captura de tela do Hermes Agents WebApp](./docs/images/ss-agents-1.png)

### Gerenciamento de memória

![Tela de gerenciamento de memória do Hermes Agents](./docs/images/ss-agent_memory-1.png)

## Stack tecnológico

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (validação de entrada da API)
- Camada de dados baseada em sistema de arquivos (`runtime/` é a fonte da verdade)

## Instalação

Pré-requisitos:

- Node.js 20+
- npm

Ponto de entrada de bootstrap preferido:

```bash
./.wt/setup
```

Este script instala dependências quando necessário, prepara diretórios de execução e instala hooks locais disponíveis.

Ou manualmente:

```bash
npm install
npm run build
PORT=18470 npm run start
```

## Comandos de desenvolvimento

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Limites de teste

- `npm run test` (Vitest): testes unitários, de componentes e de integração em `tests/api`, `tests/components`, `tests/hooks`, `tests/lib` e `tests/ui`.
- `npm run test:e2e` (Playwright): testes E2E de navegador em `tests/e2e`.
- Atualmente não há testes Playwright confirmados em `tests/e2e`, então `npm run test:e2e` apenas verifica o caminho de execução via `--pass-with-no-tests`.
- Testes Playwright assumem que o aplicativo já está em execução (por exemplo, com `npm run dev`).

## Estrutura de diretórios (visão geral)

```text
hermes-agents/
├── app/                    # Next.js App Router (UI / API)
├── components/             # Componentes de UI compartilhados
├── src/lib/                # Helpers de sistema de arquivos/Env/SkillLink
├── docs/                   # Documentos de requisitos e design
├── openspec/changes/       # Propostas de mudança Conflux
├── tests/
│   ├── api|components|hooks|lib|ui/  # Testes unitários/componentes/integração Vitest
│   └── e2e/                         # Testes E2E de navegador Playwright (requer app em execução)
├── runtime/                # Dados de execução (agents/globals/logs)
└── AGENTS.md               # Guia obrigatório para desenvolvedores
```

## Contribuindo

Consulte [`CONTRIBUTING.md`](./CONTRIBUTING.md) para o fluxo de contribuição. Este documento é mantido em inglês.

## Versionamento e lançamentos

Este projeto usa versionamento baseado em SemVer à medida que amadurece.

- Fonte da verdade da versão: `package.json`
- Notas de lançamento: GitHub Releases (mudanças voltadas ao usuário e notas de atualização para operadores)

Até que ferramentas de lançamento automatizadas sejam adicionadas, crie lançamentos com tags a partir de commits limpos que passem em `npm run test`, `npm run typecheck`, `npm run lint` e `npm run format:check`.

## Licença

MIT. Consulte [`LICENSE`](./LICENSE).
