#!/usr/bin/env node
// Screenshot capture — no dependencies. Serves a built site directory over
// plain HTTP and drives an installed Chrome/Chromium through the DevTools
// protocol (Node's built-in WebSocket + fetch), one PNG per
// page × width × colour-scheme:
//
//   node tools/capture-screenshots.mjs --root public --out shots/after
//
// Pages: the home page, one post, and the projects ledger (/progress/).
// Widths: 1440 (desktop) and 390 (phone), colour-scheme light and dark
// (emulated via CDP, so no site feature is needed to force a theme).
//
// Options:
//   --root <dir>     built site to serve        (default public)
//   --out <dir>      where PNGs land            (default shots)
//   --port <n>       HTTP port for the server   (default 58910)
//   --chrome <path>  browser binary             (default: macOS Chrome, then
//                    chromium/google-chrome/chrome on PATH)

import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const SITE = resolve(ROOT, arg('root', 'public'));
const OUT = resolve(ROOT, arg('out', 'shots'));
const PORT = Number(arg('port', 58910));

const CHROME_CANDIDATES = [
	process.env.CHROME_PATH,
	arg('chrome', null),
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
].filter(Boolean);
let chrome = CHROME_CANDIDATES.find((p) => { try { statSync(p); return true; } catch { return false; } });
if (!chrome) {
	for (const name of ['google-chrome', 'chromium', 'chrome']) {
		try { chrome = execFileSync('which', [name], { encoding: 'utf8' }).trim(); if (chrome) break; } catch {}
	}
}
if (!chrome) { console.error('no Chrome/Chromium found; pass --chrome <path>'); process.exit(2); }

const PAGES = [
	['home', '/'],
	['post', '/posts/i-made-an-ai-read-the-rust-book/'],
	['ledger', '/progress/'],
];
const SIZES = [
	{ w: 1440, h: 900, scale: 1, mobile: false, tag: '1440' },
	{ w: 390, h: 844, scale: 2, mobile: true, tag: '390' },
];
const THEMES = ['light', 'dark'];

// ---- tiny static server --------------------------------------------------
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.xml': 'text/xml', '.txt': 'text/plain', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
	let path = new URL(req.url, 'http://x').pathname;
	if (path.endsWith('/')) path += 'index.html';
	try {
		const body = readFileSync(join(SITE, path));
		res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
		res.end(body);
	} catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

// ---- Chrome via CDP ------------------------------------------------------
const DEBUG_PORT = PORT + 1;
const profile = join(tmpdir(), `capture-${process.pid}`);
const child = spawn(chrome, [
	'--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*',
	`--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', '--disable-sync',
	'--disable-background-networking', '--mute-audio', '--no-default-browser-check',
	'--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
	let targets;
	for (let i = 0; i < 50; i++) {
		try { targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json(); break; }
		catch { await sleep(200); }
	}
	if (!targets) throw new Error(`no CDP target list on :${DEBUG_PORT}`);
	const page = targets.find((t) => t.type === 'page');
	if (!page) throw new Error('no page target found');

	ws = new WebSocket(page.webSocketDebuggerUrl);
	await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

	let msgId = 0;
	const pending = new Map();
	const events = [];
	ws.onmessage = (e) => {
		const m = JSON.parse(e.data);
		if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
		else if (m.method) events.push(m.method);
	};
	const send = (method, params = {}) => new Promise((res, rej) => {
		const id = ++msgId;
		pending.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
		ws.send(JSON.stringify({ id, method, params }));
	});

	mkdirSync(OUT, { recursive: true });
	await send('Page.enable');
	await send('Runtime.enable');

	for (const theme of THEMES) {
		await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
		for (const size of SIZES) {
			await send('Emulation.setDeviceMetricsOverride', {
				width: size.w, height: size.h, deviceScaleFactor: size.scale, mobile: size.mobile,
			});
			for (const [name, path] of PAGES) {
				events.length = 0;
				await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${path}` });
				for (let i = 0; i < 100 && !events.includes('Page.loadEventFired'); i++) await sleep(100);
				await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>1)', awaitPromise: true });
				await sleep(250); // let the ticker/theme settle
				const shot = await send('Page.captureScreenshot', { format: 'png' });
				const file = join(OUT, `${name}-${size.tag}-${theme}.png`);
				writeFileSync(file, Buffer.from(shot.data, 'base64'));
				console.log(`${name}-${size.tag}-${theme}.png`);
			}
		}
	}
} finally {
	ws?.close();
	child.kill();
	try { rmSync(profile, { recursive: true, force: true }); } catch {}
	server.close();
}
