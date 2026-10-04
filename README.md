# dsh-locale-ru

Russian language pack for the **DeepSeek Harness** web UI — a community client plugin that adds
**Русский (ru)** to the language list in **Settings → General → Language**.

The pack patches nothing: no DSH file, no `node_modules`. It registers through the client's own
locale registry (`@deepseek-ai/dsh-client-locale`), adds the language to the catalog and registers
one dictionary per namespace. Anything a dictionary does not cover falls back to English through the
registry's own `ru → en` chain.

| | |
|---|---|
| Namespaces | 54 |
| Translated keys | 2158 of 2159 English keys (100 % of the corpus) |
| Fallback | `ru → en`, the registry's own chain |
| Verified on | DeepSeek Harness `0.2.0-rc.2` (installed desktop app, `web` and `desktop` profiles), Node 24 |

## What you get

- **Русский** in the language picker, switching instantly — no page reload, no restart.
- 54 namespaces covering the whole client surface: chat, conversation, trajectory, workspace,
  settings (models, permissions, plugins, subagents, web search, shell, session log, agent loop,
  agent presets), sidebar panels (files, documents, Excel, Office, PDF, images, terminal),
  plugin manager, shortcuts, goals, plan mode, questions, approvals, deliverables.
- A durable preference: the profile stores the choice as a `locale` row with
  `config.preference: ru`, so the UI stays Russian in every new session and every new window.
- Terminology kept consistent by a written glossary (`GLOSSARY.md`) and a terminology audit tool,
  not by ad-hoc translations.
- A repeatable pipeline: corpus extraction from the running build, corpus merge, dictionary build,
  coverage check (placeholders, missing keys, identical values), bundle smoke test.

## Install

From a checkout (the path is the directory you placed this package in):

```powershell
# 1. install as a bundle of a profile
dsh plugin --profile web add "file:<path to this checkout>"

# 2. reload the page (a NEW loader row is picked up when the page's module table is built)
```

Hand-mounted setup, which is how the author runs it (the profile patch layer reloads live, so
dictionary edits reach the browser without restarting the host):

```powershell
# 1. the profile sees the package as a file: dependency
#    $DSH_HOME/profiles/<profile>/package.json
#    "dsh-locale-ru": "file:<path to this checkout>"

# 2. live link into the profile's node_modules (edits stay live, no reinstall)
#    New-Item -ItemType Junction -Path "$DSH_HOME/profiles/<profile>/node_modules/dsh-locale-ru" -Target "<path to this checkout>"

# 3. loader row:  $DSH_HOME/profiles/<profile>/cordis.patch.yml
#    - insert:
#        - id: locale-ru
#          name: dsh-locale-ru
```

