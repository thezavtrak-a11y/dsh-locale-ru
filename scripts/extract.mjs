// Extract every locale dictionary pair from built DSH client bundles.
// Usage: node extract3.mjs <node_modules/@deepseek-ai> <outDir>
import fs from 'node:fs'
import path from 'node:path'

const root = process.argv[2]
const outDir = process.argv[3]

function readBalanced(src, i) {
  const open = src[i]
  const close = open === '{' ? '}' : open === '[' ? ']' : ')'
  let depth = 0
  let mode = null
  for (let j = i; j < src.length; j++) {
    const c = src[j]
    if (mode) {
      if (c === '\\') { j++; continue }
      if (c === mode) mode = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { mode = c; continue }
    if (c === '/' && src[j + 1] === '/') { while (j < src.length && src[j] !== '\n') j++; continue }
    if (c === '/' && src[j + 1] === '*') { const e = src.indexOf('*/', j); j = e === -1 ? src.length : e + 1; continue }
    if (c === '{' || c === '[' || c === '(') depth++
    else if (c === '}' || c === ']' || c === ')') {
      if (c === close) {
        depth--
        if (depth === 0) return [src.slice(i, j + 1), j + 1]
      } else depth--
    }
  }
  throw new Error(`unbalanced at ${i}`)
}

function readString(src, i) {
  const q = src[i]
  let out = ''
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j]
    if (c === '\\') { out += c + src[j + 1]; j++; continue }
    if (c === q) return [out, j + 1]
    out += c
  }
  throw new Error(`unterminated string at ${i}`)
}

function evalLiteral(text) {
  const clean = text.replace(/,\s*([}\]])/g, '$1')
  try { return JSON.parse(clean) } catch {}
  const quoted = clean.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
  return JSON.parse(quoted)
}

/** All `const/let/var <id> = <object|array|string>` bindings, anywhere in the file. */
function collectConsts(src) {
  const map = new Map()
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*/g
  let m
  while ((m = re.exec(src))) {
    const at = m.index + m[0].length
    const c = src[at]
    try {
      if (c === '{' || c === '[') {
        const [text, end] = readBalanced(src, at)
        map.set(m[1], text)
        re.lastIndex = end
      } else if (c === "'" || c === '"') {
        const [text, end] = readString(src, at)
        map.set(m[1], JSON.stringify(text))
        re.lastIndex = end
      }
    } catch {}
  }
  return map
}

const resolve = (expr, consts) => {
  const t = expr.trim().replace(/;$/, '')
  if (!t) return null
  if (t[0] === '{' || t[0] === '[' || t[0] === "'" || t[0] === '"') return t
  if (/^[A-Za-z_$][\w$]*$/.test(t)) return consts.get(t) ?? null
  return null
}

const asString = (expr, consts) => {
  const r = resolve(expr, consts)
  if (!r || (r[0] !== "'" && r[0] !== '"')) return null
  try { return JSON.parse(r) } catch { return null }
}

/** Resolve an object-literal member value to a JS value: literal, or a const reference. */
function evalValue(expr, consts, depth = 0) {
  const t = expr.trim()
  if (depth > 4) return undefined
  if (t[0] === '"' || t[0] === "'") {
    try { return t[0] === '"' ? JSON.parse(t) : evalLiteral(`"${t.slice(1, -1).replace(/"/g, '\\"')}"`) } catch { return undefined }
  }
  if (t[0] === '{' || t[0] === '[') {
    try { return evalLiteral(t) } catch { return undefined }
  }
  if (/^[A-Za-z_$][\w$]*$/.test(t)) {
    const v = consts.get(t)
    if (v === undefined) return undefined
    return evalValue(v, consts, depth + 1)
  }
  return undefined
}

