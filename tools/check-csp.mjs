#!/usr/bin/env node
// Content-Security-Policy check — no dependencies.
//
// The production CSP lives in static/_headers (Cloudflare Pages response
// headers); the HTML carries no <meta> policy, so _headers is the one source
// of truth. This check builds the site, then verifies:
//
//   1. every executable inline <script> in public/ has its sha256 hash in the
//      _headers script-src (a missing hash = the script would be blocked);
//   2. no sha256 in _headers is stale (declared but no built script matches);
//   3. no <meta http-equiv="Content-Security-Policy"> in built output (a meta
//      policy would intersect with the header one and drift apart);
//   4. no inline on*= event handlers (they can't be hash-allowed portably).
//
// <script type="application/ld+json"> blocks are data, not code — the spec's
// script check never fires on them — so they are counted but not hashed.
// Style="..." attributes can't be hashed without 'unsafe-hashes' (patchy
// browser support), so style-src keeps 'unsafe-inline'; that's deliberate.
//
//   node tools/check-csp.mjs           build, then verify
//   node tools/check-csp.mjs --print   build, then print the required hashes
//   ZOLA=/path/to/zola                 override the zola binary
//
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'public');
const HEADERS = resolve(ROOT, 'static/_headers');
const PRINT = process.argv.includes('--print');

// Build first: the check always runs against fresh output.
const ZOLA = process.env.ZOLA ?? (existsSync(`${homedir()}/.local/bin/zola`) ? `${homedir()}/.local/bin/zola` : 'zola');
const build = spawnSync(ZOLA, ['build'], { cwd: ROOT, stdio: 'inherit' });
if (build.status !== 0) { console.error(`check-csp: zola build failed (${build.status})`); process.exit(2); }

// script-src 'sha256-...' tokens declared in the /* rule of static/_headers.
function headersCsp(text) {
	const lines = text.split('\n');
	let inBlock = false;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (/^\/\*\s*$/.test(line)) { inBlock = true; continue; }
		if (inBlock && /^\S/.test(line) && !line.trimStart().startsWith('#')) inBlock = false; // next rule
		if (inBlock && /^\s+Content-Security-Policy:\s*/.test(line))
			return line.replace(/^\s*Content-Security-Policy:\s*/, '').trim();
	}
	return null;
}
// script-src 'sha256-...' tokens declared in the /* rule of static/_headers.
// (--print runs without a CSP, so the set is built lazily after scanning.)
let csp = null;
try { csp = headersCsp(readFileSync(HEADERS, 'utf8')); } catch { /* checked below */ }

// Scan every built page.
function* htmlFiles(dir) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) yield* htmlFiles(p);
		else if (name.endsWith('.html')) yield p;
	}
}
const EXECUTABLE = /^(module|importmap|speculationrules|text\/javascript|application\/javascript|application\/ecmascript|text\/ecmascript)$/i;
const required = new Set();   // sha256-... strings the built output needs
let scripts = 0, dataBlocks = 0, pages = 0;
const drift = [], handlers = [];
for (const f of htmlFiles(PUBLIC)) {
	pages++;
	const html = readFileSync(f, 'utf8');
	if (/http-equiv="Content-Security-Policy"/i.test(html)) drift.push(f);
	for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
		const [, attrs, body] = m;
		if (/\bsrc\s*=/.test(attrs)) continue;
		const type = (attrs.match(/\btype\s*=\s*"([^"]*)"/i)?.[1] ?? '').trim();
		if (type && !EXECUTABLE.test(type)) { dataBlocks++; continue; } // ld+json & friends: never execute
		scripts++;
		required.add(`sha256-${createHash('sha256').update(body).digest('base64')}`);
	}
	for (const m of html.matchAll(/\son\w+\s*=/g)) handlers.push(`${f}: ${m[0].trim()}`);
}

if (PRINT) {
	for (const h of required) console.log(`'${h}'`);
	console.error(`(${required.size} distinct hash${required.size === 1 ? '' : 'es'} over ${scripts} inline scripts on ${pages} pages)`);
	process.exit(0);
}
if (!csp) { console.error(`check-csp: no Content-Security-Policy in the /* rule of ${HEADERS}`); process.exit(2); }
const declared = new Set();
for (const d of csp.split(';')) {
	const parts = d.trim().split(/\s+/);
	if (parts[0] === 'script-src') for (const p of parts.slice(1)) if (p.startsWith("'sha256-")) declared.add(p.slice(1, -1));
}

let fail = 0;
for (const h of required) if (!declared.has(h)) { fail++; console.log(`  MISSING ${h} — used in built pages, absent from _headers`); }
for (const h of declared) if (!required.has(h)) { fail++; console.log(`  STALE ${h} — in _headers, matches no built script`); }
for (const f of drift) { fail++; console.log(`  DRIFT meta CSP in ${f} — the policy belongs in _headers only`); }
for (const h of handlers.slice(0, 10)) { fail++; console.log(`  HANDLER ${h} — inline handlers can't be hash-allowed; use addEventListener`); }
if (handlers.length > 10) console.log(`  … and ${handlers.length - 10} more handlers`);

console.log(`\n${scripts} executable inline scripts (${dataBlocks} data blocks skipped), ${declared.size} declared hashes, ${required.size} required.`);
console.log(fail ? `${fail} problem(s).` : 'csp manifest matches the built output.');
process.exit(fail ? 1 : 0);
