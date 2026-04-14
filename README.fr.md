# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Capture d'écran de Hermes Manager](./docs/images/ss-agents-1.png)

Hermes Manager est un control plane construit avec Next.js pour exploiter de manière centralisée de nombreux Hermes Agents sur un seul hôte.
Alors que le dashboard officiel de Hermes est une interface destinée à gérer une seule installation Hermes, Hermes Manager n’est pas un remplacement à parité fonctionnelle. Il se positionne pour l’exploitation multi-agents dans des environnements trusted-network / intranet. L’accent est mis sur le provisioning des agents, l’application de templates/partials, la superposition des variables d’environnement par agent, le contrôle des services locaux, ainsi que la gestion transversale des configurations, des logs et de l’historique de chat.

L’exploitation avec des « partial prompts », qui permet de maintenir le SOUL de plusieurs agents à l’aide de composants partagés, constitue également un élément différenciateur central de cette application. Chaque agent conserve un `SOUL.md` déployé et compatible avec le runtime, tout en pouvant `embed/include` des partials partagés depuis un `SOUL.src.md` destiné à l’édition. Cela permet de mettre à jour en un seul endroit les politiques communes et les règles d’exploitation s’appliquant à plusieurs agents, tout en ne conservant séparément que les différences propres à chaque agent.

## Caractéristiques de cette application

- control plane pour exploiter de manière centralisée plusieurs agents sur un seul hôte
- base d’exploitation de sous-agents fournissant managed delegation / dispatch entre agents
- contrôle des destinations de délégation, prévention des boucles et limitation du nombre maximal de hops grâce à des politiques de délégation par agent
- possibilité pour l’opérateur de composer librement des modèles de répartition des rôles, comme domain agents et specialist agents
- provisioning réutilisable à l’aide de templates / partials / memory assets
- composabilité du SOUL permettant d’intégrer des partial prompts partagés dans le `SOUL.md` de plusieurs agents
- régénération automatique du `SOUL.md` assemblé tout en conservant la compatibilité avec le runtime Hermes
- modèle opérationnel permettant de séparer la maintenance des différences propres à chaque agent des règles communes à toute la fleet
- contrôle des services locaux intégré à launchd / systemd

### Managed Subagent Delegation

![Schéma de managed subagent delegation](./docs/images/hermes-managed-subagent-delegation-org.png)

La fonctionnalité de sous-agents de Hermes Manager permet de construire un modèle d’exploitation dans lequel les agents ne fonctionnent pas de manière isolée, mais coopèrent en étant répartis par rôle. Le schéma montre une configuration où des agents orientés domaine métier, comme Project A / Project B / Client C, servent de point d’entrée pour les demandes des utilisateurs et délèguent les traitements nécessaires à des specialist agents tels que Python Developer, Marketing Analyzer, Web Designer ou Flutter Developer.

Dans ce cadre, Hermes Manager ne se contente pas de fournir un point d’entrée pour la communication entre agents ; il agit comme un control plane permettant à l’opérateur de gérer quels specialists chaque agent peut utiliser, ainsi que le nombre de niveaux de délégation autorisés. Cela permet, même si le nombre d’agents responsables de domaines métier augmente, de réutiliser les capacités spécialisées comme des ressources partagées tout en maintenant un comportement cohérent à l’échelle de toute la fleet.

La valeur de cette fonctionnalité réside dans le fait qu’elle permet d’exploiter en toute sécurité la répartition des rôles conçue par l’opérateur grâce à la managed delegation et au contrôle par politiques. Même si le nombre d’agents d’interface augmente, les specialist agents restent faciles à réutiliser, et les règles de délégation peuvent être administrées de manière centralisée, ce qui facilite la maintenance continue de workflows métier combinant plusieurs agents.

### Shared Partial Prompt / SOUL Composability

![Schéma de partial prompt](./docs/images/hermes-partial-prompts.png)

Dans cette structure, les partial prompts communs sont gérés comme des assets partagés, puis inclus depuis le `SOUL.src.md` de plusieurs agents via `embed/include` afin de construire le `SOUL.md` final. L’opérateur peut regrouper du côté des partials les règles, politiques de sécurité et conventions d’exploitation de l’hôte communes à tous les agents, tout en n’écrivant dans chaque agent que les différences propres à son rôle. Il en résulte une réduction des oublis de synchronisation des instructions communes et une maintenance plus cohérente du SOUL à l’échelle de toute la fleet.

## Carte de la documentation

- Définition des exigences : [`docs/requirements.md`](./docs/requirements.md)
- Architecture / conception de l’API : [`docs/design.md`](./docs/design.md)
- README en anglais : [`README.md`](./README.md)
- Guide de contribution : [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Signalement de sécurité : [`SECURITY.md`](./SECURITY.md)
- Informations de support pour les utilisateurs : [`SUPPORT.md`](./SUPPORT.md)

## Vue d’ensemble

Dans Hermes Manager, les opérations suivantes peuvent être effectuées depuis l’interface navigateur :

- exploitation centralisée de plusieurs agents sur un seul hôte
- provisioning, duplication et suppression d’agents
- démarrage, arrêt et redémarrage via launchd (macOS) / systemd (Linux)
- édition de `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` et `.env`
- gestion par couches des variables d’environnement globales / par agent avec métadonnées de visibilité
- réutilisation de templates / partials et equip de skills depuis un catalogue local de skills
- consultation du contrôle des services locaux, des logs, des tâches Cron et des sessions de chat

## Sécurité / frontière de confiance

Ce projet suppose une exploitation dans un environnement trusted-network / intranet.
Il n’inclut pas par défaut d’authentification pour l’internet public, de séparation des permissions pour de nombreux utilisateurs, ni de protections pour une exposition externe.
Si vous l’exploitez en dehors d’un intranet, ajoutez impérativement votre propre couche d’authentification et de contrôle d’accès en amont.

## Captures d’écran

### Liste des Agents

![Capture d'écran de Hermes Manager](./docs/images/ss-agents-1.png)

### Gestion de la mémoire

![Écran de gestion de la mémoire de Hermes Manager](./docs/images/ss-agent_memory-1.png)

## Contribution

Veuillez consulter [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour le flux de proposition, les gates de qualité et les prérequis d’implémentation.

## Licence

MIT. Veuillez consulter [`LICENSE`](./LICENSE).
