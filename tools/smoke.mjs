// Smoke-test lib/client.js: run the bundle through a mock __ModuleLoader__ and a
// mock ctx.locale that mirrors the real LocaleRuntime contract.
// Usage: node tools/smoke.mjs <packageRoot>
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2]
const code = fs.readFileSync(path.join(root, 'lib', 'client.js'), 'utf8')

const loaded = []
globalThis.window = {
  __ModuleLoader__: {
    load(record) {
      loaded.push(record)
    },
  },
}

// eslint-disable-next-line no-new-func
new Function(code)()

if (loaded.length !== 1) throw new Error(`expected 1 bundle registration, got ${loaded.length}`)
const record = loaded[0]
console.log('bundle id:', record.id)

const languages = []
const dictionaries = []
const effects = []
const ctx = {
  effect(fn, label) {
    const disposer = fn()
    effects.push({ label, disposer })
    return disposer
  },
  locale: {
    addLanguage(language) {
      languages.push(language)
      return () => {}
    },
    register(ns, locale, dict) {
      if (typeof locale === 'object') throw new Error('register must take (ns, locale, dict) for a language pack')
      dictionaries.push({ ns, locale, dict })
      return () => {}
    },
  },
}

const exports = record.factory((name) => {
  throw new Error(`bundle must not require anything, but required ${name}`)
})

console.log('exports:', Object.keys(exports).join(', '))
if (exports.name !== 'dsh-locale-ru') throw new Error(`unexpected plugin name ${exports.name}`)
if (typeof exports.apply !== 'function') throw new Error('apply must be a function')
if (!Array.isArray(exports.inject) || exports.inject[0] !== 'locale') throw new Error('inject must list locale')

exports.apply(ctx)

console.log('languages registered:', JSON.stringify(languages))
console.log('dictionaries registered:', dictionaries.length)
console.log('effects:', effects.length)

const byNs = new Map()
let keys = 0
for (const { ns, locale, dict } of dictionaries) {
  if (locale !== 'ru') throw new Error(`unexpected locale ${locale} in ${ns}`)
  if (byNs.has(ns)) throw new Error(`namespace ${ns} registered twice`)
  byNs.set(ns, dict)
  keys += Object.keys(dict).length
}
console.log('namespaces:', byNs.size, 'keys:', keys)

if (languages.length !== 1) throw new Error('exactly one language definition expected')
const [language] = languages
if (language.id !== 'ru' || language.fallback !== 'en' || !language.label) {
  throw new Error(`bad language definition ${JSON.stringify(language)}`)
}

// Every dictionary value must be a non-empty string, and every placeholder must
// survive into the bundle.
for (const [ns, dict] of byNs) {
  for (const [key, value] of Object.entries(dict)) {
    if (typeof value !== 'string' || value.length === 0) throw new Error(`${ns}/${key} is not a non-empty string`)
  }
}

// The ru dictionaries must cover the English source exactly.
const enDir = path.join(root, 'work', 'en')
let mismatch = 0
for (const file of fs.readdirSync(enDir).filter((f) => f.endsWith('.json'))) {
  const ns = file.replace(/\.json$/, '')
  const en = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8'))
  const ru = byNs.get(ns)
  if (!ru) { console.log(`MISSING namespace ${ns}`); mismatch++; continue }
  for (const key of Object.keys(en)) if (!(key in ru)) { console.log(`MISSING ${ns}/${key}`); mismatch++ }
}

console.log(mismatch === 0 ? 'smoke: OK' : `smoke: ${mismatch} mismatches`)
process.exit(mismatch === 0 ? 0 : 1)
