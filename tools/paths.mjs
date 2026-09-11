// Shared path resolution for the verification tools.
//
// Nothing here is machine-specific: every path is either derived from the
// current process or overridable through an environment variable, so the tools
// work from any checkout on any machine.
//
//   DSH_INSTALL     node_modules directory of the dsh installation
//   DSH_PROFILE_DIR directory of the booted profile
//   DSH_PACKAGE_DIR package root under verification
//
// @module tools/paths.mjs

import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Package root: two levels up from this file. */
export function packageRoot() {
  return process.env.DSH_PACKAGE_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), '..')
}

/**
 * Locate the dsh installation's node_modules.
 * @returns the directory, or undefined when it cannot be found.
 */
export function installModulesDir() {
  if (process.env.DSH_INSTALL) return process.env.DSH_INSTALL
  // An in-repo checkout keeps the installation next to the package.
  const local = join(packageRoot(), 'node_modules', '@deepseek-ai')
  if (existsSync(local)) return join(packageRoot(), 'node_modules')
  // A dsh home built by `npx @deepseek-ai/dsh`: find the versioned npx cache.
  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  const profilesModules = join(dshHome, 'profiles', 'node_modules')
  if (existsSync(join(profilesModules, '@deepseek-ai', 'dsh'))) return profilesModules
  const npxRoot = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'npm-cache', '_npx')
  if (existsSync(npxRoot)) {
    for (const entry of readdirSync(npxRoot)) {
      const candidate = join(npxRoot, entry, 'node_modules')
      if (existsSync(join(candidate, '@deepseek-ai', 'dsh', 'package.json'))) return candidate
    }
  }
  return undefined
}

/** Path of the dsh CLI entry point. @throws when the installation is missing. */
export function dshBin() {
  const install = installModulesDir()
  if (!install) throw new Error('cannot locate the dsh installation; set DSH_INSTALL to its node_modules directory')
  return join(install, '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

/** Directory of the profile whose tree the tools inspect. */
export function profileDir() {
  if (process.env.DSH_PROFILE_DIR) return process.env.DSH_PROFILE_DIR
  const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh')
  return join(dshHome, 'profiles', 'web')
}

/**
 * Resolve the package under verification the way the loader would.
 * @returns the absolute package.json path.
 */
export function resolvedManifest() {
  const root = packageRoot()
  const require = createRequire(join(profileDir(), 'package.json'))
  try {
    return require.resolve(`${require(join(root, 'package.json')).name}/package.json`)
  } catch {
    return require.resolve(join(root, 'package.json'))
  }
}
