// Split the merged English corpus into translation chunks.
// Usage: node chunk.mjs <workDir> <chunksDir> [maxKeysPerChunk]
import fs from 'node:fs'
import path from 'node:path'

const work = process.argv[2]
const outDir = process.argv[3]
const maxKeys = Number(process.argv[4] ?? 110)

const enDir = path.join(work, 'en')
const namespaces = fs.readdirSync(enDir).filter((f) => f.endsWith('.json')).sort()
const sizes = namespaces.map((f) => {
  const ns = f.replace(/\.json$/, '')
  const dict = JSON.parse(fs.readFileSync(path.join(enDir, f), 'utf8'))
  return { ns, keys: Object.keys(dict).length }
})

const chunks = []
let current = { namespaces: [], keys: 0 }
for (const { ns, keys } of sizes) {
  if (current.keys > 0 && current.keys + keys > maxKeys) {
    chunks.push(current)
    current = { namespaces: [], keys: 0 }
  }
  current.namespaces.push(ns)
  current.keys += keys
}
if (current.namespaces.length) chunks.push(current)

fs.mkdirSync(outDir, { recursive: true })
chunks.forEach((chunk, index) => {
  const id = String(index + 1).padStart(2, '0')
  const corpus = {}
  for (const ns of chunk.namespaces) {
    corpus[ns] = JSON.parse(fs.readFileSync(path.join(enDir, `${ns}.json`), 'utf8'))
  }
  fs.writeFileSync(path.join(outDir, `chunk-${id}.en.json`), JSON.stringify(corpus, null, 2) + '\n')
  console.log(`chunk-${id}: ${chunk.keys} keys — ${chunk.namespaces.join(', ')}`)
})
console.log(`\n${chunks.length} chunks, ${sizes.reduce((s, x) => s + x.keys, 0)} keys total`)
