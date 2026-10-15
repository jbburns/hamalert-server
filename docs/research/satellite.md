# Amateur radio satellites as an alert source

Researched 2026-10-13/14. Raw samples: `/tmp/claude-0/-home-user-hamalert-server/89e2a1b4-cf72-50c1-bad7-1287a1913473/scratchpad/sources/raw/satellite/`
(file names are given inline below). All requests used `User-Agent: HamAlert-research/1.0 (+https://hamalert.org)`, a handful per endpoint.

## 0. Executive summary and judgment calls

* There are two different problems. They need different data and should be separate features.
  * **(A) Activity.** The only real, public, machine-readable, keyless feed of "someone just heard / worked a satellite" is the **AMSAT Satellite Status API** (`/status/api/v1/reports.php`). It is user-submitted reports ("Heard", "Telemetry Only", "Not Heard", "Crew Active") per satellite/transponder, with reporter callsign and grid. Not a spot stream with frequency; it is a *status report*. SatNOGS Network observations are a second activity-like feed, but they describe *ground-station recordings*, not human operators, and have no spotter callsign.
  * Everything else I looked for does not exist as a usable feed today: **hamsat.org is a parked domain** (redirects to `/lander`, no API; 404 on `/api/`), PSK Reporter has no satellite flag, and none of 200+ live DX-cluster spots from three cluster mirrors (DXHeat, DXSummit, HamQTH) contained satellite markers. The only satellite thing in the existing HamAlert code is QO-100, treated as a *band* (`3cm_qo100`, 10489.550-10490 MHz), plus QO-100 mode ranges in the mode guesser (config_clean.js lines 249 and 380-382).
* **(B) Planned passes** are fully derivable: Celestrak GP (keyless, OMM JSON/TLE) or SatNOGS DB `/api/tle/` for orbital elements, SatNOGS DB `/api/transmitters/` + `/api/satellites/` for frequencies/modes/status. Pass prediction (SGP4) must be computed; the only hosted pass API is N2YO (key, 100 radio-pass calls/hour, so unusable at HamAlert scale).
* **Recommendation (judgment call):** compute passes **server-side on a shared, location-independent basis where possible, but evaluate per user location** (SGP4 for ~100 sats x N users is cheap; see section 6.4). Ship the satellite catalogue + TLEs to clients too so a client may show its own passes; the server owns *notification* timing. Do not model passes as stored `Spot`s.
* **Identifier judgment call:** NORAD catalog id is the only stable join key across Celestrak, SatNOGS, N2YO, Space-Track. AMSAT status API has **no NORAD id** (name strings like `AO-7_[U/v]`), so a hand-maintained mapping table is needed.

---

## 1. Access (per source)

### 1.1 Celestrak GP data (orbital elements)
* `GET https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=json` (also `FORMAT=tle|csv|xml|kvn|json-pretty`; selectors `GROUP`, `CATNR`, `INTDES`, `NAME`, `SPECIAL`). Sample: `celestrak_amateur.json` (96 objects, 40,589 bytes).
* Auth: none. Response headers: HTTP/2 200, `content-type: application/json; charset=UTF-8`, `content-disposition: filename="amateur.json"`; no ETag/Last-Modified/Cache-Control seen (IIS/PHP). So no conditional GET; detect change by comparing `EPOCH` per `NORAD_CAT_ID`.
* Rate limits: not machine-stated in what I could reach. Celestrak's published guidance (from my background knowledge, **could not re-verify**: the doc pages returned 503 and the host then reset my connections after ~5 requests in ~10 minutes) is that elements update about every 2 hours at most and clients should poll no more than that; abusive clients get blocked (403). Observed: after a burst of 4 requests Celestrak started returning HTTP 503 / connection reset for 10+ minutes. Treat as aggressive about burst protection. Poll at most every few hours, cache on disk, fall back to SatNOGS DB `/api/tle/` or AMSAT `nasabare.txt` on failure.
* Docs: https://celestrak.org/NORAD/documentation/gp-data-formats.php, https://celestrak.org/NORAD/elements/ (both unreachable when I tried).
* Licensing: Celestrak republishes 18th Space Defense Squadron / Space-Track data (public "basic SSA data", redistribution allowed with citation). Celestrak itself asks for attribution.

### 1.2 Space-Track (source of Celestrak's GP)
* Needs a free account; login via POST then session cookie. Documented limits (fetched from space-track.org documentation): fewer than 30 requests/min and 300/hour; query GP class **no more than once per hour**, pick a random minute not on :00/:30; combine objects in one comma list; add `/decay_date/null-val/epoch/%3Enow-10/` to filter to propagable objects. Account sharing and multiple accounts are prohibited. Redistribution: User Agreement forbids transfer of data to third parties without approval, but USSPACECOM has given blanket approval for "basic SSA data" (TLE/OMM, SATCAT, decay) with citation. Conclusion: usable but adds credential management; Celestrak or SatNOGS DB are simpler.

### 1.3 SatNOGS DB (satellites, transmitters, TLEs)
* Base `https://db.satnogs.org/api/` (DRF; root lists endpoints: `artifacts, modes, satellites, transmitters, telemetry, tle, optical-observations, transmitter-params-schemas`). OpenAPI at `/api/schema/?format=json` (200). Docs: https://docs.satnogs.org/projects/satnogs-db/en/latest/api.html.
* Auth: none for GET (token only for writing). Rate limits: not documented; no `X-RateLimit`/`Retry-After` headers seen. Community post says telemetry for frequency-violating satellites is limited to 1 req/day. Be polite.
* Pagination: **not paginated by default** for `satellites` and `transmitters` (one array). Sizes on 2026-10-13: `/api/satellites/` = 2832 objects, 1,552,159 bytes; `/api/transmitters/` = 5114 objects, 3,944,562 bytes. Responses have no ETag/Last-Modified/Cache-Control either (header dump in `sn_sat_hdr.txt`, `sn_tx_hdr.txt`). Change detection = compare each record's `updated` timestamp (most recent transmitter update seen: 2026-10-10, so actual churn is a few records per week).
* Filters I verified: transmitters `?satellite__norad_cat_id=43017&status=active` works; `?norad_cat_id=...` is **silently ignored** on transmitters (returned the full unfiltered list) - a trap. Satellites `?norad_cat_id=43700` works. TLE: `/api/tle/?norad_cat_id=25544` works (returns array with 1 element).
* Licence: data CC BY-SA 4.0 (SatNOGS DB about page / wiki). Attribution + share-alike applies if HamAlert redistributes the data verbatim; deriving a small table for internal use is fine. Needs a legal check before we ship the transmitter list inside a public API or app.
* Note: SatNOGS DB's `satellites.status` vocabulary is now `in orbit | re-entered | future` (counts: 1766 / 1023 / 43) - NOT the older `alive/dead/re-entered`. Transmitters have `status` (`active|inactive`) and a redundant boolean `alive`.

