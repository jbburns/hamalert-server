# Other digital voice and "heard" sources beyond D-STAR (DMR, YSF, NXDN, P25, M17, APRS)

Research date: 2026-10-13 (samples captured 23:09 to 23:20 UTC). Raw samples: `.../scratchpad/sources/raw/other-dv/`. Scripts: `.../scratchpad/sources/scripts/` (`bm_lh_sio2.py`, `tgif_sio.py`, `bm_an.py`).
Companion report for the shape we are extending: `dstar.md` (its extension field names `dvEvent`, `dvNode`, `dvReflector`, `dvGroup`, `dvDuration`, `dvSuffix` are reused below to avoid gratuitous divergence).

## Headline findings

1. **DMR is the only candidate with a real, high-volume, anonymous, push-style public feed**: the BrandMeister (BM) Last Heard Socket.IO stream (`wss://api.brandmeister.network`, path `/lh`, then `emit("join","everything")`). I captured 706 events in 60 s with no key. It is the same feed the BM dashboard itself uses. It is **undocumented** (no wiki/OpenAPI entry; the OpenAPI at `/api-docs?api-docs.json` has no lastheard route and `/v2/lastheard` is 404), so there is no stability or terms guarantee. The older path `/lh/socket.io` that community scripts (`bmlh_to_mqtt`, `pyBMNotify`) use still completes the handshake but delivered **zero** events to me; the dashboard bundle currently uses path `/lh` and a `join` emit. Expect this to change again.
2. **TGIF** (the second large DMR network) has an equally undocumented Socket.IO feed (`https://tgif.network`, websocket transport, `emit("handshake","")`, events `lastheard`). Its official "Developer API" (`/api_helper.php`) is configuration only and explicitly says "Continuous polling is not supported ... not a live telemetry feed".
3. **YSF has no standard feed.** Each reflector runs its own software (G4KLX YSFReflector text log, DG9VH dashboard, pYSFReflector, EUROPELINK/PA7LIM custom). The best public JSON I found is EUROPELINK (`https://europelink.pa7lim.nl/api/{lastheard,active,whois,rooms,messages,general}.json`), which is a single large reflector and a **polling** API with no stable event id. Reflector discovery is available (Pi-Star `YSF_Hosts.txt`, 1570 rows, which is a mirror of DVRef, which is behind Cloudflare and returned 403 to me).
4. **NXDN, P25, M17**: no feed at all that I could find. Only per-reflector human dashboards (NXLINK, LYNK25, mrefd/urfd web pages) and host lists. Reference data exists (radioid.net `nxdn.csv`; Pi-Star host lists: NXDN 407, P25 441, M17 121 reflectors). Treat them as "later, via bridges" (BM, XLX/URF multi-protocol reflectors already carry them).
5. **APRS**: aprs.fi API needs a key, only supports lookup of named stations (<=20 per call, no wildcard, no streaming) and its terms forbid preloading/collecting/archiving, so it cannot back a server-side alerting product. The right source is **APRS-IS** (TCP 14580/10152 with server-side filters, or the javAPRSSrvr WebSocket on 8080/14501/8888), but raw TCP and those ports are blocked here, so I could only read the specification, not capture packets.
6. **Biggest modelling differences vs D-STAR**: (a) identity is a numeric DMR ID that BM resolves to a callsign for only ~66% of sessions in my sample; (b) there is **no CQ marker**, so the "someone keyed up on X" event is every group call (about 170 qualifying callsign-bearing group sessions per minute from BM alone, ~10k/hour); (c) the key entity is a **talkgroup (number + name)**, not a reflector/module; (d) **private calls** are mixed into the same stream and must be dropped; (e) the feed is a **session lifecycle** (start, update, stop; stop is duplicated) rather than one record per key-up.

---

## 1. Access

### 1.1 BrandMeister (DMR), by far the best candidate

| Need | Endpoint | Auth | Notes |
|---|---|---|---|
| Live last heard (events) | Socket.IO v4 over WebSocket. `io("wss://api.brandmeister.network", {path:"/lh", transports:["websocket"]})`, on `connect` do `emit("join","everything")`, listen for event `"mqtt"` | none observed | Payload is `{topic:"LH", payload:"<JSON string>"}` (the inner JSON is a **string**, needs a second `JSON.parse`). Rooms other than `everything` exist (the dashboard emits `join` per filter rule, plus `activeSessions`; `searchHouse` returns history, see below). Not documented. Server accepted a Python `python-socketio` client with a custom User-Agent. |
| History / search (dashboard) | same socket, `emit("searchHouse",{query:{condition:"AND",rules:[...]},amount:N})`, answered with `mqtt` events with `topic:"LH-Startup"` then `searchHouseComplete` | none | Found in the dashboard JS bundle, **not exercised by me**. Useful for catch-up after a reconnect (no replay of missed events otherwise). |
| Talkgroup names | `GET https://api.brandmeister.network/v2/talkgroup` | none | One JSON object `{"<tgid>":"<name>"}`, 1844 entries, 44 KB. Names are free text, can be non-ASCII (Greek, etc.), includes `"9":"Local"`, `"91":"World-wide"`, `"310":"Tac 310 NOT A CALL CHANNEL"`. `GET /v2/talkgroup/{id}` returns `{"ID":91,"Name":"World-wide"}`. |
| Repeater/hotspot ("device") directory | `GET /v2/device` (9.6 MB, 32,537 devices, seen in last day), `GET /v2/device/{id}`, `GET /v2/device/byCall?callsign=W9SEM`, `GET /v2/device/{id}/talkgroup` (static TGs), `GET /v2/device/{id}/profile` (static, dynamic, timed, clusters) | none for these (see below) | Gives `tx`/`rx` MHz (as strings, `"440.7500"`), colour code, lat/lng, city (+ grid square), `last_seen`, `lastKnownMaster`, hardware, firmware. Many hotspots have `tx:"0.0000"`, `lat:0`. `/v2/device/{id}` also leaks `permissions[].username` (sysop callsigns). |
| Masters | `GET /v2/master`, `/v2/master/{id}` | none | Country and IP per master server (2xxx, 3xxx ... ids). |
| ID to callsign registry | `GET /v2/registry/{dmrid}` or `/v2/registry/byCall/{call}` | none | `{"Name":"Idhs","ID":3118573,"Call":"W9SEM","SSID":0,"Symbol":"/[","Text":"IDHS RACES"}` (this is the BM **APRS** profile: SSID, symbol). |
| Per-TG device list | `GET /v2/talkgroup/{id}/devices` | **401 Unauthenticated** | Needs a BM account API key (v2 key from Profile Settings > API Keys). Same for all writes (static TG add/delete, dropCallRoute, ...). |
| Last heard REST | none | n/a | `/v2/lastheard`, `/v2/device/{id}/lastheard` all 404. The brief's `/lastheard?...` does not exist in API v2 ("Halligan API" 2.1.0, `/api-docs?api-docs.json`, 20 paths). The wiki "HTTP API" page documents the master-server status API, not this. |
| Docs | Swagger UI `https://api.brandmeister.network/docs`; wiki is behind Anubis anti-bot (`wiki.brandmeister.network` returned an access-denied page to my fetcher); `https://help.brandmeister.network/` has user docs only | | No terms/rate-limit text found for the feed (searched; nothing). `brandmeister.network/?page=lh` returns 403 to scripts. |

Detecting new/updated events: each transmission has a `SessionID` (UUID). Events per session in my capture (313 sessions): `Session-Start`, `Session-Update` (zero or more), `Session-Stop` (**normally emitted twice**, see 4). Use `SessionID` as the idempotency key, emit the HamAlert event on the first stop (or on start, see open questions). No replay: a dropped connection loses events (use `searchHouse` or accept loss). Ping interval 25 s, timeout 20 s (Engine.IO handshake: `pingInterval:25000, pingTimeout:20000, maxPayload:1000000`).

