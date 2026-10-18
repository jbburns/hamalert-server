# SOTAwatch (Summits On The Air) source report

Researched 2026-10-13 ~23:10 UTC against the live API. Raw samples are in
`.../scratchpad/sources/raw/sotawatch/` (s50.json, s200.json, sneg.json = last 24 h / 455 spots,
week.json = last 168 h / 3597 spots, alerts*.json, assoc*.json, summit.json, summitslist_head.csv).
Per-field statistics below come from the 3597-spot week sample unless stated (24 h sample = 455).

## 1. Access

Current code (`sotaspots.js`, `config_clean.js`):
- `config.sotaWatch.spotsUrl = https://api-db2.sota.org.uk/api/spots/50/all/all`
- `config.sotaWatch.epochUrl = https://api-db2.sota.org.uk/api/spots/epoch`
- `config.summitListUrl = https://www.sotadata.org.uk/summitslist.csv`
- Polling: `setInterval(refreshSpots, config.sotaWatch.refreshInterval)`. Each tick GETs the epoch; if it differs from `lastEpoch`, GETs the last 50 spots, sorts by `id` ascending and processes each.

API behaviour observed (no auth, no API key, plain GET, CORS `*`, `Server: Rocket`, JSON):

| Endpoint | Result |
|---|---|
| `GET /api/spots/epoch` | `text/plain`, 36-char UUID, e.g. `727c71f5-357f-409a-a050-432b775ac6bd`. Global "version" of the spot table: the same value is repeated in the `epoch` field of every spot object. It only changes when something is added or modified. Compare for inequality, not ordering (it's a UUID). |
| `GET /api/spots/{N}/{assoc}/{mode}` | JSON array, newest first (by `timeStamp`; `id` is not strictly monotonic with time, see section 4). |
| `GET /api/alerts` | JSON array of planned activations (section 6, "Alerts"). |
| `GET /api/alerts/epoch` | UUID, same idea as spots epoch (alerts have their own). |
| `GET /api/summits/{assoc}/{region-ref}` e.g. `/api/summits/G/LD-001` | One summit object (see section 5). |
| `GET /api/associations` | Array of 227 associations. `GET /api/associations/{code}` e.g. `/G` returns one association incl. `regions[]`. |
| `/api/regions`, `/api/regions/G`, `/api/alerts/24/all` | 404 "Nothing to see". |
| `/docs` | HTML terms of service only (not an OpenAPI spec). `/docs/openapi.json`, `/swagger.json` just return that HTML or 404. No machine-readable docs found. |

Meaning of the `/api/spots/{N}/{assoc}/{mode}` path segments (determined empirically, undocumented):
- `{N}` positive: number of spots, hard-capped at 200 (`/500/` and `/1000/` both returned exactly 200, same bytes as `/200/`).
- `{N}` negative: hours of history. `-1` gave 6 spots, `-24` gave 455, `-48` gave 884, `-168` (7 days) gave 3597; `-1000` is clamped to 168 h (identical 3597 result). This is the way to backfill after an outage. Response was ~1.5 MB for a week.
- `{assoc}`: `all` is the only value that matters. `G`, `g`, `W7A`, `W7`, `VK1`, `gm`, `G,VK` all returned the unfiltered list (same 20 spots), so the association filter is apparently ignored or broken in this API version. Filter client-side by the summit-code prefix.
- `{mode}`: works and is lower-case and comma-list capable: `all`, `ssb`, `cw`, `fm`, `am`, `data`, `other`, `ssb,cw` all returned only matching modes (`other` returned the records with `mode":"OTHER"`). Upper-case values (`CW`, `SSB`) silently fall into the "OTHER" bucket (returned only `OTHER` spots), so always send lower-case. Spots with empty `""` mode never matched any mode filter I tried other than `all`.
- An empty last segment (`/spots/20/all/`) returns a one-element "deprecated endpoint" stub (see below).
- Deprecated stub shape (HTTP 200 with a fake record): `[{"id":null,"userID":null,"timeStamp":"2026-10-13T23:09:21","comments":"This API endpoint is deprecated. Please update ...","callsign":null,"associationCode":"DEPRECATED","summitCode":"DEPRECATED","activatorCallsign":"DEPRECATED",...}]`. A consumer must not ingest that. Defensive rule: skip any record with `id == null` or `summitCode == "DEPRECATED"`.

Rate limits: none advertised in headers; `/docs` says "reasonable usage limits" and that heavy users, deprecated-endpoint users and excessive consumers may be blocked. Current HamAlert behaviour (one tiny epoch request per interval, full fetch only on change) is the polite pattern; keep it. No streaming/websocket/SSE endpoint was found for this API (the old sotawatch.org website used a different stack; not investigated).

Terms of service (https://api-db2.sota.org.uk/docs), summarised, because they affect HamAlert as an operator:
- The API is private/internal; "reasonable public usage tolerated"; as-is, may change or break without notice.
- No commercial use (commercial use needs a licence and fee).
- A designated point of contact is required: developers must be members of the SOTA Reflector (https://reflector.sota.org.uk/) and its "API-consumers" group before using the API; changes are announced there.
- Stated policy against AI-generated/"vibe-coded" software connecting without prior approval, and against building yet another aggregator/dashboard. This is a policy/contact risk the project owners should resolve with SOTA management (contact form https://www.sota.org.uk/Contact), independent of the technical design.
- Deprecated endpoints are monitored; consumers still on them may be blocked.

Detecting new/edited/deleted spots:
- New: unseen `id`. Edited: same `id`, changed content (the epoch changes; current code hashes `timeStamp, activatorCallsign, summitCode, frequency, mode, comments` per id and re-emits as new when the hash differs). I could not observe an edit live, so whether `timeStamp` is rewritten on edit is unverified; the existing hash includes it.
- Deleted: no tombstone. A spot simply disappears from the window; the only soft deletes are `type` values (QRT/TEST) which are normal records. HamAlert does not need deletion handling for notifications.
- The epoch is global so it is a cheap "anything changed" check; per-record `epoch` is useless as a cursor.

## 2. Raw record format

Complete verbatim records from the live feed (S50 sample, 2026-10-13):
```json
{"id":409662,"timeStamp":"2026-10-13T23:00:56.773642Z","activatorCallsign":"VK1DA/P","activatorName":"Andrew","callsign":"VK1DA","comments":"Andrew also VKFF-0377","frequency":144.2,"mode":"SSB","summitCode":"VK1/AC-008","summitName":"Mt Ginini","AltM":1760,"AltFt":5774,"points":8,"userID":4969,"type":"NORMAL","latitude":-35.529170989990234,"longitude":148.77194213867188,"epoch":"727c71f5-357f-409a-a050-432b775ac6bd"}
```
RBNHole auto-spot (spotter is the literal bot name, real skimmer inside the comment, `type: null`):
```json
{"id":409656,"timeStamp":"2026-10-13T22:12:02.825487Z","activatorCallsign":"N6JFD/P","activatorName":"Jamie","callsign":"RBNHOLE","comments":"[RBNHole] at VE6JY 20 WPM 29 dB SNR","frequency":10.115,"mode":"CW","summitCode":"W6/NS-248","summitName":"7008","AltM":2136,"AltFt":7008,"points":6,"userID":19344,"type":null,"latitude":38.89590072631836,"longitude":-120.00830078125,"epoch":"727c71f5-357f-409a-a050-432b775ac6bd"}
```
QRT record (frequency null, mode empty):
```json
{"id":409556,"timeStamp":"2026-10-13T15:43:45.778447Z","activatorCallsign":"M0WML","activatorName":"Unrecognized","callsign":"MW0WML","comments":null,"frequency":null,"mode":"","summitCode":"G/WB-015","summitName":"Callow Hill","AltM":340,"AltFt":1114,"points":1,"userID":3504,"type":"QRT","latitude":52.4608268737793,"longitude":-2.795056104660034,"epoch":"727c71f5-357f-409a-a050-432b775ac6bd"}
```
APRS2SOTA and SMS-relayed:
```json
{"id":409486,"timeStamp":"2026-10-13T13:53:38.566934Z","activatorCallsign":"HB9/DG3GAI/P","activatorName":"Nikolaus","callsign":"APRS2SOTA","comments":"[APRS2SOTA] ","frequency":144.31,"mode":"SSB","summitCode":"HB/AR-002","summitName":"Hochhamm","AltM":1275,"AltFt":4183,"points":2,"userID":33443,"type":"NORMAL","latitude":47.316898345947266,"longitude":9.244999885559082,"epoch":"727c71f5-357f-409a-a050-432b775ac6bd"}
```
SMS spotter comment form (from week.json): `"comments":"[IZ3GME{IT}]: POTA IT-0773 "`, `callsign":"SMS"`.

## 3. Field inventory (spots)

Presence = value neither null nor "" in the 3597-record week sample. All 18 keys are present on every object (keys never missing; absence is expressed as null or "").

| Field | JSON type | Presence | Examples | Notes / quirks |
|---|---|---|---|---|
| `id` | int | 100% | 409662 | Unique, no duplicates. NOT strictly ordered by time (14 of 455 adjacent pairs inverted in the 24 h sample; ids are allocated at creation, timeStamp may be user/ client supplied). Gaps exist (464 id span for 455 spots: some deleted/hidden). |
| `timeStamp` | string | 100% | `2026-10-13T23:00:56.773642Z` | ISO-8601 UTC, always `Z`, always microsecond precision (9999-99-99T99:99:99.999999Z in 100% of records). Spot time. The code only keeps `HH:MM`. |
| `activatorCallsign` | string | 100% | `VK1DA/P`, `IT9/DF7TR/P`, `HB9/DG3GAI/P`, `F/DH2ID/P`, `SP5PSZ/QRP` | The callsign being spotted, includes portable/prefix suffixes. Quirk: one record had `"HB9GAL QRT"` (space and text embedded in the callsign; user typed into the callsign field). Code uppercases and strips whitespace (`replace(/\s/g,'')`, which would yield `HB9GALQRT`; arguably better to take the first token). Upper-case in all observed records. |
| `activatorName` | string | 96.0% (null/"" 4%) | `Andrew`, `Unrecognized` | First name from SOTA profile; literal `"Unrecognized"` when the user is not matched (11 of 455 in 24 h). Treat `Unrecognized` as absent. Not in current HamAlert spot. |
| `callsign` | string | 100% | `VK1DA`, `RBNHOLE`, `APRS2SOTA`, `SMS`, `SOTAmat`, `sp9jkl`, `K7STB ` | The SPOTTER (not the activator!). Naming is confusing: `callsign` = who posted. Mixed case in the wild (`sp9jkl`, `kd7qow`, `mi0srr`, `SOTAmat`); trailing space seen (`K7STB `). Current code uppercases and trims. Usually the base call of the activator (self-spot): 318/455 in 24 h. |
| `comments` | string or null | 66.3% non-empty (null ~22%, "" ~12% in 24 h sample) | `"[RBNHole] at VE6JY 20 WPM 29 dB SNR"`, `"[SOTA Activator] "`, `"*QRT* Markus"` | See section 4 for conventions. Whitespace padding common (`"[APRS2SOTA] "`, `"[SOTA Activator] "`). Newlines possible (`"[M6BWA{GB}]: TEST ONLY \n "`). Current code strips a leading `". "` or `"*"`, trims, converts null and the string `(null)` to "". No `(null)` literal was seen in the week sample. |
| `frequency` | number or null | 97.6% (null only on QRT/TEST: 84 QRT + 1 TEST) | `144.2`, `7.155`, `10.115`, `14.235`, `435.64`, `0.0` | MHz, float, up to 4 decimals (kHz resolution is 3 decimals; 4-decimals exist, e.g. 100 Hz). Range in 24 h: 0.0 to 435.64. `0.0` occurs on 13 QRT records (23 QRT with 0 or null freq in 24 h). Never a string in spots (in alerts it IS a string). Cluster/RBN use kHz so unit conversion is required (x1000). Float noise is not present as shown (JSON gives shortest repr), but round to Hz on ingest. |
| `mode` | string | 95.4% non-empty | `CW`, `SSB`, `FM`, `AM`, `DATA`, `OTHER`, `""` | Upper-case enumeration, see section 4. Empty string on 165/3597 (all but 1 of them QRT, 1 TEST). Code lower-cases. SOTAwatch has no `SSB` sub-sidebands (USB/LSB) and no digital sub-modes. |
| `summitCode` | string | 100% | `VK1/AC-008`, `W7W/WH-185`, `HB/AR-002` | Full reference `{ASSOC}/{REGION}-{NNN}`. Always upper-case, no whitespace, contains exactly one `/` and one `-`. Association part is variable length and may contain digits/letters (`W7W`, `VK1`, `ZL3`, `9A`, `4O`, `S5`). This is the primary key into the summit list. (Alert records use a different split, see below.) |
| `summitName` | string | 100% | `Mt Ginini`, `Hochhamm` | Quirk: for some summits it is just a number string, e.g. `W6/NS-248` -> `"7008"` (feet altitude; unnamed US summits named by elevation). Do not assume it is a human name. |
| `AltM` | int | 100% | `1760` | Metres, int, never 0 in sample. Note the capital A in key name. |
| `AltFt` | int | 100% | `5774` | Feet (rounded conversion). |
| `points` | int | 100% | 1,2,4,6,8,10 | Summit points (not including activator bonus). Same values as `Points` in the CSV. |
| `userID` | int | 100% | `4969` | SOTA database user id of the POSTER. For RBNHole, APRS2SOTA, SMS bots it is the bot account's/owner's id (varies per activator in some cases: 96 distinct userIDs among 455 spots, so for bots it appears to be the activator's user id rather than a bot id). Not useful for HamAlert. |
| `type` | string or null | 60.7% non-null | `NORMAL`, `QRT`, `TEST`, `null` | Week sample: NORMAL 1821, null 1414, QRT 349, TEST 13. `null` = a spot created by an automated or app route without a type (all 661 RBNHole spots, all `[SOTA Activator]` spots, spots with no comment). Treat `null` and `NORMAL` as normal. QRT = activator signing off / "spot withdrawn" (frequency often null/0, mode often ""). TEST = test spot (only APRS2SOTA/SMS/SOTAmat seen). Current code drops everything that is truthy and `!== "NORMAL"`, i.e. QRT and TEST dropped; null kept. |
| `latitude` | float | 100% | `-35.529170989990234` | Summit location; float32 widened to float64 (noisy digits, 7 meaningful). It is the summit's, not the activator's position. |
| `longitude` | float | 100% | `148.77194213867188` | idem. |
| `epoch` | string (UUID) | 100% | `727c71f5-...` | Table version, identical on every spot in a response. Current code does `this.lastEpoch = spot.epoch` in the loop (last element wins; works since all equal). |

## 4. Semantics and quirks

Time: `timeStamp` is the spot time in UTC with microseconds, apparently assigned server-side when posted (RBNHole and APRS2SOTA bots post at their own cadence). No separate "received" time. HamAlert additionally drops spots older than `config.sotaWatch.spotMaxAge`.

Frequency: MHz decimal (HF e.g. `7.155`, VHF `144.31`, UHF `432.55`). Alerts use a string with mode suffixes (see below). `0.0`/null means unknown (QRT).

Mode vocabulary actually observed (week, n=3597): `CW` 1686, `SSB` 1310, `FM` 389, `""` (empty) 165, `DATA` 38, `AM` 5, `OTHER` 4. The `/api/spots` mode filter accepts `all, ssb, cw, fm, am, data, other` (lower-case). Raw values are always upper-case. There is no `LSB/USB`, no `FT8`, no `RTTY`: digital goes to `DATA`; anything else to `OTHER`. The existing HamAlert mode guesser (frequency ranges in `config_clean.js`) is needed only when mode is "" or OTHER.

`type` vocabulary: `NORMAL`, `QRT`, `TEST`, `null`.

Spotter representation (the `callsign` field), observed styles in the week sample:
- Self-spot by the activator (callsign equals activator base call): the majority (~70% of 24 h sample).
- Another human chaser: 34/455 in 24 h.
- `RBNHOLE` (upper-case): 661/3597 (18%). Bot that posts CW spots seen by RBN for the activator's frequency. Comment is always `[RBNHole] at {SKIMMER} {WPM} WPM {SNR} dB SNR`, e.g. `[RBNHole] at VE6JY 20 WPM 29 dB SNR`. The real "spotter" (the skimmer callsign, `VE6JY`) is only in the comment; current regex `/\[RBNHole\]\s+at\s+(\S+)\s/` extracts it and replaces the spotter. Number formats: WPM and SNR integers. `type` is null for these. Mode is CW. The skimmer call may include `-#` SSID suffix? (not observed in sample, but RBN skimmers normally appear as `CALL-#`.) Note `RBNHOLE` is the literal even if the real skimmer has the same spotter identity as RBN spots HamAlert gets directly from rbn.js, so these are duplicates of RBN data tied to a summit; a dedup/merge decision belongs to the schema/consumer designers.
- `APRS2SOTA` (49): auto-spot from APRS position/beacons. Comment `[APRS2SOTA] ` (+ optional free text). Only 9 of 455 with type NORMAL; also sends TEST-typed spots.
- `SMS` (33): SMS gateway. Comment format `[{REAL_SPOTTER_CALL}{{REGION}}]: {text}`, e.g. `[IZ3GME{IT}]: POTA IT-0773 `, `[KD7WPJ{NA}]: 0041 qrt tnx chasers `. The real spotter and a 2-letter continent/region code are inside the comment, same idea as RBNHole but a different syntax (`{IT}`, `{NA}`, `{GB}`). The current code does NOT unwrap SMS spotter; `config.noLookupCallsignsRegex = /APRS2SOTA|^SMS|^[A-Z]+$/` merely prevents callsign lookups (DXCC/QRZ-style enrichments) for these pseudo callsigns.
- `SOTAmat` (15): app/web service `SOTAmat` (mixed case). Often empty comment.
- `APSPOT` (4): another bot-like name (aprs-related?) seen in the week sample.
- Lower-case human spotters (`sp9jkl`, `kd7qow`, `mi0srr`, `dl9sp`, `ea4htw`) and one with trailing space (`K7STB `): normalise with upper+trim. Earlier SOTAwatch used a "sotawatch" lowercase bot name; not observed this week.
- Comment tags of app/UI origin (spotter is the human): `[sotl.as]` (272 in week; SOTL / sotl.as web app), `[SOTA Activator]` (153; official activator app; e.g. `[SOTA Activator] rs44 sat 22:00 utc`), `[VK port-a-log]` (9), `[TrailLog` (2), `[H2K]` (1). Pattern: leading `[ToolName]` is a client tag, analogous to the bot tags. A generic rule `^\[([^\]]+)\]` yields the "posting tool".

Test spots: two text/typed layers. (1) `type == "TEST"` (13 in week); (2) free-text comments containing "test" (the code ignores them: `/\btest(ing)?\b/i`; seen: `Test Pse ignore` from SOTAmat typed NORMAL, `spot test` via SMS typed null); (3) none labelled in `mode`. The regex would also drop genuine comments such as "QRP test" or "antenna test".

QRT: `type == "QRT"` (349 in the week, ~10%). Often paired with comment `QRT`, `*QRT* Markus`, `Qrt`, `[sotl.as]`, "Thanks chasers", `frequency` 0.0/null and `mode` "". Some "QRT" intents arrive as NORMAL-typed? Observed: 0 NORMAL spots with 'qrt' in the comment in the 24 h sample, though in the week sample comments such as `0041 qrt tnx chasers` (SMS, type null) exist. Therefore text matching for QRT is not reliable; consider flagging `isQrt` from `type` and, optionally, comment heuristic.

Edited spots: same `id`, new content (assumed; not observed). Current code treats edits as new events via the content hash.

Duplicates: a single activator re-posting the same summit repeatedly is normal (e.g. `SP5PSZ/QRP` on `SP/TA-003` 25 times in 24 h, mostly `[sotl.as]` re-spots). Each is a distinct id. Dedup is a downstream decision. RBNHole results duplicate RBN spots.

Comment conventions / hidden references:
- Other programme references appear in free text: POTA (`POTA IT-0773`, `W7-...`), WWFF (`VKFF-0377` in `Andrew also VKFF-0377`), IOTA, contest/event IDs (`JCG09008/N` is a JARL award ref). 121 of 3597 week comments matched a `XX-NNNN` pattern. Current server.js `normalizeSpot` does scan the raw text for these.
- Summit ref is NOT in the comment: it is always the structured `summitCode`.
- Leading `. ` or `*` are legacy decorations, strip them.
- Other cosmetics: padded spaces, embedded newlines, occasional `(null)` literal (legacy, not seen this week).

Summit data in spots vs list: spot has `AltM/AltFt/points/summitName/lat/lon` already, so the summit list is only needed for activation count, validity, region/association names and bonus points.

## 5. Related reference data

### Summit list CSV
- URL used by code: `https://www.sotadata.org.uk/summitslist.csv`. It returns HTTP 302 (Netlify) to `https://storage.sota.org.uk/summitslist.csv` (so the HTTP client must follow redirects; axios does). ~25.2 MB, 182 280 data rows, `Last-Modified: Tue, 13 Oct 2026 03:39:12 GMT` (regenerated daily, ~03:30 UTC; the first line contains the generation date `Date=13/10/2026`). ETag/Last-Modified/`accept-ranges` are provided, so use conditional GET.
- Encoding UTF-8, CRLF-less (`\n`), RFC-4180 style quoting; some names have doubled quotes, e.g. `""Pasture Mountain""` (inside a quoted field = literal quotes in name).
- Line 1 is a title line, NOT part of the CSV header: `SOTA Summits List (Date=13/10/2026)`. Line 2 is the header. A CSV parser must skip line 1.
- Columns (17): `SummitCode, AssociationName, RegionName, SummitName, AltM, AltFt, GridRef1, GridRef2, Longitude, Latitude, Points, BonusPoints, ValidFrom, ValidTo, ActivationCount, ActivationDate, ActivationCall`.
- Samples:
```
3B8/MU-001,Mauritius,Mauritius,"Piton de la Petite Rivière Noire (Black River Peak)",828,2716,57.40771,-20.40882,57.40771,-20.40882,10,0,01/08/2026,31/12/2099,0,,
G/LD-001,England,Lake District,Scafell Pike,978,3209,NY 215072,,-3.21168,54.45426,10,3,02/03/2002,31/12/2099,284,03/10/2026,M3AWB/P
4O/IC-001,Montenegro,Istok Crne Gore,Maja Rosit,2524,8280,19.8505,42.4795,19.8505,42.4795,10,3,01/03/2019,31/12/2099,1,27/07/2022,4O/SQ9MDF/P
```
- Semantics:
  - `SummitCode` unique key (no duplicates in 182 280 rows); format `ASSOC/REGION-NNN`. There is NO separate association-code or region-code column: association code = text before `/`, region code = two letters after `/` before `-`, number = three digits. `AssociationName` is the long name (e.g. `USA - California`, `USA - CT / ME / MA / NH / RI / VT` for `W1`), `RegionName` e.g. `Lake District`. 227 associations (prefixes) in the file; `/api/associations` lists the same 227 with `dxcc`, `continent`, manager, bounding box, `regionsCount`, `summitsCount`.
  - `AltM`/`AltFt` ints; range 102 to 6960 m. `GridRef1`/`GridRef2`: for UK summits an OS grid ref (`NY 215072`) with `GridRef2` empty; otherwise just lon/lat duplicates (GridRef2 empty on 2040 rows). `Longitude`, `Latitude` decimals (5 digits, longitude first).
  - `Points`: 1, 2, 4, 6, 8, 10 (counts 26061/33522/38086/36091/26906/21614). `BonusPoints`: 0 or 3 (winter bonus/seasonal; 100 816 rows have 3).
  - `ValidFrom` and `ValidTo`: `DD/MM/YYYY`, inclusive-date semantics, UTC-less. `ValidTo=31/12/2099` means "currently valid, no end" (161 445 rows). 10 150 rows are expired (e.g. `ValidTo=01/12/2022`, summit retired; `ValidFrom==ValidTo` used when a summit is removed on the day it was created in the DB), and 7 rows are in the future (`ValidFrom=01/02/2027`, e.g. `W1/AM-434`). Current code marks `[invalid]` when `summit.ValidFrom > now || summit.ValidTo < now` (the CSV must be parsed into Dates first; the mongo import does that). Note ValidTo at 00:00 on the final day makes the last day count as invalid by that comparison; use end-of-day if exactness matters.
  - `ActivationCount`: int, 0 for 131 897 rows, max 2525; `ActivationDate` (DD/MM/YYYY) and `ActivationCall` (callsign of most recent activator, often with `/P`) are empty when never activated. These change daily and are not worth enriching at spot time except for "unactivated summit" triggers.
- The current code's fields come from `summits` collection: `SummitName`, `AltM`, `Points`, `ActivationCount`, `ValidFrom`, `ValidTo`. Spots already carry name/alt/points, so only `ActivationCount` and validity truly need the list.
- Single summit JSON via `/api/summits/G/LD-001`: `{"associationName":"England","associationCode":"G","regionName":"Lake District","regionCode":"LD","summitCode":"G/LD-001","name":"Scafell Pike","notes":"","points":10,"altM":978,"altFt":3209,"activationCount":null,"activationCall":null,"activationDate":null,"gridRef1":"NY 215072","gridRef2":"","locator":"IO84jk","latitude":54.45426,"longitude":-3.211682,"myChases":null,"myActivations":null,"validTo":"2099-12-31T00:00:00Z","validFrom":"2002-03-02T00:00:00Z","valid":true,"restrictionMask":false,"restrictionList":[]}` (note `activationCount: null` here, unlike the CSV; also gives the Maidenhead `locator`). Not suitable for bulk use.

### Associations / regions
`/api/associations` fields: `activeFrom, associationCode, associationName, associationManagerCallsign, dxcc (string), manager, maxLat/maxLong/minLat/minLong, regionsCount, summitsCount, continent`. `/api/associations/G` adds `regions[]` (`regionCode, regionName, regionManagerCallsign, manager, bounding box, summits, notes`) and `arm`. The `dxcc` field gives the association -> DXCC entity number (e.g. `G`=223 England, `3B8`=165, `5B`=215), useful to derive DXCC of the summit location without a prefix lookup; note some associations span multiple entities.

## 6. Proposed mapping

Base `Spot` (from SOTA):
| Base field | From | Transform |
|---|---|---|
| `source` | constant `"sotawatch"` | keep current value. |
| `id` / `sourceId` | `id` | int; combine with a content hash for edits (as now). |
| `callsign` (spotted station) | `activatorCallsign` | uppercase; take the first whitespace-delimited token (not remove whitespace); keep `/P`, `/QRP`, `CC/` forms; also derive `callsign` base (current `fullCallsign` vs `callsign`). |
| `spotter` | `callsign`, unwrapped | uppercase+trim; if `RBNHOLE` use the skimmer from the comment `[RBNHole] at X`; if `SMS` use `[X{..}]:` prefix; record `spotterKind`. Keep original in `reporterRaw`. |
| `frequency` | `frequency` | MHz -> Hz or kHz per global convention (decide centrally; cluster/RBN/PSK use kHz); null/0 -> unknown. |
| `mode` | `mode` | lower-case; "" and OTHER -> unknown then mode guesser by frequency; DATA is a mode family, not a specific mode. |
| `time` | `timeStamp` | keep full ISO instant (UTC); current code only stores HH:MM, drop that lossy form. |
| `comment` | `comments` | null -> ""; strip `^(\. |\*)`, trim, `(null)` -> "". Leave tags like `[RBNHole] at ...` in the comment or parse out into extension. |
| `rawText` | synthesized | `"{time} {call} on {summitRef} ({name}, {alt}m, {pts}pt) {freq} {MODE}: {comment}"` (current). |

SOTA extension (`SotaSpotExt` / `kind: summit`) - always present for this source:
- `summitRef` (string, `summitCode` upper-case, e.g. `W7W/WH-185`) - always.
- `summitAssociation`, `summitRegion` - derive by splitting (`^(.+)/(.+)-(\d+)$`, already done in server.js).
- `summitName` (string, treat purely numeric names as is), `summitHeightM` (int, `AltM`), `summitPoints` (int, `points`), `summitLatitude`/`summitLongitude` (from spot; not the operator's position).
- From CSV (optional, may be missing if the summit isn't in the list yet): `summitActivationCount`, `summitValid` (bool), `bonusPoints`, `summitRegionName`, `associationName`.
- `spotType`: enum `normal | qrt | test` from `type` (null -> normal); consider keeping QRT as a spot kind or flag rather than dropping, since "QRT" is useful for de-notification; at least make it explicit.
- `posterUserId` optional; `activatorName` optional (drop `Unrecognized`).
- `clientTag`: first `[Tag]` in comment (`RBNHole`, `APRS2SOTA`, `sotl.as`, `SOTA Activator`, ...), optional.
- For RBNHole spots, extension `skimmer`, `speedWpm`, `snrDb` parsed from the comment (these map to the generic `speed`/`snr` fields that RBN spots use in `server.js` field list).

Optional even within the source: `comment` (≈34% empty), `frequency` (unknown on QRT/TEST), `mode` (empty on QRT/TEST and ~5% overall), activator name. Always present: id, time, activator callsign, spotter, summitCode, summit name/alt/points/lat/lon.

Enrichment HamAlert must still do: band (from frequency), DXCC/continent/zones/state/prefix for the activator callsign and for the spotter (skip pseudo spotters matching `APRS2SOTA|^SMS|^[A-Z]+$`, plus SOTAmat/APSPOT), mode guess if empty/OTHER, WWFF/POTA/IOTA reference detection in the comment (`normalizeSpot`), summit list join (activations/validity).

## 7. Open questions / risks
1. Terms of service: non-commercial, requires SOTA Reflector "API-consumers" membership, API is declared private and may change/block without notice; also an explicit policy against AI-generated clients without approval. Needs a decision by the project owner (contact SOTA management) before shipping a rewrite that talks to `api-db2`. Fallback options (old `sotawatch.org` JSON, SOTA mailing-list data, or scraping other aggregators) were not researched.
2. The `{assoc}` filter segment is ignored today; if SOTA fixes it, a request with an unexpected filter might start returning less. Always use `all`.
3. Hard cap of 200 spots per request (positive N) vs up to 168 h with negative N; the current "50 newest on change" can lose spots when more than 50 are posted between polls (RBNHole bursts) or after downtime. Recommend negative-hour backfill on startup.
4. Epoch is a UUID with no ordering. One extra request per poll; changes on any edit.
5. Stub "deprecated" objects (HTTP 200, `id:null`) can arrive instead of data if the URL pattern becomes deprecated; need validation. The `/api/spots/N/all/all` pattern remains supported today.
6. `type: null` ambiguity: bots and apps create null-type spots that are real. Never filter with "type truthy". TEST and QRT (about 10% of records) must be decided (drop vs keep as flagged).
7. Spotter identity: RBNHole (skimmer in comment) and SMS (spotter in comment) are pseudo-spotters; decide whether `spotter` in the base spot is the pseudo or the real one, and whether to keep `spotterKind`/`via` for both. Case and whitespace in spotters are unreliable.
8. RBNHole spots duplicate RBN spots that HamAlert may also ingest from RBN directly; dedup policy needed (they carry summit context though).
9. Activator callsign can contain garbage (`HB9GAL QRT`); no validation upstream.
10. Frequency unit (MHz float) differs from cluster (kHz). Alerts frequency is a free-form string (`"144.300-ssb, 145.500-fm, 7-ssb"` where the number is MHz and "-mode" suffix).
11. Summit list is 25 MB, daily, with a junk first line and DD/MM/YYYY dates; ValidFrom/ValidTo edge semantics (inclusive vs exclusive) is not documented.
12. `summitName` can be numeric text; `latitude/longitude` are float32 noise.
13. Whether edits rewrite `timeStamp` is unverified.

### Alerts (planned activations) - possible future spot-like kind
`GET /api/alerts` (default window; `/api/alerts/12` identical; `/api/alerts/24/all/all` gives a wider past window, 256 vs 225 records; negative N behaves differently (155 records, further-future starts only), semantics unclear) plus `/api/alerts/epoch` (UUID) for change detection. Record (13 keys, all always present; `comments` empty in ~33%, `activatorName` 99.6%):
```json
{"id":69085,"userID":9385,"timeStamp":"2026-10-12T22:43:58.456605Z","dateActivated":"2026-10-13T00:30:00Z","associationCode":"JA","summitCode":"NN-103","summitDetails":"Jatougeyama, 1664m, 10 pts","frequency":"7-cw","comments":"JCG09008/N","activatingCallsign":"JF3KLH/0","activatorName":"Yoshito","posterCallsign":"JF3KLH","epoch":"64d3c00d-9093-4dfe-9b4b-1beecf1c7c41"}
{"id":69119,"userID":9114,"timeStamp":"2026-10-13T10:40:39.814953Z","dateActivated":"2026-10-13T11:39:00Z","associationCode":"SV","summitCode":"CR-022","summitDetails":"Analypsi, 1177m, 4 pts","frequency":"7-cw, 14-cw, 14-ssb, 144-ssb, 144-cw","comments":"@aprs","activatingCallsign":"SV9/SO9TA/P","activatorName":"Sergiy","posterCallsign":"SO9TA","epoch":"64d3c00d-9093-4dfe-9b4b-1beecf1c7c41"}
```
Differences from spots:
- Future-dated: `dateActivated` is the planned start (UTC, second precision, `...Z`); `timeStamp` is when the alert was posted. Alerts range up to 2028-12-01 (many months ahead; the default list has 225 entries from now-12h onward). No `type` (QRT/TEST); cancellation is expressed in the comment (`CANCELLED`) or by deletion. Edits keep the id.
- Summit reference is split: `associationCode` (`I`, `SV`, `W7W`, `JA`) + `summitCode` WITHOUT the association (`SI-188`, `CR-022`) -> full ref = `associationCode + "/" + summitCode` (e.g. `SV/CR-022`). Spot's `summitCode` is already full.
- `summitDetails` is a display string `"Name, 1177m, 4 pts"` (parse if needed); no lat/lon/alt fields.
- `frequency` is a free-form STRING listing multiple band/mode pairs, MHz `-` mode: `"7-cw"`, `"144.300-ssb, 145.500-fm, 7-ssb, 14-ssb"`, `"cw-ssb-hf, 145-fm"`, even `"14"`; frequencies are often only band centres (`7`, `14`, `144`), not tunable frequencies; there is no single `mode`.
- Activator is `activatingCallsign`, poster is `posterCallsign` (140 of 256 alerts are posted by someone other than the activator); no spotter-like bots.
- Therefore alerts are a separate kind (`Alert`: activator, summitRef, plannedStart, plannedBands[], comment, poster) rather than a Spot; HamAlert currently has no alert support. Only the summit extension (summit ref/name/points) overlaps with spots.
