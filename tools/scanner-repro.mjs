// Reproduce, from the host side, exactly what the client-modules scanner does
// for an entry row: resolve the row's manifest through the Loader's own
// resolution, read dsh.client, check the platform, locate the "./client"
// export, and confirm the artifact exists and looks like a loader bundle.
// Also compares the artifact against a known-good official bundle shape.
// Usage: node tools/scanner-repro.mjs [packageRoot]
//   DSH_PROFILE_DIR, DSH_INSTALL and DSH_PACKAGE_DIR override the detection.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { installModulesDir, packageRoot, profileDir } from './paths.mjs'

const root = process.argv[2] ?? packageRoot()
const profile = profileDir()
const baseUrl = pathToFileURL(profile + path.sep).href
const packageName = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).name

const problems = []
const note = (message) => { problems.push(message); console.log(`  FAIL  ${message}`) }
const ok = (message) => console.log(`  ok    ${message}`)

console.log(`package root:   ${root}`)
console.log(`profile dir:    ${profile}`)
console.log(`profile baseUrl: ${baseUrl}`)

// 1) locatePkgJson: the loader would import the row by name from the tree base URL.
const require = createRequire(baseUrl)
let pkgPath
try {
  pkgPath = require.resolve(`${packageName}/package.json`)
  ok(`row resolves: ${packageName} -> ${pkgPath}`)
} catch (error) {
  note(`cannot resolve ${packageName} from the tree base URL: ${String(error)}`)
}
if (!pkgPath) process.exit(1)

// 2) nearestPackage: the manifest declaring the name owns the module.
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
console.log(`  package name: ${pkg.name}`)
if (pkg.name !== packageName) note(`manifest name ${pkg.name} does not match the row`)

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
  const install = installModulesDir()
  for (const name of client.inject ?? []) {
    const pkgName = name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0]
    if (install === undefined) console.log(`  info  cannot locate the installation; skipped presence check for ${pkgName}`)
    else if (!fs.existsSync(path.join(install, pkgName))) note(`declared dependency ${pkgName} is not present in the installation`)
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
    if (!source.includes(`id: "${packageName}"`)) note('bundle id does not match the package name')
    else ok('bundle id matches the package name')
    const registrations = (source.match(/ctx\.locale\.register\(/g) ?? []).length
    const languages = (source.match(/addLanguage\(/g) ?? []).length
    ok(`bundle declares ${registrations} dictionary registrations, ${languages} language registration`)
    if (registrations === 0) note('bundle registers no dictionaries')
    if (languages === 0) note('bundle registers no language')
  }
}

// 5) Shape comparison with a shipped official client bundle.
const install = installModulesDir()
const official = install === undefined
  ? undefined
  : path.join(install, '@deepseek-ai', 'dsh-client-ui-plan', 'lib', 'client.js')
if (official === undefined) {
  console.log('  info  installation not located; skipped the official-format comparison')
} else if (!fs.existsSync(official)) {
  console.log(`  info  reference bundle not found at ${official}; skipped the comparison`)
} else {
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
