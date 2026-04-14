# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes-Manager-Screenshot](./docs/images/ss-agents-1.png)

Hermes Manager ist eine mit Next.js entwickelte Control Plane für den gebündelten Betrieb vieler Hermes Agents auf einem einzigen Host.
Im Gegensatz zum offiziellen Hermes-Dashboard, das eine einzelne Hermes-Installation verwaltet, ist Hermes Manager kein funktionsgleiches Ersatzprodukt, sondern für den Multi-Agent-Betrieb in vertrauenswürdigen Netzwerken bzw. Intranet-Umgebungen positioniert. Im Mittelpunkt stehen Agent-Provisionierung, Anwendung von Templates/Partials, agent-spezifisches Layering von Umgebungsvariablen, Steuerung lokaler Services sowie die übergreifende Verwaltung von Konfigurationen, Logs und Chat-Verläufen.

Ein zentrales Unterscheidungsmerkmal dieser Anwendung ist außerdem der Betrieb mit „Partial Prompts“, bei dem die SOUL mehrerer Agents über gemeinsame Bausteine gepflegt werden kann. Jeder Agent behält dabei eine zur Runtime kompatible, bereits zusammengesetzte `SOUL.md`, kann aber gemeinsame Partials aus einer bearbeitbaren `SOUL.src.md` per `embed/include` einbinden. Dadurch lassen sich gemeinsame Richtlinien und Betriebsregeln für mehrere Agents an einer Stelle aktualisieren, während nur die agent-spezifischen Unterschiede separat gepflegt werden.

## Merkmale dieser Anwendung

- Eine Control Plane für den zentralen Betrieb mehrerer Agents auf einem Host
- Eine Subagent-Betriebsbasis, die Managed Delegation / Dispatch zwischen Agents bereitstellt
- Steuerung von Delegationszielen, Verhinderung von Zyklen und Begrenzung der maximalen Hops über agent-spezifische Delegationsrichtlinien
- Frei gestaltbares Rollenmodell für Operatoren, etwa mit Domain Agents oder Specialist Agents
- Wiederverwendbare Provisionierung mit Templates, Partials und Memory-Assets
- SOUL-Komponierbarkeit, bei der gemeinsame Partial Prompts in die `SOUL.md` mehrerer Agents eingebettet werden können
- Automatische Neugenerierung der zusammengesetzten `SOUL.md` unter Wahrung der Hermes-Runtime-Kompatibilität
- Ein Betriebsmodell, in dem agent-spezifische Unterschiede und gemeinsame Regeln für die gesamte Fleet getrennt gepflegt werden können
- Steuerung lokaler Services mit Integration in launchd / systemd

### Managed Subagent Delegation

![Diagramm der Managed-Subagent-Delegation](./docs/images/hermes-managed-subagent-delegation-org.png)

Mit der Subagent-Funktion von Hermes Manager lässt sich ein Betriebsmodell aufbauen, in dem Agents nicht isoliert arbeiten, sondern nach Rollen getrennt zusammenarbeiten. Die Abbildung zeigt eine Konfiguration, in der nach Geschäftsdomänen getrennte Agents wie Project A, Project B oder Client C als Eingangspunkt für Benutzeranfragen dienen und erforderliche Aufgaben an Specialist Agents wie Python Developer, Marketing Analyzer, Web Designer oder Flutter Developer delegieren.

Dabei stellt Hermes Manager nicht nur einen Einstiegspunkt für die Kommunikation zwischen Agents bereit, sondern fungiert als Control Plane, über die der Operator verwalten kann, welcher Agent welche Specialists nutzen darf und wie viele Delegationsstufen zulässig sind. So kann auch bei einer größeren Zahl domänenspezifischer Agents das Fachwissen als gemeinsame Ressource wiederverwendet werden, während das Verhalten der gesamten Fleet konsistent bleibt.

Der Wert dieser Funktion liegt darin, dass die vom Operator entworfene Arbeitsteilung mit Managed Delegation und Policy-Steuerung sicher betrieben werden kann. Selbst wenn mehr Frontline-Agents hinzukommen, lassen sich Specialist Agents leicht wiederverwenden, und weil die Delegationsregeln zentral verwaltet werden, können praktische Workflows mit mehreren Agents dauerhaft einfacher gepflegt werden.

### Shared Partial Prompt / SOUL Composability

![Diagramm der Partial Prompts](./docs/images/hermes-partial-prompts.png)

In dieser Struktur werden gemeinsame Partial Prompts als Shared Assets verwaltet und aus den `SOUL.src.md` mehrerer Agents per `embed/include` eingebunden, um daraus die endgültige `SOUL.md` zusammenzusetzen. Der Operator kann Regeln, Sicherheitsrichtlinien und Host-Betriebsvorgaben, die für alle Agents gelten, auf der Partial-Seite bündeln und in jedem Agent nur die rollenspezifischen Unterschiede festhalten. Dadurch werden Synchronisationslücken bei gemeinsamen Anweisungen reduziert und die Pflege der SOUL in der gesamten Fleet konsistent gehalten.

## Dokumentenübersicht

- Anforderungsdefinition: [`docs/requirements.md`](./docs/requirements.md)
- Architektur / API-Design: [`docs/design.md`](./docs/design.md)
- Englische README: [`README.md`](./README.md)
- Beitragsleitfaden: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Sicherheitsmeldungen: [`SECURITY.md`](./SECURITY.md)
- Hinweise für Nutzer: [`SUPPORT.md`](./SUPPORT.md)

## Überblick

In Hermes Manager können über die Browser-Oberfläche die folgenden Aktionen ausgeführt werden.

- Zentraler Betrieb mehrerer Agents auf einem Host
- Provisionierung, Duplizierung und Löschung von Agents
- Start, Stopp und Neustart über launchd (macOS) / systemd (Linux)
- Bearbeitung von `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md`, `config.yaml` und `.env`
- Verwaltung von globalem / agent-spezifischem Layering für Umgebungsvariablen mit Sichtbarkeitsmetadaten
- Wiederverwendung von Templates / Partials und Ausrüsten von Skills aus einem lokalen Skill-Katalog
- Einsicht in lokale Service-Steuerung, Logs, Cron-Jobs und Chat-Sessions

## Sicherheit / Vertrauensgrenze

Dieses Projekt setzt den Betrieb in vertrauenswürdigen Netzwerken bzw. im Intranet voraus.
Authentifizierung für das öffentliche Internet, mandantenfähige Rechte-Trennung und Schutzmechanismen für eine externe Veröffentlichung sind standardmäßig nicht enthalten.
Wenn Sie das System außerhalb eines Intranets betreiben, stellen Sie unbedingt eine eigene vorgelagerte Authentifizierungs- und Zugriffskontrollschicht bereit.

## Screenshots

### Agent-Liste

![Hermes-Manager-Screenshot](./docs/images/ss-agents-1.png)

### Speicherverwaltung

![Hermes-Manager-Speicherverwaltung](./docs/images/ss-agent_memory-1.png)

## Beiträge

Vorschlagsprozess, Quality Gates und Implementierungsvoraussetzungen finden Sie in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Lizenz

MIT. Siehe [`LICENSE`](./LICENSE).
