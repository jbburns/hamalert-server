# POTA (Parks On The Air) spot source report

Researched 2026-10-13 ~23:08-23:14 UTC against live `https://api.pota.app`. Raw samples: `/tmp/claude-0/-home-user-hamalert-server/89e2a1b4-cf72-50c1-bad7-1287a1913473/scratchpad/sources/raw/pota/` (files named below). Statistics are from three polls ~2.5 min apart: `/spot/activator` 3 polls (76/75/70-ish rows, 221 rows total), `/spot` 3 polls (848 + 882 + ~900 rows; 1064 distinct spotId+spotTime pairs). The sample is one afternoon-US-time slice: HF heavy, RBN heavy; other times of day will show more modes/sources.

## 1. Access

**Current code**: `potaspots.js` polls `GET https://api.pota.app/spot/activator` every 60 s (`config.pota.refreshInterval`), `spotMaxAge` 5 min, header `User-Agent: HamAlert/1.0 (+https://hamalert.org)`. `config.pota.apiUrl = https://api.pota.app` is defined but unused in the files I read.

**Auth / limits**: none. Anonymous, CORS `access-control-allow-origin: *`. No documented rate limit; I saw none. There is **no official API documentation** (root `/`, `/docs`, `/stats/` return API-Gateway `{"message":"Missing Authentication Token"}` with 403, which is what unknown routes return). The API is the one the pota.app web client uses; treat it as unofficial/undocumented and subject to change. Hosted on AWS API Gateway behind CloudFront.

**Caching**: `/spot` and `/spot/activator` are served via CloudFront with no `cache-control` header, but `x-cache: Hit from cloudfront` with `age: 1..10` was seen, i.e. a few seconds of edge caching. Static-ish endpoints (`/park/*`, `/programs`, `/locations`, `/program/parks/*`, `/location/parks/*`, `/park/grids/*`, leaderboard) send `cache-control: public,immutable,max-age=3600`. Polling spots more often than ~every 10-15 s is pointless.

**Polling only** (no websocket/SSE/stream seen). There is no `since`/cursor parameter on the spot endpoints (I did not find one; unverified whether hidden params exist).

### Endpoints (all GET, JSON, HTTPS, observed live)

| Endpoint | Returns | Notes |
|---|---|---|
| `/spot/activator` | Array: **latest spot per (activator, reference)** for activations still "live", 19 fields (section 3). ~70-76 rows, 30-33 KB. | Used by HamAlert today. Includes `grid4/grid6/latitude/longitude/count/expire/invalid/parkName`. A park activation stays listed until 30 min after its last spot (`expire`). |
| `/spot` (also `/spot/`) | Array: **every spot in the last ~30 min** (848-900 rows, ~240 KB), 11 fields only: `spotId, spotTime, activator, frequency, mode, reference, spotter, source, comments, name, locationDesc`. Newest first by spotTime (not strictly spotId order). | Superset of information per spot (every RBN hit, every re-spot) but lacks grid/lat/lon/count/expire. Window observed: min spotTime = fetch time minus ~30 min. Not currently used by HamAlert. |
| `/spot/comments/{activator}/{reference}` | Array: all spots of that activation (not just 30 min; for W4S/US-7454: 419 rows from 21:54 to 23:09 UTC; for VE3YOA/CA-5572: 59 rows from 20:44). 8 fields: `spotId, spotTime, spotter, mode, frequency, band, source, comments`. Newest first. | The only place the API gives `band` (`"20m"`). Unknown activator/park pair returns `[]`. |
| `/park/{ref}` | Object: one park, full detail (see below) | Unknown ref returns literal JSON `null`. `name` here is the SHORT name (see quirk 4.9). |
| `/park/grids/{lat1}/{lon1}/{lat2}/{lon2}/{zoom?}` | GeoJSON FeatureCollection of parks in bbox: `properties {reference, name, atno}`, Point geometry `[lon, lat]` | Works for e.g. `34/-85/35/-84/0` (37 KB). Empty bbox returns empty FeatureCollection. Argument order not fully verified (looks like south/west/north/east). |
| `/program/parks/{prefix}` | Array: all parks of a program (country) e.g. `/program/parks/US` = 4.6 MB (US-0001 ...). Fields: `reference, name, latitude, longitude, grid (6 char), locationDesc, attempts, activations, qsos, website, notes` | Heavy; cache for an hour. Does it include inactive parks? Not checked per-park. |
| `/location/parks/{locationDesc}` | Same record shape as above, for one state/province, e.g. `/location/parks/US-RI` (61 parks), `/location/parks/US-GA` (237) | `name` here is the FULL name (`McGraw Ford Wildlife Management Area`), identical to the `name` in a spot. |
| `/programs` | Array of 249 programs: `programId, programPrefix, programName, isActive (1/0, 248 active), isocc, location_unit, isolang` | e.g. `{"programId":1,"programPrefix":"US","programName":"United States of America","isActive":1,"isocc":"US","location_unit":"State","isolang":"eng"}`. |
| `/locations` | Array of 4006 locations: `locationId, entityId, entityName, locationDesc, locationName, latitude, longitude, iso`; 720 KB | e.g. `{"locationId":78,"entityId":1,"entityName":"Canada","locationDesc":"CA-ON","locationName":"Ontario",...,"iso":"CA-ON"}`. `entityId` is the DXCC-like "entity" row (e.g. 291=USA, 1=Canada, 223=England, 6=Alaska, 259=Norway-incl.-Svalbard); NOT identical to the program. |
| `/park/activations/{ref}?count=N` | Array of recent activations `{activeCallsign, qso_date YYYYMMDD, totalQSOs, qsosCW, qsosDATA, qsosPHONE, locationDesc}` | Not spot-related. |
| `/park/leaderboard/{ref}` | `{activations:[{callsign,count}], activator_qsos:[...], hunter_qsos:[...]}` | Not spot-related. |
| `/stats/user/{call}` | `404 "Callsign not found"` for W4S (the user stats route exists; not explored). | Not spot-related. |
| `/stats/` | 403 Missing Authentication Token | Route not valid as typed. |
| Static CSV `https://pota.app/all_parks_ext.csv` | **Exists**: 9.5 MB, 96,586 rows, S3+CloudFront, `last-modified: 2026-10-13 07:15 UTC` (daily-ish regeneration). | See section 5. |