### 1.4 SatNOGS Network (observations by volunteer ground stations)
* Base `https://network.satnogs.org/api/`: `observations/`, `jobs/`, `stations/`, `data/`. GET open, no key. Cursor pagination via `Link: <...cursor=...>; rel="next"` header (no `next` in body; body is a bare array of 25 per page). Docs: https://network.satnogs.org/api/.
* Filters verified: `observations/?norad_cat_id=25544&status=good` works (note: `satellite__norad_cat_id` does **not** filter here, the opposite of DB), `status=future` returns scheduled observations. Good for *scheduled* satellite visibility at real stations (including station lat/lng and rise/set azimuth, max altitude).
* Update cadence: new observations appear constantly (the last "good" ISS observation in my pull ended minutes before the request); vetting happens after the pass, usually minutes to hours (observation `status` starts `unknown`, becomes `good|bad|failed`, `vetted_status` field absent in the list view).
* Heavy: each record carries full TLE, client metadata blob, waterfall and audio URLs (~11 KB each). Not a good firehose.
* `jobs/` returns upcoming scheduled jobs for stations as `{id,start,end,ground_station,tle0..2,frequency,mode,transmitter,transmitter_parameters,baud,max_altitude,...}`; needs auth for some use.
* `stations/` lists thousands of ground stations (ids seen up to ~5200) with `lat,lng,altitude,min_horizon,status,antenna[]`.

### 1.5 AMSAT Satellite Status API (the real activity feed)
* Base `https://www.amsat.org/status/api/v1`. Docs https://www.amsat.org/status/api/ (Swagger `/status/api/docs.php`, OpenAPI `/status/api/v1/openapi.php`). Root `GET /api/v1/` returns a plain-text endpoint index.
* No auth for GET. Rate limits, terms, caching: **not stated** on the docs page. Responses carry `cache-control: no-store` (Cloudflare DYNAMIC). Be conservative (suggest <= 1 request/minute).
* Endpoints (verified live):
  * `catalog.php` (93 entries 2026-10-13; `?include_stats=1` adds `report_count`, `latest_reported_time`; `?name=` exact).
  * `reports.php?name=&hours=(default 72, max 720)&since=ISO&limit=(default 100,max 500)&callsign=&grid_square=&status=`; POST to submit.
  * `summary.php?hours=24` (per satellite+status counts).
  * `statuses.php`, `health.php`; legacy `satellites.php`, `sat_info.php`.
* Polling approach: `reports.php?since=<last high-water time>&limit=500` every 1-5 min; dedupe on the integer `id` (monotonic: 1365677 .. 1365799 in my pulls). No edit/delete signalling documented; a POST for the same satellite+callsign+hour+15-minute period **replaces** the previous report (so a row can silently change; compare by `id`+fields, ids appear stable but I could not verify whether the replaced row keeps its id).
* Two-step name quirk: query `name=AO-91` fails (`404 satellite_not_found`, see `amsat_reports.php_name_AO-91_hours_72.json`); the API names are per-transponder, e.g. `AO-91_[FM]`, `AO-7_[U/v]` (URL-encode brackets), and there is no plain `AO-91` entry.

### 1.6 N2YO REST API (pass predictions as a service)
* Base `https://api.n2yo.com/rest/v1/satellite/`; endpoints `tle/{id}`, `positions/...`, `visualpasses/...`, `radiopasses/{id}/{lat}/{lng}/{alt}/{days<=10}/{min_elevation}`, `above/...`. API key in `&apiKey=` on every request (free key from profile). Limits per hour: 1000 for tle/positions, **100 for visualpasses/radiopasses/above**. "Do not use multiple keys." I did not call it (no key). Not viable for per-user server calls; mention only as a cross-check.
* Radio pass shape (from docs): `info{satid,satname,transactionscount,passescount}`, `passes[]{startAz,startAzCompass,startUTC,maxAz,maxAzCompass,maxEl,maxUTC,endAz,endAzCompass,endUTC}` (UTC are Unix epoch seconds).

### 1.7 AMSAT keps (classic app format)
* `https://www.amsat.org/tle/current/nasabare.txt` (identical copy at `/amsat/ftp/keps/current/nasabare.txt`): 3-line sets with AMSAT short names (`AO-07`, `UO-11`, `LO-19` ...). 14,434 bytes, 97 sets, epoch day 26285-26286. Sample: `amsat_nasabare.txt`. Used by SatPC32 etc.

### 1.8 ARISS (ISS school contacts and SSTV events)
* No API, no ICS (searched; the old `upcoming-contacts.html` is 404). Human-readable pages only: https://www.ariss.org/upcoming-educational-contacts.html (lists "Contact is go for: Thu 2026-10-15 15:25:33 UTC 40 deg (***)", telebridge station callsign, school, crew member, livestream link) and https://www.ariss.org/upcoming-sstv-events.html (e.g. "Begins Friday October 2, 2026 9:00 UTC. Concludes Tuesday October 6, 2026 at 15:55 UTC. Images will be transmitted at 437.550 MHz... Robot 36 ... 36 seconds on, 2 minutes off"). Regional ARISS-EU also posts announcements. Scrape-only; semi-structured text. This is genuinely a "planned event" analogue (like SOTA alerts) and the highest-value human item for a HamAlert-style user, but needs a scraper or manual feed. Also ISS crew voice status shows up in AMSAT reports as `Crew Active`.

### 1.9 hamsat.org and others
* `https://hamsat.org/` returns a 114-byte stub redirecting to `/lander` (domain parking/Trafficfactory page), `/api/`, `/api/v1/`, `/api/spots` all 404, `api.hamsat.org` proxy 502. Treat as **gone**. (An iOS "HamSat" app exists by name but no public API found.) I found no live "who is activating a satellite now" feed other than AMSAT status reports; SatNOGS is machine-only.

### 1.10 DX cluster / RBN / PSK Reporter
* Pulled 50 (DXHeat json), ~200 (DXSummit json, HamQTH csv) latest spots; none were satellite spots (all HF; one 1.25 m). Satellite spots are rare on the clusters because cluster software has no concept of "via". The only convention I could document: QO-100 operators spot the **downlink frequency ~10489.5xx MHz** (cluster nodes with 32-bit frequency bugs duplicate such spots, once at true freq and once rounded to 10 kHz), with free-text comments like "CQ Satellite (QO-100)". HamAlert already handles this via the `3cm_qo100` band and mode ranges. LEO FM/linear passes are *not* spotted on clusters in any structured way (ham convention: AMSAT status page, SatNOGS, Discord/BATC). PSK Reporter has no satellite field; QO-100 digimode reports are indistinguishable except by frequency. I did not verify PSK Reporter QO-100 coverage first-hand (telnet/XML exceeds scope here).

---

## 2. Raw record format (verbatim samples)

