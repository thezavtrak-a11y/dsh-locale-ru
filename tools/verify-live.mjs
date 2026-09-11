// Boot a throwaway dsh web instance on a spare port and verify, over real HTTP,
// that the dsh-locale-ru client bundle is part of the served boot graph.
// Usage: node verify-live.mjs <port> [logPath]
import { spawn, execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = process.argv[2] ?? '3099'
const logPath = process.argv[3] ?? join(tmpdir(), `dsh-verify-${port}.log`)
const bin = 'C:/Users/zavtr/AppData/Local/npm-cache/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai/dsh/lib/bin.js'
const tempRoot = mkdtempSync(join(tmpdir(), 'dsh-verify-'))

let output = ''
const child = spawn(process.execPath, [bin, 'web', '--port', String(port), '--no-open'], {
  env: { ...process.env, TEMP: tempRoot, TMP: tempRoot },
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', (d) => { output += d.toString() })
child.stderr.on('data', (d) => { output += d.toString() })

const base = `http://127.0.0.1:${port}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Follow redirects manually so the Set-Cookie from the launch handshake is kept. */
let cookie = ''
async function get(path, { redirects = 4, host } = {}) {
  let url = base + path
  for (let i = 0; i <= redirects; i++) {
    const headers = { 'user-agent': 'Mozilla/5.0' }
    if (cookie) headers.cookie = cookie
    if (host) headers.host = host
    const response = await fetch(url, { headers, redirect: 'manual' })
    const setCookie = response.headers.getSetCookie?.() ?? []
    if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ')
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) return { status: response.status, body: await response.text() }
      url = new URL(location, url).href
      continue
    }
    return { status: response.status, body: await response.text(), headers: response.headers }
  }
  throw new Error('too many redirects')
}

let ready = false
for (let i = 1; i <= 60; i++) {
  await sleep(1500)
  try {
    const r = await get('/', { redirects: 0 })
    // 404 means the web carrier is not mounted yet; 200 (or 303/401 from the
    // auth fence) means the app is serving.
    if (r.status === 200 || r.status === 303 || r.status === 401) { ready = true; break }
  } catch {}
}
console.log(`instance ready on ${base}: ${ready}`)

// The index is served only to the process-token URL printed by `dsh web`; find
// it in the captured output (stdout+stderr) and reuse it for the handshake.
const urls = [...new Set((output.match(/https?:\/\/[^\s"'<>]+/g) ?? []))]
console.log(`urls printed by the instance: ${urls.length}`)
for (const u of urls) console.log(`   ${u}`)
const authed = urls.find((u) => u.includes('127.0.0.1') || u.includes('localhost'))
if (authed) {
  const response = await fetch(authed, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' } })
  const setCookie = response.headers.getSetCookie?.() ?? []
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ')
  console.log(`token handshake: ${response.status}, cookie=${cookie ? 'yes' : 'no'}, location=${response.headers.get('location')}`)
}

const result = { port, index: null, bootMentions: [], bundle: null }
try {
  const index = await get('/')
  result.index = index.status
  console.log(`GET / -> ${index.status}, ${index.body.length} bytes, cookie=${cookie ? 'yes' : 'no'}`)
  const mentions = index.body.match(/[^"'\\]*dsh-locale-ru[^"'\\]*/g) ?? []
  result.bootMentions = [...new Set(mentions)].slice(0, 5)
  console.log(`boot manifest mentions dsh-locale-ru: ${mentions.length}`)
  for (const m of result.bootMentions) console.log(`   ${m.slice(0, 160)}`)
  const combo = index.body.match(/\/plugins\/[^"]*dsh-locale-ru[^"]*/)
  if (combo) console.log(`   combo url: ${combo[0].slice(0, 200)}`)

  const bundle = await get('/plugins/dsh-locale-ru/client.js')
  result.bundle = bundle.status
  console.log(`GET /plugins/dsh-locale-ru/client.js -> ${bundle.status}, ${bundle.body.length} bytes`)
  if (bundle.status === 200) {
    const ok = bundle.body.includes("addLanguage") && bundle.body.includes('"ru"') && bundle.body.includes('dsh-locale-ru')
    console.log(`   bundle content registers ru: ${ok}`)
    console.log(`   dictionaries in bundle: ${(bundle.body.match(/ctx\.locale\.register\(/g) ?? []).length}`)
  }
} catch (error) {
  console.log(`probe error: ${String(error)}`)
}
writeFileSync(logPath, output)

try {
  execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  console.log(`killed verification instance pid ${child.pid}`)
} catch (error) {
  console.log(`kill failed: ${String(error)}`)
}
console.log(`log: ${logPath}`)
console.log('--- server output (tail) ---')
console.log(output.split('\n').slice(-25).join('\n'))
