#!/usr/bin/env node
// Stylesheet contrast check — no dependencies.
//
// Reads the site stylesheet, resolves every --token custom property on :root
// (each colour is declared once as light-dark(<light>, <dark>), or a single
// value that serves both schemes), then computes the WCAG contrast ratio of
// every text/surface pair declared in the same file:
//
//   /* check: --foreground on --background 4.5 */
//
// The floor is per pair: 4.5 for normal text, 3.0 for large text and
// component boundaries (WCAG 1.4.3 / 1.4.11). Both schemes are checked —
// a pair that passes light and fails dark fails the run.
//
//   node tools/check-contrast.mjs [path/to/style.css]   (default static/style.css)
//
// Pairs that don't exist aren't checked: the site draws no form fields, so
// --input has no boundary pair (the pasted value can't reach 3:1 anyway —
// a future form must declare a compliant pair before it ships).

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CSS_PATH = resolve(ROOT, process.argv[2] ?? 'static/style.css');
const css = readFileSync(CSS_PATH, 'utf8');

const fail = (msg) => { console.error(`check-contrast: ${msg}`); process.exit(2); };

// ---- Extract the :root token block -------------------------------------
const rootMatch = css.match(/:root\s*\{/);
if (!rootMatch) fail(`no :root { } block found in ${CSS_PATH}`);
let depth = 0, end = -1;
for (let i = rootMatch.index + rootMatch[0].length - 1; i < css.length; i++) {
	if (css[i] === '{') depth++;
	else if (css[i] === '}' && --depth === 0) { end = i; break; }
}
if (end === -1) fail('unbalanced braces in :root block');
const block = css.slice(rootMatch.index, end + 1);

// ---- Parse custom properties: --name: value; ---------------------------
// A value may be light-dark(<a>, <b>) -> {light: a, dark: b}, var(--x) ->
// resolved one level deep, or a plain value serving both schemes.
const raw = new Map();
for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
	raw.set(m[1], m[2].trim());

function splitTopLevel(s) { // split on commas not inside parentheses
	const parts = []; let d = 0, cur = '';
	for (const ch of s) {
		if (ch === '(') d++;
		else if (ch === ')') d--;
		if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch;
	}
	parts.push(cur);
	return parts.map((p) => p.trim());
}
const resolveVar = (v, seen = new Set()) =>
	v.replace(/var\((--[\w-]+)\)/g, (_, name) => {
		if (!raw.has(name)) fail(`var(${name}) is used but never defined`);
		if (seen.has(name)) fail(`circular var() reference at ${name}`);
		return resolveVar(raw.get(name), new Set(seen).add(name));
	});
const tokens = new Map();
for (const [name, value] of raw) {
	const v = resolveVar(value);
	const ld = v.match(/^light-dark\((.*)\)$/);
	if (ld) {
		const [l, d] = splitTopLevel(ld[1]);
		if (d === undefined) fail(`${name}: light-dark() needs exactly two values`);
		tokens.set(name, { light: l, dark: d });
	} else tokens.set(name, { light: v, dark: v });
}

// ---- Colours -> linear sRGB -> WCAG luminance --------------------------
const num = (s) => Number.parseFloat(s);
function channel(c) { return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function luminance([r, g, b]) { return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b); }

function toSrgb(value) {
	const v = value.trim();
	let m;
	if ((m = v.match(/^oklch\(([^)]*)\)$/))) {
		const p = m[1].split(/[\s/]+/).filter(Boolean).slice(0, 3);
		let [L, C, H] = p.map(num);
		if (String(p[0]).includes('%')) L /= 100;
		if (String(p[1]).includes('%')) C *= 0.004 * 100 / 10; // C% is of 0.4
		const hr = (H * Math.PI) / 180, a = C * Math.cos(hr), b = C * Math.sin(hr);
		const l_ = L + 0.3963377774 * a + 0.2158037573 * b,
		      m_ = L - 0.1055613458 * a - 0.0638541728 * b,
		      s_ = L - 0.0894841775 * a - 1.2914855480 * b;
		const l = l_ ** 3, mm = m_ ** 3, s = s_ ** 3;
		const gam = (x) => { x = Math.min(1, Math.max(0, x)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055; };
		return [gam(+4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
		        gam(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
		        gam(-0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s)];
	}
	if ((m = v.match(/^hsla?\(([^)]*)\)$/))) {
		const p = splitTopLevel(m[1].replace(/\//g, ','));
		const h = ((num(p[0]) % 360) + 360) % 360,
		      s = num(p[1]) / 100, l = num(p[2]) / 100;
		const f = (n) => { const k = (n + h / 30) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
		return [f(0), f(8), f(4)];
	}
	if ((m = v.match(/^#([0-9a-f]{3,8})$/i))) {
		let h = m[1];
		if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
		return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
	}
	if ((m = v.match(/^rgba?\(([^)]*)\)$/))) {
		const p = splitTopLevel(m[1].replace(/\//g, ','));
		return p.slice(0, 3).map((c) => (String(c).includes('%') ? num(c) / 100 : num(c) / 255));
	}
	if (v === 'white') return [1, 1, 1];
	if (v === 'black') return [0, 0, 0];
	fail(`can't parse colour "${value}"`);
}

// ---- The declared pairs --------------------------------------------------
const checks = [...css.matchAll(/\/\*\s*check:\s*(--[\w-]+)\s+on\s+(--[\w-]+)\s+(\d+(?:\.\d+)?)\s*(boundary|large|text)?\s*\*\//g)]
	.map((m) => ({ fg: m[1], bg: m[2], min: num(m[3]), kind: m[4] ?? 'text' }));
if (checks.length === 0) fail(`no "/* check: --fg on --bg MIN */" pairs declared in ${CSS_PATH}`);

const ratio = (a, b) => { const [x, y] = [a, b].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const hex = (c) => '#' + c.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');

let bad = 0;
for (const theme of ['light', 'dark']) {
	console.log(`\n${theme}`);
	for (const { fg, bg, min, kind } of checks) {
		for (const name of [fg, bg]) if (!tokens.has(name)) fail(`check uses ${name} but it isn't defined on :root`);
		const F = toSrgb(tokens.get(fg)[theme]), B = toSrgb(tokens.get(bg)[theme]);
		const r = ratio(luminance(F), luminance(B));
		const ok = r >= min;
		if (!ok) bad++;
		console.log(`  ${ok ? 'PASS' : 'FAIL'} ${r.toFixed(2).padStart(5)} (min ${min}) ${fg} ${hex(F)} on ${bg} ${hex(B)}${kind === 'text' ? '' : ` [${kind}]`}`);
	}
}
console.log(bad ? `\n${bad} pair(s) under their floor.` : '\nall pairs pass.');
process.exit(bad ? 1 : 0);
