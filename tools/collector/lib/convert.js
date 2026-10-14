/*
	Converts a spot in today's receiver format ("legacy") into the proposed Spot model
	(see scratchpad spot-model.md / schema/spot.schema.json), recording every mapping
	problem as an issue: {code, severity, message, field?, value?}.
*/
const crypto = require('crypto');
const E = require('./enrich');

const SOURCES = new Set(['sotawatch', 'pota', 'wwff', 'cluster', 'rbn', 'pskreporter', 'quadnet', 'ircddb', 'dstarusers', 'amsat', 'simulator']);
const BOT_SPOTTERS = new Set(['RBNHOLE', 'APRS2SOTA', 'SMS', 'SOTAMAT', 'APSPOT', 'SOTAWATCH']);

function issue(list, code, severity, message, extra) {
	list.push(Object.assign({code, severity, message}, extra || {}));
}

/** Resolve "HH:MM" against the receive instant with midnight rollback. */
function timeFromHHMM(hhmm, receivedAt) {
	let m = /^(\d\d):(\d\d)$/.exec(hhmm || '');
	if (!m) return null;
	let d = new Date(receivedAt);
	let t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), +m[1], +m[2], 0, 0));
	if (t - d > 5 * 60 * 1000) t = new Date(t.getTime() - 86400000); // spot time ahead of now: it was yesterday
	return t;
}

