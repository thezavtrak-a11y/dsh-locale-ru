// Glossary consistency audit over the composed Russian dictionaries.
// Usage: node terms.mjs <dictRoot>
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2]
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))

/** term -> regex that a translation must match when the English side matches `when`. */
const RULES = [
  { en: /\bsession/i, ok: /сесси/i, bad: /сеанс|заняти/i, label: 'session -> сессия' },
  { en: /\bworkspace/i, ok: /рабоч(ая|ей|ую) папк|рабочий каталог|рабочей папк/i, bad: /воркспейс|рабочее пространство/i, label: 'workspace -> рабочая папка' },
  { en: /\bsub-?agent/i, ok: /субагент/i, bad: /суб-агент|подчин/i, label: 'subagent -> субагент' },
  { en: /\bskill/i, ok: /навык/i, bad: /скилл/i, label: 'skill -> навык' },
  { en: /\btool\b/i, ok: /инструмент/i, bad: /\bтул/i, label: 'tool -> инструмент' },
  { en: /\bapproval|approve/i, ok: /подтвержд|одобр/i, bad: null, label: 'approval -> подтверждение' },
  { en: /\bcompaction|compact/i, ok: /сжат|компакц/i, bad: null, label: 'compaction -> сжатие' },
  { en: /\bworkflow/i, ok: /сценари|воркфлоу/i, bad: null, label: 'workflow -> сценарий' },
  { en: /\bcontext\b/i, ok: /контекст/i, bad: null, label: 'context -> контекст' },
  { en: /\bturn\b/i, ok: /ход/i, bad: /оборот|поворот/i, label: 'turn -> ход' },
]

const findings = []
for (const file of files) {
  const ns = file.replace(/\.json$/, '')
  const ru = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
  for (const [key, value] of Object.entries(ru)) {
    if (typeof value !== 'string') continue
    findings.push({ ns, key, value })
  }
}
console.log(`terms: ${findings.length} translated strings in ${files.length} namespaces`)
console.log('note: this audit prints candidate strings per rule; review them, it does not fail the build.\n')

for (const rule of RULES) {
  const hits = findings.filter((f) => rule.en.test(f.key) || rule.en.test(f.value))
  const violations = rule.bad ? hits.filter((f) => rule.bad.test(f.value)) : []
  console.log(`${rule.label}: ${hits.length} strings${violations.length ? `  VIOLATIONS: ${violations.length}` : ''}`)
  for (const v of violations.slice(0, 10)) console.log(`    ${v.ns}/${v.key} = ${v.value}`)
}
