# Changelog

All notable changes to this language pack are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[SemVer](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-10-04

First public release — the pack exactly as it runs on DeepSeek Harness `0.2.0-rc.2`, plus the gate
that keeps it publishable.

### Added

- **Русский (ru)** in **Settings → General → Language**, registered through the official client
  locale registry (`@deepseek-ai/dsh-client-locale`): the language is added to the catalog with the
  `ru → en` fallback chain, and one dictionary is registered per namespace.
- 54 namespaces / 2158 translated keys, covering chat, conversation, trajectory, workspace, all
  settings pages (models, permissions, plugins, subagents, web search, shell, session log, agent
  loop, agent presets), the sidebar panels (files, documents, Excel, Office, PDF, images, terminal),
  the plugin manager, shortcuts, goals, plan mode, questions, approvals and deliverables.
- `GLOSSARY.md` — the terminology contract the dictionaries are held to.
- Pipeline tooling: `scripts/extract.mjs` (capture a corpus from a build),
  `scripts/merge-corpus.mjs` (merge English sources into `work/en`), `scripts/build.mjs`
  (dictionaries → bundle), `scripts/check.mjs` (coverage, placeholders, empty values, identical
  values), `scripts/compose.mjs`.
- Verification tooling: `tools/smoke.mjs` (the bundle through a mock module loader and a mock
  `ctx.locale`), `tools/scanner-repro.mjs` (the profile row as the client-modules scanner sees it),
  `tools/terms.mjs` (terminology audit), `tools/verify-live.mjs` (a running GUI serves this
  revision), `tools/apply-qa.mjs` / `tools/chunk.mjs` / `tools/polish.mjs` (proof-reading workbench)
  and `tools/audit-public.mjs` (the pre-publish gate for personal data and risky payload APIs).
- `work/en/*.json` — the English corpus captured from the running client, kept in the repository as
  the reference the coverage check measures against.

### Changed

- The corpus is built from the 0.2.0 client: 51 namespaces of the `web` profile client modules plus
  three namespaces that only arrive with the `desktop` profile bundles (`agent-team`,
  `directory-browser`, `schedule.catalog`).
- 968 new strings translated by hand, 179 reused from the translation memory, 128 dead keys pruned
  after checking that no 0.2.0 build references them any more.
- Language selection moved with the client: the durable preference now lives in the profile patch
  (`- id: locale`, `config.preference: ru`) instead of `~/.dsh/settings.yaml`. The pack itself is
  unchanged by this — the preference belongs to the registry's own settings page.

### Fixed

- `chat/message.stepProcess.sharedPrefix` is intentionally **not** stored: its English value is
  empty, the bundle builder rejects empty strings, and the fallback chain returns the empty string
  anyway. Both the coverage check and the smoke test encode this rule, so the gate stays green
  without carrying a key that cannot be built.
- The repository is machine-independent: no absolute path of any machine appears in the sources or
  in the tooling; `DSH_HOME`, `DSH_INSTALL`, `DSH_PROFILE_DIR` and `DSH_PACKAGE_DIR` override
  discovery where a tool needs it.

### Security

- `tools/audit-public.mjs` scans two scopes before every publish: the installed payload (`index.js`,
  `lib/client.js`, `cordis.patch.yml`, `package.json`, `dict/**`) must contain no network, storage,
  clipboard, cookie, `eval` or HTML-injection API, and the whole repository must contain no personal
  path, e-mail address, token or key. Findings are printed redacted and fail the run.

## Earlier — internal iterations, never published

- **2026-09-11** — first version of the pack: the language registered, a first dictionary set
  covering the sidebar, chat and the main settings pages.
- **2026-10-03** — corpus rebuilt from the installed `0.2.0-rc.2` client (54 namespaces), the
  dictionaries re-checked against `work/en`, terminology pass applied from `work/qa-report.md`.
