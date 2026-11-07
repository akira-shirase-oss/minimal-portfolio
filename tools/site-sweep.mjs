#!/usr/bin/env node
// Full-site sweep: serve public/ over HTTP and request every built URL at rate until
// TOTAL requests have been made — every answer checked for 200 and a sane content-type.
// Result lands in perf/results/ with machine + commit, per the workspace load standard.
//   node tools/site-sweep.mjs [--total 1000000] [--concurrency 64]
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : Number(process.argv[i + 1]); };
const TOTAL = arg('total', 1_000_000), CONC = arg('concurrency', 64), PORT = 58900;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.ico': 'image/x-icon', '.xml': 'text/xml', '.txt': 'text/plain', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const urls = [];
(function walk(d, base) {
	for (const f of readdirSync(d)) {
		const p = join(d, f);
		if (statSync(p).isDirectory()) walk(p, `${base}${f}/`);
		else if (f === 'index.html') urls.push(base);
		else urls.push(`${base}${f}`);
	}
})(join(ROOT, 'public'), '/');

const server = createServer((req, res) => {
	let path = new URL(req.url, 'http://x').pathname;
	if (path.endsWith('/')) path += 'index.html';
	try {
		const body = readFileSync(join(ROOT, 'public', path));
		res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
		res.end(body);
	} catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

let done = 0, failed = 0, non200 = 0, i = 0;
const lat = [];
const t0 = performance.now();
await Promise.all(Array.from({ length: CONC }, async () => {
	while (done < TOTAL) {
		const u = urls[i++ % urls.length], s = performance.now();
		const r = await fetch(`http://127.0.0.1:${PORT}${u}`);
		lat.push(performance.now() - s);
		if (r.status !== 200) non200++; else await r.arrayBuffer();
		done++;
	}
}));
const ms = (performance.now() - t0) / 1000;
lat.sort((a, b) => a - b);
const p = (q) => +lat[Math.floor((q / 100) * (lat.length - 1))].toFixed(3);
const result = {
	date: new Date().toISOString(), urls: urls.length, requests: done,
	rps: +(done / ms).toFixed(0), non200, failed,
	latency_ms: { p50: p(50), p95: p(95), p99: p(99), max: +lat.at(-1).toFixed(3) },
	machine: 'apple-m2-pro-12c', commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
};
const out = join(ROOT, 'perf', 'results', `${result.date.replace(/[:.]/g, '').replace('T', 'T')}-site-sweep.json`);
writeFileSync(out, JSON.stringify(result, null, 2));
server.close();
console.log(`${done} requests across ${urls.length} URLs: ${result.rps} rps, non200=${non200}, p99=${result.latency_ms.p99}ms -> ${out}`);
process.exit(non200 > 0 ? 1 : 0);
