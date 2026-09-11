# dsh-locale-ru

Русский язык для web-интерфейса **DeepSeek Harness** — клиентский плагин,
который добавляет **Русский (ru)** в список языков
(**Settings → General → Language**).

Пакет не патчит ни код DSH, ни `node_modules`: он регистрируется через штатный
реестр локализации DSH (`@deepseek-ai/dsh-client-locale`) — добавляет язык в
каталог и подключает словари по namespace. Непокрытые ключи автоматически
показываются по-английски встроенной цепочкой `ru → en`.

| | |
|---|---|
| namespace | 43 |
| переведённых строк | 1292 (100 % корпуса) |
| fallback | `ru → en` (штатный механизм DSH) |
| проверено на | DSH 0.1.5-rc.1 (CLI) / пакеты `@deepseek-ai/*` 0.1.5-rc.2, Node 24 |

## Установка

Из корня этого репозитория (путь к пакету — тот каталог, в котором вы его разместили):

```powershell
dsh plugin --profile web add "file:$PWD"
```

Затем перезапустить GUI. Подробности, процедура перезапуска и откат —
в [INSTALL.md](INSTALL.md).

## Выбор языка

**Settings → General → Language → Русский.** Переключение мгновенное, без
перезагрузки страницы; выбор хранится в `~\.dsh\settings.yaml` (секция `locale`).

## Устройство

```
dict/ru/*.json     словари: namespace → { ключ: русский текст }  (источник правды)
lib/client.js      сгенерированный бандл (window.__ModuleLoader__.load)
index.js           host-половина плагина (пустая — регистрация идёт в браузере)
cordis.patch.yml   слой профиля: монтирует плагин как строку лоадера
scripts/           build · check · extract · merge-corpus · compose
tools/             smoke · scanner-repro · terms · apply-qa · polish · verify-live
work/en/*.json     английский корпус, снятый с этого рантайма (эталон сверки)
work/qa-report.md  вычитка перевода (78 находок, применены)
GLOSSARY.md        контракт терминологии
```

## Сборка и проверки

```powershell
node scripts/build.mjs            # dict/ru/*.json -> lib/client.js
node scripts/check.mjs            # сверка с work/en: покрытие, ключи, плейсхолдеры
node scripts/check.mjs --strict   # то же, но с ненулевым кодом на проблемах
node tools/smoke.mjs .            # прогон бандла через мок-загрузчик и мок ctx.locale
node tools/scanner-repro.mjs      # строка профиля глазами сканера клиентских плагинов
node tools/terms.mjs dict/ru      # аудит терминологии по GLOSSARY.md
```

`scanner-repro` и `verify-live` сами находят установку dsh и каталог профиля;
переопределяются переменными `DSH_INSTALL`, `DSH_PROFILE_DIR`, `DSH_HOME`,
`DSH_PACKAGE_DIR`.

Обновление корпуса, когда DSH добавит строки:

```powershell
node scripts/extract.mjs  <node_modules/@deepseek-ai> work   # снять новый корпус
node scripts/merge-corpus.mjs .                              # свести en-источники в work/en
# перевести новые ключи в dict/ru, затем:
node scripts/build.mjs; node scripts/check.mjs --strict
```

## Что остаётся английским

Это ограничение апстрима, а не пропуски в словарях:

- имена встроенных инструментов и метки `IN`/`OUT`, `diff`, `JSON`, `PDF`,
  `HTTP`, `TTFT`, названия команд (`/plan`, `/compact`);
- названия приложений в «Открыть в…» (VS Code, Cursor, Finder…) — имена продуктов;
- идентификаторы, пути, имена файлов, названия моделей и провайдеров;
- текст, который пишет сама модель.

## Лицензия

MIT.
