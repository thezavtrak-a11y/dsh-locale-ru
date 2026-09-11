// Compose dict/ru/*.json from the translated chunks, then validate against the
// English corpus. Usage: node compose.mjs <packageRoot>
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2]
const chunkDir = path.join(root, 'work', 'chunks')
const enDir = path.join(root, 'work', 'en')
const outDir = path.join(root, 'dict', 'ru')

const chunks = fs.readdirSync(chunkDir).filter((f) => f.endsWith('.ru.json')).sort()
const composed = {}
const sources = {}
for (const file of chunks) {
  const data = JSON.parse(fs.readFileSync(path.join(chunkDir, file), 'utf8'))
  for (const [ns, dict] of Object.entries(data)) {
    composed[ns] ??= {}
    for (const [key, value] of Object.entries(dict)) {
      if (key in composed[ns] && composed[ns][key] !== value) {
        console.log(`CONFLICT ${ns}/${key}: ${file} vs ${sources[ns]}`)
      }
      composed[ns][key] = value
      sources[ns] = file
    }
  }
}

fs.mkdirSync(outDir, { recursive: true })
const enNamespaces = fs.readdirSync(enDir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))

let total = 0
const missingNs = []
const missingKeys = []
const placeholderIssues = []
const identical = []
for (const ns of enNamespaces.sort()) {
  const en = JSON.parse(fs.readFileSync(path.join(enDir, `${ns}.json`), 'utf8'))
  const ru = composed[ns]
  if (!ru) { missingNs.push(ns); continue }
  const out = {}
  for (const [key, source] of Object.entries(en)) {
    if (!(key in ru)) { missingKeys.push(`${ns}/${key}`); out[key] = source; continue }
    const value = ru[key]
    const ph = (s) => (String(s).match(/\{[a-zA-Z0-9_.]+\}/g) ?? []).sort().join(',')
    if (ph(source) !== ph(value)) placeholderIssues.push(`${ns}/${key}: ${ph(source)} -> ${ph(value)}`)
    if (value === source && !/^[A-Z0-9 .,:/+-]+$/.test(source)) identical.push(`${ns}/${key} = ${value}`)
    out[key] = value
  }
  const extra = Object.keys(ru).filter((k) => !(k in en))
  if (extra.length) console.log(`extra keys in ${ns}: ${extra.join(', ')}`)
  fs.writeFileSync(path.join(outDir, `${ns}.json`), JSON.stringify(out, null, 2) + '\n')
  total += Object.keys(out).length
}

const extraNs = Object.keys(composed).filter((ns) => !enNamespaces.includes(ns))
console.log(`composed ${enNamespaces.length} namespaces / ${total} keys into dict/ru/`)
if (missingNs.length) console.log(`MISSING NAMESPACES: ${missingNs.join(', ')}`)
if (extraNs.length) console.log(`EXTRA NAMESPACES: ${extraNs.join(', ')}`)
if (missingKeys.length) console.log(`MISSING KEYS (${missingKeys.length}): ${missingKeys.slice(0, 20).join(', ')}`)
if (placeholderIssues.length) console.log(`PLACEHOLDER ISSUES (${placeholderIssues.length}):\n  ${placeholderIssues.join('\n  ')}`)
if (identical.length) console.log(`IDENTICAL TO ENGLISH (${identical.length}):\n  ${identical.slice(0, 40).join('\n  ')}`)
