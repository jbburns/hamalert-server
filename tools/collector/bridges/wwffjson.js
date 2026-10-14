/*
	WWFF Spotline JSON feed (https://spots.wwff.co/static/spots.json, last 50 spots, refresh >= 30 s).
	Emits spots in the shape cluster.js produces in wwffMode, so the converter sees today's format,
	with the raw JSON record attached as _raw. Telnet (spots.wwff.co:7300) is not reachable here.
*/
const EventEmitter = require('events');
const axios = require('axios');
const config = require('../../../config_loader');
const hamutil = require('../../../hamutil');

class WwffJsonBridge extends EventEmitter {
	constructor() { super(); this.seen = new Set(); this.primed = false; }
	start() {
		this.poll();
		this.timer = setInterval(() => this.poll(), config.collector.wwffJson.interval);
	}
	async poll() {
		try {
			let res = await axios.get(config.collector.wwffJson.url, {timeout: 20000, headers: {'User-Agent': config.collector.userAgent}});
			let list = Array.isArray(res.data) ? res.data.slice().reverse() : [];
			for (let rec of list) {
				if (this.seen.has(rec.id)) continue;
				this.seen.add(rec.id);
				if (!this.primed) continue; // first poll only primes the seen set (the file holds ~a day of spots)
				this.emitSpot(rec);
			}
			this.primed = true;
			if (this.seen.size > 5000) this.seen = new Set([...this.seen].slice(-2000));
		} catch (e) {
			console.error(`wwff json: ${e.message}`);
		}
	}
	emitSpot(rec) {
		let date = new Date(rec.spot_time * 1000);
		let time = date.toISOString().substring(11, 16);
		let freq = Number(rec.frequency_khz) / 1000;
		let spot = {
			source: 'wwff', time, fullCallsign: String(rec.activator || '').toUpperCase().trim(),
			spotter: String(rec.spotter || '').toUpperCase().trim(), frequency: freq,
			wwffRefRaw: rec.reference, mode: rec.mode, comment: rec.remarks || '',
			rawText: `DX de ${rec.spotter}: ${hamutil.formatFrequency(freq)} ${rec.activator} ${rec.reference} ${rec.mode} ${rec.remarks || ''} ${time.replace(':', '')}Z`,
			title: `WWFF ${rec.activator} in ${rec.reference} (${hamutil.formatFrequency(freq)} ${rec.mode})`,
			_raw: rec, _date: date, _bridge: 'spotline-json'
		};
		this.emit('spot', spot);
	}
}
module.exports = WwffJsonBridge;
