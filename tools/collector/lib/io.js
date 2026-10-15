const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/** Append-only NDJSON writer with hourly file rotation: <dir>/<prefix>-YYYY-MM-DD-HH.ndjson */
class NdjsonWriter {
	constructor(dir, prefix) {
		this.dir = dir;
		this.prefix = prefix;
		this.current = null;
		this.fd = null;
		this.count = 0;
		fs.mkdirSync(dir, {recursive: true});
	}
	write(obj) {
		let hour = new Date().toISOString().slice(0, 13).replace('T', '-');
		if (hour !== this.current) {
			if (this.fd !== null) fs.closeSync(this.fd);
			this.fd = fs.openSync(path.join(this.dir, `${this.prefix}-${hour}.ndjson`), 'a');
			this.current = hour;
		}
		fs.writeSync(this.fd, JSON.stringify(obj) + '\n');
		this.count++;
	}
	close() {
		if (this.fd !== null) fs.closeSync(this.fd);
		this.fd = null;
	}
}

/**
	Records every HTTP response the receivers get, via an axios interceptor on the default
	instance. Bodies are stored only when they changed for that URL (sha256), capped at maxBody.
*/
function installCapture(axios, dataDir, options = {}) {
	const maxBody = options.maxBody || 2 * 1024 * 1024;
	const writer = new NdjsonWriter(path.join(dataDir, 'raw'), 'http');
	const lastHash = new Map();
	const stats = {responses: 0, errors: 0, bytes: 0};

	function bodyOf(res) {
		let d = res.data;
		if (d === undefined || d === null) return '';
		if (typeof d === 'string') return d;
		if (Buffer.isBuffer(d)) return d.toString('utf8');
		if (typeof d === 'object' && typeof d.pipe === 'function') return null; // stream
		try { return JSON.stringify(d); } catch (e) { return String(d); }
	}

	axios.interceptors.response.use(res => {
		try {
			let url = res.config && (res.config.url || '');
			let body = bodyOf(res);
			let rec = {t: new Date().toISOString(), method: (res.config.method || 'get').toUpperCase(), url, status: res.status,
				range: res.config.headers && (res.config.headers.Range || res.config.headers.range) || undefined,
				contentType: res.headers && res.headers['content-type']};
			if (body !== null) {
				let sha = crypto.createHash('sha256').update(body).digest('hex');
				rec.bytes = Buffer.byteLength(body);
				rec.sha256 = sha;
				rec.changed = lastHash.get(url) !== sha;
				lastHash.set(url, sha);
				if (rec.changed && rec.bytes <= maxBody) rec.body = body;
				stats.bytes += rec.bytes;
			} else {
				rec.stream = true;
			}
			stats.responses++;
			writer.write(rec);
		} catch (e) {
			console.error('capture failed:', e.message);
		}
		return res;
	}, err => {
		try {
			stats.errors++;
			writer.write({t: new Date().toISOString(), url: err.config && err.config.url, error: err.message,
				status: err.response && err.response.status});
		} catch (e) {}
		return Promise.reject(err);
	});
	return {writer, stats};
}

module.exports = {NdjsonWriter, installCapture};
