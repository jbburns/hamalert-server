#!/usr/bin/env node
/*
	Replays recorded legacy spots (data/<source>/legacy-*.ndjson) through the current converter
	and rewrites spots-*.ndjson and issues-*.ndjson for that data dir. Use it to iterate on
	lib/convert.js and schema/spot.schema.json without collecting again.

	Usage: node tools/collector/reconvert.js [DIR]
*/
const fs = require('fs');
const path = require('path');
const dataDir = path.resolve(process.argv[2] || process.env.COLLECTOR_DATA || path.join(__dirname, 'data'));
process.env.COLLECTOR_DATA = dataDir;
process.env.HAMALERT_CONFIG = path.join(__dirname, 'config.js');
const config = require('../../config_loader');
const refdata = require('./lib/refdata');
const {convert} = require('./lib/convert');
const validate = require('./lib/validate');

async function main() {
	let ref = await refdata.loadAll();
	let ctx = {ref, config};
	let totals = {spots: 0, issues: 0, schemaErrors: 0};
	for (let src of fs.readdirSync(dataDir)) {
		let dir = path.join(dataDir, src);
		if (!fs.statSync(dir).isDirectory() || src === 'raw' || src === 'cache') continue;
		for (let f of fs.readdirSync(dir).filter(f => f.startsWith('legacy-') && f.endsWith('.ndjson'))) {
			let hour = f.slice('legacy-'.length, -'.ndjson'.length);
			let spotsOut = [], issuesOut = [];
			for (let line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
				if (!line) continue;
				let legacy = JSON.parse(line);
				let {spot, issues} = convert(legacy, ctx);
				let schemaIssues = validate(spot);
				if (schemaIssues.length) totals.schemaErrors++;
				issues.push(...schemaIssues);
				spotsOut.push(JSON.stringify(spot));
				for (let is of issues) issuesOut.push(JSON.stringify(Object.assign({t: legacy._receivedAt, source: spot.source, spotId: spot.id}, is)));
				totals.spots++; totals.issues += issues.length;
			}
			fs.writeFileSync(path.join(dir, `spots-${hour}.ndjson`), spotsOut.join('\n') + (spotsOut.length ? '\n' : ''));
			fs.writeFileSync(path.join(dir, `issues-${hour}.ndjson`), issuesOut.join('\n') + (issuesOut.length ? '\n' : ''));
		}
	}
	console.log(`reconverted ${totals.spots} spots, ${totals.issues} issues, ${totals.schemaErrors} spots with schema errors`);
}
main().catch(e => { console.error(e); process.exit(1); });
