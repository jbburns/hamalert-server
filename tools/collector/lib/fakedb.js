/*
	A stand-in for the MongoDB handle the receivers expect, backed by the in-memory reference
	data. Only the lookups the receivers actually make are implemented; everything else is a
	no-op that returns empty results. Callbacks are invoked synchronously, which lets the
	collector attach the raw upstream record to the spot a receiver emits.
*/
function makeFakeDb(ref) {
	function lookup(name, query) {
		switch (name) {
			case 'summits': {
				let s = ref.summits.get(query.SummitCode);
				return s ? Object.assign({}, s) : null;
			}
			case 'wwffParks': {
				let p = ref.park(query.reference);
				if (!p) return null;
				if (query.status === 'active' && p.program === 'wwff' && p.status !== 'active') return null;
				if (query.status === 'active' && p.program === 'pota' && !p.active) return null;
				return {reference: p.reference, name: p.name, program: p.program, division: p.reference.split('-')[0],
					location: p.locations ? p.locations.join(',') : undefined};
			}
			case 'iotaGroups': {
				let g = ref.iota.get(query.grpRef);
				return g ? Object.assign({}, g) : null;
			}
			default:
				return null;
		}
	}
	const cursor = {toArray: async () => [], forEach: (fn, cb) => { if (cb) cb(null); }, sort() { return cursor; }, limit() { return cursor; },
		hasNext: async () => false, next: async () => null};
	return {
		collection(name) {
			return {
				findOne(query, opts, cb) {
					if (typeof opts === 'function') { cb = opts; opts = {}; }
					let r = lookup(name, query || {});
					if (cb) { cb(null, r); return; }
					return Promise.resolve(r);
				},
				find() { return cursor; },
				distinct: async () => [],
				updateOne: async () => ({matchedCount: 0}),
				updateMany: async () => ({}),
				insertOne: async () => ({}),
				replaceOne: async () => ({}),
				deleteMany: async () => ({}),
				findOneAndUpdate(q, u, o, cb) { if (cb) cb(null, {value: {badgeCount: 0}}); return Promise.resolve({value: {badgeCount: 0}}); }
			};
		}
	};
}
module.exports = makeFakeDb;
