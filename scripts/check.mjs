#!/usr/bin/env node
/**
 * check.mjs — verify dict/ru/*.json against the English source corpus.
 *
 *   node scripts/check.mjs            report only
 *   node scripts/check.mjs --strict   non-zero exit on any finding (CI gate)
 *
 * The corpus (work/en/*.json) is the English key/value set extracted from the
 * exact DSH release this pack targets; upstream/corpus.json keeps the same
 * source with its Chinese sibling for drift review.
 *
 * Findings:
 *   MISSING_KEY / MISSING_NS  — translation absent (falls back to English)
 *   EXTRA_KEY / EXTRA_NS      — key upstream does not have (dead weight)
 *   PLACEHOLDER_MISMATCH      — the {placeholder} set differs from English
 *   IDENTICAL                 — value identical to English (allowlist-aware)
 *   EMPTY                     — empty or non-string value
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict')

const EN_DIR = join(ROOT, 'work', 'en')
const RU_DIR = join(ROOT, 'dict', 'ru')
const ALLOWLIST = join(ROOT, 'upstream', 'identical-allowlist.json')

if (!existsSync(EN_DIR)) {
  console.error(`check: English corpus not found at ${EN_DIR}`)
  process.exit(2)
}

const allow = existsSync(ALLOWLIST) ? new Set(JSON.parse(readFileSync(ALLOWLIST, 'utf8'))) : new Set()

const placeholders = (text) => (String(text).match(/\{[a-zA-Z0-9_.]+\}/g) ?? []).sort().join('\u0000')

const findings = []
const add = (kind, ns, key, detail = '') => findings.push({ kind, ns, key, detail })

const enNamespaces = readdirSync(EN_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort()
const ruNamespaces = existsSync(RU_DIR)
  ? readdirSync(RU_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort()
  : []

const stats = { en: 0, ru: 0 }
for (const ns of enNamespaces) {
  const en = JSON.parse(readFileSync(join(EN_DIR, `${ns}.json`), 'utf8'))
  stats.en += Object.keys(en).length
  const ruPath = join(RU_DIR, `${ns}.json`)
  if (!existsSync(ruPath)) {
    add('MISSING_NS', ns, '', `${Object.keys(en).length} keys`)
    continue
  }
  const ru = JSON.parse(readFileSync(ruPath, 'utf8'))
  stats.ru += Object.keys(ru).length
  for (const [key, source] of Object.entries(en)) {
    if (!(key in ru)) { add('MISSING_KEY', ns, key); continue }
    const value = ru[key]
    if (typeof value !== 'string' || value.length === 0) { add('EMPTY', ns, key); continue }
    if (placeholders(source) !== placeholders(value)) {
      add('PLACEHOLDER_MISMATCH', ns, key, `${placeholders(source)} -> ${placeholders(value)}`)
    }
    if (value === source && !allow.has(`${ns}/${key}`)) add('IDENTICAL', ns, key, value)
  }
  for (const key of Object.keys(ru)) if (!(key in en)) add('EXTRA_KEY', ns, key)
}
for (const ns of ruNamespaces) if (!enNamespaces.includes(ns)) add('EXTRA_NS', ns, '')

const byKind = {}
for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1

console.log(`check: corpus ${enNamespaces.length} namespaces / ${stats.en} keys`)
console.log(`check: russian ${ruNamespaces.length} namespaces / ${stats.ru} keys`)
if (stats.en) {
  const covered = stats.en - (byKind.MISSING_KEY ?? 0) - (byKind.MISSING_NS ?? 0)
  console.log(`check: coverage ${((covered / stats.en) * 100).toFixed(1)}%`)
}
console.log('')
if (!findings.length) {
  console.log('check: OK — no findings')
  process.exit(0)
}
for (const [kind, count] of Object.entries(byKind).sort()) console.log(`${String(count).padStart(5)}  ${kind}`)
console.log('')
const limit = 40
const shown = findings.slice(0, limit)
for (const f of shown) console.log(`  ${f.kind.padEnd(20)} ${f.ns}${f.key ? '/' + f.key : ''}${f.detail ? '  ' + f.detail : ''}`)
if (findings.length > limit) console.log(`  … and ${findings.length - limit} more`)

const blocking = findings.filter((f) => f.kind !== 'IDENTICAL' && f.kind !== 'EXTRA_KEY' && f.kind !== 'EXTRA_NS')
if (strict && blocking.length) {
  console.error(`\ncheck: STRICT FAIL — ${blocking.length} blocking findings`)
  process.exit(1)
}
process.exit(0)