Volume (BM, 60 s at 23:12 UTC on a Tuesday): 706 events = 175 start + 108 update + 423 stop; 282 distinct stopped sessions (250 group, 32 private); 170 group sessions of >=2 s with a callsign; 113 distinct callsigns. Roughly 10k qualifying callsign-bearing key-ups per hour at this time of day, probably 2 to 3x at EU/US evening peaks. Many are 0 to 1 s "kerchunks" (median 4 s; 27% of sessions last 0 to 1 s).

### 1.2 TGIF (DMR)

- Live: `io("https://tgif.network", {transports:["websocket"]})`, `emit("handshake", api_token)` (an empty string works anonymously; token is for logged-in users who see admin extras), events `lastheard` (single record each) and `lastheard_backlog` (batch, not seen in my 40 s run), plus `status` (`[200]`). Discovered from `https://tgif.network/lastheard.php` page source. In 40 s I received 144 `lastheard` events for 36 distinct streams (~1 stream/s).
- REST: `https://tgif.network/api_helper.php` documents an **authenticated configuration API** (static TG GET/POST/DELETE/PUT, tokens, 429/503 backoff rules) and says: "Continuous polling is not supported. The API is an event-driven configuration interface, not a live telemetry feed." Session update URL (`:5040/api/sessions/update/...`) exists but is also control, not telemetry.
- Terms: T&C page covers the network's audio recording and says over-the-air contacts are "deemed public domain"; nothing about scraping the dashboard feed. No documented rate limits. Treat as "ask permission before building a product on it".
- Reference: `https://tgif.network/talkgroups.php` (HTML talkgroup list).

### 1.3 radioid.net (DMR/NXDN ID to callsign)

- Bulk: `https://radioid.net/static/user.csv` (17 MB, 314,913 rows, `Last-Modified` 2026-10-13 05:01 UTC), `https://radioid.net/static/users.json` (85 MB), `https://radioid.net/static/rptrs.json` (6 MB, repeater list), `https://radioid.net/static/nxdn.csv` (963 KB). Regenerated about daily around 05:00 UTC. `HEAD`/`Last-Modified` works for cheap change detection.
- Query: `GET https://radioid.net/api/dmr/user/?id=3118573` or `?callsign=W9SEM` (no key needed in my tests) returns `{count,page,pages,per_page:200,results:[...]}` and **includes live fields** `lastheard` (RFC 1123 date), `lastmaster`, `lastsource`, `lasttg`. That is a handy "last seen on TG" pull API for a single user, but one request per user does not scale to a push alerting service.
- Terms: not reviewed (no terms text found at `/about`). The files are linked publicly and used by essentially all hotspot software (Pi-Star, WPSD, MMDVMHost), so bulk download is the accepted practice; be polite (once per day).

### 1.4 YSF / System Fusion, FCS, Wires-X

- No official public API. Components: G4KLX `YSFReflector` (text log only, see 2), `YSFGateway`, DG9VH `YSFReflector-Dashboard` (PHP that parses the log; "no longer under development"), `pYSFReflector` (iu5jae, Python with websockets dashboard), and custom stacks (EUROPELINK).
- EUROPELINK JSON (public, no auth, plain GET, JSON): `https://europelink.pa7lim.nl/api/lastheard.json` (15 most recent stations, newest last), `active.json` (people currently keyed), `whois.json` (243 connected clients with device/locator/gateway), `rooms.json`, `messages.json`, `general.json` (version). URLs found in the page's `david.js`. Polling only; no ids; no documented limits. I polled `active.json` 3x at 20 s intervals.
- Reflector directory: Pi-Star `https://www.pistar.uk/downloads/YSF_Hosts.txt` (1570 reflectors, `id;name;description;host;port;000;`), `FCS_Hosts.txt` (3002 rows, xreflector.net data, `FCS00100;Repeater;FCS001 - Repeater;;;`). `WiresX_Hosts.txt`/`YSFHosts.txt` returned 502. Upstream registry is DVRef (`dvref.com/api/v2/ysf/reflectors/`), which is **Cloudflare-challenged (403)** to scripts and has an "AUP" page I could not read.
- Wires-X: Yaesu's proprietary room system; no public feed. Bridged to YSF via YSFGateway/`TreeHouse Connector` (appears in EUROPELINK `whois`). Practical conclusion: only reflector-side logs/dashboards see Wires-X traffic.
- BM also bridges YSF into DMR: 51 of 706 BM events had `LinkName:"YSF Client"`, i.e. YSF users appear in the BM feed (with `LinkCall:"REFLECTOR "` and the DMR-side `DestinationName` equal to the YSF reflector name, e.g. `"Argentina Network"`, `"Pegasus-Projekt"`).

### 1.5 NXDN, P25, M17

- No feeds found. NXLINK (`reflectores.zonadmr.cl/NXDN/`) and LYNK25 dashboards are human HTML (periodic refresh, no JSON paths in the page); LMARC and others link their own dashboards. M17: `m17project.org` hosts protocol/software pages; reflector list is DVRef (blocked); `reflectors.m17project.org` had a TLS name mismatch. mrefd/urfd reflectors have their own web dashboards.
- Reference lists (Pi-Star mirror of DVRef): `NXDN_Hosts.txt` (407, `12\treflector.nxdn.es\t41400`), `P25_Hosts.txt` (441), `M17_Hosts.txt` (121, `M17-002\turf001.cumbriacq.com\t17000`). NXDN IDs: `https://radioid.net/static/nxdn.csv` (`RADIO_ID,CALLSIGN,...`, IDs are small integers like `1`..). P25 uses DMR-style 7-digit RadioIDs; M17 identifies by callsign directly (base-40 encoded in the stream; there is no ID table).
- Multi-protocol reflectors (XLX/URF, "reflector that supports D-Star, DMR, YSF, M17, P25 and NXDN") are the realistic way these modes will reach a spot feed. `xlxapi.rlx.lu` reset my connection; I could not inspect XLX's dashboard data.

### 1.6 DMR-MARC / IPSC2

`www.dmr-marc.net` is now a landing page that redirects ID registration to radioid.net ("over 500 DMR-MARC repeaters in 83 countries"). Its legacy last heard (`//ambe.moses.bz/dmr/lastheard.php`) returned a proxy 502, and the old `cgi-bin/trbo-database/last.cgi` is 404. No evidence of a live public API. Treat MARC as legacy; most of its repeaters are reachable through BM (`LinkName:"Motorola IP Site Connect"` is a BM link type, 52 of 706 events).

### 1.7 APRS

| Option | Access | Verdict |
|---|---|---|
| aprs.fi API | `https://api.aprs.fi/api/get?name=CALL[,CALL...]&what=loc|wx&apikey=KEY&format=json`; `what=msg&dst=CALL[,..]` (<=10 recipients, <=10 latest messages) | Key required (verified: `{"command":"get","result":"fail","code":"apikey-invalid","description":"invalid API key"}`). Rate limited per key, unspecified numbers. **Terms**: credit aprs.fi with a link; app must be free and public; "may only request data when it is actively needed by the end-user. Do not preload, pre-cache, or collect data using the API for archival purposes"; no clone sites; "no wildcard search". Not usable as a firehose for HamAlert. Possible for an on-demand "where is X" button only. |
| APRS-IS | TCP `14580` (user-defined filter), `10152` (full feed), HTML status on `14501`; login line `user CALL pass PASS vers hamalert 1.0 filter r/lat/lon/km t/poimqstunw ...`; plus **javAPRSSrvr WebSocket** on `srvr.aprs-is.net:8080`/`:14501` and `ametx.com:8888` (TLS) | The correct streaming source. Server-side filters: `r/` range, `p/` prefix, `b/` budlist (exact calls, wildcard ok), `t/` type (p position, o object, i item, m message, q query, s status, t telemetry, u user-defined, n NWS, w weather), `e/`, `d/`, `g/`, `s/`, `m/`. Read-only clients can use passcode `-1`. Connections to those ports were reset/timed out here, so no samples. |
| Other | `findu`, `aprs.fi` map, `aprsdirect`: web only | skip |

Spec pages: `https://www.aprs-is.net/Connecting.aspx`, `https://www.aprs-is.net/javAPRSFilter.aspx`. APRS-IS etiquette: pick a software name/version in the login line, do not hammer, and the full feed (`10152`) is heavy (thousands of packets per second world wide).

