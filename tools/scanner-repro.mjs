// Reproduce, from the host side, exactly what the client-modules scanner does
// for an entry row: resolve the row's manifest through the Loader's own
// resolution, read dsh.client, check the platform, locate the "./client"
// export, and confirm the artifact exists and looks like a loader bundle.
// Also compares the artifact against a known-good official bundle shape.
// Usage: node tools/scanner-repro.mjs <packageRoot>
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = process.argv[2]
const profileDir = 'C:\\Users\\zavtr\\.dsh\\profiles\\web'
const baseUrl = pathToFileURL(profileDir + path.sep).href

const problems = []
const note = (message) => { problems.push(message); console.log(`  FAIL  ${message}`) }
const ok = (message) => console.log(`  ok    ${message}`)

console.log(`profile baseUrl: ${baseUrl}`)

// 1) locatePkgJson: the loader would import the row by name from the tree base URL.
const require = createRequire(baseUrl)
let pkgPath
try {
  pkgPath = require.resolve('dsh-locale-ru/package.json')
  ok(`row resolves: dsh-locale-ru -> ${pkgPath}`)
} catch (error) {
  note(`cannot resolve dsh-locale-ru from the tree base URL: ${String(error)}`)
}
if (!pkgPath) process.exit(1)

// 2) nearestPackage: the manifest declaring the name owns the module.
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
console.log(`  package name: ${pkg.name}`)
if (pkg.name !== 'dsh-locale-ru') note(`manifest name ${pkg.name} does not match the row`)

// 3) parseDshClient + platform gate.
const client = pkg.dsh?.client
if (!client) note('package.json declares no dsh.client')
else {
  ok(`dsh.client: ${JSON.stringify(client)}`)
  if (client.platform !== 'web') note(`dsh.client.platform is ${client.platform}, not "web"`)
  // `immediately` is phase-one registration, and every shell-level client
  // package (locale, theme, renderer) sets it; a language pack that must be
  // registered before the shell renders localized copy belongs in that batch.
  if (client.immediately === true) ok('immediately: true (phase-one registration, same as the shipped locale package)')
  else console.log('  info  immediately is not set — the pack joins the shared application batch')
  if (!Array.isArray(client.inject) || !client.inject.includes('@deepseek-ai/dsh-client-locale')) {
    note('dsh.client.inject does not declare @deepseek-ai/dsh-client-locale')
  } else ok('declares the locale dependency informationally')
  for (const name of client.inject ?? []) {
    const pkgName = name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0]
    if (!fs.existsSync(path.join('C:\\Users\\zavtr\\AppData\\Local\\npm-cache\\_npx\\1e7f6d9597241db0\\node_modules', pkgName))) {
      note(`declared dependency ${pkgName} is not present in the installation`)
    }
  }
}

// 4) clientExportOf: the "./client" export must exist.
const clientExport = pkg.exports?.['./client']
const clientRel = clientExport?.default ?? clientExport
if (!clientRel) note('no "./client" export in package.json')
else {
  const clientPath = path.join(path.dirname(pkgPath), clientRel)
  if (!fs.existsSync(clientPath)) note(`client artifact missing: ${clientPath}`)
  else {
    const bytes = fs.statSync(clientPath).size
    const source = fs.readFileSync(clientPath, 'utf8')
    ok(`client bundle: ${clientPath} (${bytes} bytes)`)
    // A banner comment may precede the call; the official format is the call
    // itself with the package id, then a factory.
    if (!/window\.__ModuleLoader__\.load\(\{/.test(source)) note('bundle does not use the module-loader format')
    else ok('bundle uses the window.__ModuleLoader__.load format')
    if (!source.includes(`id: "dsh-locale-ru"`)) note('bundle id does not match the package name')
    else ok('bundle id matches the package name')
    const registrations = (source.match(/ctx\.locale\.register\(/g) ?? []).length
    const languages = (source.match(/addLanguage\(/g) ?? []).length
    ok(`bundle declares ${registrations} dictionary registrations, ${languages} language registration`)
    if (registrations === 0) note('bundle registers no dictionaries')
    if (languages === 0) note('bundle registers no language')
  }
}

// 5) Shape comparison with a shipped official client bundle.
const official = 'C:\\Users\\zavtr\\AppData\\Local\\npm-cache\\_npx\\1e7f6d9597241db0\\node_modules\\@deepseek-ai\\dsh-client-ui-plan\\lib\\client.js'
if (fs.existsSync(official)) {
  const reference = fs.readFileSync(official, 'utf8')
  const refHead = reference.slice(0, reference.indexOf('factory:'))
  const ours = fs.readFileSync(path.join(root, 'lib', 'client.js'), 'utf8')
  const ourHead = ours.slice(0, ours.indexOf('factory:'))
  const shape = /window\.__ModuleLoader__\.load\(\{\s*id:\s*"[^"]+",\s*$/m
  console.log(`  reference head: ${JSON.stringify(refHead.trim())}`)
  console.log(`  our head:       ${JSON.stringify(ourHead.trim())}`)
  if (shape.test(refHead) && shape.test(ourHead)) {
    ok('bundle header matches the official loader format')
  } else {
    note('bundle header deviates from the official loader format')
  }
  for (const token of ['var module = { exports: {} };', 'exports.apply = apply', 'return module.exports;']) {
    if (!ours.includes(token)) note(`bundle is missing the official token: ${token}`)
  }
  if (!reference.includes('exports.apply = apply')) note('reference bundle shape changed upstream — recheck the format')
}

console.log(problems.length ? `\nscanner-repro: ${problems.length} problems` : '\nscanner-repro: OK — the row resolves exactly like a shipped client plugin')
process.exit(problems.length ? 1 : 0)
