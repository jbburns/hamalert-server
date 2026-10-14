/*
	DX cluster via an HTTP mirror (DXSummit JSON), because telnet is blocked here. Each mirror
	spot is formatted as a classic DXSpider "DX de" line (same layout notify/telnetconn.js
	emits) and fed to the real ClusterReceiver.handleLine, so the production parser is what
	gets exercised. Lines the parser drops are reported as 'dropped' events.
*/
const EventEmitter = require('events');
const axios = require('axios');
const sprintf = require('sprintf-js').sprintf;
const config = require('../../../config_loader');
const ClusterReceiver = require('../../../cluster');

function classicLine(spotter, freqKhz, dx, comment, hhmm) {
	let freq = sprintf('%.1f', freqKhz);
	let sp = spotter.substring(0, 16 - freq.length);
	let spotterFreq = sp + ':' + ' '.repeat(Math.max(0, 17 - freq.length - sp.length)) + freq;
	return sprintf('DX de %s  %-12s %-30s %sZ', spotterFreq, dx.substring(0, 12), (comment || '').substring(0, 30), hhmm);
}

class ClusterMirrorBridge extends EventEmitter {
	constructor() {
		super();
		this.receiver = new ClusterReceiver({source: 'cluster', servers: [], timeout: 24 * 3600 * 1000, titlePrefix: 'Cluster spot',
			filterRegex: /\b(nil)\b/i, spotterFilterRegex: /^W3LPL$/i});
		this.lastId = 0;
		this.primed = false;
		this.pending = null;
		this.receiver.on('spot', spot => {
			if (this.pending) { spot._raw = this.pending.raw; spot._date = this.pending.date; spot._bridge = 'dxsummit'; this.pending.emitted = true; }
			this.emit('spot', spot);
		});
	}
	start() {
		this.poll();
		this.timer = setInterval(() => this.poll(), config.collector.dxsummit.interval);
	}
	async poll() {
		try {
			let res = await axios.get(config.collector.dxsummit.url, {timeout: 20000, headers: {'User-Agent': config.collector.userAgent}});
			let list = Array.isArray(res.data) ? res.data.slice().sort((a, b) => a.id - b.id) : [];
			for (let rec of list) {
				if (rec.id <= this.lastId) continue;
				this.lastId = rec.id;
				if (!this.primed) continue;
				this.feed(rec);
			}
			this.primed = true;
		} catch (e) {
			console.error(`dxsummit: ${e.message}`);
		}
	}
	feed(rec) {
		let date = new Date(rec.time.endsWith('Z') ? rec.time : rec.time + 'Z');
		let hhmm = date.toISOString().substring(11, 16).replace(':', '');
		let line = classicLine(String(rec.de_call || ''), Number(rec.frequency), String(rec.dx_call || ''), rec.info || '', hhmm);
		this.pending = {raw: rec, date, emitted: false, line};
		try {
			this.receiver.handleLine(line);
		} catch (e) {
			this.emit('dropped', {bridge: 'dxsummit', line, raw: rec, reason: `exception: ${e.message}`});
		}
		if (!this.pending.emitted) this.emit('dropped', {bridge: 'dxsummit', line, raw: rec, reason: 'parser did not emit'});
		this.pending = null;
	}
}
module.exports = ClusterMirrorBridge;
