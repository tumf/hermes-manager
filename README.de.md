# Hermes Manager

[![日本語](https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-blue?style=flat-square)](./README.ja.md) [![English](https://img.shields.io/badge/English-blue?style=flat-square)](./README.md) [![简体中文](https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-blue?style=flat-square)](./README.zh-CN.md) [![Español](https://img.shields.io/badge/Espa%C3%B1ol-blue?style=flat-square)](./README.es.md) [![Português%20(BR)](<https://img.shields.io/badge/Portugu%C3%AAs%20(BR)-blue?style=flat-square>)](./README.pt-BR.md) [![한국어](https://img.shields.io/badge/%ED%95%9C%EA%B5%AD%EC%96%B4-blue?style=flat-square)](./README.ko.md) [![Français](https://img.shields.io/badge/Fran%C3%A7ais-blue?style=flat-square)](./README.fr.md) [![Deutsch](https://img.shields.io/badge/Deutsch-blue?style=flat-square)](./README.de.md) [![Русский](https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-blue?style=flat-square)](./README.ru.md) [![Tiếng%20Việt](https://img.shields.io/badge/Ti%E1%BA%BFng%20Vi%E1%BB%87t-blue?style=flat-square)](./README.vi.md)

![Hermes Manager Screenshot](./docs/images/ss-agents-1.png)

Hermes Manager ist eine Next.js-Anwendung zur zentralen Verwaltung von Hermes Agents, die in der Mini-Umgebung betrieben werden, über eine Web-Oberfläche.
Sie integriert die Erstellung, Duplizierung, Löschung, Start-/Stopp-Steuerung, Konfigurationsbearbeitung, Umgebungsvariablenverwaltung, Skill-Verwaltung, Cron-Job-Operationen, Chat-Verlaufsinspektion und Log-Anzeige.

Die Web-Oberfläche unterstützt die folgenden 10 Sprachen:

- Japanisch (`ja`)
- Englisch (`en`)
- Vereinfachtes Chinesisch (`zh-CN`)
- Spanisch (`es`)
- Portugiesisch (Brasilien) (`pt-BR`)
- Vietnamesisch (`vi`)
- Koreanisch (`ko`)
- Russisch (`ru`)
- Französisch (`fr`)
- Deutsch (`de`)

Sie können die Sprache über den Sprachumschalter in der gemeinsamen App-Shell wechseln. Die ausgewählte Sprache wird in `localStorage` gespeichert, und ungültige oder fehlende Werte fallen auf Japanisch zurück.

Hinweis: Nur die Anwendungsoberfläche ist lokalisiert. Betriebsinhalte wie `SOUL.md`, Speicherdateien, Logs und Chat-Transkripte werden nicht automatisch übersetzt.

> **Vertrauensnetzwerk-Anwendung** — Hermes Manager ist für den Betrieb in vertrauenswürdigen Netzwerken/Intranets konzipiert. Es enthält keine öffentliche Internet-Authentifizierung oder mandantenfähige Zugriffskontrolle. Wenn Sie es außerhalb eines vertrauenswürdigen Netzwerks bereitstellen, fügen Sie Ihre eigene Authentifizierungs- und Zugriffskontrollschicht hinzu.

Für detaillierte Betriebsregeln und Designrichtlinien siehe:

- Entwicklerhandbuch: [`AGENTS.md`](./AGENTS.md)
- Anforderungen: [`docs/requirements.md`](./docs/requirements.md)
- Design: [`docs/design.md`](./docs/design.md)
- Beitragsanleitung: [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- Sicherheitsmeldungen: [`SECURITY.md`](./SECURITY.md)
- Support: [`SUPPORT.md`](./SUPPORT.md)

## Hauptfunktionen

- Zentrale Verwaltung mehrerer Hermes Agents über die Web-Oberfläche
- Agents erstellen, duplizieren, löschen, starten, stoppen und neu starten
- `SOUL.md`, `SOUL.src.md`, `memories/MEMORY.md`, `memories/USER.md` und `config.yaml` bearbeiten
- Agent-/globale Umgebungsvariablen mit Sichtbarkeitsmetadaten verwalten
- Skills durch Kopieren von Skill-Verzeichnissen ausrüsten/entfernen
- Cron-Jobs verwalten und deren Ausgaben inspizieren
- Chat-Sitzungen und Verlauf über den Agent-API-Server einsehen
- Gateway-/Webapp-Logs mit Tail/Stream anzeigen
- Oberfläche zwischen 10 unterstützten Sprachen wechseln

## Screenshots

### Agent-Liste

![Hermes Manager Screenshot](./docs/images/ss-agents-1.png)

### Speicherverwaltung

![Hermes Manager Speicherverwaltung](./docs/images/ss-agent_memory-1.png)

## Technologie-Stack

- Next.js (App Router)
- React / TypeScript
- Tailwind CSS + shadcn/ui
- Zod (API-Eingabevalidierung)
- Dateisystem-basierte Datenschicht (`runtime/` ist die Quelle der Wahrheit)

## Installation

Voraussetzungen:

- Node.js 20+
- npm

Bevorzugter Bootstrap-Einstiegspunkt:

```bash
./.wt/setup
```

Dieses Skript installiert bei Bedarf Abhängigkeiten, bereitet Laufzeitverzeichnisse vor und installiert verfügbare lokale Hooks.

Oder manuell:

```bash
npm install
npm run build
PORT=18470 npm run start
```

## Entwicklungsbefehle

```bash
npm run dev
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Testgrenzen

- `npm run test` (Vitest): Unit-, Komponenten- und Integrationstests in `tests/api`, `tests/components`, `tests/hooks`, `tests/lib` und `tests/ui`.
- `npm run test:e2e` (Playwright): Browser-E2E-Tests in `tests/e2e`.
- Derzeit gibt es keine committeten Playwright-Tests in `tests/e2e`, daher überprüft `npm run test:e2e` nur den Ausführungspfad über `--pass-with-no-tests`.
- Playwright-Tests setzen voraus, dass die Anwendung bereits läuft (z.B. mit `npm run dev`).

## Verzeichnisstruktur (Übersicht)

```text
hermes-manager/
├── app/                    # Next.js App Router (UI / API)
├── components/             # Gemeinsame UI-Komponenten
├── src/lib/                # Dateisystem-/Env-/SkillLink-Helfer
├── docs/                   # Anforderungs- und Design-Dokumente
├── openspec/changes/       # Conflux-Änderungsvorschläge
├── tests/
│   ├── api|components|hooks|lib|ui/  # Vitest Unit-/Komponenten-/Integrationstests
│   └── e2e/                         # Playwright Browser-E2E-Tests (laufende App erforderlich)
├── runtime/                # Laufzeitdaten (agents/globals/logs)
└── AGENTS.md               # Pflichtlektüre für Entwickler
```

## Beitragen

Siehe [`CONTRIBUTING.md`](./CONTRIBUTING.md) für den Beitrags-Workflow. Dieses Dokument wird auf Englisch gepflegt.

## Versionierung und Releases

Dieses Projekt verwendet SemVer-basierte Versionierung in seiner Reifephase.

- Versionsquelle der Wahrheit: `package.json`
- Release-Notizen: GitHub Releases (benutzerbezogene Änderungen und Upgrade-Hinweise für Betreiber)

Bis automatisierte Release-Tools hinzugefügt werden, erstellen Sie getaggte Releases aus sauberen Commits, die `npm run test`, `npm run typecheck`, `npm run lint` und `npm run format:check` bestehen.

## Lizenz

MIT. Siehe [`LICENSE`](./LICENSE).
