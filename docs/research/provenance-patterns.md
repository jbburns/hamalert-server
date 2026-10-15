# Per-field provenance / precision in public APIs and data standards

Researched 2026-10-14. Everything below was read from the cited page unless marked (inferred) or (unverified).
Target: JSON spot API, TypeScript clients, rule engine evaluating `mode in [cw, ssb]`.

## 1. Survey (how each models "not reported by the source")

### 1.1 Spothole (closest domain peer) - sibling enum per field
- Live API https://spothole.app/api/v1/spots returns `mode_source: "BANDPLAN"`, `dx_location_source: "HOME QTH"`,
  `de_location_source`, plus `dx_location_good: true` (boolean verdict), `source: "Cluster"`, `time` (epoch float) + `time_iso`.
- Source of truth (enums.py, git.ianrenton.com/ian/spothole): `ModeSource = SPOT | COMMENT | BANDPLAN`;
  `LocationSourceForSpot = SPOT | ACTIVITY REF LOOKUP | GRID | HOME QTH | DXCC`. spot.py comments: "DX Location source. Indicates how
  accurate the location might be" and `dx_location_good` is a derived boolean ("true if source is SPOT, ACTIVITY REF LOOKUP or GRID, or HOME QTH
  and callsign has no /P suffix").
- Pros: tiny, flat, proven in this exact domain; enum says HOW, boolean says "trust it enough to plot".
  Cons: `*_source` is always present (reported is explicit `SPOT`), only 3 fields covered, SCREAMING values with spaces ("HOME QTH"), and
  the good/bad verdict is a second hand-maintained field. Note Spothole conflates provenance and precision in one enum (HOME QTH vs GRID).
- Counter-signal in same domain: POTA API https://api.pota.app/spot/activator has only `source: "RBN"|"Web"` (whole-record origin) and no per-field flags.