### 2.1 Celestrak GP (OMM JSON) - `celestrak_amateur.json`, first two records
```json
{"OBJECT_NAME":"OSCAR 7 (AO-7)","OBJECT_ID":"1974-089B","EPOCH":"2026-10-13T13:47:33.052704","MEAN_MOTION":12.53700031,"ECCENTRICITY":0.00119424,"INCLINATION":101.9903,"RA_OF_ASC_NODE":301.0544,"ARG_OF_PERICENTER":265.4181,"MEAN_ANOMALY":209.8135,"EPHEMERIS_TYPE":0,"CLASSIFICATION_TYPE":"U","NORAD_CAT_ID":7530,"ELEMENT_SET_NO":999,"REV_AT_EPOCH":37535,"BSTAR":-3.361495e-6,"MEAN_MOTION_DOT":-4.7e-7,"MEAN_MOTION_DDOT":0}
{"OBJECT_NAME":"PHASE 3B (AO-10)","OBJECT_ID":"1983-058B","EPOCH":"2026-10-08T23:20:46.360320","MEAN_MOTION":2.05869979,"ECCENTRICITY":0.59749371,"INCLINATION":25.986,"RA_OF_ASC_NODE":201.0038,"ARG_OF_PERICENTER":146.8173,"MEAN_ANOMALY":271.4245,"EPHEMERIS_TYPE":0,"CLASSIFICATION_TYPE":"U","NORAD_CAT_ID":14129,"ELEMENT_SET_NO":999,"REV_AT_EPOCH":29783,"BSTAR":0,"MEAN_MOTION_DOT":-3.5e-7,"MEAN_MOTION_DDOT":0}
```

### 2.2 SatNOGS DB satellite - ISS (`satnogs_satellites_sample.json`)
```json
{"sat_id":"XSKZ-5603-1870-9019-3066","norad_cat_id":25544,"norad_follow_id":null,"name":"ISS","names":"ZARYA, RS0ISS, NA1SS","image":"satellites/ISS.jpg","status":"in orbit","decayed":null,"launched":"1998-11-20T00:00:00Z","deployed":null,"website":"https://www.nasa.gov/mission_pages/station/main/index.html","operator":"None","countries":"RU,US","telemetries":[{"decoder":"iss"}],"updated":"2025-08-01T05:17:04.759872Z","citation":"dl7ndr","is_frequency_violator":false,"associated_satellites":[],"reception_status":"Unknown","reception_evidence":{"urls":[]}}
```
QO-100 (fetched live): `{"sat_id":"LBQI-9987-6865-3928-8294","norad_cat_id":43700,"norad_follow_id":null,"name":"Es'hail 2","names":"QO-100","image":"satellites/Eshail_2.jpg","status":"in orbit","decayed":null,"launched":"2018-11-15T00:00:00Z","deployed":null,"website":"https://www.eshailsat.qa/satellites/","operator":"None","countries":"QA","telemetries":[{"decoder":"eshail2"}],"updated":"2026-04-12T19:32:20.134687Z","citation":"https://www.eshailsat.qa/satellites/","is_frequency_violator":false,"associated_satellites":[],"reception_status":"Unknown","reception_evidence":{"urls":[]}}`

### 2.3 SatNOGS DB transmitters (`satnogs_transmitters_sample.json`, `satnogs_transmitters_amateur_active_300.json`)
Linear transponder (AO-7 mode B, inverting, frequencies in **Hz**):
```json
{"uuid":"uLfAhJaZJUWmA9Sik8yQ2m","description":"Mode U/V (B) Lin","alive":true,"type":"Transponder","uplink_low":432125000,"uplink_high":432175000,"uplink_drift":null,"uplink_drifted":432125000,"downlink_low":145925000,"downlink_high":145975000,"downlink_drift":null,"downlink_drifted":145925000,"mode":"USB","mode_id":9,"uplink_mode":"LSB","invert":true,"baud":0.0,"sat_id":"HHSS-6325-1344-4603-7774","norad_cat_id":7530,"norad_follow_id":null,"status":"active","updated":"2020-08-08T21:54:18.194642Z","citation":"https://www.amsat.org/two-way-satellites/ao-7/","service":"Unknown","iaru_coordination":"N/A","iaru_coordination_url":"","itu_notification":{"urls":[]},"frequency_violation":false,"unconfirmed":false,"params":null}
```
FM repeater (AO-91):
```json
{"uuid":"LoK6HANoyLWRnwhJKs8gHd","description":"Mode U/V FM Voice (no CTCSS any longer)","alive":true,"type":"Transceiver","uplink_low":435250000,"uplink_high":null,"uplink_drift":null,"uplink_drifted":435250000,"downlink_low":145960000,"downlink_high":null,"downlink_drift":null,"downlink_drifted":145960000,"mode":"FM","mode_id":1,"uplink_mode":"FM","invert":false,"baud":null,"sat_id":"PMAW-9203-2442-8666-3249","norad_cat_id":43017,"norad_follow_id":null,"status":"active","updated":"2026-06-26T09:17:33.053273Z","citation":"https://www.amsat.org/two-way-satellites/ao-91/","service":"Amateur","iaru_coordination":"IARU Coordinated","iaru_coordination_url":"https://iaru.amsat-uk.org/finished_detail.php?serialnum=342", ...}
```
QO-100 narrowband digimode segment (note `mode` is "FM" in the DB for a linear segment; DB data quality is weak here):
```json
{"uuid":"URSfwDDuDJUh6MTN7UPrAj","description":"Narrowband digimodes(500Hz max BW)","alive":true,"type":"Transponder","uplink_low":2400040000,"uplink_high":2400080000, ... "downlink_low":10489540000,"downlink_high":10489580000, ... "mode":"FM","mode_id":1,"uplink_mode":"FM","invert":false,"baud":null,"sat_id":"LBQI-9987-6865-3928-8294","norad_cat_id":43700,"status":"active", ...}
```

### 2.4 SatNOGS DB TLE - `satnogs_tle_iss.json`
```json
[{"tle0":"0 ISS (ZARYA)","tle1":"1 25544U 98067A   26286.43465595  .00005946  00000-0  11657-3 0  9992","tle2":"2 25544  51.6321  74.9235 0006732 257.7935 102.2300 15.48850287590084","tle_source":"Space-Track.org","sat_id":"XSKZ-5603-1870-9019-3066","norad_cat_id":25544,"updated":"2026-10-13T19:29:31.237567Z"}]
```

