#!/usr/bin/env node
// Project-link check — no dependencies.
//
// Reads the [extra.links.*] map in zola.toml (the same map the templates
// draw the Website · Docs · Source rows from) and requests every URL.
// A URL that answers anything but 200 fails the run. A URL that can't be
// reached at all means this machine is probably offline: locally that's a
// warning and the run passes (builds must work without a network), in CI
// (the CI env var set) an unreachable URL fails — there, "can't reach it"
// really does mean the link is broken.
//
//   node tools/check-links.mjs [path/to/zola.toml]   (default zola.toml)

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOML = resolve(ROOT, process.argv[2] ?? 'zola.toml');
const CI = !!process.env.CI;

const urls = []; // [{slug, key, url}]
let current = null;
for (const line of readFileSync(TOML, 'utf8').split('\n')) {
	const t = line.trim();
	const head = t.match(/^\[extra\.links\.([^\]]+)\]$/);
	if (head) { current = head[1]; continue; }
	if (t.startsWith('[')) { current = null; continue; }
	const kv = current && t.match(/^(website|docs|source)\s*=\s*"([^"]+)"\s*(?:#.*)?$/);
	if (kv) urls.push({ slug: current, key: kv[1], url: kv[2] });
}
if (urls.length === 0) { console.error(`check-links: no [extra.links.*] URLs found in ${TOML}`); process.exit(2); }

const TIMEOUT = 15_000;
let bad = 0, skipped = 0;
await Promise.all(urls.map(async ({ slug, key, url }) => {
	let status;
	try {
		const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) });
		status = r.status;
		await r.arrayBuffer(); // drain so the connection completes cleanly
	} catch (e) {
		skipped++;
		console.log(`  UNREACHABLE ${slug}.${key} ${url} (${e.cause?.code ?? e.name ?? 'network'})`);
		return;
	}
	const ok = status === 200;
	if (!ok) bad++;
	console.log(`  ${ok ? 'PASS' : 'FAIL'} ${status} ${slug}.${key} ${url}`);
}));

console.log(`\n${urls.length} URLs: ${urls.length - bad - skipped} ok, ${bad} bad, ${skipped} unreachable.`);
if (skipped) console.log(CI ? 'unreachable URLs in CI count as failures.' : 'unreachable URLs skipped — offline run, nothing was verified for them.');
process.exit(bad || (CI && skipped) ? 1 : 0);
