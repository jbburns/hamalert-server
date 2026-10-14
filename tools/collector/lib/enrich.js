/*
	Enrichment the converter can do without Club Log or MongoDB: band from frequency, mode
	family from the explicit table, mode guessing with provenance, callsign cleaning, and
	reference detection in free text validated against the reference data.
*/
const config = require('../../../config_loader');
const hamutil = require('../../../hamutil');

// Explicit mode family table (replaces the startsWith('psk'|'jt'|'msk') collapsing).
// key: reported mode, lowercased. value: family. Missing key = unknown family (reported as an issue).
const MODE_FAMILY = {
	cw: 'cw', ssb: 'ssb', usb: 'ssb', lsb: 'ssb', fm: 'fm', am: 'am', phone: 'ssb', ph: 'ssb',
	psk: 'psk', psk31: 'psk', psk63: 'psk', psk125: 'psk', bpsk31: 'psk', bpsk63: 'psk', qpsk31: 'psk',
	jt4: 'jt', jt9: 'jt', jt65: 'jt', jt6m: 'jt',
	msk144: 'msk', msk: 'msk',
	ft8: 'ft8', ft4: 'ft4', ft2: 'ft2', rtty: 'rtty', jtty: 'rtty', js8: 'js8', varac: 'varac',
	sstv: 'sstv', fst4: 'fst4', fst4w: 'fst4w', q65: 'q65', q65d: 'q65', wspr: 'wspr', qra64: 'qra64', iscat: 'iscat',
	fsk441: 'fsk441', t10: 't10', hell: 'hell', contestia: 'contestia', mfsk: 'mfsk', thor: 'thor', domino: 'domino',
	fsq: 'fsq', freedv: 'freedv', pi4: 'pi4', ros: 'ros', opera: 'opera', pkt: 'pkt',
	dstar: 'dstar', dv: 'dstar', dmr: 'dmr', c4fm: 'c4fm', ysf: 'c4fm', data: 'data', 'data-usb': 'data', digi: 'data', digital: 'data'
};

function modeFamily(reported) {
	if (!reported) return undefined;
	let m = String(reported).trim().toLowerCase();
	if (MODE_FAMILY[m]) return MODE_FAMILY[m];
	if (m.startsWith('olivia')) return 'olivia';
	return undefined;
}

function bandForMHz(f) {
	if (!(f > 0)) return undefined;
	let b = config.bands.find(e => e.from <= f && e.to >= f);
	return b ? b.band : undefined;
}

/** Mode guess with provenance: 'comment' when the comment names a digital mode, else 'bandplan'. */
function guessMode(frequencyMHz, comment) {
	if (comment && config.modeguesser.commentPattern) {
		let m = config.modeguesser.commentPattern.exec(comment);
		if (m) return {mode: m[1].toLowerCase(), provenance: 'comment'};
	}
	// explicit phone/cw words too (production deliberately ignores these; counted separately)
	if (comment) {
		let w = /\b(cw|ssb|usb|lsb|fm)\b/i.exec(comment);
		if (w && !/\bI AM\b/i.test(comment)) return {mode: w[1].toLowerCase(), provenance: 'comment-word'};
	}
	if (frequencyMHz > 0) {
		let r = config.modeguesser.ranges.find(e => e.from <= frequencyMHz && e.to >= frequencyMHz);
		if (r) return {mode: r.mode, provenance: 'bandplan'};
	}
	return null;
}

const CALLSIGN_RE = /^(?:[A-Z0-9]{1,4}\/)?[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,4}[A-Z](?:\/[A-Z0-9]{1,4})*$/;

function cleanCallsign(raw) {
	let s = String(raw || '').toUpperCase().trim();
	let cleaned = s.replace(/[^0-9A-Z\/]/g, '');
	return {cleaned, changed: cleaned !== s, shapeOk: CALLSIGN_RE.test(cleaned), base: hamutil.extractCanonicalCallsign(cleaned)};
}

const SUMMIT_RE = /\b([A-Z0-9]{1,8}\/[A-Z]{2})-?((?:[0-9][0-9][1-9])|(?:[0-9][1-9][0])|(?:[1-9][0-9][0]))\b/gi;
const PARK_RE = /\b([A-Z0-9]{1,5})-(\d{4,5})\b/gi;
const IOTA_RE = /(?:^|[\s(\[])(AF|AN|AS|EU|NA|OC|SA)[ -]?(\d{3})\b/gi;

function findSummits(text, ref) {
	let out = [];
	for (let m of String(text || '').matchAll(SUMMIT_RE)) {
		let code = `${m[1].toUpperCase()}-${m[2]}`;
		out.push({ref: code, valid: ref.summits.has(code)});
	}
	return out;
}
function findParks(text, ref) {
	let out = [];
	for (let m of String(text || '').matchAll(PARK_RE)) {
		let code = `${m[1].toUpperCase()}-${m[2]}`;
		if (/^[0-9]+$/.test(m[1])) continue; // "599-1234" style numbers
		out.push({ref: code, park: ref.park(code)});
	}
	return out;
}
function findIota(text, ref) {
	let out = [];
	for (let m of String(text || '').matchAll(IOTA_RE)) {
		let code = `${m[1].toUpperCase()}-${m[2]}`;
		out.push({ref: code, valid: ref.iota.size === 0 ? undefined : ref.iota.has(code)});
	}
	return out;
}

module.exports = {MODE_FAMILY, modeFamily, bandForMHz, guessMode, cleanCallsign, findSummits, findParks, findIota};
