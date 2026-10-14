/*
	PSK Reporter via the public retrieval API (XML), polled no more often than every 5 minutes as
	its terms ask. The token-protected NDJSON stream is not available here. Each receptionReport
	is turned into the object the stream would deliver and fed to PskReporterReceiver.processSpot.
	Only the newest ~20 s of reports come back per query, so this is a sample, not the firehose.
*/
const EventEmitter = require('events');
const axios = require('axios');
const xml2js = require('xml2js');
const config = require('../../../config_loader');
const PskReporterReceiver = require('../../../pskreporter');

class PskXmlBridge extends EventEmitter {
	constructor() {
		super();
		this.receiver = new PskReporterReceiver();
		const TTLCache = require('@isaacs/ttlcache');
		this.receiver.spotCache = new TTLCache({ttl: config.pskreporter.quorumInterval});
		this.pending = null;
		this.receiver.on('spot', spot => {
			if (this.pending) { spot._raw = this.pending.raw; spot._bridge = 'retrieve-xml'; this.pending.emitted = true; }
			this.emit('spot', spot);
		});
	}
	start() {
		this.poll();
		this.timer = setInterval(() => this.poll(), config.collector.pskXml.interval);
	}
	async poll() {
		try {
			let params = {flowStartSeconds: -config.collector.pskXml.window, rronly: 1, appcontact: config.collector.appContact};
			let res = await axios.get(config.collector.pskXml.url, {params, timeout: 60000, responseType: 'text', headers: {'User-Agent': config.collector.userAgent}});
			let doc = await xml2js.parseStringPromise(res.data);
			let reports = (doc.receptionReports && doc.receptionReports.receptionReport) || [];
			for (let r of reports) {
				let a = r.$ || {};
				let obj = {
					senderCallsign: a.senderCallsign, receiverCallsign: a.receiverCallsign,
					frequency: a.frequency !== undefined ? Number(a.frequency) : undefined, mode: a.mode,
					sNR: a.sNR !== undefined ? Number(a.sNR) : null, flowStartSeconds: Number(a.flowStartSeconds),
					senderLocator: a.senderLocator, receiverLocator: a.receiverLocator, receiverDecoderSoftware: undefined
				};
				this.pending = {raw: a, emitted: false};
				try { this.receiver.processSpot(obj); } catch (e) { this.emit('dropped', {bridge: 'retrieve-xml', raw: a, reason: `exception: ${e.message}`}); }
				if (!this.pending.emitted) this.emit('dropped', {bridge: 'retrieve-xml', raw: a, reason: 'receiver did not emit (filtered or quorum)'});
				this.pending = null;
			}
			console.log(`pskreporter xml: ${reports.length} reports`);
		} catch (e) {
			console.error(`pskreporter xml: ${e.message}`);
		}
	}
}
module.exports = PskXmlBridge;