/** Evaluate a dictionary object literal, resolving bare identifier values from bundle consts. */
function evalDict(objText, consts) {
  const easy = (() => { try { return evalLiteral(objText) } catch { return undefined } })()
  if (easy && typeof easy === 'object' && !Array.isArray(easy)) {
    const ok = Object.values(easy).every((v) => typeof v === 'string' || (v && typeof v === 'object'))
    if (ok) return easy
  }
  const out = {}
  for (const raw of splitTop(objText.slice(1, -1))) {
    const part = raw.trim()
    if (!part) continue
    const colon = findTopColon(part)
    if (colon === -1) continue
    const keyExpr = part.slice(0, colon).trim()
    const valueExpr = part.slice(colon + 1).trim()
    const key = (() => {
      if (keyExpr[0] === '"' || keyExpr[0] === "'") { try { return JSON.parse(keyExpr[0] === '"' ? keyExpr : `"${keyExpr.slice(1, -1).replace(/"/g, '\\"')}"`) } catch { return null } }
      const r = consts.get(keyExpr)
      if (r && (r[0] === '"' || r[0] === "'")) { try { return JSON.parse(r) } catch { return null } }
      return /^[A-Za-z_$][\w$]*$/.test(keyExpr) ? keyExpr : null
    })()
    if (key === null) continue
    const value = evalValue(valueExpr, consts)
    if (typeof value === 'string') out[key] = value
  }
  return out
}

function findTopColon(part) {
  let depth = 0
  let mode = null
  for (let i = 0; i < part.length; i++) {
    const c = part[i]
    if (mode) { if (c === '\\') i++; else if (c === mode) mode = null; continue }
    if (c === "'" || c === '"') { mode = c; continue }
    if (c === '{' || c === '[' || c === '(') depth++
    else if (c === '}' || c === ']' || c === ')') depth--
    else if (c === ':' && depth === 0) return i
  }
  return -1
}

/** Split a top-level comma list, tracking only bracket nesting. */
function splitTop(text) {
  const parts = []
  let depth = 0
  let mode = null
  let buf = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (mode) {
      buf += c
      if (c === '\\') { buf += text[++i]; continue }
      if (c === mode) mode = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { mode = c; buf += c; continue }
    if (c === '{' || c === '[' || c === '(') depth++
    else if (c === '}' || c === ']' || c === ')') depth--
    if (c === ',' && depth === 0) { parts.push(buf); buf = ''; continue }
    buf += c
  }
  if (buf.trim()) parts.push(buf)
  return parts
}

