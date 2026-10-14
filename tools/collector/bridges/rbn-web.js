/*
	RBN via the undocumented web JSON endpoint (what reversebeacon.net/main.php polls), because
	telnet port 7000/7001 is blocked here. Each spot is formatted as the telnet line and fed to
	the real RbnReceiver.handleLine. Note: this endpoint does not serve FT8/FT4 (port 7001 data).
*/
const EventEmitter = require('events');
const axios = require('axios');
const config = require('../../../config_loader');
const RbnReceiver = require('../../../rbn');

const MODES = {1: 'CW', 2: 'PH', 5: 'FM', 10: 'PSK31', 11: 'RTTY', 12: 'BPSK', 30: 'PSK63', 31: 'PSK125', 34: 'FT8', 45: 'FT4'};
const TYPES = {1: 'CQ', 2: 'DX', 3: 'BEACON', 4: 'BEACON', 5: 'NCDXF B'};

class RbnWebBridge extends EventEmitter {
	constructor() {
		super();
		this.receiver = new RbnReceiver(Object.assign({}, config.rbn[0], {server: {host: 'none', port: 0}, quorum: undefined, timeout: 24 * 3600 * 1000}));
		this.receiver.restartConnection = () => {};   // fed by handleLine, never by a socket
		this.hash = null;
		this.lastId = 0;
		this.pending = null;
		this.receiver.on('spot', spot => {
			if (this.pending) { spot._raw = this.pending.raw; spot._date = this.pending.date; spot._bridge = 'rbn-web'; this.pending.emitted = true; }
			this.emit('spot', spot);
		});
	}
	start() {
		this.poll();
		this.timer = setInterval(() => this.poll(), config.collector.rbnWeb.interval);
	}
	async fetchHash() {
		let res = await axios.get(config.collector.rbnWeb.page, {timeout: 20000, headers: {'User-Agent': config.collector.userAgent}});
		let m = /RBN_version_hash\s*=\s*['"]([0-9a-f]+)['"]/.exec(String(res.data));
		if (!m) throw new Error('version hash not found on main.php');
		this.hash = m[1];
	}
	async poll() {
		try {
			if (!this.hash) await this.fetchHash();
			let params = {h: this.hash, ma: 120, s: this.lastId, r: config.collector.rbnWeb.rows};
			let res = await axios.get(config.collector.rbnWeb.api, {params, timeout: 20000, headers: {'User-Agent': config.collector.userAgent}});
			let data = res.data;
			if (data && data.error) { this.hash = null; throw new Error(`api error ${data.error}`); }
			let spots = data && data.spots ? Object.entries(data.spots).map(([id, a]) => ({id: Number(id), a})).sort((x, y) => x.id - y.id) : [];
			let first = this.lastId === 0;
			for (let {id, a} of spots) {
				this.lastId = Math.max(this.lastId, id);
				if (first) continue; // prime
				this.feed(id, a);
			}
		} catch (e) {
			console.error(`rbn web: ${e.message}`);
		}
	}
	feed(id, a) {
		let [de, freq, dx, db, wpm, timeStr, diff, band, type, mode, epoch] = a;
		let date = new Date(epoch * 1000);
		let hhmm = date.toISOString().substring(11, 16).replace(':', '');
		let modeStr = MODES[mode] || `MODE${mode}`;
		let marker = TYPES[type] || 'CQ';
		let speed = (modeStr === 'CW') ? `${wpm} WPM` : `${wpm} BPS`;
		let line = `DX de ${de}-#:   ${freq}  ${dx}   ${modeStr}    ${db} dB  ${speed}  ${marker}      ${hhmm}Z`;
		let raw = {id, de, freq, dx, db, wpm, time: timeStr, band, type, mode, epoch};
		this.pending = {raw, date, emitted: false};
		try { this.receiver.handleLine(line); } catch (e) { this.emit('dropped', {bridge: 'rbn-web', line, raw, reason: `exception: ${e.message}`}); }
		if (!this.pending.emitted) this.emit('dropped', {bridge: 'rbn-web', line, raw, reason: 'parser did not emit'});
		this.pending = null;
	}
}
module.exports = RbnWebBridge;
