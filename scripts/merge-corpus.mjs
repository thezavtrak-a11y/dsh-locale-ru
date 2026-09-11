// Merge the local runtime extraction with the upstream reference corpus and
// emit the English source files to translate, plus a coverage report.
// Usage: node merge.mjs <workDir>
import fs from 'node:fs'
import path from 'node:path'

const work = process.argv[2]
const local = JSON.parse(fs.readFileSync(path.join(work, 'corpus.json'), 'utf8'))
const upstream = JSON.parse(fs.readFileSync(path.join(work, 'corpus-upstream.json'), 'utf8'))

const nsSet = new Set([...Object.keys(local), ...Object.keys(upstream)])
const merged = {}
const report = []
for (const ns of [...nsSet].sort()) {
  const loc = local[ns]?.en?.keys ?? {}
  const up = upstream[ns] ?? {}
  const source = {}
  const fromLocalOnly = []
  const fromUpstreamOnly = []
  for (const [key, entry] of Object.entries(up)) {
    const en = entry.en
    if (typeof en !== 'string') continue
    source[key] = en
    if (!(key in loc)) fromUpstreamOnly.push(key)
  }
  for (const [key, en] of Object.entries(loc)) {
    if (typeof en !== 'string') continue
    if (!(key in source)) { source[key] = en; fromLocalOnly.push(key) }
  }
  merged[ns] = source
  report.push({
    ns,
    pkg: local[ns]?.en?.pkg ?? local[ns]?.pkg ?? '-',
    local: Object.keys(loc).length,
    upstream: Object.keys(up).length,
    merged: Object.keys(source).length,
    upstreamOnly: fromUpstreamOnly.length,
    localOnly: fromLocalOnly.length,
    upstreamOnlyKeys: fromUpstreamOnly,
    localOnlyKeys: fromLocalOnly,
  })
}

const enDir = path.join(work, 'en')
fs.mkdirSync(enDir, { recursive: true })
let total = 0
for (const [ns, dict] of Object.entries(merged)) {
  fs.writeFileSync(path.join(enDir, `${ns}.json`), JSON.stringify(dict, null, 2) + '\n')
  total += Object.keys(dict).length
}

fs.writeFileSync(path.join(work, 'coverage.json'), JSON.stringify(report, null, 2))

console.log('ns'.padEnd(26), 'local', 'upstr', 'merged', 'up-only', 'local-only', 'pkg')
for (const r of report) {
  console.log(
    r.ns.padEnd(26),
    String(r.local).padStart(5),
    String(r.upstream).padStart(5),
    String(r.merged).padStart(6),
    String(r.upstreamOnly).padStart(7),
    String(r.localOnly).padStart(10),
    r.pkg,
  )
}
console.log(`\nnamespaces: ${report.length}  merged keys: ${total}`)
console.log('only-local namespaces:', report.filter((r) => r.upstream === 0).map((r) => r.ns).join(', ') || '(none)')
console.log('only-upstream namespaces:', report.filter((r) => r.local === 0).map((r) => r.ns).join(', ') || '(none)')
const empty = report.filter((r) => r.merged === 0)
if (empty.length) console.log('EMPTY:', empty.map((r) => r.ns).join(', '))