---

## 2. Raw record format

### 2.1 BrandMeister Last Heard, one full session as received (verbatim, `raw/other-dv/bm_lh_ws.jsonl`, outer envelope shown for the first)

Envelope: `{"topic": "LH", "payload": "<string>"}`; inner JSON below.

Session-Start (group call from a hotspot, W9SEM, TG 3118573, i.e. "TG = own ID", an odd case):
```json
{"LinkName":"MMDVM Host","SessionID":"1698f935-f9f0-4291-88f9-fd75b9b2569e","LinkType":1,"ContextID":311857399,"SessionType":7,"Slot":0,"SourceID":3118573,"DestinationID":3118573,"Route":"M48","LinkCall":"W9SEM","SourceCall":"W9SEM","SourceName":"Idhs","DestinationCall":"","DestinationName":"","State":null,"Start":1791933132,"Stop":0,"RSSI":0,"BER":0,"ReflectorID":0,"LinkTypeName":"Repeater","CallTypes":["Group","Voice","Call"],"LossCount":0,"TotalCount":0,"Master":"3104","TalkerAlias":"W9SEM Indiana IDHS AUXCOMM ","FlagSet":0,"Event":"Session-Start"}
```
First Session-Stop of the same session (note `Route:null`, `State:2`, `Master` string, zero counters):
```json
{"LinkName":"MMDVM Host","SessionID":"1698f935-f9f0-4291-88f9-fd75b9b2569e","LinkType":1,"ContextID":311857399,"SessionType":7,"Slot":0,"SourceID":3118573,"DestinationID":3118573,"Route":null,"LinkCall":"W9SEM","SourceCall":"W9SEM","SourceName":"Idhs","DestinationCall":"","DestinationName":"","State":2,"Start":1791933132,"Stop":1791933164,"RSSI":0,"BER":0,"ReflectorID":0,"LinkTypeName":"Repeater","CallTypes":["Group","Voice","Call"],"LossCount":0,"TotalCount":0,"Master":"3104","TalkerAlias":"W9SEM Indiana IDHS AUXCOMM ","FlagSet":0,"Event":"Session-Stop"}
```
Second Session-Stop (same session; `Route:"M48"`, `Master` is an **int**, `Stop` differs by 1 s, real loss stats):
```json
{"LinkName":"MMDVM Host","SessionID":"1698f935-f9f0-4291-88f9-fd75b9b2569e","LinkType":1,"ContextID":311857399,"SessionType":7,"Slot":0,"SourceID":3118573,"DestinationID":3118573,"Route":"M48","LinkCall":"W9SEM","SourceCall":"W9SEM","SourceName":"Idhs","DestinationCall":"","DestinationName":"","State":2,"Start":1791933132,"Stop":1791933163,"RSSI":0,"BER":0,"ReflectorID":0,"LinkTypeName":"Repeater","CallTypes":["Group","Voice","Call"],"LossCount":1,"TotalCount":524,"Master":3104,"TalkerAlias":"W9SEM Indiana IDHS AUXCOMM ","FlagSet":0,"Event":"Session-Stop"}
```
YSF user bridged into BM (completed):
```json
{"LinkName":"YSF Client","SessionID":"a51d73a2-46da-41fe-b0ab-cf34043226b3","LinkType":"","ContextID":"","SessionType":7,"Slot":0,"SourceID":2620778,"DestinationID":262810,"Route":null,"LinkCall":"REFLECTOR ","SourceCall":"DG3RCO","SourceName":"Wolfi","DestinationCall":"","DestinationName":"Pegasus-Projekt","State":2,"Start":1791933107,"Stop":1791933148,"RSSI":0,"BER":0,"ReflectorID":0,"LinkTypeName":"Application","CallTypes":["Group","Voice","Call"],"LossCount":0,"TotalCount":0,"Master":"2622","TalkerAlias":"DG3RCO","FlagSet":0,"Event":"Session-Stop"}
```
Private call (note `SessionType:5`, `CallTypes` without `"Group"`, destination 9990 is the Parrot):
```json
{"LinkName":"Open DMR Terminal","SessionID":"d815c655-ed9f-4490-a170-665450d78d93","LinkType":3,"ContextID":2681134,"SessionType":5,"Slot":0,"SourceID":2681134,"DestinationID":9990,"Route":null,"LinkCall":"","SourceCall":"CT2HUI","SourceName":"Antonio","DestinationCall":"","DestinationName":"","State":2,"Start":1791933138,"Stop":1791933143,"RSSI":0,"BER":0,"ReflectorID":0,"LinkTypeName":"","CallTypes":["Voice","Call"],"LossCount":0,"TotalCount":0,"Master":"2682","TalkerAlias":"","FlagSet":0,"Event":"Session-Stop"}
```
Directory samples (verbatim):
```
GET /v2/device/310186 -> {"id":310186,"callsign":"K6MBY","linkname":"MMDVM Host","hardware":"MMDVM","firmware":"20260911_WPSD","tx":"440.7500","rx":"445.7500","colorcode":1,"status":3,"lastKnownMaster":3102,"lat":48.136,"lng":-123.163,"city":"Sequim, CN88kd","website":"https:\/\/wpsd.radio","pep":1,"agl":0,...
GET /v2/talkgroup/9990 -> {"ID":9990,"Name":"Parrot - Private Call ONLY"}
GET /v2/registry/3118573 -> {"Name":"Idhs","ID":3118573,"Call":"W9SEM","SSID":0,"Symbol":"/[","Text":"IDHS RACES"}
```

### 2.2 TGIF (verbatim, `raw/other-dv/tgif_ws.jsonl`; Socket.IO event `lastheard`)

Two records for the same stream and same timestamp: first the anonymous one (no callsign yet), then the resolved one.
```json
{"latitude": "34.982  ", "longitude": "-85.3600 ", "timestamp": 1791933318, "talkgroup": 43389, "security_level": "1", "radio_id": 0, "repeater_id": 0, "streamid": 191749214, "rssi": 0, "ber": 0, "admin": "no", "location_source": "hotspot", "station_key": "endpoint:312052621"}
{"latitude": "34.982  ", "longitude": "-85.3600 ", "timestamp": 1791933318, "talkgroup": 43389, "radio_id": 3120526, "repeater_id": 312052621, "streamid": 191749214, "rssi": 0, "ber": 0, "security_level": "1", "admin": "no", "callsign": "N4LMC", "name": "SE-LINK ", "shortname": "SE-LINK", "rptbaseid": 3120526, "rptcallsign": "N4LMC", "talkgroup_name": "SouthEast Link", "location_source": "hotspot", "station_key": "endpoint:312052621"}
```
Another resolved one: `{"latitude": "41.73329", "longitude": "-50.39989", "timestamp": 1791933318, "talkgroup": 51598, "radio_id": 5152066, "repeater_id": 515206655, "streamid": 4521647, ..., "callsign": "4F0X", "name": "Rollydel ", "shortname": "Rollydel", "rptbaseid": 5152066, "rptcallsign": "4F0X", "talkgroup_name": "Freedom", "location_source": "hotspot", ...}` (note the coordinates `41.73329,-50.39989` are a **placeholder in mid-Atlantic**, reused by many unrelated hotspots).