### 2.5 SatNOGS Network observation (good, trimmed demoddata/metadata) - `net_obs_iss_sample.json`
```json
{"id":15195194,"start":"2026-10-13T20:14:08Z","end":"2026-10-13T20:20:20Z","ground_station":5078,"transmitter":"cjQ8LkcsshNpAvTEAGkU3X","norad_cat_id":25544,"payload":"https://network-satnogs.freetls.fastly.net/media/data_obs/2026/10/13/20/15195194/satnogs_15195194_2026-10-13T20-14-08.ogg","waterfall":"https://s3.eu-central-1.wasabisys.com/satnogs-network/data_obs/2026/10/13/20/15195194/waterfall_15195194_2026-10-13T20-14-08.png","demoddata":[{"payload_demod":"https://s3.eu-central-1.wasabisys.com/..."}],"station_name":"dm43","station_lat":33.4969,"station_lng":-111.9054,"station_alt":400,"archived":false,"vetted_user":null,"vetted_datetime":null,"archive_url":null,"client_version":"2.1.2","client_metadata":"{...}","status":"good","status_certainty":null,"waterfall_status":"unknown","waterfall_status_user":null,"waterfall_status_datetime":null,"rise_azimuth":327.0,"set_azimuth":113.0,"max_altitude":44.0,"transmitter_uuid":"cjQ8LkcsshNpAvTEAGkU3X","transmitter_description":"Mode U APRS test","transmitter_type":"Transceiver","transmitter_uplink_low":437825000,"transmitter_uplink_high":null,"transmitter_uplink_drift":null,"transmitter_downlink_low":437825000,"transmitter_downlink_high":null,"transmitter_downlink_drift":null,"transmitter_mode":"AFSK","transmitter_invert":false,"transmitter_baud":1200.0,"transmitter_updated":"2026-02-24T15:14:14.178342Z","transmitter_status":"active","tle0":"0 ISS (ZARYA)","tle1":"1 25544U 98067A   26286.43465595  .00005946  00000-0  11657-3 0  9992","tle2":"2 25544  51.6321  74.9235 0006732 257.7935 102.2300 15.48850287590084","tle_source":"Space-Track.org","center_frequency":null,"observer":"dm43","observation_frequency":437825000,"transmitter_unconfirmed":false,"sat_id":"XSKZ-5603-1870-9019-3066","transmitter_parameters":null}
```
Scheduled (future) observation of AO-91 (`fut.json`): `{"id":15195258,"start":"2026-10-15T06:43:30Z","end":"2026-10-15T06:47:15Z","ground_station":766,"transmitter":"KgazZMKEa74VnquqXLwAvD","norad_cat_id":43017,"payload":null,"waterfall":null,"demoddata":[],"station_name":"Dunchurch","station_lat":52.342463,"station_lng":-1.290348,"station_alt":128,...,"status":"future",...,"rise_azimuth":91.0,"set_azimuth":27.0,"max_altitude":20.0,"transmitter_uuid":"KgazZMKEa74VnquqXLwAvD","transmitter_description":"DUV TLM",...}`. This shows Network already exposes AOS/LOS (`start`/`end`), azimuths and max elevation per scheduled pass at stations, i.e. exactly the `Pass` shape (but only where a station schedules it).

### 2.6 AMSAT status report - `amsat_reports_all.json`, `amsat_reports_AO7.json`
```json
{"data":[{"id":1365794,"name":"AO-7_[U/v]","satellite_display_name":"AO-7 [U/v]","reported_time":"2026-10-13T22:30:00Z","callsign":"LU2DSF","report":"Not Heard","grid_square":"GF13pk","period":1},
         {"id":1365751,"name":"AO-7_[U/v]","satellite_display_name":"AO-7 [U/v]","reported_time":"2026-10-13T19:30:00Z","callsign":"CN8UN","report":"Heard","grid_square":"IM64rg","period":0}],
 "meta":{"count":5,"limit":5,"since":"2026-10-12T00:00:47Z","hours":48}}
```
Statuses (`/statuses.php`): `[{"value":"Heard","label":"Satellite active"},{"value":"Telemetry Only","label":"Telemetry or beacon only"},{"value":"Not Heard","label":"No signal"},{"value":"Crew Active","label":"ISS crew voice active"}]`.
Catalog entry with stats: `{"id":79,"name":"AO-91_[FM]","display_name":"AO-91 [FM]","website":"https://www.amsat.org/live-fm-satellites/","links":{"self":"...catalog.php?name=AO-91_%5BFM%5D","reports":"...reports.php?name=AO-91_%5BFM%5D"},"report_count":423,"latest_reported_time":"2026-10-13T20:30:00Z"}`.
Summary row: `{"name":"AO-123_[FM]","satellite_display_name":"AO-123 [FM]","report":"Telemetry Only","report_count":2,"latest_reported_time":"2026-10-13T21:30:00Z"}`.

### 2.7 N2YO radiopasses (from docs, not called)
```json
{"info":{"satid":25544,"satname":"SPACE STATION","transactionscount":4,"passescount":3},"passes":[{"startAz":307.21,"startAzCompass":"NW","startUTC":1521354770,"maxAz":225.1,"maxAzCompass":"SW","maxEl":41.5,"maxUTC":1521355110,"endAz":140.7,"endAzCompass":"SE","endUTC":1521355445}]}
```

### 2.8 AMSAT keps (3-line, `amsat_nasabare.txt`)
```
AO-07
1 07530U 74089B   26285.99683185 -.00000045  00000-0  68016-5 0  9991
2 07530 101.9903 300.4707 0011943 266.5495 121.7346 12.53700018375282
```

### 2.9 ARISS text (educational contacts page, scraped)
`EcoTarium, Worcester, MA telebridge via AB1OC (Luke Delaney KJ5PPF)` / `Contact is go for: Thu 2026-10-15 15:25:33 UTC 40 deg (***)` / `Watch for Livestream at https://youtube.com/live/F04UKyV1LIA`; `Ecole Internationale PACA de Manosque, Manosque, France, direct via F4KKM (Joshua Kutryk KJ5BFU)` / `Contact is go for: Fri 2026-10-16 11:37:19 UTC 25 deg`. The "NN deg" is the maximum elevation of the pass at the ground station. SSTV: "Begins Friday October 2, 2026 9:00 UTC. Concludes Tuesday October 6, 2026 at 15:55 UTC... 437.550 MHz... Robot 36".

---

## 3. Field inventory

### 3.1 Celestrak GP / OMM (96 records, all 16 keys in 100%)
| field | type | presence | example | notes |
|---|---|---|---|---|
| OBJECT_NAME | string | 100% | `OSCAR 7 (AO-7)`, `RADFXSAT (FOX-1B)`, `ES'HAIL 2`, `2026-195A` | Celestrak name; **differs from SatNOGS and AMSAT names**. Brand-new objects have only the intl designator as name. |
| OBJECT_ID | string | 100% | `1974-089B` | COSPAR/intl designator |
| NORAD_CAT_ID | int | 100% | 7530 | primary key |
| EPOCH | string | 100% | `2026-10-13T13:47:33.052704` | **UTC, no `Z`** suffix. Range in group: 2026-10-08 .. 2026-10-13 (AO-10 oldest, 5 days). |
| MEAN_MOTION, ECCENTRICITY, INCLINATION, RA_OF_ASC_NODE, ARG_OF_PERICENTER, MEAN_ANOMALY, BSTAR, MEAN_MOTION_DOT, MEAN_MOTION_DDOT | number | 100% | `12.53700031` | revs/day, degrees; exactly SGP4 inputs |
| EPHEMERIS_TYPE, CLASSIFICATION_TYPE, ELEMENT_SET_NO, REV_AT_EPOCH | int/str | 100% | `0`, `U`, `999`, `37535` | |