`/park/{ref}` sample (`park_US-7454.json`):
`{"parkId":61109,"reference":"US-7454","name":"McGraw Ford","latitude":34.3231,"longitude":-84.349,"grid4":"EM74","grid6":"EM74th","parktypeId":123,"active":1,"parkComments":"...","accessibility":null,"sensitivity":null,"accessMethods":"Automobile,Foot","activationMethods":"Automobile,Pedestrian","agencies":null,"agencyURLs":null,"parkURLs":null,"website":"https://georgiawildlife.com/mcgraw-ford-wma","createdByAdmin":"directUpload","parktypeDesc":"Wildlife Management Area","locationDesc":"US-GA","locationName":"Georgia","entityId":291,"entityName":"United States of America","referencePrefix":"US","entityDeleted":0,"firstActivator":"W7ALS","firstActivationDate":"2020-11-18"}`

### Detecting new / edited / deleted spots

- `spotId` (integer, e.g. 58664514) is the record key; ids are globally increasing in *creation* order roughly, but **not monotonic in the feed**: in a later poll 27 of 101 new rows had `spotId` lower than the previous poll's max id (late-arriving/lagging inserts). Do not use "max spotId seen" as a cursor; keep a seen-set (or seen-map) keyed by spotId.
- **A re-spot with the same content REUSES the spotId and bumps `spotTime`.** Between two polls ~2.5 min apart, 48 of 781 spotIds present in both polls had a changed `spotTime` and *nothing else changed* (46 RBN, 2 'Ham2K Portable Logger'). Example: spotId 58662966 (KD5QJQ / US-1091, 14074 FT8, spotter WC2L-#, RBN) had spotTime 22:54:19 then 23:11:02. So an RBN skimmer hearing the same station on the same frequency again refreshes the existing row. Non-RBN human spots were never seen being bumped, except two Ham2K logger rows.
- **A content change creates a NEW spotId.** A new frequency/mode/comment from the same spotter gives a new row with a new spotId (e.g. KD2ZZA / US-6432 had 5 rows from spotter KD2ZZA with different frequencies 14268, 14269, 14277, 14309 and different comments/sources). Old rows stay in the list until they age out of 30 min.
- Existing HamAlert dedup: `sha256(spotTime \n activator \n reference \n frequency \n mode \n comments)` per spotId, so a bumped `spotTime` re-emits the spot as new. That is arguably wanted for "fresh activity" but means RBN refreshes retrigger notifications; the schema should expose both `spotId` and the time so the backend can choose.
- **Deleted/invalid spots**: no tombstones. Rows simply disappear from the list (after the 30-min window; also possibly if an admin invalidates). The `invalid` field exists in `/spot/activator` but was `null` in 100% of 221 rows; its non-null form was never observed (presumably a flag/reason for moderator-invalidated spots; unverified).
- There is no `updated`/`modified` field.

## 2. Raw record format

Verbatim `/spot/activator` rows (first poll, 23:08:53 UTC), redacted nothing:

```json
{"spotId": 58664514, "activator": "W4S", "frequency": "14037.1", "mode": "CW", "reference": "US-7454", "parkName": null, "spotTime": "2026-10-13T23:08:16", "spotter": "K5EM-#", "comments": "RBN 10 dB 17 WPM via K5EM-#", "source": "RBN", "invalid": null, "name": "McGraw Ford Wildlife Management Area", "locationDesc": "US-GA", "grid4": "EM74", "grid6": "EM74th", "latitude": 34.3231, "longitude": -84.349, "count": 25, "expire": 1763}
```
```json
{"spotId": 58664454, "activator": "VE3YOA", "frequency": "7280", "mode": "SSB", "reference": "CA-5572", "parkName": null, "spotTime": "2026-10-13T23:07:32", "spotter": "K8DPC", "comments": "59 in MI 73s K8DPC via POTACAT", "source": "POTACAT", "invalid": null, "name": "Woolverton Conservation Area", "locationDesc": "CA-ON", "grid4": "FN03", "grid6": "FN03ee", "latitude": 43.191, "longitude": -79.5993, "count": 59, "expire": 1719}
```
(second row: comment/source inferred from the first poll's truncated output plus the later `/spot/comments`; see `spot_activator_p1.json` for exact bytes.)

A multi-location, multi-state park and a non-US/foreign-style row (from `/spot`, 11-field form; `spot.sample300.json`):

```json
{"spotId": 58664794, "spotTime": "2026-10-13T23:11:01", "activator": "KG0HG", "frequency": "14066", "mode": "CW", "reference": "US-4566", "spotter": "KG0HG", "source": "Ham2K Portable Logger", "comments": "QRV 3-fer: US-4566 US-4579 US-4576", "name": "California National Historic Trail", "locationDesc": "US-CA,US-CO,US-ID,US-KS,US-MO,US-NE,US-NV,US-OR,US-UT,US-WY"}
{"spotId": 58664629, "spotTime": "2026-10-13T23:09:07", "activator": "K4NYM", "frequency": "14051", "mode": "CW", "reference": "US-4559", "spotter": "N6TV-#", "source": "RBN", "comments": "RBN 6 dB 21 WPM via N6TV-#", "name": "Florida Trail National Scenic Trail", "locationDesc": "US-FL"}
```

`/spot/comments/{activator}/{reference}` row: `{"spotId": 58664514, "spotTime": "2026-10-13T23:08:16", "spotter": "K5EM-#", "mode": "CW", "frequency": "14037.1", "band": "20m", "source": "RBN", "comments": "RBN 10 dB 17 WPM via K5EM-#"}`

## 3. Field inventory

`/spot/activator` (A, n=221 rows over 3 polls) and `/spot` (S, n=848 in first poll; the same ratios hold in later polls).

| Raw field | JSON type | Presence | Examples | Notes / quirks |
|---|---|---|---|---|
| `spotId` | int | 100% (A,S,comments) | `58664514` | Unique key. Same id can reappear with a bumped `spotTime` (re-spot). Not monotonic in feed order. |
| `activator` | string | 100% | `W4S`, `8P6PE`, `JK1CWV/1`, `KE8NJW` | Callsign, uppercase in all 1064 rows already; may contain `/portable` suffix (`JK1CWV/1`, `7K1GIJ/1`, `JA4RQO/9` = Japanese area suffix; 6 distinct in the sample). Existing code still uppercases + strips whitespace. Callsign of the person *being* spotted. |
| `frequency` | **string** (numeric) | 100% | `"14037.1"`, `"7280"`, `"1294940"`, `"10118.5"` | **kHz** as decimal string. Zero or one decimal digit only (765/882 integer, 117/882 one decimal); i.e. 100 Hz resolution max. Not a JSON number. Values seen 7002..1294940 kHz (1294940 = 1294.94 MHz, VHF/UHF/SHF FM/C4FM exist). Existing code: `sprintf('%.4f', parseFloat(f)/1000)` giving MHz string. |
| `mode` | string | 100% present; **empty string in 0.4%** (2/848, 4/1064 distinct) | `CW`, `SSB`, `FT8`, `FT4`, `FM`, `RTTY`, `C4FM`, `""` | Uppercase. Empty when a web spotter did not choose a mode (spotters: Web, with comment still present). Observed set in section 4. No `USB/LSB`. |
| `reference` | string | 100% | `US-7454`, `CA-5572`, `BB-0041`, `JP-xxxx` | `PREFIX-NNNN` (4 or 5 digits). Exactly one reference per spot (n-fers are in the comment text instead). See 4.8. |
| `parkName` | null | **always null** (221/221) | `null` | Legacy/unused field. Use `name`. |
| `spotTime` | string | 100% | `"2026-10-13T23:08:16"` | ISO-8601 *without* zone designator, **UTC** (verified: latest spot of a fetch is within seconds of Date header UTC). Second precision. Parse with an explicit `Z`; `new Date(str)` in JS treats it as local time (the current code does exactly that, which is only correct if the server runs in UTC). |
| `spotter` | string | 100% | `K5EM-#`, `KI4SDC`, `WX7V/5-#`, `N6TV-#` | See 4.3. Callsign of the person (or skimmer) that posted the spot; `-#` suffix = RBN skimmer. Uppercase in all sampled rows. In S sample: 641 (60%) have `-#` suffix (all source RBN), 5 contain `/`. In 80 of 423 non-RBN rows spotter == activator (self-spot). |
| `comments` | string | 100% present, empty string in 12.7% of `/spot` (108/848); 10.5% of `/spot/activator` (8/76) | `"RBN 10 dB 17 WPM via K5EM-#"`, `"QRT TNX ALL"`, `""`, `"FT8  Sent: -10  Rcvd: -03"` | Never null in the data I saw (existing code defends against null and keeps `.trim()`). Max 99 chars in sample. Contains UTF-8 including emoji and Japanese (`🍑 South GA 73 🍑`, `TKS ニューパーク！`), unicode ellipsis, double spaces; leading/trailing whitespace possible. Not HTML-escaped (3 rows with `&`, none `&amp;`). |
| `source` | string | 100% | `RBN`, `Web`, `POTACAT`, ... | Free-text name of the *client/app* that posted the spot. Open-ended vocabulary; see 4.2. |
| `invalid` | null | **always null** (221/221) | `null` | Presumably set for invalidated/hidden spots. Unobserved non-null. In `/spot` this field is absent. |
| `name` | string | 100% | `McGraw Ford Wildlife Management Area` | Full park name = short name + park-type description (e.g. `McGraw Ford` + `Wildlife Management Area`). Not null. |
| `locationDesc` | string | 100% | `US-GA`, `CA-ON`, `BB-AN`, `US-CA,US-CO,...` | One or comma-separated list (no spaces) of `PREFIX-REGION` codes (ISO 3166-2-ish). 10 states in a single value observed. See 4.8. |
| `grid4` | string | 100% (A only) | `EM74` | Maidenhead 4 char of the park. Park, not activator. |
| `grid6` | string | 100% (A only) | `EM74th` | Maidenhead 6 char; mixed case (upper field, lower subsquare). |
| `latitude` | float | 100% (A only) | `34.3231` | Park centroid, 4 decimals. |
| `longitude` | float | 100% (A only) | `-84.349` | Park centroid. |
| `count` | int | 100% (A only) | `25`, `59`, `5` | Number of **human (non-RBN) spots** for this activator+park in the current activation (inferred; see 4.5). Not a count of the 30-min window. |
| `expire` | int | 100% (A only) | `1763`, `8` | **Seconds remaining until the activation row drops from `/spot/activator`** = (spotTime + 1800 s) - now. Range seen 8..1779. |
| `band` | string | `/spot/comments` only | `"20m"` | Only in the comments endpoint, never in spot lists. |

## 4. Semantics & quirks

**4.1 Time.** `spotTime` is the time of the latest post of that row (UTC, no zone suffix). Because identical re-spots bump an existing row's spotTime, the row's time is "last seen", not "first seen". There is no separate receive time; the code compares against `Date.now()` for freshness. `/spot` window ~30 min.

**4.2 `source` vocabulary** (free text, observed in 1064 distinct `/spot` rows; the client/app that submitted; many include versions): `RBN` (641, 60%), `Web` (267, pota.app website), `GT2` (46), `Ham2K Portable Logger` (37), `POTACAT` (31), `GT` (18), `Ham Relay` (4), `Ham2K Logger` (4), `HAMRS Pro/2.52.1` (4, includes version string!), `parkwatch` (3), `hunterlog` (2), `Smart Logger` (2), `Desktop` (2), `setSpot.py` (1), `Smart HAMLOG POTA Assist` (1), `POTA New Park Alert Monitor` (1). `/spot/comments` for VE3YOA also showed `hamtrax`. Treat as an opaque label; do not enumerate. `RBN` is the only value with machine-generated spots. No `SOTA` source seen (the brief's example), but POTA does not appear to cross-post from SOTA in this sample. GT/GT2 = GridTracker (likely; unverified). `comments` for some sources append "via <app>" (`via POTACAT`, `via Ham Relay`).

**4.3 Spotter.** `RBN` source: spotter is the skimmer call with `-#` suffix (`K5EM-#`, `WX7V/5-#`, `K2PO/7-#`) and comment `RBN {snr} dB [{wpm} WPM] via {skimmer}-#` (CW has WPM, digital has only dB, e.g. `RBN -5 dB via WA2LNW-#`; SNR can be negative). Humans: plain callsign, possibly with `/N`. No ssid on humans. Existing code strips `-#` (first occurrence). Self-spots (spotter == activator) are common (19% of human spots). RBN spots are only posted for CW/RTTY/FT8/FT4 in this sample (CW 366, FT8 203, FT4 66, RTTY 6). So `Spot.spotter` for RBN-derived POTA spots should be the skimmer (without `-#`) and a flag `is_skimmer`/`automated`.

**4.4 Modes observed** (distinct values, 1064 `/spot` rows): `CW` 452, `FT8` 279, `SSB` 224, `FT4` 91, `RTTY` 6, `FM` 5, `C4FM` 3, `""` (empty) 4. In `/spot/activator`: SSB, FT8, CW, FT4, FM, RTTY, `""`. Notes: POTA's UI offers other modes (e.g. AM, JS8, PSK, DIGI/SSTV, DMR, D-STAR); they did not occur in this sample, so the vocabulary must be treated as open. Mode and frequency can disagree (a 'SSB' web spot on 14037 kHz, i.e. user mistake); spots from RBN are internally consistent. `mode` as typed by the spotter may not match the activator's real mode.

**4.5 `count` / `expire` semantics.** `expire` = seconds until 30 min after `spotTime` of the row (checked against W4S: 23:08:16+1800-23:08:53 = 1763; AC7RX: spot 22:39:01 gave expire 8 at 23:08:53). `count` = number of non-RBN spots for the activation: W4S/US-7454 `count` 25 equals the 17 'Web' + 8 'POTACAT' rows in `/spot/comments` (386 RBN rows excluded); VE3YOA/CA-5572 `count` 59 equals all 59 rows (all non-RBN). So `count` ≈ "how many people spotted this activation", ignoring skimmers. (Inferred from two samples; both agreed.) It is a property of the activation rather than the spot.

**4.6 `/spot/activator` loses information.** One row per (activator, reference): when a human spot follows ten RBN spots, only the newest is visible; an RBN hit following a human spot replaces it. Between 60 s polls any spot that is superseded within a minute is never seen by HamAlert. `/spot` returns all of them. The activator list also contains rows older than any `/spot` row (up to 30 min after the last spot; e.g. 22:39:01 spot still listed at 23:08:53), so union semantics differ slightly between the two endpoints. Recommendation: poll `/spot` for the spot stream (11 fields) and enrich park coordinates from reference data, or poll both.

**4.7 Test / QRT / duplicates.**
- Test spots: user-entered comment containing "test"/"testing"; HamAlert filters by `/\btest(ing)?\b/i` on comments (none seen in my sample). The park list contains an official test park `K-TEST` ("Test Park", active=0, entityId 0, lat/lon 0.0, locationDesc literally the string `None`).
- QRT: spotter posts a normal spot with a comment such as `QRT`, `QRT TNX ALL`, `Qrt`, `qrt for now, thank you all for the contacts`, `QRT 3-fer: US-4566 US-4579 US-4576`. No structured QRT flag. 13 of ~850 spots in the 30-min window had QRT. Activator row stays listed until `expire`.
- Duplicates: no identical-content rows with different ids within a snapshot. RBN spots from the same skimmer for the same activator are the same spotId re-used (bumped). The same human can have several rows in one window (frequency/comment changes). `mode`/`frequency` are not normalized across duplicates.
- Same spotter can show two different sources for the same activation (Ham2K Portable Logger and Web both used by KD2ZZA).

**4.8 Reference & location encoding.**
- Format `{PREFIX}-{NNNN}`: prefix = POTA *program* (country-level, 2 letters in all 239 prefixes found except the legacy test `K-TEST`), then 4 digits, or 5 digits (11,797 of 96,586 parks; FR 6,792, US 3,584, AU 1,421 have >4 digits; max 5 observed). Regex that matches all real refs: `^[A-Z]{2}-\d{4,5}$`. The current code's `wwffRefRegex = /\b([a-z0-9]{1,5})-(\d{4})\b/i` (exactly 4 digits) would **miss 5-digit POTA refs** such as `US-13471` and `US-10308` seen in the live feed when matching from comments; spot.reference from the POTA feed is used directly so it works today, but any comment parsing for POTA refs needs `\d{4,5}`.
- Prefix is NOT the DXCC prefix: `US` covers 50 states + DC (+ territories? territories like PR have their own program `PR`), `GB` covers England/Scotland/Wales/NI (location `GB-ENG`...), `NO` also covers Svalbard (`locationDesc` `SJ-S` with reference `NO-0179`; 29 such parks) and `PF`/`GL`-style cases exist (37 parks total where location prefix != reference prefix). Legacy `K-xxxx` (pre-2020 US) refs: only `K-TEST` remains in the current park list; the live feed uses `US-`. Observed prefixes in live spots: US 951, CA 51, JP 28, BB 13, CU 12, AR 8, CL 1.
- `locationDesc`: `{ISO country}-{region}` e.g. `US-GA`, `CA-ON`, `JP-13`-style (Japan uses prefectures like `JP-KY`/`JP-OS` in the multi list), `BB-AN`, `CL-CO`, `GB-ENG`. **Multi-location parks** are comma-joined with no spaces: 1,620 of 96,586 parks (1.7%) have 2..22 locations (`US-DC,US-MD,US-WV`; `US-NC,US-VA`; `JP-KY,JP-OS`; `CU-CA,CU-CM`). In live spots 5% (34 with 2, 15 with 10 states, 4 with 5, 2 with 3). 2,203 parks (2.3%) have an empty locationDesc in the CSV. Existing code splits on comma for US/CA only and maps `-`→`_` (`US_GA`) into `spot.state` (array).
- N-fers (multiple parks in one activation): not expanded by the API; each park gets its own spot only if the spotter posts one. Other park refs appear in free text: `3-fer: US-6432 US-0684 US-1347`, `also US-4483`, `[PW] US-4533, Chequamegon National Forest also KFF-4519` (a WWFF `KFF-` ref mixed in).
- The existing `findWwffRef` is skipped when `spot.wwffRef` is set (POTA path sets it from `reference`), so POTA park spots never go through comment scanning; but POTA-looking refs in *DX cluster* or RBN comments do (lookup in `wwffParks` collection `{reference, status:'active'}`; note program stored in `wwffProgram`).

**4.9 Name inconsistency.** Spot `name` and `/location/parks` `name` = full name ("McGraw Ford Wildlife Management Area", "Woolverton Conservation Area"); `/park/{ref}` `name` = short name ("McGraw Ford", "Woolverton"), and `parktypeDesc` holds the suffix. The CSV `all_parks_ext.csv` also has the full name (first rows: "Acadia National Park"). Pick one convention for `parkName`.

**4.10 Timestamps / encoding.** All responses UTF-8 JSON. `Content-Type: application/json; charset=utf-8`. Pretty-printed with `", "` separators.

## 5. Related reference data

| Data | URL | Format / size | Cadence |
|---|---|---|---|
| All parks (CSV) | `https://pota.app/all_parks_ext.csv` | UTF-8 CSV, header `"reference","name","active","entityId","locationDesc","latitude","longitude","grid"`, all values double-quoted, 96,586 rows, 9.5 MB, S3/CloudFront, Last-Modified 2026-10-13 07:15 UTC (daily, recommended once/day) | Daily. Contains inactive parks (`active=0`: 4,307 rows = 4.5%). 57 rows have empty lat/lon/grid. |
| Parks by program | `https://api.pota.app/program/parks/{PREFIX}` | JSON, richer (adds `attempts, activations, qsos, website, notes`), `grid` is 6-char; `/program/parks/US` = 4.6 MB | cache 1 h |
| Parks by location | `https://api.pota.app/location/parks/{locationDesc}` | same as above, e.g. `US-RI` 61 parks | cache 1 h |
| Single park | `https://api.pota.app/park/{ref}` | JSON, includes `parktypeDesc`, `active`, `firstActivator`... | cache 1 h |
| Programs | `https://api.pota.app/programs` | 249 rows: `programId, programPrefix, programName, isActive, isocc, location_unit, isolang` | rarely changes |
| Locations | `https://api.pota.app/locations` | 4006 rows (GB 221, UG 135, PH 99, RU 84, TR 81 ...) `locationId, entityId, entityName, locationDesc, locationName, latitude, longitude, iso` | rarely |

Sample CSV rows (`all_parks_ext.head400.csv`):
```
"US-0001","Acadia National Park","1","291","US-ME","44.31","-68.2034","FN54vh"
"US-0002","Alagnak Wild River National Park","1","6","US-AK","59.0908","-156.463","BO19sc"
"US-0015","Chesapeake and Ohio Canal National Historical Park","1","291","US-DC,US-MD,US-WV","39.6007","-77.8265","FM19co"
"K-TEST","Test Park","0","0","None","0.0","0.0","JJ00aa"
"AQ-0025","Terra Nova Bay Camp Antarctic Station","0","13","AQ-AQ","0.0","0.0","JJ00aa"
```
CSV stats: 239 distinct reference prefixes; top FR 16,639, US 13,429, AU 11,410, GB 7,265, CA 6,605, NO 3,385, PL 2,987, ES 2,521, SE 2,235, IT 2,177. `entityId` values: 227 (14,137 rows), 291 (USA, 13,145), 150 (11,394), 1 (Canada, 6,603), 223 (England etc.). No duplicate references. Number of locations per park distribution: 1: 94,966; 2: 1,212; 3: 252; ... max 22.

Existing HamAlert code loads the WWFF directory into `wwffParks` (`config.wwff.listUrl` = wwff_directory.csv, which has a `program` column; POTA rows are in it too with `program='pota'` presumably). I did not verify how POTA parks get into that collection (there is no POTA import in the files I read; presumably a separate import job not in the repo). The POTA CSV could replace it for POTA.

## 6. Proposed mapping

**Base Spot** (all sources):

| Base field | From POTA | Notes |
|---|---|---|
| `id` / `source_id` | `spotId` (string/int) | Plus keep `source: "pota"`. spotId reuse means id alone is not a content key. |
| `callsign` | `activator` | Uppercase, strip whitespace; keep `/suffix`. Not normalized (e.g. `JK1CWV/1`). |
| `spotter` | `spotter` with trailing `-#` removed | Plus `spotter_kind`: `skimmer` when `source=="RBN"` / `-#` suffix, else `human`. |
| `frequency` | `parseFloat(frequency)` kHz -> store kHz (or Hz int) | POTA kHz string with <=1 decimal; keep exact decimal string if you want round-trip; existing code gives MHz with 4 decimals. |
| `mode` | `mode` uppercase trimmed | Empty string possible: map to null/unknown then use backend mode guesser (`config_clean` ranges). Do not assume values beyond observed. |
| `time` | `spotTime` + "Z" | UTC, second precision. Bumps on re-spot. Optionally `first_seen` (backend) separate from `last_spot_time`. |
| `comment` | `comments` trimmed | Empty -> "". |
| `raw` / rawText | synthesized | Existing: `HH:MM CALL in REF (NAME) FREQ MODE: comment`. There is no native raw text. |
| `band` | derived by backend | Only `/spot/comments` has `band`; derive from frequency in kHz. |
| DXCC | derived from callsign (backend) | The feed has none. |

**POTA extension** (`pota` block):
- `reference` (string, `^[A-Z]{2}-\d{4,5}$`; required), `program` (derived: prefix before `-`, e.g. `US`; also existing field `wwffDivision`), `park_name` (from `name`; full name), `locations` (string[], split `locationDesc` on `,`; zero-length possible via reference data), `grid4`, `grid6` (optional; only in `/spot/activator` or via park lookup), `latitude`, `longitude` (park, not activator; optional), `activation_spot_count` (`count`, optional; only /spot/activator; humans only), `expires_in_s` or `expires_at` (derived: now + `expire`; optional), `client` (the `source` string e.g. `POTACAT`, free text; keep verbatim, does not map 1:1 to base `source`), `invalid` (null; keep as optional passthrough), `is_skimmer_spot`/`snr_db`/`wpm` parsed from RBN comment when `source=="RBN"` (optional; regex `^RBN (-?\d+) dB(?: (\d+) WPM)? via`).
- Base `source` should be the feed (`pota`), while `client` holds POTA's `source`; sticking with the brief's term, "source" in the raw POTA data is the sub-source.
- Keep wwff-family compatibility? Today POTA parks are stored in `wwffRef/wwffDivision/wwffName/wwffProgram='pota'`. Suggest a neutral `park` extension used by POTA and WWFF with `program in {pota, wwff, ...}` + `reference`, `name`, `division`, `locations`, because both share reference/name/division fields and the existing code already merges them. Fields only POTA has: grid/lat/lon in spot, `count`, `expire`, multi-location list, client. WWFF has a separate `KFF-` namespace.
- US/CA state for notification triggers: `locations` filtered to `^(US|CA)-..$` mapped `-`→`_` as today, overriding callsign home state when matching `^((US|CA)-..,?)+$`. Multi-state parks yield several states (up to 10); triggers need "any of" semantics.

**Backend enrichment**: band from kHz; DXCC/CQ/ITU from callsign; mode guessing when empty; test filter by comment regex; maxAge 5 min (spotTime relative to now); QRT detection from comment (`\bQRT\b`) is not done today; "n-fer" extra refs from comment (`[A-Z]{2}-\d{4,5}`); lat/lon fallback from reference data if `/spot` is used.

## 7. Open questions / risks

1. **Re-spot semantics.** Same-content re-spots keep `spotId` but change `spotTime`. Should the new API expose `id` (stable) + `time` (last) + `first_time`? Current dedup hashes spotTime, so RBN refreshes retrigger. Decide whether a bumped row is a "new spot" for alerting.
2. **Which endpoint?** `/spot/activator` is lossy (latest per activation) but carries park coordinates, `count`, `expire`; `/spot` has every spot but 11 fields. Recommend `/spot` + park reference data. Needs a decision, and note dedup logic works with both ids.
3. **Frequency units / precision**: POTA kHz strings with at most 0.1 kHz resolution; any base type should accept Hz int or kHz decimal; avoid float rounding (`7.0145` MHz from 7014.5 is fine with sprintf, but use decimal/Hz ints).
4. **Mode vocabulary open-ended + empty**: schema should allow unknown/empty, normalize to lowercase or uppercase consistently (code lowercases).
5. **Reference regex**: 5-digit refs exist (11,797 parks, 12%); existing 4-digit regex breaks comment parsing (US-10308 style). Multi-location (`locationDesc` list) and empty locations (2.3% of parks) must be allowed.
6. **Park name** differs between endpoints; choose the full name (spot/`location/parks`/CSV) as `name`.
7. **`source` naming collision**: POTA's `source` is a client app string; the HamAlert Spot `source` is the network. Name the POTA one `client`/`spotSource`.
8. **`invalid`, `parkName`** always null in my sample; I could not observe a non-null `invalid`. Risk that moderation can hide spots (unknown how: disappear vs `invalid` set).
9. **Time zone**: `spotTime` has no `Z`; the existing JS `new Date()` interprets it in the server's local zone. Server must run UTC or parse explicitly.
10. **Undocumented API**: no official docs, no SLA, no auth; endpoints/fields can change. Sample date 2026-10-13 is a single time-of-day; weekend/Parks-on-the-Air event days will have far higher volume (a 30-min `/spot` window held ~850 rows; peak days could be several times larger, 240 KB each poll).
11. **Lag/ordering**: late-arriving lower spotIds mean no monotonic cursor; use a bounded seen-cache (existing `idCache` Map never evicts: unbounded memory growth, existing bug).
12. I did not verify: whether `/spot` accepts query parameters, the exact semantics of `/park/grids` argument order and `atno` ("all-time new one" flag for the viewer; assumption), non-null `invalid`, other programs' modes, whether `count` includes spots older than the activation window.