function iso(d) { return new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z'); }

function convert(legacy, ctx) {
	const issues = [];
	const ref = ctx.ref;
	const receivedAt = legacy._receivedAt || new Date();
	const consumed = new Set(['_raw', '_receivedAt', '_bridge', '_date', 'title', 'rawText']);
	const take = k => { consumed.add(k); return legacy[k]; };
	const provenance = {};
	const precision = {};

	const spot = {id: crypto.randomUUID(), activity: 'on-air'};

	// source
	let source = take('source');
	if (!SOURCES.has(source)) issue(issues, 'source-unknown', 'error', `unknown source "${source}"`, {value: source});
	spot.source = source;
	const isDstar = take('mode') === 'dstar' || ['quadnet', 'ircddb', 'dstarusers'].includes(source);

	// sourceId / client from the raw record when a bridge or wrapper attached it
	let raw = legacy._raw;
	if (raw) {
		let id = raw.id ?? raw.spotId ?? raw.sequenceNumber;
		if (id !== undefined && id !== null) spot.sourceId = String(id);
		if (source === 'pota' && raw.source) spot.client = String(raw.source);
	}
	if (source === 'sotawatch') {
		let tag = /^\[([^\]]+)\]/.exec(legacy.comment || '');
		if (tag) spot.client = tag[1];
	}

	// callsign
	let fc = take('fullCallsign');
	if (!fc) {
		issue(issues, 'callsign-missing', 'error', 'no fullCallsign');
	} else {
		let c = E.cleanCallsign(fc);
		if (c.changed) issue(issues, 'callsign-cleaned', 'warn', `callsign "${fc}" cleaned to "${c.cleaned}"`, {value: fc});
		if (!c.shapeOk) issue(issues, 'callsign-shape', 'warn', `callsign "${c.cleaned}" does not look like a callsign`, {value: c.cleaned});
		spot.callsign = c.cleaned;
		spot.baseCallsign = c.base;
	}
	consumed.add('callsign');

	// spotter
	let sp = take('spotter');
	let comment = take('comment');
	if (sp) {
		let spotter = {callsign: String(sp).toUpperCase().trim(), kind: 'human', isSelf: false};
		if (source === 'rbn' || source === 'pskreporter') spotter.kind = 'skimmer';
		if (isDstar) spotter.kind = 'gateway';
		if (source === 'pota') {
			let rawSpotter = raw && raw.spotter;
			if ((rawSpotter && /-#$/.test(rawSpotter)) || (raw && raw.source === 'RBN') || /^RBN -?\d+ dB/.test(comment || '')) spotter.kind = 'skimmer';
		}
		if (source === 'sotawatch') {
			if (/^\[RBNHole\]/i.test(comment || '')) { spotter.kind = 'skimmer'; spotter.relay = 'RBNHOLE'; }
			else if (BOT_SPOTTERS.has(spotter.callsign)) {
				let sms = /^\[([A-Z0-9\/-]+)\{[A-Z]{2}\}\]:/i.exec(comment || '');
				if (sms) { spotter.relay = spotter.callsign; spotter.callsign = sms[1].toUpperCase(); issue(issues, 'spotter-unwrapped', 'info', `spotter unwrapped from ${spotter.relay} comment`); }
				else spotter.kind = 'bot';
			}
		}
		if (source === 'cluster') {
			if (/-#$/.test(spotter.callsign)) { spotter.kind = 'skimmer'; spotter.callsign = spotter.callsign.replace(/-#$/, ''); }
			else if (/-@$/.test(spotter.callsign)) { spotter.callsign = spotter.callsign.replace(/-@$/, ''); spotter.relay = 'web'; }
		}
		if (source === 'wwff' && /via RBN/i.test(comment || '')) spotter.kind = 'skimmer';
		// skimmer/receiver instance suffix ("W1NT-6", "K1RA-4"): keep it apart from the callsign
		let inst = /^([A-Z0-9\/]+)-(\d{1,2})$/.exec(spotter.callsign);
		if (inst && spotter.kind === 'skimmer') { spotter.callsign = inst[1]; spotter.instance = inst[2]; }
		let sc = E.cleanCallsign(spotter.callsign);
		if (isDstar && /^(REF|XRF|DCS|XLX)[0-9A-Z]{3}$/.test(spotter.callsign)) {
			// a reflector reporting its own module: there is no reporting station; the reflector is in dstar.reflector
			issue(issues, 'spotter-is-reflector', 'info', `reflector ${spotter.callsign} reported this itself; spotter omitted`);
			spotter = null;
		} else if (!sc.shapeOk && spotter.kind !== 'bot') {
			issue(issues, 'spotter-shape', 'info', `spotter "${spotter.callsign}" does not look like a callsign`, {value: spotter.callsign});
		}
		if (spotter) {
			spotter.isSelf = !!spot.baseCallsign && sc.base === spot.baseCallsign;
			spot.spotter = spotter;
		}
	} else {
		issue(issues, 'spotter-missing', isDstar ? 'info' : 'warn', 'no spotter');
	}

	// time
	let fullDate = legacy._date || legacy.date || (raw && (raw.timeStamp || raw.spotTime || (raw.spot_time && new Date(raw.spot_time * 1000))));
	consumed.add('date');
	let t = null;
	if (fullDate) {
		t = new Date(fullDate);
		if (raw && raw.spotTime && !/[Zz]|[+-]\d\d:\d\d$/.test(raw.spotTime)) t = new Date(raw.spotTime + 'Z');
		if (isNaN(t)) { issue(issues, 'time-invalid', 'error', `cannot parse "${fullDate}"`, {value: String(fullDate)}); t = null; }
		if (source === 'pskreporter') provenance.time = 'decode';
	}
	let hhmm = take('time');
	if (!t) {
		t = timeFromHHMM(hhmm, receivedAt);
		if (t) { provenance.time = 'receive-clock'; precision.time = 'minute'; issue(issues, 'time-lossy', 'info', 'feed/receiver gave HH:MM only'); }
		else { issue(issues, 'time-missing', 'error', `no usable time ("${hhmm}")`); t = receivedAt; }
	} else if (hhmm && iso(t).slice(11, 16) !== hhmm) {
		issue(issues, 'time-mismatch', 'warn', `legacy time ${hhmm} vs raw ${iso(t)}`, {value: hhmm});
	}
	spot.time = iso(t);
	spot.receivedAt = new Date(receivedAt).toISOString();
	if (t - receivedAt > 5 * 60 * 1000) issue(issues, 'time-future', 'warn', `spot time ${spot.time} is ahead of receive time`);
	if (receivedAt - t > 30 * 60 * 1000) issue(issues, 'time-stale', 'info', `spot is ${Math.round((receivedAt - t) / 60000)} min old at receive`);

	// frequency / band
	let f = take('frequency');
	let fNum = (f === undefined || f === null || f === '') ? NaN : Number(f);
	if (typeof f === 'string') issue(issues, 'frequency-string', 'info', `frequency arrived as string "${f}"`, {value: f});
	if (!isNaN(fNum) && fNum > 0) {
		spot.frequency = Math.round(fNum * 1e6);
		if (Math.abs(spot.frequency / 1e6 - fNum) > 1e-7) issue(issues, 'frequency-precision', 'warn', `frequency ${f} MHz not representable as Hz integer`, {value: f});
	} else if (!isDstar) {
		issue(issues, 'frequency-missing', 'error', `frequency "${f}"`, {value: f});
	}
	let band = take('band');
	consumed.add('bandIsGuessed'); consumed.add('frequencySource');
	if (spot.frequency) {
		let b = E.bandForMHz(spot.frequency / 1e6);
		if (b) spot.band = b; else issue(issues, 'band-unresolved', 'warn', `no band for ${spot.frequency} Hz`, {value: spot.frequency});
		if (legacy.frequencySource === 'nodelist') provenance.frequency = 'directory';
	} else if (band && band !== 'unknown') {
		spot.band = band;
		provenance.band = legacy.bandIsGuessed ? 'module-letter' : 'directory';
	} else if (isDstar) {
		issue(issues, 'band-unknown', 'info', 'D-STAR spot with neither frequency nor band');
	}

	// mode
	let modeRaw = legacy.mode;
	consumed.add('modeDetail'); consumed.add('modeIsGuessed');
	if (modeRaw) {
		let fam = E.modeFamily(modeRaw);
		spot.modeDetail = String(modeRaw).toLowerCase().trim();
		if (fam) spot.mode = fam;
		else { issue(issues, 'mode-unmapped', 'warn', `no family for mode "${modeRaw}"`, {value: modeRaw}); spot.mode = spot.modeDetail; }
	} else if (!isDstar) {
		let g = E.guessMode(spot.frequency ? spot.frequency / 1e6 : 0, comment);
		if (g) { spot.mode = E.modeFamily(g.mode) || g.mode; spot.modeDetail = g.mode; provenance.mode = g.provenance; }
		else issue(issues, 'mode-missing', 'info', 'no mode and no guess');
	}

	if (comment !== undefined && comment !== null && String(comment).trim() !== '') spot.comment = String(comment).trim();
	if (legacy.rawText) spot.rawText = String(legacy.rawText);

	// activity
	if (isDstar) {
		let ev = take('dvEvent');
		spot.activity = ev === 'linked' ? 'monitoring' : 'on-air';
		if (ev && ev !== 'linked' && ev !== 'active') issue(issues, 'activity-unknown', 'warn', `dvEvent "${ev}"`, {value: ev});
	} else if (/\bqrt\b/i.test(comment || '')) {
		spot.activity = 'qrt';
		provenance.activity = 'comment';
	}
	if (source === 'rbn' && legacy.rawText) {
		let mk = /\s(CQ|DX|BEACON|NCDXF B)\s+\d{4}Z\s*$/.exec(legacy.rawText);
		if (mk && (mk[1] === 'BEACON' || mk[1] === 'NCDXF B')) spot.activity = 'beacon';
	}

	// references: summit
	let summitRef = take('summitRef');
	consumed.add('summitName'); consumed.add('summitHeight'); consumed.add('summitPoints'); consumed.add('summitActivations');
	consumed.add('summitAssociation'); consumed.add('summitRegion');
	let summitFromComment = null;
	if (!summitRef && source !== 'sotawatch') {
		let hits = E.findSummits(comment, ref);
		if (hits.length) {
			let v = hits.find(h => h.valid);
			if (v) summitFromComment = v.ref;
			else issue(issues, 'ref-unvalidated', 'info', `summit-like text ${hits.map(h => h.ref).join(',')} not in summit list`, {value: hits[0].ref});
		}
	}
	let sref = summitRef || summitFromComment;
	if (sref) {
		let m = /^(.+)\/(.+)-(\d+)$/.exec(sref);
		let s = ref.summits.get(sref);
		spot.summit = {program: 'sota', ref: sref, association: m ? m[1] : '', region: m ? m[2] : ''};
		if (!m) issue(issues, 'summit-shape', 'warn', `summit ref "${sref}" not ASSOC/REGION-NNN`, {value: sref});
		if (s) {
			spot.summit.name = s.SummitName; spot.summit.altitude = s.AltM; spot.summit.points = s.Points;
			spot.summit.activationCount = s.ActivationCount;
			let now = new Date();
			spot.summit.valid = !(s.ValidFrom > now || s.ValidTo < now);
			if (!isNaN(s.Latitude)) { spot.summit.latitude = s.Latitude; spot.summit.longitude = s.Longitude; }
		} else {
			issue(issues, 'summit-unknown', 'warn', `summit ${sref} not in summit list`, {value: sref});
			if (legacy.summitName) spot.summit.name = legacy.summitName;
		}
		if (summitFromComment) provenance['summit.ref'] = 'comment-regex';
	}

	// references: parks
	let parks = [];
	let wwffRef = take('wwffRef'); let wwffRefRaw = take('wwffRefRaw');
	consumed.add('wwffDivision'); consumed.add('wwffName'); consumed.add('wwffProgram');
	let feedRef = wwffRef || wwffRefRaw;
	if (feedRef) {
		let p = ref.park(String(feedRef).toUpperCase());
		let program = legacy.wwffProgram || (p ? p.program : (/FF-/.test(feedRef) ? 'wwff' : 'pota'));
		let entry = {program, ref: String(feedRef).toUpperCase(), prefix: String(feedRef).toUpperCase().split('-')[0]};
		if (p) {
			entry.name = p.name;
			if (p.locations && p.locations.length) entry.locations = p.locations;
			if (!isNaN(p.latitude)) { entry.latitude = p.latitude; entry.longitude = p.longitude; }
			if (p.program === 'wwff' && p.status !== 'active') issue(issues, 'park-inactive', 'warn', `WWFF ${entry.ref} has status ${p.status}`, {value: entry.ref});
			if (p.program === 'pota' && !p.active) issue(issues, 'park-inactive', 'warn', `POTA ${entry.ref} is inactive`, {value: entry.ref});
		} else {
			issue(issues, 'park-unknown', 'warn', `park ${entry.ref} not in park lists`, {value: entry.ref});
			if (legacy.wwffName) entry.name = legacy.wwffName;
		}
		parks.push(entry);
	}
	for (let h of E.findParks(comment, ref)) {
		if (parks.some(p => p.ref === h.ref)) continue;
		if (!h.park) { if (/^(?:[A-Z]{2}|[A-Z0-9]{1,5}FF)-/.test(h.ref)) issue(issues, 'ref-unvalidated', 'info', `park-like text ${h.ref} not in park lists`, {value: h.ref}); continue; }
		let entry = {program: h.park.program, ref: h.ref, prefix: h.ref.split('-')[0], name: h.park.name};
		if (h.park.locations && h.park.locations.length) entry.locations = h.park.locations;
		if (!isNaN(h.park.latitude)) { entry.latitude = h.park.latitude; entry.longitude = h.park.longitude; }
		parks.push(entry);
		provenance[`parks.${parks.length - 1}.ref`] = 'comment-regex';
	}
	if (parks.length) spot.parks = parks;

	// references: IOTA
	let iotaRef = take('iotaGroupRef'); consumed.add('iotaGroupName');
	if (iotaRef) spot.iota = {ref: iotaRef, name: legacy.iotaGroupName};
	else {
		let hits = E.findIota(comment, ref);
		let v = hits.find(h => h.valid);
		if (v) { spot.iota = {ref: v.ref, name: ref.iota.get(v.ref).grpName}; provenance['iota.ref'] = 'comment-regex'; }
		else if (hits.length && hits[0].valid === false) issue(issues, 'ref-unvalidated', 'info', `IOTA-like text ${hits[0].ref} not in IOTA list`, {value: hits[0].ref});
	}

	// states (POTA park location)
	let state = take('state');
	if (state) spot.states = Array.isArray(state) ? state : [state];

	// signal report
	let signal = {};
	let snr = take('snr'); let speed = take('speed');
	if (snr !== undefined) { let n = Number(snr); if (isNaN(n)) issue(issues, 'snr-invalid', 'warn', `snr "${snr}"`, {value: snr}); else signal.snr = n; }
	if (speed !== undefined) { let n = Number(speed); if (!isNaN(n)) { signal.speed = n; signal.speedUnit = (spot.mode === 'cw') ? 'wpm' : 'bps'; } }
	if (source === 'rbn' && legacy.rawText) {
		let mk = /\s(CQ|DX|BEACON|NCDXF B)\s+\d{4}Z\s*$/.exec(legacy.rawText);
		if (mk) signal.spotType = {CQ: 'cq', DX: 'dx', BEACON: 'beacon', 'NCDXF B': 'ncdxf'}[mk[1]];
	}
	if (source === 'pota') {
		let m = /^RBN (-?\d+) dB(?: (\d+) WPM)? via/.exec(comment || '');
		if (m) { signal.snr = +m[1]; if (m[2]) { signal.speed = +m[2]; signal.speedUnit = 'wpm'; } }
	}
	if (source === 'sotawatch') {
		let m = /\[RBNHole\] at \S+ (\d+) WPM (-?\d+) dB SNR/i.exec(comment || '');
		if (m) { signal.speed = +m[1]; signal.speedUnit = 'wpm'; signal.snr = +m[2]; }
	}
	let software = take('spotterSoftware');
	if (software) signal.software = software;
	consumed.add('noSpotterDxccLookup');
	if (Object.keys(signal).length) spot.signal = signal;

	// D-STAR block
	if (isDstar) {
		let d = {};
		let node = take('dvNode'); if (node) d.node = node;
		let gw = legacy.spotter && legacy.dvNode && legacy.spotter !== legacy.dvNode.split('-')[0] ? legacy.spotter : (legacy.spotter || undefined);
		if (gw) d.gateway = gw;
		let refl = take('dvReflector'); if (refl) d.reflector = refl;
		let rs = take('dvReflectorSource'); if (rs === 'dashboard') provenance['dstar.reflector'] = 'dashboard';
		let g = take('dvGroup'); if (g) d.group = g;
		let gn = take('dvGroupName'); if (gn) d.groupName = gn;
		let dur = take('dvDuration'); if (dur !== undefined) d.duration = Number(dur);
		let suf = take('dvSuffix'); if (suf) d.suffix = suf;
		spot.dstar = d;
		if (!d.node && !d.reflector && !d.group) issue(issues, 'dstar-no-place', 'warn', 'D-STAR spot with no node, reflector or group');
	}

	// cluster detail
	if (source === 'cluster') {
		let cd = {};
		if (comment && String(comment).length >= 30) cd.commentTruncated = true;
		if (legacy._bridge) cd.node = legacy._bridge;
		if (Object.keys(cd).length) spot.cluster = cd;
	}

	spot.provenance = provenance;
	spot.precision = precision;

	// anything on the legacy spot we never looked at is a mapping gap
	for (let k of Object.keys(legacy)) {
		if (!consumed.has(k) && !k.startsWith('_')) issue(issues, 'legacy-field-unmapped', 'warn', `legacy field "${k}" not mapped`, {field: k, value: typeof legacy[k] === 'object' ? JSON.stringify(legacy[k]).slice(0, 80) : legacy[k]});
	}
	return {spot, issues};
}

module.exports = {convert};