function pairsFromWrapper(objText, consts) {
  const out = []
  for (const raw of splitTop(objText.slice(1, -1))) {
    const part = raw.trim()
    if (!part) continue
    let colon = -1
    let depth = 0
    let mode = null
    for (let i = 0; i < part.length; i++) {
      const c = part[i]
      if (mode) { if (c === '\\') i++; else if (c === mode) mode = null; continue }
      if (c === "'" || c === '"') { mode = c; continue }
      if (c === '{' || c === '[' || c === '(') depth++
      else if (c === '}' || c === ']' || c === ')') depth--
      else if (c === ':' && depth === 0) { colon = i; break }
    }
    const name = (colon === -1 ? part : part.slice(0, colon)).trim().replace(/^['"]|['"]$/g, '')
    const value = colon === -1 ? part : part.slice(colon + 1).trim()
    const obj = resolve(value, consts)
    if (!obj || obj[0] !== '{') continue
    let dict
    dict = evalDict(obj, consts)
    if (!dict || typeof dict !== 'object' || Array.isArray(dict)) continue
    out.push({ locale: name, dict })
  }
  return out
}

function pairsFromArray(arrText, consts) {
  const out = []
  for (const raw of splitTop(arrText.slice(1, -1))) {
    const part = raw.trim()
    if (!part.startsWith('[')) continue
    const [text] = readBalanced(part, 0)
    const items = splitTop(text.slice(1, -1))
    if (items.length < 2) continue
    const loc = asString(items[0], consts)
    const obj = resolve(items[1], consts)
    if (!loc || !obj || obj[0] !== '{') continue
    let dict
    dict = evalDict(obj, consts)
    out.push({ locale: loc, dict })
  }
  return out
}

function parseCall(src, callArgStart, consts) {
  const argsRaw = []
  let depth = 0
  let mode = null
  let buf = ''
  for (let j = callArgStart; j < src.length; j++) {
    const c = src[j]
    if (mode) {
      buf += c
      if (c === '\\') { buf += src[++j]; continue }
      if (c === mode) mode = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { mode = c; buf += c; continue }
    if (c === '{' || c === '[') { depth++; buf += c; continue }
    if (c === '}' || c === ']') { depth--; buf += c; continue }
    if (c === '(') { buf += c; continue }
    if (c === ')') {
      if (depth === 0) break
      buf += c
      continue
    }
    if (c === ',' && depth === 0) { argsRaw.push(buf); buf = ''; continue }
    buf += c
  }
  argsRaw.push(buf)
  const args = argsRaw.map((a) => a.trim()).filter((a) => a !== '')
  if (process.env.DSH_DEBUG_CALL) {
    console.log('DBG args:', JSON.stringify(args.map((a) => a.slice(0, 60))))
  }
  if (args.length < 2) return null
  const ns = asString(args[0], consts)
  if (!ns) return null
  if (args.length === 2) {
    const a1 = resolve(args[1], consts)
    if (!a1) return null
    if (a1[0] === '{') {
      const pairs = pairsFromWrapper(a1, consts)
      return pairs.length ? { ns, pairs } : null
    }
    if (a1[0] === '[') {
      const pairs = pairsFromArray(a1, consts)
      return pairs.length ? { ns, pairs } : null
    }
    return null
  }
  const loc = asString(args[1], consts)
  const obj = loc ? resolve(args[2], consts) : null
  if (!loc || !obj || obj[0] !== '{') return null
  try {
    return { ns, pairs: [{ locale: loc, dict: evalDict(obj, consts) }] }
  } catch { return null }
}

const dirs = fs.readdirSync(root).filter((d) => d.startsWith('dsh-'))
const byNs = {}
const conflicts = []
const perPkg = {}
for (const d of dirs) {
  const f = path.join(root, d, 'lib', 'client.js')
  if (!fs.existsSync(f)) continue
  const src = fs.readFileSync(f, 'utf8')
  if (!src.includes('.locale.register(')) continue
  const consts = collectConsts(src)
  const re = /(?:\bctx\.)?\blocale\.register\(/g
  let m
  let count = 0
  while ((m = re.exec(src))) {
    let got = null
    try {
      got = parseCall(src, m.index + m[0].length, consts)
    } catch (error) {
      console.log(`  [{d}] parse error at ${m.index}: ${String(error).slice(0, 120)}`)
      continue
    }
    if (!got) continue
    count++
    for (const { locale, dict } of got.pairs) {
      const key = `${got.ns}\u0000${locale}`
      if (byNs[key]) {
        if (JSON.stringify(byNs[key].dict) !== JSON.stringify(dict)) {
          conflicts.push(`${got.ns}/${locale}: ${byNs[key].pkg} vs ${d}`)
        }
        continue
      }
      byNs[key] = { pkg: d, ns: got.ns, locale, dict }
    }
  }
  // inline table form: register(NS, locale, dict) inside a for-of over a table
  const inlineNs = /locale\.register\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\)/.exec(src)
  if (inlineNs) {
    const ns = asString(inlineNs[1], consts)
    if (ns && !Object.keys(byNs).some((k) => k.startsWith(ns + '\u0000'))) {
      const t = consts.get(inlineNs[3])
      if (t && t[0] === '[') {
        for (const { locale, dict } of pairsFromArray(t, consts)) {
          const key = `${ns}\u0000${locale}`
          if (!byNs[key]) { byNs[key] = { pkg: d, ns, locale, dict }; count++ }
        }
      }
    }
  }
  if (count) perPkg[d] = count
}
if (process.env.DSH_DEBUG_CALL) {
  const withClient = fs.readdirSync(root).filter((d) => fs.existsSync(path.join(root, d, 'lib', 'client.js')))
  console.log('DBG packages with client.js but no extracted dict:', withClient.filter((d) => !perPkg[d]).join(', '))
}

const namespaces = {}
for (const [key, value] of Object.entries(byNs)) {
  const [ns, locale] = key.split('\u0000')
  namespaces[ns] ??= {}
  namespaces[ns][locale] = { pkg: value.pkg, keys: value.dict }
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'corpus.json'), JSON.stringify(namespaces, null, 2))

let totalEn = 0
const missing = []
for (const [ns, locales] of Object.entries(namespaces)) {
  const en = locales.en?.keys ?? {}
  const zh = locales.zh?.keys ?? {}
  totalEn += Object.keys(en).length
  if (Object.keys(en).length !== Object.keys(zh).length) missing.push(ns)
  console.log(`${String(Object.keys(en).length).padStart(4)}  ${ns.padEnd(26)} ${locales.en?.pkg ?? locales.zh?.pkg}`)
}
console.log(`namespaces: ${Object.keys(namespaces).length}  keys(en): ${totalEn}`)
if (missing.length) console.log('en/zh count mismatch:', missing.join(', '))
if (conflicts.length) console.log('conflicts:', conflicts.join('; '))