Detailed install, restart and rollback procedures: [INSTALL.md](INSTALL.md) (in Russian — the
author's own step-by-step log).

## Choosing the language

**Settings → General → Language → Русский.** The switch is immediate. The choice is stored in the
profile as a `locale` row:

```yaml
# $DSH_HOME/profiles/<profile>/cordis.patch.yml
- id: locale
  name: '@deepseek-ai/dsh-client-locale'
  config:
    preference: ru
```

Without that row the language follows the browser's own preference, and the pack simply shows up as
an option in the picker.

## How it works

```
dict/ru/*.json     dictionaries: namespace -> { key: Russian text }   (source of truth)
lib/client.js      generated bundle (window.__ModuleLoader__.load)
index.js           host half of the plugin (empty — registration happens in the browser)
cordis.patch.yml   profile layer: mounts the package as a loader row
scripts/           build · check · extract · merge-corpus · compose
tools/             smoke · scanner-repro · terms · apply-qa · polish · verify-live · audit-public
work/en/*.json     English corpus captured from a running build (the reference for the check)
work/qa-report.md  proof-reading log (78 findings, applied)
GLOSSARY.md        terminology contract
```

The browser half calls the official registry once, with the dictionaries it ships:

```js
ctx.locale.addLanguage({ id: 'ru', label: 'Русский', fallback: 'en' })
ctx.locale.register('chat', { en: enDict, ru: ruDict })   // or register(ns, 'ru', dict)
```

Nothing else is touched: the language catalog, the preference and the fallback chain belong to
`@deepseek-ai/dsh-client-locale`, so an upstream update cannot conflict with this pack — at worst it
adds keys, which show up in English until they are translated here.

## Verify it yourself

```powershell
# 1. syntax of both halves
node --check index.js && node --check lib/client.js

# 2. rebuild the bundle from dict/ru
node scripts/build.mjs

# 3. coverage gate: every English key present, placeholders intact, no empty values,
#    no value identical to English unless it is a product name or a URL
node scripts/check.mjs
node scripts/check.mjs --strict     # non-zero exit on findings

# 4. run the bundle through a mock module loader and a mock ctx.locale
node tools/smoke.mjs .

# 5. the profile row as the client-modules scanner sees it
node tools/scanner-repro.mjs

# 6. terminology audit against GLOSSARY.md
node tools/terms.mjs dict/ru

# 7. the pre-publish gate: no personal data anywhere, and no risky API in the payload
node tools/audit-public.mjs
```

`scanner-repro` and `verify-live` discover the installation and the profile directory themselves;
they can be pointed elsewhere with `DSH_INSTALL`, `DSH_PROFILE_DIR`, `DSH_HOME`, `DSH_PACKAGE_DIR`.

Refreshing the corpus when DSH adds strings:

```powershell
node scripts/extract.mjs <node_modules/@deepseek-ai> work   # capture a new corpus
node scripts/merge-corpus.mjs .                             # merge the English sources into work/en
# translate the new keys in dict/ru, then:
node scripts/build.mjs; node scripts/check.mjs --strict
```

## Security and privacy

- **No network, no storage, no injection in the payload.** The published payload is `index.js`,
  `lib/client.js`, `cordis.patch.yml`, `package.json` and `dict/**` — data plus one registry call.
  `tools/audit-public.mjs` fails the release if the payload ever gains `fetch`, `XMLHttpRequest`,
  `WebSocket`, `EventSource`, `sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`,
  `document.cookie`, `navigator.clipboard`, `eval`, `new Function`, `document.write`,
  `.innerHTML =`, `dangerouslySetInnerHTML` or a dynamic `import()`.
- **The dictionaries contain UI text only.** No telemetry, no identifier, nothing about the machine
  the pack runs on.
- **The host half is empty.** `index.js` exports a name and an `apply()` that does nothing, so
  mounting the pack cannot change host behaviour.
- **Nothing upstream is modified.** The pack is a client of the public locale registry; it never
  writes into the installation or into `node_modules`.
- The repository is scanned for personal paths, e-mail addresses, tokens and keys before every
  publish; findings are printed redacted and fail the run.

## Compatibility

- DeepSeek Harness client `0.2.0-rc.2`: verified live (the installed desktop app and a `dsh web`
  host), 54 namespaces.
- The locale registry contract used here is unchanged between `0.1.5` and `0.2.0`
  (`addLanguage` and both `register` forms), so older clients work with the same bundle.
- Node 22+ for the tooling; nothing beyond the client itself is needed at runtime.
- Language selection moved between versions: `0.1.5` kept it in `~/.dsh/settings.yaml`, `0.2.0`
  keeps it in the profile patch (`- id: locale`, `config.preference`). The pack does not care — it
  only adds the language, the preference stays owned by the registry's own settings page.

## What stays English

This is upstream behaviour, not a gap in the dictionaries:

- built-in tool names and the `IN`/`OUT`, `diff`, `JSON`, `PDF`, `HTTP`, `TTFT` labels, slash
  commands (`/plan`, `/compact`);
- application names in "Open in…" (VS Code, Cursor, Finder…) — product names;
- identifiers, paths, file names, model and provider names;
- anything the model itself writes.

`scripts/check.mjs --strict` reports these as `IDENTICAL` and exits `0`; the current corpus has 92 of
them, all product names, separators, URLs and command names.

## Limitations

- **A pack, not a fork.** A key added by a newer client shows up in English until it is translated
  here; the fallback chain is what keeps the UI readable in the meantime.
- **Russian only.** The bundle carries one target language; a second language would be a separate
  pack with its own dictionaries.
- **Corpus-driven.** `work/en/*.json` is captured from a specific build; after a client update run
  `scripts/extract.mjs` and `scripts/merge-corpus.mjs` before trusting the coverage number.
- **One key is intentionally absent** from `dict/ru`: `chat/message.stepProcess.sharedPrefix` has an
  empty English value, the bundle builder rejects empty strings, and the `ru → en` chain returns the
  empty string anyway. Both `scripts/check.mjs` and `tools/smoke.mjs` know this rule.
- Namespaces that only exist in the desktop bundles (`agent-team`, `directory-browser`,
  `schedule.catalog`) are shipped ahead of time; on a profile without those bundles they are simply
  unused.

## License

MIT — see [LICENSE](LICENSE).

## По-русски, коротко

Это русский язык для веб-интерфейса DeepSeek Harness: плагин добавляет **Русский** в
**Settings → General → Language** и подключает 54 словаря (2158 строк из 2159 английских).
Ставится как обычный пакет профиля (`dsh plugin --profile web add "file:<путь>"`) или вручную —
`file:`-зависимость, junction в `node_modules` профиля и строка `insert` в его
`cordis.patch.yml`. Ничего в самой установке не патчится: язык и словари регистрируются через
штатный реестр локализации, непокрытые ключи показываются по-английски цепочкой `ru → en`.
Выбор языка — **Settings → General → Language → Русский**, хранится строкой `- id: locale`
с `config.preference: ru` в патче профиля. При обновлении клиента корпус снимается заново
(`scripts/extract.mjs`, `scripts/merge-corpus.mjs`), новые ключи переводятся, затем
`scripts/build.mjs` и `scripts/check.mjs --strict`. Лицензия MIT.