### 2.3 radioid.net (verbatim)
```
user.csv:   RADIO_ID,CALLSIGN,FIRST_NAME,LAST_NAME,CITY,STATE,COUNTRY
            1023007,VA3BOC,Hans Juergen,,Cornwall,Ontario,Canada
users.json: {"users":[{"name":"Hans Juergen","fname":"Hans Juergen","surname":"","country":"Canada","callsign":"VA3BOC","city":"Cornwall","radio_id":1023007,"id":1023007,"state":"Ontario","has_valid_callsign":"1","has_valid_email":0,"account_unvalidated":0,"account_validation_status":"validated"}, ...
API:        {"count":1,"page":1,"pages":1,"per_page":200,"results":[{"account_unvalidated":0,"account_validation_status":"validated","callsign":"W9SEM","city":"Indianapolis","country":"United States","fname":"Idhs","has_valid_callsign":"1","has_valid_email":1,"id":3118573,"lastheard":"Tue, 13 Oct 2026 23:13:41 GMT","lastmaster":"3104","lastsource":"311857399","lasttg":"3118573","name":"Idhs","radio_id":3118573,"state":"Indiana","surname":""}]}
rptrs.json: {"rptrs":[{"locator":110601,"id":110601,"callsign":"WB6ECE","city":"Bonny Doon","state":"California","country":"United States","frequency":"440.58750","color_code":2,"offset":"+5.000","assigned":"Peer","ts_linked":"TS1 TS2","map_info":"","map":0,"ipsc_network":"Brandmeister","trustee":["KA6SQG"],"status":"ACTIVE","talkgroups":[]}, ...
```
(`user.csv` contains personal names and city; HamAlert must not republish name/city beyond what it already shows for other sources.)

### 2.4 YSF: EUROPELINK JSON (verbatim, `raw/other-dv/europelink_*.json`)

`active.json` (poll at 23:18:31, 23:18:52, 23:19:13; same PTT session; `startPTT2` is a bogus counter formatted as a 1970 date):
```json
[{"Call":"JR5BUA","DMR":"false","Gateway":"YSF-ARF","device":"Peanut","lastHeard":"Oct 13, 2026, 11:18:31 PM","lat":"","loggedInTime":"May 6, 2026, 7:04:48 PM","lon":"","mode":"2","options":"0","room":"ARG-NETW","startPTT":"Oct 13, 2026, 11:18:27 PM","startPTT2":"Jan 1, 1970, 1:00:03 AM"}]
```
`lastheard.json` row: `{"call":"LU8HEG","dgid":"0","fusionmode":"2","lastseen":"Oct 13, 2026, 11:11:53 PM","options":"0","room":"ARG-NETW"}`
`whois.json` row: `{"Call":"WP3JM","Gateway":"US-LNK","appVersion":"","clientname":"TreeHouse Connector","device":"FTM-100D","locator":"JO22MB","loggedInTime":"May 6, 2026, 7:04:42 PM","options":0,"room":"US-MIAMI","rxfreq":"000000000","txfreq":"000000000","ysfversion":"GATEWAY"}`
`rooms.json` row: `{"room":"WORLD","country":"wl","description":"World chat room","dgid":"3"}`
`messages.json` row: `{"call":"EA4IOG", "datetime":"Jul 22, 2026, 8:03:13 AM", "destination":"ALL", "message":"TEST message"}`

### 2.5 YSF: G4KLX YSFReflector log lines (NOT live; reconstructed from the DG9VH dashboard parser `raw/other-dv/ysfdash_functions.php`, lines 140 to 215)

```
M: 2016-06-24 11:11:41.787 Currently linked repeaters/gateways:
M: 2016-06-24 11:11:41.787     DM0GER    : 217.251.59.165:42000 5/60
M: <ts> Adding <GATEWAYCALL> (<ip:port>)          / Removing <GATEWAYCALL> ...
M: <ts> Received data from <SRC 10 chars> to <DST 10 chars> at <GATEWAY 10 chars>   (FICH ... optional)
M: <ts> Received end of transmission / watchdog has expired ...   (parser also treats "end of", "ended RF data", "ended network" as TX end)
```
Fixed-width, no duration field (the dashboard computes it from the next end line), local server time (the parser calls `convertTimezone`).

### 2.6 aprs.fi (verbatim from the API page; no key, so not fetched live)
```json
{"command":"get","result":"ok","what":"loc","found":1,"entries":[{"name":"OH7RDA","type":"l","time":"1267445689","lasttime":"1270580127","lat":"63.06717","lng":"27.66050","symbol":"\/#","srccall":"OH7RDA","dstcall":"APND12","phg":"44603","comment":"\/R,W,Wn,Tn Siilinjarvi","path":"WIDE2-2,qAR,OH7AA"}]}
{"command":"get","result":"ok","found":2,"what":"msg","entries":[{"messageid":"1271366","time":"1272453795","srccall":"OH5KUY-4","dst":"OH2TI","message":"foo bar"}]}
```
APRS-IS raw line (from the spec, TNC2 format): `OH7RDA>APND12,WIDE2-2,qAR,OH7AA:!6304.03N/02739.63E#PHG4460/R,W,Wn,Tn Siilinjarvi` (illustrative; derived from the aprs.fi example above, not captured).

---

## 3. Field inventory

### 3.1 BrandMeister `LH` payload (706 events, 313 sessions, one minute)

