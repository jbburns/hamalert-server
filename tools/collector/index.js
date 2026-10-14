#!/usr/bin/env node
/*
	HamAlert data collector

	Runs the real spot receivers (sotaspots.js, potaspots.js, dstar.js) and HTTP bridges for the
	feeds whose native transport is blocked where this runs (WWFF Spotline JSON, DX cluster via
	DXSummit, RBN via its web endpoint, PSK Reporter via the retrieval API), records:

	  data/raw/http-<hour>.ndjson           every upstream HTTP response (body when changed)
	  data/<source>/legacy-<hour>.ndjson    the spot object today's receiver emitted (+ _raw)
	  data/<source>/spots-<hour>.ndjson     the same spot converted to the proposed model
	  data/<source>/issues-<hour>.ndjson    conversion / validation findings, one per issue
	  data/<source>/dropped-<hour>.ndjson   records a bridge fed to a receiver that emitted nothing
	  data/summary-<ts>.json                counters at the end of the run

	Usage: node tools/collector/index.js [--hours 2] [--sources sotawatch,pota,dstar,wwff,cluster,rbn,pskreporter] [--data DIR]
	Then:  node tools/collector/report.js [DIR]
*/
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
function arg(name, def) { let i = args.indexOf(name); return i === -1 ? def : args[i + 1]; }
const hours = parseFloat(arg('--hours', '2'));
const dataDir = path.resolve(arg('--data', process.env.COLLECTOR_DATA || path.join(__dirname, 'data')));
const sources = arg('--sources', 'sotawatch,pota,dstar,wwff,cluster,rbn,pskreporter').split(',').map(s => s.trim()).filter(Boolean);

process.env.COLLECTOR_DATA = dataDir;
process.env.HAMALERT_CONFIG = path.join(__dirname, 'config.js');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
fs.mkdirSync(dataDir, {recursive: true});

const axios = require('axios');
const {NdjsonWriter, installCapture} = require('./lib/io');
const capture = installCapture(axios, dataDir);

const config = require('../../config_loader');
const refdata = require('./lib/refdata');
const makeFakeDb = require('./lib/fakedb');
const {convert} = require('./lib/convert');
const validate = require('./lib/validate');

const writers = new Map();
function writer(source, kind) {
	let key = `${source}/${kind}`;
	if (!writers.has(key)) writers.set(key, new NdjsonWriter(path.join(dataDir, source), kind));
	return writers.get(key);
}

const counters = {startedAt: new Date().toISOString(), sources: {}};
function counter(source) {
	if (!counters.sources[source]) counters.sources[source] = {legacy: 0, converted: 0, schemaErrors: 0, issues: {error: 0, warn: 0, info: 0}, dropped: 0, byCode: {}};
	return counters.sources[source];
}

let ctx;
function handleSpot(legacy) {
	legacy._receivedAt = new Date();
	let source = legacy.source || 'unknown';
	let c = counter(source);
	c.legacy++;
	writer(source, 'legacy').write(legacy);
	let result;
	try {
		result = convert(legacy, ctx);
	} catch (e) {
		c.issues.error++;
		writer(source, 'issues').write({t: legacy._receivedAt, source, code: 'convert-exception', severity: 'error', message: e.stack});
		return;
	}
	let {spot, issues} = result;
	let schemaIssues = validate(spot);
	if (schemaIssues.length) c.schemaErrors++;
	issues.push(...schemaIssues);
	c.converted++;
	writer(source, 'spots').write(spot);
	for (let is of issues) {
		c.issues[is.severity] = (c.issues[is.severity] || 0) + 1;
		c.byCode[is.code] = (c.byCode[is.code] || 0) + 1;
		writer(source, 'issues').write(Object.assign({t: legacy._receivedAt, source, spotId: spot.id}, is));
	}
}
function handleDropped(source, info) {
	counter(source).dropped++;
	writer(source, 'dropped').write(Object.assign({t: new Date().toISOString()}, info));
}

/** Make a receiver attach the upstream JSON record it is processing to the spot it emits. */
function attachRaw(receiver, method) {
	let orig = receiver[method].bind(receiver);
	receiver[method] = function (json) {
		receiver._currentRaw = JSON.parse(JSON.stringify(json));
		try { orig(json); } finally { receiver._currentRaw = null; }
	};
	receiver.on('spot', spot => { if (receiver._currentRaw) spot._raw = receiver._currentRaw; });
}

async function main() {
	console.log(`collector: ${hours} h, sources ${sources.join(',')}, data ${dataDir}`);
	let ref = await refdata.loadAll();
	ctx = {ref, config};
	let db = makeFakeDb(ref);
	const started = [];

	if (sources.includes('sotawatch')) {
		const SotaSpotReceiver = require('../../sotaspots');
		let r = new SotaSpotReceiver(db);
		attachRaw(r, 'processJsonSpot');
		r.on('spot', handleSpot);
		r.start(); started.push('sotawatch');
	}
	if (sources.includes('pota')) {
		const PotaSpotReceiver = require('../../potaspots'); // note: the module also starts a stray receiver of its own on require
		let r = new PotaSpotReceiver(db);
		attachRaw(r, 'processJsonSpot');
		r.on('spot', handleSpot);
		r.start(); started.push('pota');
	}
	if (sources.includes('dstar')) {
		const DstarReceiver = require('../../dstar');
		let r = new DstarReceiver({db});
		r.on('spot', handleSpot);
		r.start(); started.push('dstar');
	}
	const bridges = {wwff: './bridges/wwffjson', cluster: './bridges/cluster-mirror', rbn: './bridges/rbn-web', pskreporter: './bridges/pskreporter-xml'};
	for (let [name, mod] of Object.entries(bridges)) {
		if (!sources.includes(name)) continue;
		const Bridge = require(mod);
		let b = new Bridge();
		b.on('spot', handleSpot);
		b.on('dropped', info => handleDropped(name, info));
		b.start(); started.push(name);
	}
	console.log(`collector: started ${started.join(', ')}`);

	const tick = setInterval(() => {
		let parts = Object.entries(counters.sources).map(([s, c]) => `${s}=${c.legacy}/${c.converted}${c.schemaErrors ? `/!${c.schemaErrors}` : ''}${c.dropped ? `/d${c.dropped}` : ''}`);
		console.log(`[${new Date().toISOString()}] spots ${parts.join(' ')} | http ${capture.stats.responses} ok ${capture.stats.errors} err`);
	}, 60000);

	function finish(reason) {
		clearInterval(tick);
		counters.finishedAt = new Date().toISOString();
		counters.reason = reason;
		counters.http = capture.stats;
		fs.writeFileSync(path.join(dataDir, `summary-${counters.finishedAt.replace(/[:.]/g, '-')}.json`), JSON.stringify(counters, null, 2));
		for (let w of writers.values()) w.close();
		capture.writer.close();
		console.log(`collector: finished (${reason})`);
		process.exit(0);
	}
	setTimeout(() => finish('time limit'), hours * 3600 * 1000);
	process.on('SIGINT', () => finish('SIGINT'));
	process.on('SIGTERM', () => finish('SIGTERM'));
}

main().catch(e => { console.error(e); process.exit(1); });
