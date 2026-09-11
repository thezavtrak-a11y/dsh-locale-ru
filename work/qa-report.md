# QA-отчёт по русскому переводу DSH Web UI

Дата: ревизия файлов `C:\Users\zavtr\.dsh\locale-ru\dict\ru\*.json` (43 namespace, 1292 ключа)
против эталона `C:\Users\zavtr\.dsh\locale-ru\work\en\*.json` и `GLOSSARY.md`.

## Сводка автопроверок (машинные)

| Проверка | Результат |
|---|---|
| Совпадение набора ключей RU ↔ EN (43 файла) | **расхождений нет** (0 missing / 0 extra) |
| Потеря/порча плейсхолдеров `{name}`, `{count}`, `{message}`, `{n}`… | **не найдено ни одного потерянного плейсхолдера**; единственная строка с перестановкой — `settings.pluginInventory:matchesInOtherPresets` (см. таблицу) |
| Потеря разделителей `{m}/{d}`, ` · `, `×{count}`, `+` | не найдено (все диффы разделителей — это `;`→`—` и «ёлочки» вместо `“ ”`, что допустимо) |
| Строки без кириллицы | 58, из них мусорных **3** — `settings.permission:preset.readOnly / workspaceWrite / fullAccess` (остальные — имена приложений, форматы, `JSON`/`PDF`/`HTTP`/`TTFT`, `/plan`, `Diff`, `Tab`, `Bash/Glob/Grep/Pwsh`) |

## Предлагаемые исправления