### 3.2 SatNOGS DB `satellites` (2832 records, fields all always present)
| field | type | notes |
|---|---|---|
| sat_id | string `XXXX-0000-0000-0000-0000` | SatNOGS stable id (survives NORAD changes) |
| norad_cat_id | int / null | 2 Celestrak amateur objects (new launches) were **not yet in SatNOGS** |
| norad_follow_id | int/null | for sats tracked under another NORAD id |
| name, names | string | `names` is a comma-separated alias list incl. OSCAR number (`AO-7, AMSAT OSCAR 7`) - the only place to map `AO-91` -> FOX-1B (`name`: "FOX-1B") |
| status | enum | observed: `in orbit` 1766, `re-entered` 1023, `future` 43 |
| decayed, launched, deployed | ISO datetime / null | `T00:00:00Z` date precision |
| operator, countries, website, citation, image | string | `operator` literal `"None"` for 2741 of 2832 (string, not null) |
| telemetries | array | `[{"decoder":"iss"}]` |
| updated | ISO datetime | use as change cursor |
| is_frequency_violator | bool | |
| associated_satellites | array | |
| reception_status | enum | `Unknown` (2827) / `Verified` (5) |
| reception_evidence | object | `{"urls":[]}` |

### 3.3 SatNOGS DB `transmitters` (5114 records; all 30 keys present on 100%, but values null often)
| field | type | non-null % | example | notes |
|---|---|---|---|---|
| uuid | string(22) | 100 | `uLfAhJaZJUWmA9Sik8yQ2m` | stable per-transmitter id |
| sat_id / norad_cat_id / norad_follow_id | | 100 / 100 / ~0 | | join to satellites |
| description | string | 100 | `Mode U/V (B) Lin`, `Mode V/U FM Voice CTCSS 67.0 Hz`, `ISS CCSDS Data 1` | human label; CTCSS tone only in free text |
| type | enum | 100 | `Transmitter` 4791, `Transceiver` 253, `Transponder` 70 | Transmitter = downlink only (beacon/telemetry), Transceiver = FM repeater/regenerative, Transponder = linear bent-pipe |
| alive / status | bool / enum | 100 | `true` / `active` (3006) , `inactive` (2108) | `alive` == (`status == active`) in all rows |
| uplink_low | int Hz | 6.1 | 145850000 | only uplink-capable devices |
| uplink_high | int Hz | 1.2 | 145950000 | present only for passbands (linear) |
| uplink_drift, downlink_drift | int | 0.2 / ? | 21954 | parts-per-billion drift; `uplink_drifted`/`downlink_drifted` = low freq with drift applied |
| downlink_low | int Hz | 99.9 | 145925000 | |
| downlink_high | int Hz | 95.1 | 145975000 | |
| mode / mode_id | string / int | 100 / 99.6 | `FM`,`1` | `mode` null for 23 rows; 61 modes in `/api/modes/` |
| uplink_mode | string | 6.1 | `LSB` | for linear: often the opposite sideband |
| invert | bool | 100 | `true` for 35 | true = inverting transponder (uplink freq rising -> downlink falling) |
| baud | float | 54.3 | 1200.0, 0.0 | `0.0` is used as "n/a" in some rows |
| service | enum | 100 | `Unknown` 3593, `Amateur` 1060, `Space Operation` 105, `Meteorological` 95, `Space Research` 65, `Earth Exploration` 65, `Mobile` 40, `Maritime` 23, `Inter-satellite` 21, `Radiolocation` 19, `Radionavigational` 18, `Aeronautical` 8, `Fixed`, `Broadcasting` | filter `Amateur` for HamAlert (but ISS/QO-100 rows are often `Unknown`; filter by the satellite instead) |
| iaru_coordination | enum | 100 | `N/A` 3762, `IARU Coordinated` 941, `IARU Uncoordinated` 375, `IARU Declined` 36 | |
| frequency_violation, unconfirmed | bool | 100 | 35 / 291 true | |
| citation, updated, params, itu_notification | | | | `params` almost always null |

Observed `mode` vocabulary (count in 5114): FM 1534, BPSK 659, GMSK 459, FSK 423, CW 397, GFSK 282, AFSK 222, LoRa 211, FSK AX.100 Mode 5 170, GMSK USP 115, UNKNOWN 98, QPSK 78, SSTV 50, USB 43, MSK AX.100 Mode 5 40, DVB-S2 26, OQPSK 24, null 23, GFSK/BPSK 23, DOKA 20, FMN 19, BPSK PMT-A3 18, LRPT 17, FSK AX.25 G3RUH 15, AHRPT 12, HRPT 11, PSK 10, MSK 10, APT 9, PSK31 7, DQPSK 6, 64-QAM 6, AM 5, CERTO 5, AFSK TUBiX10 5, SIDLOC 5, DSB 4, DUV 4, DSTAR 4, OFDM 4, SSDV 4, LSB 3, MFSK 3, WSJT 3, GFSK Rktr 3, MSK AX.100 Mode 6 3, 4FSK 3, DBPSK 3, ASK 2, SQPSK 2, FT8 2, GENESIS FSK 2, QPSK31, FFSK, DPSK, FSK AX.100 Mode 6, DATV, PPM, GFSK Pkst, FSK QUBIK (1 each). **There is no "APRS", "digipeater" or "linear" mode value**: APRS is `AFSK` (+ description text "APRS"), linear is `type=Transponder` with `mode` USB/CW, digipeaters are described in `description` ("Mode V/U FM Voice Repeater", "digipeater"). Data-quality caveat: all QO-100 transponder segments are tagged `FM`.

### 3.4 SatNOGS Network observation (25 per page, 54 keys)
Keys: `id, start, end, ground_station, transmitter, norad_cat_id, payload, waterfall, demoddata[], station_name, station_lat, station_lng, station_alt, archived, vetted_user, vetted_datetime, archive_url, client_version, client_metadata (JSON string), status, status_certainty, waterfall_status(+_user,_datetime), rise_azimuth, set_azimuth, max_altitude, transmitter_* (uuid, description, type, uplink/downlink low/high/drift, mode, invert, baud, updated, status, unconfirmed, parameters), tle0/1/2, tle_source, center_frequency, observer, observation_frequency, sat_id`. `status` values: `future`, `good`, `bad`, `failed`, `unknown`. All always present; nulls for `payload`/`waterfall` on future observations. `start`/`end` are ISO UTC with `Z`. `id` monotonic -> usable cursor.

### 3.5 AMSAT reports (100 reports in 24 h sample, 8 keys at 100%)
| field | type | example | notes |
|---|---|---|---|
| id | int | 1365799 | monotonic, dedupe key |
| name | string | `FO-29_[V/u]` | API key; bracket suffix = transponder/mode |
| satellite_display_name | string | `FO-29 [V/u]` | |
| reported_time | ISO UTC `Z` | `2026-10-13T23:30:00Z` | in my data **always at :30:00** (hour-bucketed, not real report time); `period` 0-3 (counts 20/29/29/22) = 15-minute quarter within the hour, the clock time is therefore only approximately known |
| callsign | string | `ZL3AHW/M`, `VU2GRM` | reporter (human, case as typed, may have /M /P suffix) |
| report | enum | Heard 87 / Telemetry Only 8 / Not Heard 5 | |
| grid_square | string | `MK82su`, `JO31` | 4 or 6 char Maidenhead, 0% missing in sample |
| period | int | | |
Busiest names in 24 h: RS-44_[V/u] 28, ISS_[FM] 18, JO-97_[U/v] 8, QO-100_[NB] 8, SO-50_[FM] 8, FO-29_[V/u] 7, AO-7_[U/v] 5. Volume ~100-300 reports/day, i.e. a very low-rate stream.

