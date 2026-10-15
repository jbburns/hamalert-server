#!/usr/bin/env node
/* Summarizes a collector data dir into report.md: counts, field presence, vocabularies, issues, drops. */
const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(process.argv[2] || process.env.COLLECTOR_DATA || path.join(__dirname, 'data'));

function readNdjson(dir, prefix) {
	let out = [];
	if (!fs.existsSync(dir)) return out;
	for (let f of fs.readdirSync(dir).filter(f => f.startsWith(prefix + '-') && f.endsWith('.ndjson')).sort()) {
		for (let line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
			if (!line) continue;
			try { out.push(JSON.parse(line)); } catch (e) {}
		}
	}
	return out;
}
function pct(n, d) { return d ? `${(100 * n / d).toFixed(1)}%` : '-'; }
function top(counts, n = 20) { return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n); }
function inc(obj, k) { obj[k] = (obj[k] || 0) + 1; }

function flattenKeys(obj, prefix = '') {
	let keys = [];
	for (let [k, v] of Object.entries(obj)) {
		if (k === 'provenance' || k === 'precision') { keys.push(prefix + k); continue; }
		keys.push(prefix + k);
		if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...flattenKeys(v, prefix + k + '.'));
		if (Array.isArray(v) && v.length && typeof v[0] === 'object') keys.push(...flattenKeys(v[0], prefix + k + '[].'));
	}
	return keys;
}

const sources = fs.readdirSync(dataDir).filter(d => fs.statSync(path.join(dataDir, d)).isDirectory() && d !== 'raw' && d !== 'cache').sort();
let md = [`# Collector report`, ``, `Data dir: \`${dataDir}\`. Generated ${new Date().toISOString()}.`, ``];
let summaries = fs.readdirSync(dataDir).filter(f => f.startsWith('summary-')).sort();
if (summaries.length) {
	let s = JSON.parse(fs.readFileSync(path.join(dataDir, summaries[summaries.length - 1]), 'utf8'));
	md.push(`Last run: ${s.startedAt} to ${s.finishedAt} (${s.reason}); HTTP ${s.http && s.http.responses} responses, ${s.http && s.http.errors} errors.`, ``);
}

md.push(`## Overview`, ``, `| Source | Legacy spots | Converted | Schema errors | Issues (error/warn/info) | Dropped by receiver |`, `|---|---|---|---|---|---|`);
const per = {};
for (let src of sources) {
	let dir = path.join(dataDir, src);
	let spots = readNdjson(dir, 'spots'), legacy = readNdjson(dir, 'legacy'), issues = readNdjson(dir, 'issues'), dropped = readNdjson(dir, 'dropped');
	per[src] = {spots, legacy, issues, dropped};
	let sev = {error: 0, warn: 0, info: 0};
	for (let i of issues) inc(sev, i.severity);
	let schemaErr = new Set(issues.filter(i => i.code === 'schema').map(i => i.spotId)).size;
	md.push(`| ${src} | ${legacy.length} | ${spots.length} | ${schemaErr} | ${sev.error}/${sev.warn}/${sev.info} | ${dropped.length} |`);
}
md.push(``);