| namespace | ключ | текущий RU | предлагаемый RU | причина (кратко) |
|---|---|---|---|---|
| settings.permission | preset.readOnly | Read Only | Только чтение | не переведено; в `permission.access` и `conversation` тот же EN переведён («Только чтение») |
| settings.permission | preset.workspaceWrite | Workspace Write | Запись в рабочую папку | то же; видно в списке «режим доступа по умолчанию» |
| settings.permission | preset.fullAccess | Full access | Полный доступ | то же; перевод есть в двух других namespace |
| chat | message.systemPrompt | Системная инструкция | Системный промпт | EN «System prompt» переведён в 7 местах как «системный промпт» и лишь здесь иначе |
| chat | message.systemPromptUpdate | Обновление системной инструкции | Обновление системного промпта | то же расхождение |
| chat | chat.loadOlder | Загрузить раньше | Загрузить более ранние | «Загрузить раньше» — обрубленная калька «Load earlier» (ср. `trajectory:history.loadEarlier`) |
| chat | message.referenceSummary | Сессия в ссылке · {labels} | Ссылка на сессию · {labels} | «сессия в ссылке» — калька «Referenced session», читается криво |
| chat | message.contextRecall | Воспоминание сессии | Память сессии | EN «Session recall»; «воспоминание сессии» звучит как мемуары |
| chat | message.contextInjection | Внедрение контекста | Добавление контекста | «внедрение» = implementation, для injection в UI лучше «добавление» |
| chat | message.turnProcess.thoughtForAWhile | Думал некоторое время | Размышлял | канцелярит; EN «Thought for a while» — короткая подпись |
| chat | message.turnUsage.reasoning |  ({tokens} рассуждение) |  ({tokens} на рассуждения) | нет согласования с числом («1536 рассуждение») |
| chat | settings.transcript.compact | Компактный | Сжатый | это режим показа процесса (сжатие), «компактный» — про размер (ср. глоссарий: compaction → сжатие) |
| chat | message.tokensPerSecond | {tps} ток/с | {tps} ток./с | единицы не совпадают с `trajectory:unit.tokensPerSecond` («ток./с») |
| chat | message.turnUsage.count | {count} ток | {count} ток. | та же единица в трёх видах: «ток», «ток.», «токенов» |
| chat | duration.compactMinutes | {minutes}м{seconds}с | {minutes}мин{seconds}с | «м» читается как метры; в `job`/`subagent` минута = «мин» |
| chat | duration.seconds | {seconds}с | {seconds} с | нет пробела, тогда как `job:duration.seconds` → «{seconds} с» |
| chat | duration.compactSeconds | {seconds}с | {seconds} с | то же |
| chat | duration.milliseconds | {milliseconds}мс | {milliseconds} мс | нет пробела, тогда как `trajectory:unit.milliseconds` → «{value} мс» |
| command | description.compact | Сжать старую историю переписки | Сжать старую историю диалога | «переписка» — про письма; в остальном UI — «диалог» |
| common | number.thousand | {value}K | {value} тыс. | то же сокращение в `subagent:tokens.thousand` уже переведено «тыс.» |
| common | number.million | {value}M | {value} млн | то же; в `subagent:tokens.million` — «млн» |
| conversation | settings.enter.steer | Направление | Направить | все прочие «Steer» — «Направить…»; «Направление» читается как direction |
| conversation | tool.title.webFetch | Загрузка | Получение | «загрузка» по глоссарию = upload/download-upload; Fetch — это получение страницы |
| conversation | placeholder.parentOffline | Родительская сессия офлайн; отправка недоступна, но запуск можно остановить | Родительская сессия недоступна; отправка невозможна, но запуск можно остановить | «офлайн» + повтор «недоступна… недоступна»; ср. `subagent:readonly.body` — «недоступна» |
| model | menu.aria | Модель и усилие рассуждения | Модель и уровень рассуждений | «усилие рассуждения» — калька; в `settings.plugins` уже «уровень рассуждений» |
| model | trigger.ariaEffort | Выбрать модель, текущая {model}, усилие рассуждения {effort} | Выбрать модель, текущая {model}, уровень рассуждений {effort} | то же расхождение |
| model | empty.efforts | У этой модели нет уровней усилия рассуждения. | У этой модели нет уровней рассуждений. | двойной родительный, неестественно |
| model | option.deepseekV4Pro.description | …подходит для сложных задач и задач, критичных к качеству, при более высокой стоимости. | …подходит для сложных и требовательных к качеству задач при более высокой стоимости. | повтор «задач … задач» |
| model | action.reload | Обновить | Перезагрузить | тот же EN «Reload» в `sidebarFiles`/`sidebarDocumentPreview` — «Перезагрузить» |
| settings.models | modelAdvanced | Ёмкости | Характеристики | capacity здесь = context window / max output tokens; «ёмкости» — ложная калька |
| settings.models | modelCapacityInvalid | Ёмкость должна быть числом, при желании с суффиксом K или M. | Значение должно быть числом, при необходимости с суффиксом K или M. | «при желании» — калька «optionally»; «ёмкость» неверна по смыслу |
| settings.models | baseUrlDefault | По умолчанию у провайдера | Значение провайдера | рваная фраза; рядом `contextWindowPlaceholder` — «Используется значение провайдера по умолчанию» |
| settings.models | modelsEmpty | В списке выбора не будет ни одной модели. Не указанные в списке id всё равно можно отправлять напрямую. | В списке выбора не будет ни одной модели. Модели, которых нет в списке, всё равно можно запрашивать напрямую. | «не указанные в списке… отправлять» — тяжёлая калька |
| settings.models | welcomeBody | …опираясь на открытую, открыто доступную, переиспользуемую и компонуемую инфраструктуру. | …опираясь на открытую, переиспользуемую и компонуемую инфраструктуру с открытым исходным кодом. | «открытую, открыто доступную» — повтор, потерян смысл «open-source» |
| settings.agentPreset | idInvalid | Используйте строчные буквы, цифры и дефисы; начинать с буквы или цифры. | Используйте строчные буквы, цифры и дефисы; первый символ — буква или цифра. | вторая часть — инфинитив при императиве, рассогласование |
| settings.agentPreset | deleteDescription | …Сессии, уже работающие на нём, продолжат работу; новые сессии не смогут его выбрать. | …Сессии, уже запущенные на нём, продолжат работу; новые сессии не смогут его выбрать. | «работающие … работу» — повтор |
| settings.pluginInventory | matchesInOtherPresets | Ещё совпадений в других профилях: {count} —  | {count} совпадений в других профилях:  | {count} переставлен в конец, добавлено «— »; строка открывает список (после неё дописываются названия) |
| settings.pluginInventory | condition | Отключён при | Условие отключения | обрубленный лейбл перед выражением (EN «Disabled when») |
| settings.pluginInventory | fromPreset | Из | Из профиля | «Из» без объекта — обрублено (EN «From» + имя профиля) |
| settings.pluginInventory | failedCountLabel | с ошибкой | не удалось | расходится с `failedTag` («Не удалось») и `failed` («Не удалось запустить») в том же файле |
| settings.plugins | reset | Сбросить по умолчанию | Вернуть по умолчанию | «сбросить по умолчанию» — калька «Reset to default» |
| settings.plugins | webSearchBaseUrl | Эндпоинт | Адрес | жаргон; в `settings.models` тот же смысл — «базовый URL» |
| settings.plugins | subagentModelSelectionOff | Субагенты используют заданные по умолчанию значения или наследуют модель родительского агента. Сохранённые варианты моделей сохраняются. | Субагенты используют заданные по умолчанию значения или наследуют модель родительского агента. Сохранённые варианты моделей остаются. | «сохранённые … сохраняются» — тавтология |
| settings.plugins | subagentModelSelectionEmpty | Ни один провайдер моделей сейчас не предлагает модели. | Ни один провайдер сейчас не сообщает о моделях. | «провайдер моделей … модели» — повтор; EN «advertises» |
| settings.plugins | webSearchMaxUsesHint | Сколько раз один запрос может искать, прежде чем должен ответить. | Сколько раз запрос может выполнить поиск, прежде чем обязан ответить. | «может искать … должен ответить» — рваная фраза |
| settings.plugins | webSearchApiKeyUnset | Ключ не настроен; поиск недоступен, пока его нет. | Ключ не настроен; без него поиск недоступен. | «пока его нет» — тяжело и двусмысленно |
| session-log-download | dialog.successTitle | Загрузка сессии начата | Скачивание сессии начато | download по глоссарию → «скачать»; «загрузка» читается как upload/load |
| deliverables | presented.directory | Открыть содержащую папку | Открыть папку с файлом | «содержащая папка» — калька «containing folder» (в UI ещё 3 такие строки) |
| deliverables | presented.directoryError | Не удалось открыть содержащую папку. Повторите попытку. | Не удалось открыть папку с файлом. Повторите попытку. | то же |
| deliverables | presented.directoryOpening | Открытие содержащей папки… | Открытие папки с файлом… | то же |
| deliverables | presented.directoryOpened | Запрошено открытие содержащей папки | Запрошено открытие папки с файлом | то же |
| deliverables | row.inspect | Изучить вызов | Подробнее о вызове | в `skill:row.inspect` то же действие — «Подробнее» |
| cordis | action.inspect | Изучить | Подробнее | то же действие «Inspect» в трёх namespace переведено тремя способами |
| agent-team | memberStatus.idle | Простой | Бездействие | «простой» — омоним прилагательного «простой»; EN «Idle» |
| agent-team | blockedBy | Заблокировано | Заблокировано из-за | лейбл перед списком id (EN «Blocked by») |
| workspace | status.idle | Простой | Бездействие | то же; видно в списке сессий боковой панели |
| workspace | actions.session.aria | Действия с сессией для {name} | Действия с сессией {name} | лишнее «для» — калька «actions for {name}» |
| workspace | actions.workspace.aria | Действия с рабочей папкой для {name} | Действия с рабочей папкой {name} | то же |
| workspace | time.days | {n} дн. | {n} дн | точка не используется в `reference:time.days` и `subagent:duration.days` |
| workspace | time.months | {n} мес. | {n} мес | то же (`reference:time.months` — «{n} мес») |
| workspace | time.years | {n} г. | {n} г | то же (`reference:time.years` — «{n} г») |
| trajectory | column.think | Размышление | Рассуждение | EN Think/Thinking/Reasoning переведены как «Думать», «Размышление», «Рассуждение» |
| trajectory | tab.usage | Использование | Расход | в чате Usage = «Расход за ход», «Расход токенов»; «Использование» — калька |
| trajectory | timing.usageUnavailable | Использование недоступно | Расход недоступен | то же |
| trajectory | timing.durationTooShort | Слишком маленькая длительность | Слишком короткая длительность | «маленькая длительность» — неестественно |
| trajectory | toolbar.useEqualWidth | Операции одинаковой ширины | Одинаковая ширина операций | рядом кнопка «Использовать фактическую длительность» — императив, здесь существительное-назывное |
| trajectory | timeline.overviewAria | Обзор хронологии; перетаскивайте по горизонтали, чтобы приблизить события | Обзор хронологии; перетаскивайте по горизонтали, чтобы сфокусироваться на событиях | «focus events» ≠ «приблизить» (это zoom) |
| trajectory | tab.raw | Исходное | Исходные данные | рассогласование с `tab.rawOutput` («Исходный вывод») при одинаковом EN Raw |
| trajectory | timing.throughput | Пропускная способность | Скорость | в таблице таймингов это токены/с; «пропускная способность» уводит смысл |
| subagent | tokens.total | {value} токенов | {value} ток. | единицы токенов в трёх видах («ток», «ток.», «токенов») |
| subagent | mode.continuable | продолжаемый | с возможностью продолжения | «продолжаемый» — неудачное словообразование (EN «continuable») |
| subagent | duration.minutes | {minutes} м {seconds} с | {minutes} мин {seconds} с | «м» путается с метрами; в `job` минуты — «мин» |
| subagent | duration.hours | {hours} ч {minutes} м {seconds} с | {hours} ч {minutes} мин {seconds} с | то же |
| schedule.catalog | trigger.other | напоминаний: {count} | {count} напоминаний | порядок расходится с `trigger.one` («{count} напоминание») |
| schedule.catalog | relative.now | Пора | Сейчас | EN «Due now»; «Пора» — разговорно и вне контекста непонятно |
| settings | connection.connecting | Переподключение | Переподключение… | это статус соединения, существительное без процесса читается как заголовок |
| settings | connection.restart | Переподключение автоматически, переподключиться сейчас | Переподключение выполняется автоматически; подключиться сейчас | рваная фраза + дубль «переподключ…» |
| settings | connection.reconnect | Отключено, переподключиться сейчас | Отключено; подключиться сейчас | запятая между независимыми частями; «переподключиться сейчас» дублирует `connection.retry` |

