// Apply the QA review (work/qa-report.md) to dict/ru/*.json.
// Values only: keys, key counts and namespace names never change.
// Usage: node tools/apply-qa.mjs <packageRoot>
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2]
const dir = path.join(root, 'dict', 'ru')

/** namespace (as the report prints it) -> { fullKey: newValue } */
const table = [
  // chat
  ['chat', 'chat.message.systemPrompt', 'Системный промпт'],
  ['chat', 'chat.message.systemPromptUpdate', 'Обновление системного промпта'],
  ['chat', 'chat.message.referenceSummary', 'Ссылка на сессию · {labels}'],
  ['chat', 'chat.message.contextRecall', 'Память сессии'],
  ['chat', 'chat.message.contextInjection', 'Добавление контекста'],
  ['chat', 'chat.message.turnProcess.thoughtForAWhile', 'Размышлял'],
  ['chat', 'chat.message.turnUsage.reasoning', ' ({tokens} на рассуждения)'],
  ['chat', 'chat.settings.transcript.compact', 'Сжатый'],
  ['chat', 'chat.message.tokensPerSecond', '{tps} ток./с'],
  ['chat', 'chat.message.turnUsage.count', '{count} ток.'],
  ['chat', 'chat.duration.compactMinutes', '{minutes} мин {seconds} с'],
  ['chat', 'chat.duration.compactSeconds', '{seconds} с'],
  ['chat', 'chat.duration.seconds', '{seconds} с'],
  ['chat', 'chat.duration.milliseconds', '{milliseconds} мс'],
  // command / common
  ['command', 'command.description.compact', 'Сжать старую историю диалога'],
  ['common', 'common.number.thousand', '{value} тыс.'],
  ['common', 'common.number.million', '{value} млн'],
  // conversation
  ['conversation', 'conversation.settings.enter.steer', 'Направить'],
  ['conversation', 'conversation.tool.title.webFetch', 'Получение'],
  ['conversation', 'conversation.placeholder.parentOffline', 'Родительская сессия недоступна; отправка невозможна, но запуск можно остановить'],
  // model
  ['model', 'model.menu.aria', 'Модель и уровень рассуждений'],
  ['model', 'model.trigger.ariaEffort', 'Выбрать модель, текущая {model}, уровень рассуждений {effort}'],
  ['model', 'model.empty.efforts', 'У этой модели нет уровней рассуждений.'],
  ['model', 'model.option.deepseekV4Pro.description', 'Подходит для сложных и требовательных к качеству задач при более высокой стоимости.'],
  ['model', 'model.action.reload', 'Перезагрузить'],
  // settings.models
  ['settings.models', 'settings.models.modelAdvanced', 'Характеристики'],
  ['settings.models', 'settings.models.modelCapacityInvalid', 'Значение должно быть числом, при необходимости с суффиксом K или M.'],
  ['settings.models', 'settings.models.baseUrlDefault', 'Значение провайдера'],
  ['settings.models', 'settings.models.modelsEmpty', 'В списке выбора не будет ни одной модели. Модели, которых нет в списке, всё равно можно запрашивать напрямую.'],
  ['settings.models', 'settings.models.welcomeBody', 'опираясь на открытую, переиспользуемую и компонуемую инфраструктуру с открытым исходным кодом.'],
  // settings.agentPreset
  ['settings.agentPreset', 'settings.agentPreset.idInvalid', 'Используйте строчные буквы, цифры и дефисы; первый символ — буква или цифра.'],
  ['settings.agentPreset', 'settings.agentPreset.deleteDescription', 'Сессии, уже запущенные на нём, продолжат работу; новые сессии не смогут его выбрать.'],
  // settings.pluginInventory
  ['settings.pluginInventory', 'settings.pluginInventory.matchesInOtherPresets', 'Совпадений в других профилях: {count} — '],
  ['settings.pluginInventory', 'settings.pluginInventory.condition', 'Условие отключения'],
  ['settings.pluginInventory', 'settings.pluginInventory.fromPreset', 'Из профиля'],
  ['settings.pluginInventory', 'settings.pluginInventory.failedCountLabel', 'не удалось'],
  // settings.plugins
  ['settings.plugins', 'settings.plugins.reset', 'Вернуть по умолчанию'],
  ['settings.plugins', 'settings.plugins.webSearchBaseUrl', 'Адрес'],
  ['settings.plugins', 'settings.plugins.subagentModelSelectionOff', 'Субагенты используют заданные по умолчанию значения или наследуют модель родительского агента. Сохранённые варианты моделей остаются.'],
  ['settings.plugins', 'settings.plugins.subagentModelSelectionEmpty', 'Ни один провайдер сейчас не сообщает о моделях.'],
  ['settings.plugins', 'settings.plugins.webSearchMaxUsesHint', 'Сколько раз запрос может выполнить поиск, прежде чем обязан ответить.'],
  ['settings.plugins', 'settings.plugins.webSearchApiKeyUnset', 'Ключ не настроен; без него поиск недоступен.'],
  // session-log-download
  ['session-log-download', 'session-log-download.dialog.successTitle', 'Скачивание сессии начато'],
  // deliverables
  ['deliverables', 'deliverables.presented.directory', 'Открыть папку с файлом'],
  ['deliverables', 'deliverables.presented.directoryError', 'Не удалось открыть папку с файлом. Повторите попытку.'],
  ['deliverables', 'deliverables.presented.directoryOpening', 'Открытие папки с файлом…'],
  ['deliverables', 'deliverables.presented.directoryOpened', 'Запрошено открытие папки с файлом'],
  ['deliverables', 'deliverables.row.inspect', 'Подробнее о вызове'],
  // cordis / agent-team
  ['cordis', 'cordis.action.inspect', 'Подробнее'],
  ['agent-team', 'agent-team.memberStatus.idle', 'Бездействие'],
  ['agent-team', 'agent-team.blockedBy', 'Заблокировано из-за'],
  // workspace
  ['workspace', 'workspace.status.idle', 'Бездействие'],
  ['workspace', 'workspace.actions.session.aria', 'Действия с сессией {name}'],
  ['workspace', 'workspace.actions.workspace.aria', 'Действия с рабочей папкой {name}'],
  ['workspace', 'workspace.time.days', '{n} дн'],
  ['workspace', 'workspace.time.months', '{n} мес'],
  ['workspace', 'workspace.time.years', '{n} г'],
  // trajectory
  ['trajectory', 'trajectory.column.think', 'Рассуждение'],
  ['trajectory', 'trajectory.tab.usage', 'Расход'],
  ['trajectory', 'trajectory.timing.usageUnavailable', 'Расход недоступен'],
  ['trajectory', 'trajectory.timing.durationTooShort', 'Слишком короткая длительность'],
  ['trajectory', 'trajectory.toolbar.useEqualWidth', 'Одинаковая ширина операций'],
  ['trajectory', 'trajectory.timeline.overviewAria', 'Обзор хронологии; перетаскивайте по горизонтали, чтобы сфокусироваться на событиях'],
  ['trajectory', 'trajectory.tab.raw', 'Исходные данные'],
  ['trajectory', 'trajectory.timing.throughput', 'Скорость'],
  // subagent
  ['subagent', 'subagent.tokens.total', '{value} ток.'],
  ['subagent', 'subagent.mode.continuable', 'с возможностью продолжения'],
  ['subagent', 'subagent.duration.minutes', '{minutes} мин {seconds} с'],
  ['subagent', 'subagent.duration.hours', '{hours} ч {minutes} мин {seconds} с'],
  // schedule.catalog
  ['schedule.catalog', 'schedule.catalog.trigger.other', '{count} напоминаний'],
  ['schedule.catalog', 'schedule.catalog.relative.now', 'Сейчас'],
  // settings
  ['settings', 'settings.connection.connecting', 'Переподключение…'],
  ['settings', 'settings.connection.restart', 'Переподключение выполняется автоматически; подключиться сейчас'],
  ['settings', 'settings.connection.reconnect', 'Отключено; подключиться сейчас'],
]

let applied = 0
const skipped = []
const byNs = new Map()
for (const [ns, printedKey, value] of table) {
  // Dictionaries differ: some keep "<namespace>.<rest>" (chat, common,
  // conversation), others the bare feature key (model, workspace, trajectory).
  // Try the stripped form first and fall back to the printed key verbatim.
  const stripped = printedKey.startsWith(`${ns}.`) ? printedKey.slice(ns.length + 1) : printedKey
  if (!byNs.has(ns)) byNs.set(ns, [])
  byNs.get(ns).push([stripped, printedKey, value])
}

for (const [ns, entries] of byNs) {
  const file = path.join(dir, `${ns}.json`)
  if (!fs.existsSync(file)) { skipped.push(`${ns} (no file)`); continue }
  const dict = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const [stripped, printed, value] of entries) {
    const key = stripped in dict ? stripped : printed in dict ? printed : null
    if (key === null) { skipped.push(`${ns}/${printed}`); continue }
    if (dict[key] === value) continue
    dict[key] = value
    applied++
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + '\n')
}
console.log(`apply-qa: ${applied} values updated across ${byNs.size} namespaces`)
if (skipped.length) console.log(`apply-qa: skipped ${skipped.length}: ${skipped.join(', ')}`)
