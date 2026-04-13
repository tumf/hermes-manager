# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Capture d'écran de Hermes Manager](./docs/images/ss-agents-1.png)

Hermes Manager est un control plane construit avec Next.js pour exploiter de nombreux Hermes Agents sur un seul hôte depuis une interface web centralisée.
Contrairement au dashboard officiel de Hermes, qui se concentre sur la gestion d'une installation Hermes unique, Hermes Manager est positionné pour les opérations multi-agents : gestion du cycle de vie, provisioning avec templates et partials, superposition des variables d'environnement par agent, contrôle des services locaux et inspection des logs ainsi que de l'activité de chat entre agents. Il ne vise pas à remplacer le dashboard officiel mono-installation à parité fonctionnelle.

L'interface web prend en charge les 10 langues suivantes :

- Japonais (`ja`)
- Anglais (`en`)
- Chinois simplifié (`zh-CN`)
- Espagnol (`es`)
- Portugais (Brésil) (`pt-BR`)
- Vietnamien (`vi`)
- Coréen (`ko`)
- Russe (`ru`)
- Français (`fr`)
- Allemand (`de`)

Vous pouvez changer de langue depuis le sélecteur de langue dans le shell partagé de l'application. La langue sélectionnée est stockée dans `localStorage`, et les valeurs invalides ou manquantes reviennent au japonais par défaut.

Remarque : seule l'interface de l'application est localisée. Le contenu opérationnel tel que `SOUL.md`, les fichiers de mémoire, les logs et les transcriptions de chat n'est pas traduit automatiquement.

> **Application réseau de confiance** — Hermes Manager est conçu pour fonctionner sur un réseau de confiance/intranet. Il n'inclut pas d'authentification pour l'internet public ni de contrôle d'accès multi-locataire. Si vous l'exposez en dehors d'un réseau de confiance, ajoutez votre propre couche d'authentification et de contrôle d'accès.

Pour les règles opérationnelles détaillées et les politiques de conception, consultez les documents suivants :

- Guide du développeur : [`AGENTS.md`](./AGENTS.md)
- Exigences : [`docs/requirements.md`](./docs/requirements.md)
- Conception : [`docs/design.md`](./docs/design.md)
- Guide de contribution : [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Signalement de sécurité : [`SECURITY.md`](./SECURITY.md)
- Support : [`SUPPORT.md`](./SUPPORT.md)

## Fonctionnalités principales

- Gérer centralement plusieurs Hermes Agents depuis l'interface web
- Créer, dupliquer, supprimer, démarrer, arrêter et redémarrer des agents
- Éditer `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md` et `config.yaml`
- Gérer les variables d'environnement agent/globales avec des métadonnées de visibilité
- Équiper/déséquiper des compétences en copiant les répertoires de compétences
- Gérer les tâches planifiées et inspecter leurs résultats
- Inspecter les sessions de chat et l'historique via le serveur API de l'agent
- Consulter les logs gateway/webapp avec tail/stream
- Basculer l'interface entre 10 langues prises en charge

## Captures d'écran

### Liste des Agents

![Capture d'écran de Hermes Manager](./docs/images/ss-agents-1.png)

### Gestion de la mémoire

![Écran de gestion de la mémoire Hermes Manager](./docs/images/ss-agent_memory-1.png)

## Stack technique

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (validation des entrées API)
- Couche de données basée sur le système de fichiers (`runtime/` est la source de vérité)

## Installation

Prérequis :

- Node.js 20+
- npm

Point d'entrée de bootstrap préféré :

```bash
./.wt/setup
```

Ce script installe les dépendances si nécessaire, prépare les répertoires d'exécution et installe les hooks locaux disponibles.

Ou manuellement :

```bash
npm install
npm run build
PORT=18470 npm run start
```

## Commandes de développement

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Périmètre des tests

- `npm run test` (Vitest) : tests unitaires, de composants et d'intégration dans `tests/api`, `tests/components`, `tests/hooks`, `tests/lib` et `tests/ui`.
- `npm run test:e2e` (Playwright) : tests E2E navigateur dans `tests/e2e`.
- Actuellement, il n'y a pas de tests Playwright validés dans `tests/e2e`, donc `npm run test:e2e` vérifie uniquement le chemin d'exécution via `--pass-with-no-tests`.
- Les tests Playwright supposent que l'application est déjà en cours d'exécution (par exemple avec `npm run dev`).

## Structure des répertoires (aperçu)

```text
hermes-manager/
├── app/                    # Next.js App Router (UI / API)
├── components/             # Composants UI partagés
├── src/lib/                # Helpers système de fichiers/Env/SkillLink
├── docs/                   # Documents d'exigences et de conception
├── openspec/changes/       # Propositions de changement Conflux
├── tests/
│   ├── api|components|hooks|lib|ui/  # Tests unitaires/composants/intégration Vitest
│   └── e2e/                         # Tests E2E navigateur Playwright (nécessite une app en cours d'exécution)
├── runtime/                # Données d'exécution (agents/globals/logs)
└── AGENTS.md               # Guide obligatoire pour les développeurs
```

## Contribuer

Consultez [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour le flux de contribution. Ce document est maintenu en anglais.

## Versionnement et publications

Ce projet utilise le versionnement basé sur SemVer à mesure qu'il mûrit.

- Source de vérité de la version : `package.json`
- Notes de publication : GitHub Releases (changements orientés utilisateur et notes de mise à niveau pour les opérateurs)

Jusqu'à ce que des outils de publication automatisés soient ajoutés, créez des publications taguées à partir de commits propres qui passent `npm run test`, `npm run typecheck`, `npm run lint` et `npm run format:check`.

## Licence

MIT. Consultez [`LICENSE`](./LICENSE).