AMSAT catalog (93 entries) naming scheme: `<Sat>_[<Mode>]` with modes seen: `FM`, `U/v`, `V/u`, `V/a`, `C/x`, `NB`, `WB`, `SSTV`, `SSDV`, `TLM`, `UHF_Digi`, `VHF_Digi`, `V/u_Digi`, `DVB-S2`, `DATV`, `Crew`, `Music`, `CODEC2`, `FSK`, `5.8G_TLM`, `UHF_TLM`. Case convention: uppercase letter = uplink band? (`U/v` = UHF up, VHF down; `V/u` = VHF up, UHF down.)

---

## 4. Semantics and quirks

* **"Active" is three-way and per transmitter, not per satellite.** SatNOGS: satellite `status` (in orbit / re-entered / future) AND transmitter `status` (active / inactive). AMSAT: community reports within a time window. A sat in orbit with `Not Heard` reports is effectively dead; rule of thumb to use for alerts: transmitter `status=active` AND latest AMSAT report not older than ~48 h.
* **Frequencies.** SatNOGS and Network: integer **Hz** (`145960000`). Existing HamAlert spots: **kHz** (cluster) or MHz in config bands (`config.bands` use MHz: `{from: 144, to: 148}`; QO-100 band `10489.550 - 10490` MHz) - the band table mixes MHz units while spots use kHz; satellite code must convert. A transponder has a band (`*_low..*_high`); a transmitter has a single frequency and `*_high` is null. Doppler: SatNOGS `*_drifted` fields are NOT Doppler; Doppler is a runtime computation (df = f * v_radial / c, up to +-10 kHz at 435 MHz for LEO; ISS 437.800 MHz +-~10 kHz; QO-100 geostationary has none). For inverting transponders, uplink = const - downlink.
* **Time.** Celestrak EPOCH: UTC without `Z`. SatNOGS: ISO with `Z`. N2YO: Unix epoch seconds. AMSAT: ISO `Z`, but hour-bucketed. ARISS: free text "Thu 2026-10-15 15:25:33 UTC".
* **TLE freshness.** LEO TLE older than ~2 weeks gives bad AOS/LOS (seconds to minutes error); in the Celestrak amateur group epochs ranged 0-5 days old (AO-10, a HEO, oldest). Refresh at least daily; AOS accuracy matters because passes are 5-15 min.
* **5-digit catalog limit:** NORAD ids pass 99999 in 2026-2027 (SatNOGS already has `norad_cat_id: 98395`, 98194, 63235...). Classic TLE format cannot encode > 99999 (Alpha-5 workaround; Celestrak's JSON/OMM carries the integer). Prefer OMM JSON (SGP4 libs: satellite.js >= 5, python-sgp4 OMM support, Orekit) over TLE text to be safe. Note even Celestrak's amateur group already contains `2026-195A` (new launch with no name yet).
* **Names are not consistent across sources** (Celestrak `RADFXSAT (FOX-1B)`, SatNOGS `FOX-1B` with names `AO-91`, AMSAT `AO-91_[FM]`, AMSAT keps `AO-91`; QO-100 = `ES'HAIL 2` / `Es'hail 2` / `QO-100_[NB]`). Display name should be an OSCAR designator when it exists. Source of truth for mapping OSCAR designators: SatNOGS `names` field plus a curated override table.
* **ISS is special.** 40+ ISS transmitters listed (FM voice, APRS digipeater 145.825 MHz AFSK, V/U cross-band repeater with 67.0 Hz CTCSS, SSTV 437.550/145.800, HamTV DVB-S2 2395 MHz, Soyuz/Dragon telemetry); most are non-amateur. Amateur-relevant ISS items: APRS 145.825 MHz, cross-band repeater (uplink 145.990, downlink 437.800), SSTV events, ARISS voice contacts (crew). Only a subset is on at a time (ARISS/crew control), so "transmitter active" in SatNOGS means "exists", not "on air now". The AMSAT `ISS_[FM]`, `ISS_[Crew]`, `ISS_[SSTV]`, `ISS_[VHF_Digi]`, `ISS_[UHF_Digi]`, `ISS_[DATV]` reports are the only live signal of that.
* **QO-100 is geostationary**: always visible within the footprint (Africa, Europe, Middle East, Brazil to India); no passes, no Doppler; "activity" there means cluster/PSK Reporter spots on 10489.5-10490 MHz (already covered by HamAlert as a band). Uplink 2400.0-2400.5 MHz, downlink 10489.5-10490 MHz; narrowband 10489.500-10489.800, wideband DATV 10491 MHz.
* **Other GEO/HEO:** AO-10 (HEO, epoch 5 days old) and AO-7 are listed in the Celestrak amateur group but long-range, not classic pass shape. AO-7 operates only when its solar panels are lit (modes A and B alternate) which is why AMSAT shows `Heard` / `Not Heard` flipping.
* **Duplicates / edits.** AMSAT: replaced reports per (sat, callsign, hour, 15-min); SatNOGS transmitter edits (e.g. "alive" flips) show only through `updated`. No delete/tombstones are exposed except status values (`inactive`, `re-entered`).
* **Test/QRT.** No QRT concept; `Not Heard` is the closest. 2 of 100 AMSAT reports (24 h sample: 5 of 100) were `Not Heard` - those should not alert.
* **Reporters.** AMSAT: human callsigns only. SatNOGS Network: station names/ids (`dm43`, `MAUSyagi-AK`), no callsign (observers are mostly owners' nicknames). Neither carries a "DX" callsign (nobody is "being spotted").
* Frequency range issue: ground-station min elevations differ; a "good" Network observation says nothing about being able to work the satellite from a user's QTH.

---

## 5. Related reference data

| dataset | URL | format | size / count | cadence | sample |
|---|---|---|---|---|---|
| Amateur satellite TLE/OMM | `https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=json` | JSON array | 96 objects, 40 KB | Celestrak refreshes from Space-Track every few hours; element epochs 0-5 d old | section 2.1 |
| AMSAT keps | `https://www.amsat.org/tle/current/nasabare.txt` | 3-line TLE with OSCAR name | 97 objects, 14 KB | irregular | `AO-07` |
| SatNOGS satellite catalogue | `https://db.satnogs.org/api/satellites/?format=json` | JSON | 2832, 1.5 MB | ad hoc; check `updated` | ISS, QO-100 above |
| SatNOGS transmitters | `https://db.satnogs.org/api/transmitters/?format=json` | JSON | 5114, 3.9 MB | weekly-ish edits (latest `updated` 2026-10-10) | above |
| SatNOGS TLE | `https://db.satnogs.org/api/tle/?norad_cat_id=N` | JSON | 1 per satellite | refreshed ~daily from Space-Track (`updated` 2026-10-13T19:29Z) | above |
| SatNOGS modes | `https://db.satnogs.org/api/modes/` | JSON | 61 modes (`{"id":1,"name":"FM"}`) | rare | `satnogs_modes.json` |
| AMSAT status catalog | `https://www.amsat.org/status/api/v1/catalog.php` | JSON | 93 (satellite+mode) rows | when AMSAT adds | section 2.6 |
| SatNOGS Network stations | `https://network.satnogs.org/api/stations/` | JSON | thousands (ids up to ~5200) | continuous | `{"id":1,"name":"Hackerspace.gr 1","lat":38.01697,"lng":23.7314,"qthlocator":"KM18ua","min_horizon":40,...}` |
| ARISS KEPS/Doppler pages | https://www.ariss.org (menu "KEPS", "Doppler Correction Tables") | HTML/PDF | | | |
| IARU frequency coordination | https://iaru.amsat-uk.org/finished.php | HTML | | | referenced in `iaru_coordination_url` |

Celestrak amateur group coverage vs SatNOGS: 94/96 Celestrak objects have a SatNOGS satellite; those 94 all are `in orbit`; **273 active transmitters across 91 of them** (modes: CW 50, FM 45, BPSK 36, FSK 25, GFSK 23, AFSK 22, GMSK USP 15, GMSK 10, USB 9, SSTV 9 ...). Only **21 active `Transponder` rows** exist among these. Celestrak's "amateur" group is not a complete ham list (it is Celestrak's own curation; I did not diff it against the AMSAT catalog, but e.g. it lists 27 RS-numbered cubesats and 9 TEVEL2 units, and names like 'RADFXSAT (FOX-1B)'); the AMSAT catalog (93 rows) is a better "what hams use" list than Celestrak's group, and SatNOGS `service=Amateur` + `status=active` + sat `in orbit` is the machine filter. I did not complete a precise diff of those three lists.

Curated list needed (HamAlert maintainers' decision): a short whitelist of ham-usable satellites (NORAD id, OSCAR name, AMSAT API names, display name) - roughly 30-40 sats really in use: ISS (25544), AO-7 (7530), AO-27, FO-29 (24278), SO-50 (27607), AO-73 (39444), AO-85 (40967), AO-91 (43017), AO-92, AO-95 (43770), RS-44 (44909), JO-97, XW-3, IO-117, QO-100 (43700), PO-101, CAS-3H, IO-86, TEVEL, AO-123, SO-121, etc. Verified examples with ids: ISS 25544; FOX-1B/AO-91 43017; SO-50/SaudiSat 1C 27607; AO-7 7530; FO-29 24278; AO-73 39444; FOX-1A/AO-85 40967; Es'hail-2/QO-100 43700; RS-44 44909 (marked `frequency_violation:true`, `IARU Uncoordinated` in SatNOGS).

---

## 6. Proposed mapping

### 6.1 Principles
* Keep satellites out of the base `Spot` unless a human reported activity. A pass is not a spot.
* Use `noradId` (int) as identity, `name` as display only, and always carry the AMSAT API name for traceability.
* Store frequencies in **Hz as integers** in satellite objects (SatNOGS-native, QO-100 10489540000 fits in 64-bit/JS double exactly) and convert at the Spot boundary to match whatever base `frequency` unit the maintainers pick (today kHz). Do not use float kHz for sat data: 10 GHz-range values have 32-bit pitfalls (the cluster 32-bit rounding bug applies there).

### 6.2 (A) Activity spot with `satellite` detail block
Sources: (1) AMSAT status reports (primary), (2) optional parsing of cluster spots on satellite frequencies/comment keywords, (3) optional SatNOGS Network (sat "heard by station", flagged as machine).

Base Spot fields from an AMSAT report:
| Spot base | from AMSAT |
|---|---|
| source | `"amsat-status"` |
| callsign (the DX being heard) | **none** - report is about a satellite, not a station. Use the satellite's designator (e.g. `AO-7`) or leave null. Open question below. |
| spotter | `callsign` (reporter) |
| time | `reported_time` (hour-bucketed; record `period` too) |
| frequency | null (or the transponder downlink centre from SatNOGS lookup) |
| mode | from SatNOGS lookup (`FM`, `SSB`...) or from bracket suffix |
| comment | `"Heard"`/`"Telemetry Only"`/`"Not Heard"`/`"Crew Active"` |
| locator (spotter grid) | `grid_square` |
| externalId | `id` |

Proposed `satellite` detail block:
```jsonc
"satellite": {
  "noradId": 43017,            // int, from mapping table; null if unmapped
  "name": "AO-91",             // OSCAR/display name
  "amsatName": "AO-91_[FM]",   // raw status API key (nullable for non-AMSAT sources)
  "transmitterUuid": null,     // SatNOGS uuid when resolvable (nullable)
  "transmitterMode": "FM",     // SatNOGS-like mode string, or "linear" | "aprs" | "sstv" | "telemetry" | "digipeater" category (see below)
  "uplinkHz":   435250000,     // nullable
  "downlinkHz": 145960000,     // nullable
  "uplinkHighHz": null, "downlinkHighHz": null,   // passband edges for transponders
  "inverting": false,
  "report": "heard" | "telemetryOnly" | "notHeard" | "crewActive",  // AMSAT vocabulary, normalised
  "reporterGrid": "JO31ol",
  "reportPeriod": 0            // 15-min quarter within reported hour (AMSAT only)
}
```
* Add a normalised `transmitterKind` enum in HamAlert: `fm_voice | linear | cw_beacon | telemetry | aprs | sstv | datv | digipeater | other`, derived from SatNOGS `type`, `mode`, `description`. Do not expose SatNOGS' 61 raw modes to users.
* Alert semantic: trigger on `report in (Heard, Crew Active)` for satellite X, optionally within distance of the reporter's grid (to guess "is the sat visible near me?"). Suppress `Not Heard`. Throttle per satellite (e.g. 1 alert / satellite / 2 h) because 100+ reports a day cluster around the same passes.
* Cluster path: only extract a `satellite` block when the spot frequency is inside a known satellite downlink (QO-100 10489.5-10490 GHz band, 145.825 ISS APRS, 145.800 ISS FM, 145.960 AO-91 etc.) or comment matches `/\b(SAT|QO-?100|AO-\d+|SO-\d+|RS-?\d+|FO-\d+|XW-?\d|ISS)\b/i`. In 250 live spots sampled none matched, so low value for effort; QO-100 can remain a band. Do NOT infer satellite from `via`.

### 6.3 (B) Planned event: `Pass`
HamAlert's other planned events (SOTA alerts, WWFF agendas) are *published by a third party*. A pass is **derived**, so it should be a computed object, not a stored upstream event. Shape:
```jsonc
{
  "type": "satellitePass",
  "satellite": { "noradId": 43017, "name": "AO-91", "tleEpoch": "2026-10-13T13:47:33Z" },
  "observer": { "lat": 52.34, "lon": -1.29, "altM": 128, "grid": "IO92" },
  "aos": "2026-10-15T06:43:30Z", "los": "2026-10-15T06:47:15Z",
  "tca": "2026-10-15T06:45:20Z",
  "maxElevationDeg": 20.0, "aosAzimuthDeg": 91.0, "tcaAzimuthDeg": 38.0, "losAzimuthDeg": 27.0,
  "durationSec": 225,
  "transmitters": [ { "uuid": "...", "mode": "FM", "type": "Transceiver", "uplinkHz": 435250000, "downlinkHz": 145960000, "kind": "fm_voice", "status": "active" } ],
  "sunlit": true, "observerDark": false,        // optional, SatNOGS/Heavens-Above style, nice for AO-7 and for APRS
  "recentActivity": { "lastHeardAt": "...", "heardReports24h": 8 }  // optional join with AMSAT
}
```
Field names match N2YO (`startAz,maxEl,endAz`), SatNOGS Network (`rise_azimuth,set_azimuth,max_altitude`) so a cross-check is easy. AOS/LOS define the event start/end for the planned-event contract.

User-side triggers to support: satellite whitelist, min max-elevation (typical 10-20 deg), notify N minutes before AOS (5/10/15), only passes in time-of-day window, only passes where an `active` transmitter of kind X exists, only when AMSAT status in last 24 h is `Heard`.

### 6.4 Where pass computation should live (decision)
* **Server computes, per user location, lazily** (judgment call):
  * Cost: SGP4 for 40 sats x 3 days at 30-s steps is ~10k propagations per user = a few ms in C/JS; 100k users still trivially cheap if only users with satellite triggers are processed and results are cached by 0.5-degree grid cell (pass times vary only a few seconds across ~10 km, minutes across ~1 degree; so cache key must be the exact lat/lon rounded to ~0.01 degree or just compute per user).
  * It must be the server because notifications fire server-side when no client is open, and client time zones/clocks can't be relied on.
  * TLE refresh: one job pulls Celestrak (every 6 h, with SatNOGS TLE fallback), stores OMM JSON + epoch; recompute passes on each TLE update for users with satellite triggers, or on a rolling 24-h horizon each night.
* **Also publish TLE/OMM + curated catalogue as a static endpoint** for the web/app clients so that a UI "next passes" widget can compute locally (satellite.js) without a round trip for an arbitrary location (map exploration, "discover near you"). The server's pass list is authoritative for alerts.
* Do not depend on N2YO or Heavens-Above scraping at runtime.
* Edge cases to implement: min elevation horizon masks, AOS/LOS defined at 0 deg vs station horizon, geostationary sats (QO-100) get "visibility from location" (elevation > 0 and constant) instead of passes, HEO sats (AO-10) get long windows, decayed sats (drop when SatNOGS `status=re-entered` or TLE missing), sats with `norad_cat_id` null.

---

## 7. How popular tools get their data (brief)
* **Look4Sat (Android, open source):** TLEs from Celestrak (and SatNOGS); transmitter list from SatNOGS DB; newer versions add an ARISS source and user-importable data sources; local SGP4 (Predict4Java); offline-capable.
* **AMSAT Droid / AMSAT status app:** AMSAT keps (nasabare), own transmitter/frequency tables, status from the AMSAT status page API (AMSAT announced the Android app moved to the new Status API).
* **SatPC32 (Windows, Doppler rig control):** `nasa.all`/`nasabare.txt` keps from AMSAT or Celestrak files via `Celestrak.SQF`, plus a hand-edited `Doppler.SQF` (uplink/downlink/mode per satellite) and `AmsatNames.txt` for mapping names to catalog numbers.
* **Heavens-Above:** its own propagation from Space-Track elements; visible passes for optical, includes a ham-satellite catalogue; no public API (scraping only, terms prohibit).
* **N2YO / Orbitron / gpredict / GridTracker (QO-100 widgets):** TLE from Space-Track/Celestrak; gpredict uses `.qth` and `.sat` files (transponder tables manually curated).
* **Common pattern:** TLE (daily) + SGP4 on device + a community transmitter table (increasingly SatNOGS DB). HamAlert would be the first to join this with an *alerting* layer.

---

## 8. Open questions / risks
1. **Is an AMSAT status report a "spot"?** It has a reporter but no DX callsign and no frequency. If `Spot.callsign` is required, either allow a satellite pseudo-callsign (`AO-91`) or make `satellite.report` a distinct `Activity` kind. Needs a schema decision.
2. **Rate/ToS clarity:** AMSAT API has no stated rate limit, ToS or licence; SatNOGS CC BY-SA obligations (share-alike) if we ship transmitter data to clients; Celestrak blocked my IP-range after ~5 requests in 10 minutes (503 + resets) - we need caching, jittered polling, and a fallback source. Should email AMSAT and ask permission for polling at 1-5 min.
3. **No unique/verified NORAD id in AMSAT data.** Need a maintained mapping (AMSAT names -> NORAD id -> SatNOGS sat_id). Bracketed transponder names change over time (`AO-123_[FM]`, `[SSDV]`).
4. **hamsat.org parked / no replacement.** There is no machine feed of "who is activating a satellite grid now". If HamAlert wants rover/activator alerts for satellite operation, that's a new community data source (possibly hamsat.org's old schedule model). Need confirmation of whether hamsat.org relocated.
5. **ARISS data is HTML.** A scraper for "Contact is go for" lines is brittle; maybe ask ARISS for an ICS/JSON feed. ARISS contacts are time-precise (to the second) and give max elevation for the *ground station*, which doubles as a planned event for the user's own location only through our computed pass.
6. **Doppler** is a client/radio concern; the alert should state nominal frequency only. Do we show "downlink 145.960 MHz +-3.5 kHz"?
7. **Unit conversion**: Hz (satellites) vs kHz (spots) vs MHz (config bands). Suggest storing Hz or a decimal string for GHz-range values; `3cm_qo100` band is currently defined in MHz with fractional kHz.
8. **Satellite catalogue curation** (30-40 ham-useful sats vs 2800 in SatNOGS): who maintains it? Auto rule `sat in orbit AND any transmitter(status=active, service=Amateur or Transponder/Transceiver)` gave 91 sats among the Celestrak group but includes many CW-only beacon CubeSats.
9. **TLE format after 99999** (Alpha-5), library support. Prefer OMM JSON everywhere.
10. **Data quality of SatNOGS transmitters** (QO-100 modes "FM", `baud: 0.0` placeholders, `Unknown` service for ISS/AO-7 rows, `description` carrying CTCSS tone): need overrides.
11. **Privacy:** pass computation requires storing user lat/lon; HamAlert already stores locations for "near you" features (assumed). Confirm retention policy.
12. **Not verified** (state clearly): PSK Reporter QO-100 coverage; N2YO responses (no key); Celestrak current usage policy text (docs 503); exact update interval of the SatNOGS TLE (appeared daily); whether replaced AMSAT reports keep their `id`.