### 1.2 FHIR - parallel `_field` object + data-absent-reason + method/status
- Primitive extensions: value in `birthDate`, metadata in sibling `_birthDate: {extension:[...]}`; arrays use index-aligned nulls
  (https://hl7.org/fhir/R4/json.html). Rationale: the primitive stays a plain JSON primitive so ordinary consumers/queries are unaffected.
- `data-absent-reason` extension (https://hl7.org/fhir/R4/extension-data-absent-reason.html, 15 codes at /valueset-data-absent-reason.html:
  unknown, asked-unknown, temp-unknown, not-asked, asked-declined, masked, not-applicable, unsupported, as-text, error, not-performed, ...).
  This models *missing* values, not guessed ones. Observation.dataAbsentReason only allowed when value[x] absent (invariant on /observation.html).
- Observation.status (registered|preliminary|final|amended) is a record-level maturity flag and a "modifier element"; Observation.method
  (CodeableConcept, 0..1) says how a value was obtained; Observation.interpretation is a categorisation of the value, NOT its reliability.
- Precision: `date`/`dateTime` allow YYYY, YYYY-MM, YYYY-MM-DD; if hours/minutes are given a timezone is mandatory; `instant` must have seconds
  + timezone (https://hl7.org/fhir/R4/datatypes.html). `Quantity.comparator` ("<" means true value < stated) models limited precision. Decimal trailing zeros
  are significant ("0.010" != "0.01") - which JSON.parse in TS destroys, so do not copy this.
- FHIR Provenance resource (https://hl7.org/fhir/R4/provenance.html): out-of-band record (target, agent, activity, entity.role = derivation|revision|quotation|source|removal),
  explicitly mapped to W3C PROV. Heavy; per-resource not per-field.
- Pros: strongest worked-out vocabulary; keeps value types clean. Cons: `_field` doubles every field name, awkward in TS (`obj._mode?.extension?.[0]...`),
  and rule engines cannot easily address it. The idea worth stealing is "metadata lives beside the value, never wraps it".

### 1.3 HL7 (v2/v3) (inferred from FHIR heritage, not fetched)
- v3 NullFlavor / v2 empty-vs-"" ("" = delete, absent = unchanged) are the ancestors of data-absent-reason. Same lesson: keep "missing" and "guessed" as separate axes.

### 1.4 OpenStreetMap - namespaced sibling key per tag
- `source=*` plus `source:name=*`, `source:maxspeed=*`, `source:maxspeed:date=*` (https://wiki.openstreetmap.org/wiki/Key:source).
  Values are free-ish vocabulary: survey, GPS, aerial_imagery, extrapolation, common_knowledge, local_knowledge; multiple joined by ";".
  Page recommends separate source tags per main tag. No boolean flag at all; `fixme`/`check_date` are not documented on that page.
- Pros: exactly the "xSource" sibling pattern, scales per field, absent = unspecified. Cons: free vocabulary means consumers cannot filter reliably;
  OSM itself warns `source:maxspeed` was historically used for the *type* of limit, i.e. semantic drift without a closed enum.

### 1.5 W3C PROV-O / DQV
- PROV-O (https://www.w3.org/TR/prov-o/): Entity, Activity, Agent; `wasDerivedFrom` (subtypes hadPrimarySource, wasQuotedFrom, wasRevisionOf),
  `wasGeneratedBy`, `wasAttributedTo`; "qualified" forms attach detail via an intermediate node. Primary Source = "direct experience", e.g. a sensor reading.
- DQV (https://www.w3.org/TR/vocab-dqv/): QualityMeasurement/Metric/Dimension; deliberately does not define "quality".
- Pros: the correct conceptual model (reported = primary source; the rest = derived). Cons: graph-shaped RDF, wrong weight for a 15-field JSON object.
  Steal vocabulary only: "primary source" vs "derived from".

### 1.6 schema.org
- PropertyValue has `measurementMethod`, `measurementTechnique`, `minValue`/`maxValue`, `valueReference` (https://schema.org/PropertyValue),
  but no generic per-property source/confidence. Provenance is expressed by wrapping in PropertyValue (a wrapper pattern) or `isBasedOn` at thing level (unverified here).

### 1.7 Google Maps Geocoding - enum next to value + boolean for fuzzy match
- `geometry.location_type`: ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE, and `partial_match: true` when only part of the request matched
  (https://developers.google.com/maps/documentation/geocoding/requests-geocoding). `types` (what it is) is deliberately separate from `location_type` (how precise).
- Mapbox (https://docs.mapbox.com/api/search/geocoding/): `coordinates.accuracy` = rooftop|parcel|point|interpolated|approximate|intersection;
  `match_code.confidence` = exact|high|medium|low; per-component `matched|unmatched|not_applicable|inferred|plausible`.
- Pros: closed enums on the sibling, ordered from best to worst; boolean `partial_match` coexists with the enum. Cons: Google's booleans/enums are per-result,
  Mapbox's per-component enum even includes the word `inferred` - closest precedent for our "guessed" semantic.

### 1.8 Weather QC (NOAA GHCN-Daily) - companion flag triple
- Every value has MFLAG (measurement, e.g. K "converted from knots", T trace), QFLAG (blank = passed; D,G,I,K,L,M,N,O,R,S,T,W,X,Z = which check failed),
  SFLAG (source dataset code; "S" notes it is derived from GTS reports and "may differ from true daily data") (https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt).
- Pros: separates "how derived" from "failed QC" from "who supplied it"; blank = nominal. Cons: single-letter cryptic codes; positional fixed-width format.
  Lesson: provenance (source) and quality (verdict) are different axes - do not let one boolean encode both.

### 1.9 GPS / GeoJSON / ADS-B
- NMEA GGA carries a fix-quality integer and HDOP next to position (sample sentence in https://en.wikipedia.org/wiki/NMEA_0183; code table not on that page).
- GeoJSON RFC 7946 (https://www.rfc-editor.org/rfc/rfc7946): digits "MUST NOT be interpreted as an indication to the level of uncertainty"; "has no concept of uncertainty";
  foreign members allowed but not interoperable. So put precision in explicit metadata, never in decimal places.
- readsb/ADS-B aircraft.json (https://github.com/wiedehopf/readsb/blob/dev/README-json.md): record-level `type` (adsb_icao, mlat, tisb_*) AND
  arrays `mlat: [...]`, `tisb: [...]` "list of fields derived from MLAT data". This is the sparse "list of derived fields" pattern: absent/empty = as reported.
  Pro: very compact, trivial to test. Con: no per-field reason, only a set membership.

### 1.10 ADIF (amateur radio log format)
- Spec 3.1.4 (https://www.adif.org/314/ADIF_314.htm): no confidence/source fields. Time precision is encoded by string length (TIME_ON = HHMM or HHMMSS; Maidenhead
  grids 2-12 chars). DXCC=0 means "known not to be in an entity". `MODE`/`SUBMODE` split; BAND and FREQ coexist without stated precedence. Application-defined
  fields `APP_PROGRAMID_FIELDNAME` are the sanctioned extension route (so an ADIF export of a guessed mode could carry `APP_HAMALERT_MODE_SOURCE`).
- Lesson: ham tooling already accepts length-as-precision for time, but it is invisible to typed JSON consumers; spell it out.

### 1.11 Wikidata / Wikibase - rank + snaktype + qualifiers + references
- Rank preferred|normal|deprecated; snaktype value|somevalue|novalue; qualifiers (e.g. determination method P459), references; time value `precision` integer
  (9 year, 11 day, 12-14 hour/min/sec - 12-14 currently unused) (https://www.wikidata.org/wiki/Help:Ranking, https://doc.wikimedia.org/Wikibase/master/php/docs_topics_json.html).
- Pro: full multi-valued, multi-source truth. Con: every value is a wrapper object; rank answers "which to use", not "how known". Shows precision as a separate integer next to the value.

### 1.12 API style guides
- Zalando (https://opensource.zalando.com/restful-api-guidelines/): null and absent MUST have same semantics (#123); no null for booleans, use enums (#122);
  UPPER_SNAKE enums with `x-extensible-enum` for open sets; `date-time` for exact moments; server-computed properties marked `readOnly` (#252).
- Microsoft Azure (https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md): extensible enums (`modelAsString`) by default, never remove values;
  omit nulls (missing == null); "DO NOT add fields ... if the value is easily computable from other fields".
- Google AIP-203 (https://google.aip.dev/203): `OUTPUT_ONLY` explicitly covers "derived or structured information based on original user input".
- JSON Schema: `null` is not the same as absent (https://json-schema.org/understanding-json-schema/reference/null).
- None of the three guides defines a provenance or precision convention; they only constrain the shape (omit nulls, extensible enums, readOnly).
  Implication: tri-state booleans are discouraged (#122), so `xGuessed: boolean|null` is out; and a derived boolean that is "easily computable" should be computed, not stored.

## 2. Pattern comparison for this API

| Pattern | TS ergonomics | Rule engine | Verdict |
|---|---|---|---|
| `xGuessed` boolean per field | trivial | trivial (`modeGuessed == false`) | loses WHY (bandplan vs comment vs module-letter), field count explodes (one per field), cannot grow to "decode time" or precision |
| sibling `xSource` enum (Spothole, OSM, NOAA) | fine, but base object grows ~8 optional keys | `modeSource != bandplan` | good semantics, noisy base object, naming collisions (`source`, `spotSource`) |
| single sparse `provenance` map (readsb, FHIR `_field` spirit) | one optional key; `Partial<Record<Field,Source>>` typed | `provenance.mode`, one path per field; dotted keys for detail blocks | best fit: why + sparse + extensible + base stays 15 fields |
| wrapper `{value, source, confidence}` (schema.org PropertyValue, Wikidata) | breaks every `spot.mode` read; unions in TS | rule `mode in [...]` must unwrap, breaking change | reject; FHIR's `_field` exists precisely to avoid this. Numeric `confidence` has no honest source here (discrete heuristics), skip |

Note on "absent = reported": it matches readsb, OSM (unset) and Zalando/Microsoft null==absent. Risk is that absent also reads as "unknown provenance". Mitigate by contract:
the schema states that absence in `provenance` means the upstream feed supplied the value, and fields that are ALWAYS derived (DXCC entity from prefix DB) are
documented as readOnly/derived in the schema rather than tagged on every record (AIP-203 / Zalando #252).

## 3. Recommendation

**Pattern: one sparse `provenance` map, plus a sparse `precision` map. Values stay flat and unwrapped. Boolean "guessed" is derived, not stored.**

### Naming and vocabulary
- Top-level keys `provenance` and `precision` (camelCase to match the API). Keys are the field names (`mode`, `band`, `frequency`, `time`, `spotter`); for detail blocks use dotted paths
  (`"pota.ref"`, `"sota.ref"`) so rule paths stay flat. Omit both maps when empty? Prefer always present as `{}` so TS types are non-optional and `spot.provenance.mode` never throws (Microsoft says omit nulls; `{}` is not null).
- Values: lowercase kebab-case strings (match the `cw`, `ssb` token style users already type), documented as an EXTENSIBLE enum (Microsoft `modelAsString`, Zalando `x-extensible-enum`): never remove, clients must tolerate unknown.
  Absent key = reported by the source. Never write `"reported"` into the map.
- Each source has a fixed class, published in the OpenAPI as `x-class`/in docs: `derived` (deterministic transform or lookup, high trust) or `guessed` (heuristic, may be wrong).

| field | source value | class |
|---|---|---|
| mode | `bandplan` (frequency to mode) | guessed |
| mode | `comment` (parsed from free text) | derived (your call; flip to guessed if false positives matter) |
| band | `module-letter` (D-STAR module to band) | guessed |
| band | `frequency` (computed from frequency, rarely worth tagging, usually just omit) | derived |
| frequency | `directory` (lookup, not feed) | derived |
| time | `decode` (decode time, not transmit time) | guessed (semantic mismatch) |
| pota.ref / sota.ref / sig.ref | `comment-regex` | guessed |
| spotter | `relay-unwrapped` | derived |
| dxcc / entity | (not tagged; always `prefix-db`, document as derived in schema) | derived |

### Derived boolean view
- `guessed(field) = provenance[field] != null && CLASS[provenance[field]] == "guessed"`; unknown future source values count as NOT-reported (so a "not guessed" filter stays safe: `notGuessed(field) = provenance[field] == null`
  by default, or `|| class == derived` for the lenient view). Provide helper `isGuessed(spot, field)` in the shared TS package; UI renders "(guessed)" when true.
- Optionally expose a read-only convenience `guessedFields: string[]` (cheap, like readsb `mlat`) ONLY if the UI needs it in one hop; otherwise compute client-side (Microsoft: do not add easily computable fields).
- Do not store `xGuessed` booleans: they duplicate the map and become a second source of truth (Spothole's `dx_location_good` shows the maintenance cost).

### Precision (separate axis, per GHCN QFLAG vs SFLAG and Google location_type vs types)
- `time` stays a full RFC 3339 UTC `date-time` string (Zalando #169; FHIR `instant` also needs seconds), zero-padded when the feed only had minutes. Do NOT rely on string length like ADIF HHMM/HHMMSS or FHIR partial dates:
  padding hides it, JSON.parse hides trailing zeros, GeoJSON explicitly forbids reading digits as uncertainty.
- `precision.time`: `"minute"` (absent = `"second"`). Same enum style for `precision.frequency`: `"khz"` / `"mhz"` if a feed rounds, and for grids use the existing length. Values are the unit of the least-significant digit that is trustworthy (Wikibase `precision` idea, readable).
- Time semantics (decode vs transmit) is provenance, not precision: `provenance.time = "decode"`.

### Interaction with trigger conditions
- Default: conditions evaluate on the value regardless of provenance, so existing rules (`mode in [cw, ssb]`) are unchanged and a guessed `cw` still matches. Back-compatible and what users expect from a spot feed.
- Expose provenance in the rule language as path `provenance.<field>` (resolved to `null` when absent) plus sugar `guessed(mode)` / `reported(mode)`:
  `mode in [cw, ssb] and not guessed(mode)`; `provenance.mode != bandplan`. Compile sugar to the same map lookup so there is only one implementation.
- Negative conditions: `mode != cw` on a guessed mode is ambiguous (it may really be cw). Document that guessed values participate in positive AND negative matches unless `not guessed(...)` is added.
- Per-trigger option "ignore guessed values" can compile to an implicit `not guessed(f)` on every field referenced in that trigger; do not apply it globally.
- Precision: `time` windows compare the padded timestamp; add `precision.time` only if a rule needs sub-minute ordering (rare). Dedup/ordering logic should treat minute-precision times as intervals `[t, t+60s)`.

### Concrete example
```json
{
  "id": "9f2c1a7e",
  "callsign": "DL1ABC",
  "spotter": "G4XYZ",
  "frequency": 14074000,
  "band": "20m",
  "mode": "ft8",
  "time": "2026-10-14T00:18:00Z",
  "dxcc": 230,
  "pota": { "ref": "DE-0001" },
  "comment": "CQ POTA DE-0001 FT8?",
  "provenance": {
    "mode": "bandplan",
    "time": "decode",
    "spotter": "relay-unwrapped",
    "pota.ref": "comment-regex"
  },
  "precision": { "time": "minute" }
}
```
Reads: mode, time, and park ref are guessed or derived; band, frequency, callsign were reported (absent). UI: `mode: FT8 (guessed)`, `POTA DE-0001 (guessed)`.
Rule `band == 20m and mode in [ft8, ft4] and not guessed(mode)` does NOT match this spot; `... and pota.ref exists` does.

### TypeScript sketch
```ts
type Source = "bandplan"|"comment"|"module-letter"|"directory"|"decode"|"comment-regex"|"relay-unwrapped"|(string & {});
interface Spot { /* flat fields */ provenance: Partial<Record<FieldPath, Source>>; precision: Partial<Record<"time"|"frequency", string>> }
const GUESSED = new Set<Source>(["bandplan","module-letter","decode","comment-regex"]);
const isGuessed = (s: Spot, f: FieldPath) => GUESSED.has(s.provenance[f] as Source);
```
The `(string & {})` keeps the union open per the extensible-enum rule while preserving autocomplete.

## 4. Caveats
- WebFetch summaries were produced by a small model; quotes are short and checked where possible. NMEA fix-quality code table, schema.org `isBasedOn`, and HL7 v2/v3 NullFlavor were not verified from the pages.
- Spothole's mode_source enum was read from the repo source (main branch), not the OpenAPI doc (404 at the guessed path).
