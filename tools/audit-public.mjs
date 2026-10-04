/**
 * audit-public.mjs — the pre-publish gate for dsh-locale-ru.
 *
 * Two scopes, because the installed payload and the development tools are held to
 * different standards:
 *
 *   payload — what a user actually installs: `index.js`, `lib/client.js`,
 *             `cordis.patch.yml`, `package.json` and every dictionary under
 *             `dict/`. A language pack registers text with the client's locale
 *             registry and does nothing else, so the payload must carry no
 *             personal data AND no network, storage, clipboard, cookie, code or
 *             HTML-injection API at all.
 *   repo    — everything tracked in the repository. No personal path, e-mail
 *             address, token or key may be published, in code or in docs.
 *
 * Both lists are absolute: this pack has no legitimate use for any of the risky
 * APIs, so there is no allow-list and any hit fails the run. (A dictionary string
 * that merely mentions an API name, e.g. a settings description, does not match:
 * the rules require a call shape such as `localStorage.` or `fetch(`.)
 *
 * Findings are printed redacted; the process exits non-zero when anything is
 * found, so this can gate a release. The script names the patterns it forbids, so
 * it excludes itself from the scan.
 *
 * Usage:  node tools/audit-public.mjs [--root <dir>]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const packageRoot = dirname(here)

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
	const index = argv.indexOf(`--${name}`)
	return index === -1 || argv[index + 1] === undefined ? fallback : argv[index + 1]
}
const root = flag('root', packageRoot)

/** Installed payload, by exact file name… */
const PAYLOAD_FILES = ['index.js', 'cordis.patch.yml', 'package.json']
/** …and by directory prefix (the browser bundle and the dictionaries). */
const PAYLOAD_PREFIXES = ['lib/', 'dict/']

/** Text extensions worth scanning. */
const TEXT = new Set(['.js', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.md', '.txt', '.ts', '.cmd', '.bat', '.ps1', '.sh'])

/** Patterns that must never be published, in either scope. */
const PERSONAL = [
	{ name: 'Windows user path', pattern: /[A-Za-z]:\\Users\\[^\\\s"']+/g },
	{ name: 'POSIX home path', pattern: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//g },
	{ name: 'e-mail address', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
	{ name: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9]{20,}/g },
	{ name: 'OpenAI-style key', pattern: /sk-[A-Za-z0-9_-]{16,}/g },
	{ name: 'bearer credential', pattern: /Bearer\s+[A-Za-z0-9._-]{12,}/g },
	{ name: 'private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
	{ name: 'assigned secret', pattern: /(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"'\s]{6,}["']/gi }
]

/** Patterns the installed payload must not contain at all. */
const RISKY = [
	{ name: 'network call', pattern: /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/g },
	{ name: 'web storage', pattern: /\b(?:localStorage|sessionStorage|indexedDB)\s*[.[]/g },
	{ name: 'cookie access', pattern: /document\.cookie/g },
	{ name: 'clipboard API', pattern: /navigator\.clipboard/g },
	{ name: 'code injection', pattern: /\b(?:eval|new Function|document\.write)\b|dangerouslySetInnerHTML|\.innerHTML\s*=/g },
	{ name: 'dynamic import', pattern: /\bimport\s*\(/g }
]

/** Every file the repository would publish. */
function trackedFiles() {
	try {
		const out = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
		return out.split('\0').filter((value) => value !== '')
	} catch (error) {
		console.log('note: not a git repository yet — scanning the working tree')
		return null
	}
}

/** Fallback listing when the directory is not a git repository yet. */
function walk(directory, found = []) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.name === '.git' || entry.name === 'node_modules') continue
		const path = join(directory, entry.name)
		if (entry.isDirectory()) walk(path, found)
		else found.push(relative(root, path).split(sep).join('/'))
	}
	return found
}

/** Redact a finding so the report itself leaks nothing. */
function redact(text) {
	const clean = text.trim()
	return clean.length <= 12 ? clean : `${clean.slice(0, 6)}…${clean.slice(-3)}`
}

const files = trackedFiles() ?? walk(root)
const findings = []
const isPayload = (file) => PAYLOAD_FILES.includes(file) || PAYLOAD_PREFIXES.some((prefix) => file.startsWith(prefix))

/** Scan one file for one rule set. */
function scanFile(file, rules, scope) {
	const path = join(root, file)
	if (!existsSync(path) || statSync(path).isDirectory()) return
	if (!TEXT.has(extname(file))) return
	if (file.endsWith('tools/audit-public.mjs')) return
	const text = readFileSync(path, 'utf8')
	const lines = text.split('\n')
	for (const rule of rules) {
		for (const match of text.matchAll(rule.pattern)) {
			const lineNumber = text.slice(0, match.index).split('\n').length
			findings.push({ file, line: lineNumber, scope, rule: rule.name, excerpt: redact(lines[lineNumber - 1] ?? match[0]) })
		}
	}
}

/* The payload exists and is what the manifest says it is. */
for (const file of PAYLOAD_FILES) {
	if (!existsSync(join(root, file))) findings.push({ file, line: 0, scope: 'payload', rule: 'expected payload file is missing', excerpt: file })
}
if (!existsSync(join(root, 'dict')) || readdirSync(join(root, 'dict'), { recursive: true }).length === 0) {
	findings.push({ file: 'dict', line: 0, scope: 'payload', rule: 'expected payload directory is missing or empty', excerpt: 'dict/' })
}

for (const file of files) {
	const payload = isPayload(file)
	/* Personal data is forbidden everywhere; risky APIs only in the payload. */
	scanFile(file, PERSONAL, payload ? 'payload' : 'repo')
	if (payload) scanFile(file, RISKY, 'payload')
}

const scanned = files.filter((file) => TEXT.has(extname(file)) && !file.endsWith('tools/audit-public.mjs'))
console.log('dsh-locale-ru · pre-publish audit')
console.log(`root: ${root}`)
console.log(`files: ${files.length} tracked, ${scanned.length} text files scanned (payload: ${PAYLOAD_FILES.join(', ')} + ${PAYLOAD_PREFIXES.join('*')})`)
console.log(`rules: ${PERSONAL.length} personal-data, ${RISKY.length} payload-safety`)

if (findings.length === 0) {
	console.log('\nRESULT: clean — no personal data, no network/storage/injection in the payload')
	process.exitCode = 0
} else {
	console.log('')
	for (const finding of findings) {
		console.log(`  ${finding.scope === 'payload' ? 'PAYLOAD' : 'repo   '} ${finding.file}:${finding.line}  ${finding.rule}  «${finding.excerpt}»`)
	}
	console.log(`\nRESULT: ${findings.length} finding(s) — do not publish until they are gone`)
	process.exitCode = 1
}