for (let src of sources) {
	let {spots, issues, dropped, legacy} = per[src];
	md.push(`## ${src}`, ``);
	if (!spots.length) { md.push(`No spots.`, ``); if (dropped.length) { md.push(`Dropped by receiver: ${dropped.length}`); let reasons = {}; for (let d of dropped) inc(reasons, d.reason); for (let [r, n] of top(reasons)) md.push(`- ${n} x ${r}`); md.push(''); for (let d of dropped.slice(0, 5)) md.push('    ' + (d.line || JSON.stringify(d.raw)).slice(0, 160)); md.push(''); } continue; }

	// field presence
	let presence = {};
	for (let s of spots) for (let k of new Set(flattenKeys(s))) inc(presence, k);
	md.push(`### Field presence (${spots.length} spots)`, ``, `| Field | Present |`, `|---|---|`);
	for (let [k, n] of Object.entries(presence).sort()) md.push(`| ${k} | ${pct(n, spots.length)} |`);
	md.push(``);

	// vocabularies
	let vocab = {activity: {}, mode: {}, modeDetail: {}, 'spotter.kind': {}, 'spotter.relay': {}, band: {}, client: {}};
	let prov = {}, prec = {};
	for (let s of spots) {
		inc(vocab.activity, s.activity); inc(vocab.mode, s.mode || '(none)'); inc(vocab.modeDetail, s.modeDetail || '(none)');
		inc(vocab['spotter.kind'], s.spotter ? s.spotter.kind : '(none)'); if (s.spotter && s.spotter.relay) inc(vocab['spotter.relay'], s.spotter.relay);
		inc(vocab.band, s.band || '(none)'); if (s.client) inc(vocab.client, s.client);
		for (let [k, v] of Object.entries(s.provenance || {})) inc(prov, `${k.replace(/\.\d+\./, '.N.')}=${v}`);
		for (let [k, v] of Object.entries(s.precision || {})) inc(prec, `${k}=${v}`);
	}
	md.push(`### Vocabularies`, ``);
	for (let [name, counts] of Object.entries(vocab)) {
		let t = top(counts, 25);
		if (!t.length) continue;
		md.push(`- **${name}**: ${t.map(([k, n]) => `${k} ${n}`).join(', ')}`);
	}
	md.push(`- **provenance**: ${top(prov, 30).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`);
	md.push(`- **precision**: ${top(prec).map(([k, n]) => `${k} ${n}`).join(', ') || 'none'}`, ``);

	// issues
	let byCode = {}, examples = {};
	for (let i of issues) { inc(byCode, `${i.severity}:${i.code}`); (examples[`${i.severity}:${i.code}`] = examples[`${i.severity}:${i.code}`] || []); if (examples[`${i.severity}:${i.code}`].length < 3 && !examples[`${i.severity}:${i.code}`].includes(i.message)) examples[`${i.severity}:${i.code}`].push(i.message); }
	md.push(`### Issues`, ``);
	if (!issues.length) md.push(`None.`);
	for (let [code, n] of top(byCode, 40)) md.push(`- **${code}** ${n} (${pct(n, spots.length)} of spots): ${examples[code].map(e => '`' + String(e).replace(/`/g, "'").slice(0, 140) + '`').join('; ')}`);
	md.push(``);

	// unmapped legacy fields detail
	let unm = {};
	for (let i of issues) if (i.code === 'legacy-field-unmapped') inc(unm, i.field);
	if (Object.keys(unm).length) md.push(`Unmapped legacy fields: ${top(unm).map(([k, n]) => `${k} ${n}`).join(', ')}`, ``);

	// dropped
	if (dropped.length) {
		let reasons = {};
		for (let d of dropped) inc(reasons, d.reason);
		md.push(`### Dropped by receiver (${dropped.length})`, ``);
		for (let [r, n] of top(reasons)) md.push(`- ${n} x ${r}`);
		md.push(``);
		for (let d of dropped.slice(0, 8)) md.push('    ' + (d.line || JSON.stringify(d.raw)).slice(0, 160));
		md.push(``);
	}

	// a few samples
	md.push(`### Samples`, ``, '```json');
	for (let s of spots.slice(-2)) md.push(JSON.stringify(s));
	md.push('```', ``);
}

// cross-source overlap: same base callsign + band within 10 minutes from different sources
let all = [];
for (let src of sources) for (let s of per[src].spots) all.push(s);
all.sort((a, b) => a.time < b.time ? -1 : 1);
let overlaps = {};
for (let i = 0; i < all.length; i++) {
	for (let j = i + 1; j < all.length && new Date(all[j].time) - new Date(all[i].time) < 600000; j++) {
		if (all[i].source !== all[j].source && all[i].baseCallsign === all[j].baseCallsign && all[i].band === all[j].band && all[i].band) inc(overlaps, [all[i].source, all[j].source].sort().join('+'));
	}
}
md.push(`## Cross-source overlap (same base callsign and band within 10 min)`, ``);
for (let [k, n] of top(overlaps)) md.push(`- ${k}: ${n}`);
if (!Object.keys(overlaps).length) md.push(`none`);
md.push(``);

fs.writeFileSync(path.join(dataDir, 'report.md'), md.join('\n'));
console.log(md.join('\n'));