## Спорные, но оставлены как есть

- `settings.models:modelId` / `customRoute` / `modelIdDuplicate` / `modelIdRequired` / `modelDuplicate` / `customRouteTaken` / `modelNamePlaceholder` — «id модели», «id провайдера» строчными: глоссарий прямо требует не переводить `id`, хотя в начале лейбла привычнее `ID`. Менять не стал — формально соответствует глоссарию.
- `common:number.thousand` / `number.million` — оставлены как `M`/`K` в таблице исправлений, но это же решение принято в `subagent` как «млн»/«тыс.»; если решите, что латинские M/K уместнее везде, уберите 2 строки из таблицы, а не правьте `subagent`.
- `agent-team:trigger` — «Панель команды» вместо EN «Agent Team»: похоже на название панели/продукта, но перевод осмысленный; оставил.
- `chat:message.unknownSurface` — «Неизвестное событие поверхности»: буквальный «surface» из внутреннего протокола DSH, русского эквивалента нет.
- `conversation:tool.title.edit` / `goal:action.cancel` — «Правка» против `common:edit` → «Изменить»: для diff-инструмента «Правка» нормально, тронул бы только ради формального единообразия.
- `trajectory:request.labelCompaction`, `trajectory:source.goalRound`, `trajectory:timeline.ttftDecoding` — строчная буква после разделителя « · » («Запрос #3 · сжатие»), тогда как в чате после « · » обычно прописная. Единого правила нет, поэтому не менял.
- `trajectory:details.status` («Статус») против `settings.pluginInventory:runtime` («Состояние») при одном EN «Status» — оба варианта живые; менять стоит только вместе с решением по всему UI.
- `trajectory:record.noPayload` / `noResult` — «Данные не захвачены» / «Результат не захвачен»: смешение числа, но смысл сохранён.
- `common:previous` («Предыдущий») при `common:next` («Далее») — «Предыдущий» не режет слух, а «Назад» занято `common:back`.
- Форматы дат/чисел (`chat:clock.*`, `workspace:date.ymd`, `reference:time.*` без точек), имена приложений в `open-in-app`, технические токены (`JSON`, `PDF`, `HTTP`, `TTFT`, `Diff`, `Tab`, `Bash/Glob/Grep/Pwsh`, `/plan`, `compact`) — оставлены по правилам задачи.
- `chat:command.failed` → «Команда не удалась» — формально калька «Command failed», но согласуется со глоссарием («failed» → «не удалось»).

Проверены все 43 namespace; по `goal`, `job`, `question`, `plan`, `feedback`, `skill`, `slash.menu`, `open-in-app`, `sidebar*`, `directory-browser`, `document*`, `session-log-download` (кроме одной строки), `reference`, `workflowRun`, `permission.access`, `approval`, `settings.theme`, `settings.locale`, `settings.plugins`-мелочи правок не требуется — перевод там корректный и единообразный.

**Итого предложено исправлений: 78** (все — только значения; ключи, их число и состав namespace не менялись).