| Field | Type | Presence | Examples | Notes / quirks |
|---|---|---|---|---|
| `Event` | string | 100% | `Session-Start` (175), `Session-Update` (108), `Session-Stop` (423) | Stops are ~1.5x sessions because of duplicates. 138 sessions seen only as a stop (we joined mid-session). |
| `SessionID` | UUID string | 100% | `1698f935-...` | Idempotency key; shared by start, updates and both stops. |
| `Start` / `Stop` | int, epoch **seconds UTC** | 100% | `1791933132` / `0` | `Stop:0` while in progress. Duration = `Stop-Start`; start of Stop events can be the same second (duration 0). Median stopped-session duration 4 s, 27% last 0 to 1 s; 16-quantile list `0,0,0,0,1,2,3,3,4,6,8,11,15,23,35,84`. |
| `SourceID` | int | 100% | `3118573`, `7221578`, `460411` | The talker DMR ID, usually 7 digits (247/282), but 4/5/6 digits also occur (bridges, parrot, TG-as-source, network IDs). |
| `SourceCall` | string | **65.7%** non-empty (34.3% empty) | `W9SEM`, `LU8HEG`, `""` | BM-side lookup of SourceID in the RadioID DB. Empty means BM could not (or did not) resolve it; of 72 empty-call stopped sessions, 37 had a 7-digit ID that **is** in radioid.net `user.csv` (BM's resolution lags the daily DB or filters), the rest are non-user IDs. No case where BM and radioid.net disagreed. |
| `SourceName` | string | same as `SourceCall` | `Idhs`, `Wolfi` | First name (from RadioID). Personal data; not needed. |
| `TalkerAlias` | string | 61.5% | `W9SEM Indiana IDHS AUXCOMM `, `LU8HEG` | Free text from the radio's talker alias; trailing spaces; can be arbitrary text; for YSF bridge equals callsign. |
| `DestinationID` | int | 100% | `91`, `3118573`, `262810`, `31531`, `9990` | **Talkgroup (group call) or target DMR ID (private call)**. Length mix in group calls: 1 to 7 digits (e.g. 5-digit `31531`, 6-digit `262810`, 7-digit `3118573`). |
| `DestinationName` | string | 29.2% non-empty overall (78/250 group sessions) | `Argentina Network`, `Pegasus-Projekt` | BM-side TG name when known. The authoritative name list is `/v2/talkgroup`. 7-digit "TGs" such as `3118573` have no name. |
| `DestinationCall` | string | 5% | `""` | Callsign of private-call target; almost always empty. |
| `CallTypes` | string[] | 100% | `["Group","Voice","Call"]` (640), `["Voice","Call"]` (66) | **Absence of `"Group"` = private (unit to unit) call.** No literal `"Private"` value was seen. Other values (SMS, Data, ...) exist per the dashboard code (`SDS`). |
| `SessionType` | int | 100% | `7` (640), `5` (66) | `7` = group voice, `5` = private voice in the sample (inferred; perfectly co-varies with `"Group"` in `CallTypes`). |
| `Slot` | int | 100% | `0` (562), `1` (74), `2` (70) | Timeslot; 0 for non-TDMA links (hotspot MMDVM sets 0 here, YSF, apps). |
| `LinkName` | string | 100% | `MMDVM Host` 441, `Open DMR Terminal` 61, `Motorola IP Site Connect` 52, `YSF Client` 51, `Parrot` 46, `Homebrew Repeater` 38, `Hytera Multi-Site Connect` 13, `CBridge CC-CC Link` 4 | Type of the attached device/protocol. The dashboard JS also lists `SmartPTT Bridge`, `WIRES-X Link`, `XLX Interlink`, `YSF Direct`, `Zello Link`, TETRA/Hytera RoIP. Filter out `Parrot`. |
| `LinkTypeName` / `LinkType` | string / int-or-"" | 100% | `Repeater`/`1` (544), `Application`/`""` (97), `""`/`3` (61), `Network`/`2` (4) | `LinkType` is **int or empty string** (mixed types). |
| `ContextID` | int or `""` | 100% (7.2% empty strings) | `311857399`, `310186`, `""` | The **repeater/hotspot ID** the audio came in on (6-digit repeater, 7-digit base, or 9-digit = 7-digit DMR ID + 2-digit ESSID suffix). Joins to `/v2/device/{id}`. Mixed int/str type (655 int, 51 str). |
| `LinkCall` | string | 62.7% non-empty | `W9SEM`, `REFLECTOR ` | Callsign of the link (device). For YSF clients the literal `"REFLECTOR "` (trailing space). Not the same as `SourceCall`. |
| `Master` | **string or int** | 100% | `"3104"`, `3104`, `"2622"` | BM master server id. Type flips between the two Stop events of one session. |
| `Route` | string or null | ~80% | `M48` (106), `M47` (153), `A2`, `R204077502`, `T2681134`, `null`, `""` | Internal routing label (M=master, R=remote?, T=terminal?). Opaque; ignore. |
| `RSSI`, `BER` | int | 100% | `0` mostly (RSSI non-zero on 162 events) | Non-zero RSSI seems to be a positive number (e.g. 47-ish in TGIF); units unclear. |
| `LossCount`, `TotalCount` | int | 100% | `1`, `524` | Packet stats; only meaningful on the "good" Stop (non-zero in 226 of 423 stops). |
| `State`, `FlagSet`, `ReflectorID` | int/null | 100% | `State` 2/1/null, `FlagSet` 0/1/3, `ReflectorID` always `0` | `ReflectorID` was 0 in 706/706 despite the name; DMR has no reflectors. |

Presence of top-level keys: all 28 keys present in every event (nulls/empty strings instead of absence).

### 3.2 BM directory (`/v2/device`, 32,537 devices)

`id` (int; 6-digit repeaters 2,918; 7-digit 12,612; 9-digit hotspots 17,007), `callsign`, `linkname` (28,765 MMDVM Host, 2,120 Homebrew Repeater, 884 Motorola IPSC, 750 Hytera MSC, ...), `hardware`, `firmware`, `tx`/`rx` (strings, MHz, 4 decimals; **tx is the repeater's transmit frequency**), `colorcode`, `status`, `lastKnownMaster`, `lat`, `lng`, `city` (often `"Town, GRID"`), `pep` (W), `agl` (m), `last_seen` (`"2026-10-13 22:55:54"`, UTC assumed, no tz), `website`, `description`, `priorityDescription`. A hotspot's `tx` is frequently `0.0000`; frequencies are self-declared.

### 3.3 TGIF `lastheard` (144 events, 36 streams, 40 s)

| Field | Type | Presence | Examples | Notes |
|---|---|---|---|---|
| `streamid` | int | 100% | `191749214` | Per-transmission key; each stream sent 1 to 9 events (`timestamp` advances while the user is talking), no explicit stop or duration. |
| `timestamp` | int epoch s | 100% | `1791933318` | Updated on each repeat; duration ~= last minus first for a stream. |
| `talkgroup` | int | 100% | `43389` | TG number. |
| `talkgroup_name` | string | 67% | `Freedom`, `SouthEast Link`, `vale dos sinos` | Missing on the anonymous duplicate. |
| `radio_id` | int | 100% (`0` on 37.5%) | `3120526`, `0` | `0` on the anonymous event. |
| `callsign`, `name`, `shortname` | string | 65% (those with `radio_id` != 0) | `N4LMC`, `SE-LINK ` | Trailing spaces in `name`. |
| `repeater_id` | int | 100% (`0` on anon) | `312052621` | 9-digit = radio ID + ESSID. |
| `rptbaseid`, `rptcallsign` | int/string | 65% | `3120526`, `N4LMC` | Hotspot base ID and callsign. |
| `latitude`, `longitude` | **string** | 100% | `"34.982  "`, `"41.73329"` | Padded with spaces; `location_source` `hotspot` 116, `missing` 26, `profile` 2. **Placeholder coordinates** common (`41.73329,-50.39989`, `38.0000,-095.0000`). Do not use as the operator position. |
| `rssi`, `ber` | int | 100% | `0` (129), `47` (12), `48`, `49` | |
| `security_level`, `admin`, `station_key` | str | 100% | `"1"`, `"no"`, `"endpoint:312052621"` | Account/admin flags; ignore. |

### 3.4 radioid.net `user.csv` (314,913 rows)

`RADIO_ID` (7 digits, all rows), `CALLSIGN` (never empty; 291,626 distinct; **20,698 callsigns own more than one ID**, max 70 for `ZL6AREC`, 61 for `N0SZ`), `FIRST_NAME`, `LAST_NAME` (mostly empty), `CITY`, `STATE`, `COUNTRY`. Three rows look like repeater/club suffixes (`GB7EE-L`, `GB7EU-L`, `GB3HB-L`). So **callsign to ID is one-to-many; ID to callsign is many-to-one**: matching a user's trigger by callsign must expand to a set of IDs (or, as BM does, resolve ID to callsign upstream and compare callsigns).

### 3.5 EUROPELINK (YSF) JSON

| Endpoint | Field | Notes |
|---|---|---|
| `lastheard` (15 rows, 100%) | `call`, `room`, `dgid` (string, "0" in all 15), `fusionmode` (string, "2" in all), `lastseen`, `options` | `lastseen` is `"Oct 13, 2026, 11:11:24 PM"` (en-US, 12 h, **UTC** by comparison with `date -u`; no tz marker, no seconds precision issues but also no duration). Same callsign repeated (LU8HEG x3) as separate key-ups. |
| `active` (0 or 1 rows) | `Call`, `Gateway` (e.g. `YSF-ARF`), `device` (`Peanut` = app, or radio model), `room`, `mode`, `DMR` ("false"), `startPTT`, `lastHeard`, `loggedInTime`, `lat`, `lon`, `options`, `startPTT2` | `startPTT` is the key-up time; `lastHeard` advances ~every 21 s as I polled (liveness). `startPTT2` is garbage (1970 + elapsed). The only record that exposes the **start time** of a QSO. |
| `whois` (243 rows) | `Call`, `Gateway`, `room`, `device`, `clientname`, `locator`, `ysfversion`, `rxfreq`, `txfreq`, `loggedInTime`, `appVersion`, `options` | `device` empty on 167/243; names include `FT-2D`, `FT-70D`, `FTM-100D`, `FTM-300D`, `FTM-500D`, `FT-5D`. Frequencies are `"000000000"` for gateways. `ysfversion` values `''`(179) `GATEWAY`(41) `YSFG-EA`(18) `Fusion2X`(2) `YSFG-MMDVM`(1). |
| `rooms` | `room`, `country` (ISO or `wl`), `description`, `dgid` (string) | Room names like `WORLD`, `ENGLISH`, `ARG-NETW`, `EA7URC`; each room has a DG-ID (e.g. WORLD=3, ENGLISH=10, DUTCH=17). |

### 3.6 aprs.fi / APRS-IS fields

aprs.fi location entry: `class`, `name`, `showname`, `type` (`a` AIS, `l` station, `i` item, `o` object, `w` weather), `time` (first at this position), `lasttime`, `lat`, `lng`, `course`, `speed` (km/h), `altitude` (m), `symbol`, `srccall`, `dstcall`, `comment`, `path`, `phg`, `status`, `status_lasttime`; message entry: `messageid`, `time`, `srccall`, `dst`, `message`. Timestamps are Unix seconds UTC, strings. APRS-IS raw: `SRC>DST,PATH,qAx,IGATE:payload` with payload types by first char (`!` `=` `/` `@` position, `:` message, `;` object, `)` item, `>` status, `T#` telemetry, `_` weather).

---

## 4. Semantics and quirks

### 4.1 What counts as a "spot" for DMR

- A BM `LH` event stream is a **call log of the whole network**, not a log of "CQ" calls. There is no equivalent to D-STAR UR=CQCQCQ, so every group call is potentially an alert-worthy "X is on the air on TG Y". Required filters before emitting a HamAlert event:
  1. **Drop private calls**: `"Group"` not in `CallTypes` (or `SessionType != 7`). Private calls are addressed to an individual DMR ID and are not public broadcasts. In my sample 32 of 282 stopped sessions (11%).
  2. **Drop non-human links**: `LinkName` = `Parrot` (46 events), echo/test TGs (9990 Parrot, 9998/9999 test, 4000 disconnect, 98 radio test), and calls with `SourceCall==""` that cannot be matched to a callsign.
  3. **Drop kerchunks**: duration < ~2 s (27% of sessions are 0 or 1 s). D-STAR in HamAlert already carries `durationSeconds`; keep it in DMR too.
  4. Optionally treat TG 9/local (`DestinationID` 9, 1, 2, 8) as local-only (not a network-wide call), and `Slot`.
- Per-call dedupe: `SessionID` plus first Stop. A conversation of 10 short overs creates 10 sessions; the D-STAR rules for debouncing the same callsign (user-configurable "min seconds between alerts") should be reused.
- **Start vs stop**: BM emits `Session-Start` immediately and `Session-Stop` when the PTT is released. For D-STAR the HamAlert event is a key-off with a duration. For DMR the stop event is the one carrying duration; the start event can give faster alerts but with unreliable `SourceCall` (measured: **85.1% of `Session-Start` events have an empty `SourceCall`**, vs 5.6% of updates and 20.6% of stops, so BM resolves the callsign only after the call has started; a start-triggered alert would mostly have no callsign) and a possible 0-s kerchunk. Recommendation: emit on **stop** (parity with D-STAR) and optionally on start for "long transmission" lag.
- TGIF: emits `lastheard` per stream repeatedly; derive duration from `max(timestamp)-min(timestamp)` per `streamid` and close the stream after N seconds without an update (no stop event). Anonymous duplicate events (`radio_id:0`) should be ignored if a resolved event with same `streamid` exists.

### 4.2 Time

- BM `Start`/`Stop` epoch seconds, UTC, **second resolution**, clock of the BM master. Event receipt delay was under 1 s. `Stop-Start` often disagrees by 1 s between the two Stop copies (`1791933164` vs `1791933163`).
- TGIF `timestamp` epoch seconds (server). EUROPELINK strings `"Oct 13, 2026, 11:11:24 PM"` en-US 12 h, UTC (verified against `date -u` 23:18). radioid.net `lastheard` is RFC 1123 GMT. BM `/v2/device` `last_seen` is `"YYYY-MM-DD HH:MM:SS"` without tz (matches UTC). G4KLX YSFReflector log lines carry server local time (the dashboard converts via a configured timezone).
- aprs.fi times are Unix seconds UTC strings; APRS-IS packets carry no timestamp (receive time = event time) unless the payload has a DHM/HMS stamp.

### 4.3 Identity

- **DMR ID versus callsign**: the unit of identity is the 7-digit RadioID. Resolution happens either upstream (BM `SourceCall`, TGIF `callsign`) or via `user.csv`. Upstream resolution is incomplete/lagging (BM left 34% empty). One person can have several IDs (up to 70 per callsign, 7% of callsigns have >1), and one ID maps to exactly one callsign. IDs can be reassigned and re-registered (callsign changes), so a nightly diff is needed. Hotspot ESSIDs append 2 digits to the DMR ID (`311857399` = `3118573` + `99`), and `ContextID`/`repeater_id` are those 9-digit device IDs.
- A callsign in `SourceCall` is **not validated** as a licensed callsign; it is whatever the RadioID DB has (including suffix-style entries like `GB7EE-L`). The HamAlert pipeline should still run its usual callsign normalization/DXCC lookup.
- Talkgroup identity: `DestinationID` is the TG number, **scoped to the network** (BM TG 91 is not TGIF TG 91). The name is optional (BM `/v2/talkgroup` has 1844 names; TGIF names come inline as `talkgroup_name`). So the group key must include the network: `brandmeister:91`, `tgif:43389`.
- YSF identity: callsigns are 10 characters (can contain `/` and `-` suffixes, e.g. a radio-ID-in-callsign). The listening place is a **room/reflector name** (`ARG-NETW`) with a DG-ID; the same reflector can carry multiple rooms. Reflector ids are 5-digit in Pi-Star list (`00006;GR-HELLAS Zone A`) and `FCS00100`-style for FCS.
- NXDN: 16-bit-ish NXDN IDs from radioid.net `nxdn.csv`; reflector number (e.g. 12, 14, 91) + TG. P25: 7-digit RadioID, reflector/TG number (e.g. 10100). M17: callsign native; reflector `M17-XXX` + module letter (`M17-002 A`), CAN (channel access number).

### 4.4 Privacy and what is not a spot

- Over-the-air group calls are public by nature (TGIF terms: contacts over radio are "public domain"), but BM and TGIF do not publish their data under an explicit open license. The BM payload carries first names (`SourceName`) and free-text `TalkerAlias`; TGIF carries `name`, hotspot lat/lon (often fuzzed or placeholder). **Do not republish names/locations**; use callsign + talkgroup + duration.
- Private calls (`SessionType 5`, no `Group` call type) and data/SMS (`SDS`) must be excluded; they are person-to-person. Also exclude hotspots flagged `lat:0` as locations.
- aprs.fi: rights/terms restrict archival; APRS position data is public RF but moving to the product as a push alert of "X is at lat/lon" is a higher privacy bar than "X was on TG Y"; offer opt-in.
- Reflector `whois` (EUROPELINK) lists *connected* clients, which is presence, not activity. Use only for "linked" events (parity with D-STAR `dvEvent:"linked"`) and only if the operator agrees.

### 4.5 Mode vocabulary actually observed

- BM `LinkName` (8 values observed): `MMDVM Host`, `Open DMR Terminal`, `Motorola IP Site Connect`, `YSF Client`, `Parrot`, `Homebrew Repeater`, `Hytera Multi-Site Connect`, `CBridge CC-CC Link`. `CallTypes` combos: `Group,Voice,Call`; `Voice,Call`. `Event`: `Session-Start`, `Session-Update`, `Session-Stop`.
- EUROPELINK `fusionmode`: `"2"` in all rows (Yaesu DN/VW/FR mode code: `0` DN, `1` VW, `2` FR per YSF spec; not verified), `DMR:"false"`.
- HamAlert mode for these sources: `dmr`, `ysf`, `nxdn`, `p25`, `m17`, `aprs`. The existing mode filter in `config_clean.js` is `all/cw/phone/data` (`modeValues`), so digital voice needs a new category (or map to `phone`) in trigger matching; dstar.md should be checked for what was decided.

### 4.6 Volume summary

| Source | Rate | Notes |
|---|---|---|
| BM LH (all events) | ~12/s (706/60 s) | after filters (group, callsign, >=2 s, no parrot): ~3/s, ~10k/h |
| TGIF `lastheard` | ~3.6/s events, ~0.9 streams/s | after dedupe by stream: ~3k streams/h |
| EUROPELINK (YSF) | ~15 `lastheard` rows per 8 min in the evening, 0 to 1 active | tiny; one reflector of hundreds |
| APRS-IS full feed | thousands of packets/s | must be filtered server-side to named calls (`b/`) or types |
| radioid.net | 315k rows, daily | fits in memory (~25 MB as ID to callsign map) |

---

## 5. Related reference data

| Dataset | URL | Format / size | Cadence | Sample |
|---|---|---|---|---|
| RadioID DMR users | `https://radioid.net/static/user.csv` | CSV 17 MB, 314,913 rows | daily ~05:00 UTC | `1023007,VA3BOC,Hans Juergen,,Cornwall,Ontario,Canada` |
| RadioID users JSON | `https://radioid.net/static/users.json` | JSON 85 MB | daily | see 2.3 |
| RadioID repeaters | `https://radioid.net/static/rptrs.json` | JSON 6 MB | daily | `{"locator":110602,"callsign":"WB6YES",...,"frequency":"447.30000","color_code":3,"offset":"-5.000","ipsc_network":"BrandMeister",...}` |
| RadioID NXDN | `https://radioid.net/static/nxdn.csv` | CSV 963 KB | daily | `1,KB3AWQ,John,,Williamsport,Pennsylvania,United States` |
| RadioID single-user API | `https://radioid.net/api/dmr/user/?id=` or `?callsign=` | JSON | live | includes `lastheard`, `lasttg`, `lastmaster` |
| BM talkgroups | `https://api.brandmeister.network/v2/talkgroup` | JSON object id to name, 1844 | live | `"91":"World-wide","92":"Europe","262":"Deutschland","3100":"USA Bridge"` |
| BM devices | `https://api.brandmeister.network/v2/device` | JSON array 9.6 MB, 32,537 | live | see 3.2 |
| BM masters | `https://api.brandmeister.network/v2/master` | JSON | rarely | `{"id":2302,"country":"CZ","address":"80.250.21.206"}` |
| YSF reflectors | `https://www.pistar.uk/downloads/YSF_Hosts.txt` | text `;` separated, 1570 | daily | `00009;GB-CQ-UK;Main Reflector;149.102.158.76;42200;000;` |
| FCS rooms | `https://www.pistar.uk/downloads/FCS_Hosts.txt` | text, 3002 | stale (header says March 2025) | `FCS00101;Deutschland;FCS001 - Deutschland;;;` |
| NXDN / P25 / M17 reflectors | `.../NXDN_Hosts.txt`, `P25_Hosts.txt`, `M17_Hosts.txt` | TSV, 407 / 441 / 121 | daily (generated from DVRef) | `M17-002\turf001.cumbriacq.com\t17000` |
| DMR master list | `.../DMR_Hosts.txt` | text, 1275 | daily | |
| Wires-X room list | `.../WiresX_Hosts.txt` | 502 at test time | | |
| DVRef (upstream registry) | `https://dvref.com/api/v2/{ysf,nxdn,p25,mrefd}/reflectors/` | JSON | | **403 Cloudflare to scripts**; AUP at `/aup/` unreadable. Pi-Star's mirror is credited "Reflector data provided by DVRef". |
| EUROPELINK rooms | `https://europelink.pa7lim.nl/api/rooms.json` | JSON | | `{"room":"ENGLISH","country":"en","description":"English chat room","dgid":"10"}` |
| APRS-IS filter spec | `https://www.aprs-is.net/javAPRSFilter.aspx` | HTML | | |
| aprs.fi API spec | `https://aprs.fi/page/api` | HTML | | |

Also needed: the existing DXCC/callsign tables (already in `normalizeSpot`) to turn `SourceCall` into country; and the existing band tables. For DMR there is **no per-call frequency** in the feed: frequency must be derived from the device (`ContextID` to `/v2/device/{id}` `tx`, or `rptrs.json` `frequency`), which is empty or `0.0000` for many hotspots (and meaningless for a call that arrived via the network from another place). Band is therefore usually "unknown" for DMR, YSF, and for most calls via reflectors.

---

## 6. Proposed mapping

### 6.1 Shared base: `Spot` fields (what each source can fill)

| Base field | D-STAR (from dstar.md) | DMR (BM / TGIF) | YSF (reflector dashboards) | NXDN / P25 / M17 | APRS |
|---|---|---|---|---|---|
| `callsign` | `MY` | `SourceCall` / TGIF `callsign` (else resolve `SourceID` via RadioID; else drop) | 10-char src call (`Call`, `call`) | callsign (M17); resolve ID for NXDN/P25 | `srccall` / packet source (with `-SSID`) |
| `spotter` | gateway/RPT | the receiving device callsign (`LinkCall`, TGIF `rptcallsign`), optional | gateway callsign (`Gateway`, `at <GW>`) | gateway | igate (last `qAR,IGATE` in path), optional |
| `frequency` | optional | optional, derived from device directory; usually absent | usually absent | usually absent | none (APRS freq is only in some comments) |
| `band` | guess/label | derived from `tx` of the device if present, otherwise unknown (never invent) | unknown | unknown | unknown |
| `mode` | `dstar` | `dmr` | `ysf` (sub-mode FR/DN/VW in extension) | `nxdn`/`p25`/`m17` | `aprs` |
| `time` | key-off UTC | `Stop` (or `Start` for start events), epoch s | `lastseen` / `lastHeard` | | packet arrival time or aprs.fi `time` |
| `comment` | TX message | `TalkerAlias` (optional; strip if it equals callsign) | none (DT text messages exist in `messages.json`) | | packet comment |
| `source` | `quadnet`, `ircddb`, `dstarusers` | `brandmeister`, `tgif` | `europelink`, `<reflector>` | `<dashboard>` | `aprs-is`, `aprsfi` |
| `rawText` | synthesized | synthesized from fields (there is no text) | synthesized | | raw TNC2 line (native) |

### 6.2 Proposed `DigitalVoiceEvent` extension (superset of the D-STAR extension; names aligned with dstar.md)

Common to D-STAR, DMR, YSF, NXDN, P25, M17:

| Field | Type | D-STAR | DMR | YSF | Notes |
|---|---|---|---|---|---|
| `dvEvent` | `"active" \| "linked"` | active/linked | `active` only (a link is a static-TG config, not an event) | `active`, `linked` (from `whois`) | enum extended by `"unlinked"` later if wanted |
| `dvNetwork` | string | `quadnet`/`ircddb`/`dstarusers` (could keep in `source`) | `brandmeister`/`tgif`/... | `europelink`/... | **New, needed because a talkgroup/room id is only unique per network**. Keeps `source` for the feed and `dvNetwork` for the namespace. |
| `dvNode` | string | `CALL-M` | device callsign + id: `K6MBY` / numeric `310186` (use `dvNodeId` for the number) | gateway callsign | The place the audio entered. Optional. |
| `dvNodeId` | string | n/a | `ContextID` / `repeater_id` (9-digit hotspot, 6-digit repeater) | n/a | Join key to the device directory (freq, location). |
| `dvGroup` | string | Smart-group name (rare) | **talkgroup id**, e.g. `"91"` (always present for group calls) | **room name / DG-ID** (`ARG-NETW`, `dgid` 0 to 99) | The "where is the conversation". For D-STAR the equivalent is mostly `dvReflector+module`. |
| `dvGroupName` | string | | `DestinationName` / `talkgroup_name` / `/v2/talkgroup` | room description | optional free text |
| `dvReflector` | string | `REF030-C` | n/a (but BM bridges to XLX: no field) | reflector id/name when the source is a YSF/FCS reflector (`GB-CQ-UK`, `FCS001-05`) | Keep the D-STAR field; a YSF "room" belongs in `dvGroup` and the reflector in `dvReflector`. |
| `dvDuration` | float s | QuadNet always | `Stop-Start` (BM, integer) / derived (TGIF) | derived from `startPTT`/`lastHeard` if available, else absent | |
| `dvSuffix` | string | radio suffix | n/a | n/a | do not map |
| `dvTargetKind` / `urKind` | enum | `cq`/`link`/`area`/`group` | always `group` (private is dropped) | `all` (dest `ALL`) | D-STAR's CQ-vs-directed concept does not exist for DMR/YSF: all emitted events are broadcast-type. |
| `dvPrivate` | bool | n/a | internal: true when dropped | n/a | not emitted; documents the filter |

Mode-specific extensions (put in a sub-object per mode, to avoid pollution of the shared one):

| Mode | Fields |
|---|---|
| `dmr` | `dmrId` (int, talker), `dmrSlot` (0/1/2), `dmrColorCode` (from device), `dmrMaster` (BM master id, int-normalized), `dmrLinkType` (`MMDVM Host`, `Homebrew Repeater`, `YSF Client`, ... normalized enum), `dmrSessionId` (UUID, idempotency), `talkerAlias`, `dmrIdResolved` (bool: callsign from upstream vs RadioID DB), `lossPct` (from `LossCount/TotalCount` of the second stop) |
| `ysf` | `dgId` (0 to 99), `ysfMode` (DN/VW/FR/DN-narrow...), `radioModel` (`FT-70D`), `locator`, `ysfGateway` |
| `nxdn` | `nxdnId`, `ran` |
| `p25` | `p25Nac`, `p25Wacn`, radio ID |
| `m17` | `m17Can`, `m17Dst` (`@ALL`), module letter in `dvReflector` |
| `aprs` | `lat`, `lng`, `symbol`, `path`, `dstcall`, `ssid`, `packetType` (`position`/`message`/`object`/`status`/`weather`), `messageText` (for `:` messages), `speed`, `course`, `altitude`, `igate` |

APRS is a different *kind* of spot than the digital-voice family (a station report, not a transmission with a duration), so it should be its own Spot kind (`PositionReport`) sharing the base (`callsign`, `time`, `comment`, `source`, `rawText`) and *not* `DigitalVoiceEvent`. APRS messages addressed to a callsign are a notification-style use case ("tell me when someone messages me") that is a feature of the APRS-IS login/filter (`message packets addressed to the client` are delivered by default on 14580), not of a spot feed.

Example (DMR):
```json
{"source":"brandmeister","mode":"dmr","callsign":"W9SEM","time":"2026-10-13T23:12:44Z",
 "spotter":"W9SEM","frequency":null,"band":null,"comment":"W9SEM Indiana IDHS AUXCOMM",
 "dvEvent":"active","dvNetwork":"brandmeister","dvNode":"W9SEM","dvNodeId":"311857399",
 "dvGroup":"3118573","dvGroupName":null,"dvDuration":31,
 "dmr":{"dmrId":3118573,"dmrSlot":0,"dmrMaster":3104,"dmrLinkType":"mmdvm_host","dmrSessionId":"1698f935-f9f0-4291-88f9-fd75b9b2569e","lossPct":0.2}}
```
Example (YSF):
```json
{"source":"europelink","mode":"ysf","callsign":"JR5BUA","time":"2026-10-13T23:18:31Z",
 "spotter":"YSF-ARF","dvEvent":"active","dvNetwork":"europelink","dvReflector":"EUROPELINK",
 "dvGroup":"ARG-NETW","dvNode":"YSF-ARF","dvDuration":null,"ysf":{"dgId":0,"radioModel":"Peanut"}}
```

### 6.3 Backend enrichment needed

- DMR: ID to callsign fallback via `user.csv` (daily), group name via `/v2/talkgroup` (hourly), device freq/band/location via `/v2/device` (hourly; 9.6 MB), TG-name display, bridge/test TG denylist, callsign-to-ID expansion for triggers, `LinkName` normalization, Master int/str normalization, `Start/Stop` to ISO, dedupe by `SessionID`, merge of the two Stop copies (prefer the one with `TotalCount>0` and a non-null `Route`).
- YSF: reflector list refresh, room-to-DG-ID map, UTC-parse of en-US dates, dedupe by (call, room, `lastseen`), and a "close" heuristic (no stop event).
- All: DXCC/country from callsign (existing), mode label for UI, and a throttle (see 7) since a single popular callsign can generate dozens of sessions per hour.

---

## 7. Open questions and risks

1. **Permission and stability (blocking for DMR).** The BM and TGIF Socket.IO feeds are undocumented dashboard back-ends; BM has already changed the protocol at least once (the community scripts' `/lh/socket.io` path now yields no events, current is `/lh`). There is no published API terms for the feed. Before shipping, ask BrandMeister (the BM dev team / Slack / forum) and TGIF (support@tgif.network) for explicit permission, a stable endpoint and a preferred User-Agent. Without it the integration can break or be blocked at any time. The documented `/v2` REST (device/talkgroup/registry) is stable but has no events; the authenticated API v2 keys cover only account/device management.
2. **Volume and relevance.** ~10k qualifying DMR key-ups per hour from BM alone; every group call is an event. HamAlert triggers for DMR should require at least one of: callsign, DMR ID, talkgroup, or DXCC, and not allow "any DMR spot" (the equivalent of "any D-STAR CQ" would be too noisy). Decide on per-trigger debounce (e.g. one alert per callsign per N minutes) and a per-source ingest rate cap. The DMR `dvGroup` filter ("tell me when anybody talks on TG 91 / TG 3100") is a new trigger dimension that D-STAR did not need.
3. **Start vs stop semantics.** D-STAR spots are emitted on key-off with duration. For DMR a "call in progress" notification (on start) is more useful to chase a station but yields kerchunk noise and missing callsigns; need a product decision. Same for YSF where only polling reveals start (`startPTT`).
4. **Callsign resolution gap.** BM leaves ~34% of sessions without `SourceCall` (some resolvable by `user.csv`, some are infrastructure/bridge IDs). Decide: drop vs resolve locally. Also a person with several DMR IDs (7% of callsigns) and callsign changes (stale cache). Also unvalidated callsigns (`GB7EE-L`) and 4 to 6 digit "users" (bridges).
5. **Private-call exclusion is inferred**, not documented: `"Group"` absent from `CallTypes` and `SessionType:5`. I observed 66 such events, all with `Voice,Call`; I never saw a `SessionType` other than 5/7 or any SMS/data calls in 60 s. Confirm with BM.
6. **Frequency/band is mostly unknown** for digital voice (network-delivered audio, self-declared hotspot frequencies, `0.0000` placeholders, TGIF placeholder coordinates). The HamAlert band filter will not work; either exclude DV spots from band triggers or add `bandIsGuessed`/`bandUnknown`. Same applies to D-STAR but worse for DMR because the same TG is heard on every band simultaneously.
7. **YSF coverage is a patchwork.** Only reflector operators who publish JSON (EUROPELINK) or a dashboard are readable; there is no central feed. Candidate approaches: (a) integrate EUROPELINK only (one large multi-mode reflector, includes DMR/D-STAR/NXDN bridges), (b) partner with reflector operators to push webhooks, (c) rely on BM's YSF bridge (already visible in the BM feed). The EUROPELINK API is custom and can change; time zone is implicit UTC; no ids or durations. DVRef (the registry) is Cloudflare-protected, so reflector lists need a mirror (Pi-Star) or a partnership.
8. **NXDN/P25/M17:** no data path today; defer. The generic `DigitalVoiceEvent` accommodates them without schema change if an operator feed appears (callsign, network, group, node, duration).
9. **APRS:** needs a decision on product shape (separate Spot kind vs not at all). Streaming requires APRS-IS (TCP) with server-side filters; I could not test it (blocked). aprs.fi API is unsuitable for server-side alerting by its own terms. Position privacy and the volume of the full feed are the main risks; objects/items/weather change the semantics of `callsign`.
10. **Data minimization:** do not store or display `SourceName`, `city`, `lat/lon` of hotspots, or `TalkerAlias` verbatim unless the product explicitly wants it (they are personal data under GDPR; TGIF's own policy invokes legitimate interest for audio). Keep `callsign`, TG/room, network, duration.
11. **Schema questions for the designers:** (a) one `mode: "dmr"` vs `mode: "dv"` + `dvProtocol`; (b) is `dvNetwork` needed in addition to `source` (my recommendation: yes, for TG namespace); (c) store TG as string (BM TG ids up to 7 digits, YSF rooms are names, M17 are `@ALL`/module); (d) whether `dvReflector` and `dvGroup` stay mutually exclusive as in D-STAR (for YSF both can be present: reflector `EUROPELINK` + room `ARG-NETW` + `dgId`); (e) whether HamAlert should model *sessions* (start/update/stop) rather than flat spots so edits and completions can be tracked (the current spot model has no concept of an in-progress record and duration arrives later).
12. **Not verified:** the BM `searchHouse`/`join` room names beyond `everything`; RSSI units; `fusionmode` value meaning; whether TGIF emits a final event or `lastheard_backlog` after reconnect; APRS-IS live behaviour; DMR-MARC current state (legacy sites 404/502); Wires-X lists (502).
