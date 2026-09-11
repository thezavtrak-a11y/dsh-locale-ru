// One-off polish pass over dict/ru/*.json.
// Usage: node tools/polish.mjs <packageRoot>
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2]
const dir = path.join(root, 'dict', 'ru')

/** ns -> { key: newValue } */
const FIXES = {
  'settings.permission': {
    // The locale registry overrides these for the shell's own preset labels; the
    // English values would otherwise leak through into the picker.
    'preset.readOnly': 'Только чтение',
    'preset.workspaceWrite': 'Запись в рабочую папку',
    'preset.fullAccess': 'Полный доступ',
    loading: 'Загрузка…',
  },
  chat: {
    loadOlder: 'Загрузить более ранние',
    toBottom: 'К последнему',
  },
  common: {
    brandLocalBuild: undefined,
  },
}
delete FIXES.common.brandLocalBuild

let changed = 0
for (const [ns, fixes] of Object.entries(FIXES)) {
  const file = path.join(dir, `${ns}.json`)
  const dict = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const [key, value] of Object.entries(fixes)) {
    if (!(key in dict)) {
      console.log(`SKIP ${ns}/${key} — not in the dictionary`)
      continue
    }
    if (dict[key] === value) continue
    console.log(`FIX  ${ns}/${key}\n     ${dict[key]}\n  -> ${value}`)
    dict[key] = value
    changed++
  }
  fs.writeFileSync(file, JSON.stringify(dict, null, 2) + '\n')
}
console.log(`\npolish: ${changed} values updated`)
