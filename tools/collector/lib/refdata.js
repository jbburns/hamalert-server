/*
	Reference data the converter validates against: SOTA summits, POTA parks, WWFF parks,
	IOTA groups. Downloaded once per run (cached on disk for config.collector.refMaxAge) and
	held in Maps. This mirrors what the real reference loaders would publish to the database.
*/
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../../../config_loader');
let parseCsv;
try { parseCsv = require('csv/sync').parse; } catch (e) { parseCsv = require('csv-parse/sync').parse; }

async function fetchCached(url, name) {
	const file = path.join(config.collector.cacheDir, name);
	fs.mkdirSync(config.collector.cacheDir, {recursive: true});
	if (fs.existsSync(file) && (Date.now() - fs.statSync(file).mtimeMs) < config.collector.refMaxAge) {
		return fs.readFileSync(file);
	}
	console.log(`refdata: downloading ${url}`);
	let res = await axios.get(url, {responseType: 'arraybuffer', maxRedirects: 5, timeout: 120000,
		headers: {'User-Agent': config.collector.userAgent}, maxContentLength: 200 * 1024 * 1024});
	fs.writeFileSync(file, Buffer.from(res.data));
	return Buffer.from(res.data);
}

function parseDmy(s) {
	let m = /^(\d\d)\/(\d\d)\/(\d{4})$/.exec(s || '');
	return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null;
}

async function loadSummits() {
	let buf = await fetchCached(config.summitListUrl, 'summitslist.csv');
	let text = buf.toString('utf8');
	text = text.slice(text.indexOf('\n') + 1); // first line is a title, not the header
	let rows = parseCsv(text, {columns: true, relax_column_count: true, skip_empty_lines: true});
	let map = new Map();
	for (let r of rows) {
		map.set(r.SummitCode, {
			SummitCode: r.SummitCode, SummitName: r.SummitName, AltM: parseInt(r.AltM), Points: parseInt(r.Points),
			BonusPoints: parseInt(r.BonusPoints), ActivationCount: parseInt(r.ActivationCount),
			ValidFrom: parseDmy(r.ValidFrom), ValidTo: parseDmy(r.ValidTo),
			Latitude: parseFloat(r.Latitude), Longitude: parseFloat(r.Longitude),
			AssociationName: r.AssociationName, RegionName: r.RegionName
		});
	}
	return map;
}

async function loadPotaParks() {
	let buf = await fetchCached(config.collector.potaParksCsv, 'pota_parks.csv');
	let rows = parseCsv(buf.toString('utf8'), {columns: true, relax_column_count: true, skip_empty_lines: true});
	let map = new Map();
	for (let r of rows) {
		map.set(r.reference, {reference: r.reference, program: 'pota', name: r.name, active: r.active === '1',
			locations: r.locationDesc && r.locationDesc !== 'None' ? r.locationDesc.split(',') : [],
			latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude), grid: r.grid});
	}
	return map;
}

async function loadWwffParks() {
	let buf = await fetchCached(config.wwff.listUrl.replace(/^http:/, 'https:'), 'wwff_directory.csv');
	let rows = parseCsv(buf.toString('utf8'), {columns: true, relax_column_count: true, skip_empty_lines: true});
	let map = new Map();
	for (let r of rows) {
		if (!/^[A-Z0-9]{1,5}FF-\d{4}$/.test(r.reference || '')) continue;
		map.set(r.reference, {reference: r.reference, program: 'wwff', name: r.name, status: r.status,
			division: r.reference.split('-')[0], programCode: r.program, dxcc: r.dxcc,
			latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude)});
	}
	return map;
}

async function loadIota() {
	try {
		let buf = await fetchCached(config.iotaListUrl, 'iota.json');
		let data = JSON.parse(buf.toString('utf8'));
		let map = new Map();
		let list = Array.isArray(data) ? data : (data.data || data.groups || []);
		for (let g of list) {
			let ref = g.refno || g.grpRef || g.ref;
			if (ref) map.set(ref, {grpRef: ref, grpName: g.name || g.grpName || ''});
		}
		return map;
	} catch (e) {
		console.error(`refdata: IOTA list unavailable (${e.message}); IOTA validation disabled`);
		return new Map();
	}
}

async function loadAll() {
	let [summits, pota, wwff, iota] = await Promise.all([loadSummits(), loadPotaParks(), loadWwffParks(), loadIota()]);
	console.log(`refdata: ${summits.size} summits, ${pota.size} POTA parks, ${wwff.size} WWFF parks, ${iota.size} IOTA groups`);
	return {summits, pota, wwff, iota,
		park(ref) { return pota.get(ref) || wwff.get(ref) || null; }};
}

module.exports = {loadAll};
