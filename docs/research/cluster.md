# Source report: DX cluster (DXSpider / CC Cluster / AR-Cluster telnet networks)

Researched 2026-10-13 (UTC). Raw samples: `.../sources/raw/cluster/` (see "Evidence base" at the end). Scripts: `.../sources/scripts/cluster_analyze.py`, `cluster_comments.py`.

IMPORTANT LIMITATION: raw TCP/telnet is blocked in this environment, and the two production servers (`spider.ham-radio-deluxe.com:8000`, `spider.hb9on.net:8000`) are unreachable over HTTP too. I could NOT capture a live `DX de` line stream. Everything about the telnet line format is therefore derived from (a) the HamAlert parser itself, (b) verbatim third-party fixtures/docs (dh1tw/DX-Cluster-Parser README, DXSpider wiki, CC User manual, dj1yfk/cwclubspotter source), cross-checked by me against the column positions HamAlert assumes. Statistics about comments come from four HTTP mirrors of the same cluster network (about 1,077 unique spots, 2026-10-13 19:38-23:09Z). Mirrors give structured fields (and sometimes their own enrichment); they do not give the raw line, so where the mirror is not the telnet stream I say so.

---

## 1. Access

### 1.1 What HamAlert does today
- `cluster.js` (class `ClusterReceiver`): raw TCP via `reconnect-net`, `carrier` line splitter, decoded as **latin1** ("utf8 causes field widths to shift in the presence of non-ASCII characters").
- Config (`config_clean.js` `config.cluster[0]`): `source: 'cluster'`, two servers tried round-robin on each (re)connect: `spider.ham-radio-deluxe.com:8000`, `spider.hb9on.net:8000`; `login: "HB9DQM-4"` (callsign written followed by `\n`; no password, no post-login commands such as `set/dxgrid`, `set/ve7cc`, filters); `timeout: 300000` (5 min of silence on the socket => disconnect/rotate to next server; every received line, spot or not, resets the timer); `filterRegex: /\b(nil)\b/i` (drops spots whose comment contains the word "nil", i.e. "not in log"/no copy); `spotterFilterRegex: /^W3LPL$/i` (drops spots whose spotter is W3LPL); `solardataTargetUrlBase` for WCY forwarding to sotl.as.
- A commented-out `w3lpl.net:7373` entry with `set dx filter not skimbusted` / `set dx ext` also exists in config (inside the RBN block), showing the operators know about Skimmer-Busted filtering and the "ext" format.
- The same class is reused with `wwffMode: true` for `spots.wwff.co:7300` (WWFF spotline, a different dialect where the comment is `<ref> <mode> <text>`) and has a never-configured `modeSnr` mode (RBN style). Those are other agents' sources; noted here only because they share the parser.

### 1.2 Protocol / transport
- Plain telnet (TCP, typically port 7300, 7373, 8000, 23, 9000, ...). Server prints a banner, asks `login:` (callsign), sometimes `password:`; then the node streams every spot that passes the node's default + user filters. Streaming, no polling, no request/response; no sequence numbers, no spot ids, no resume. Lines end in `\r\n` (or `\n`); lines may contain a trailing BEL (`\x07`) when the user has `set/beep` (HamAlert strips `\u0007` from `rawText`).
- Rate: the cluster network as a whole is roughly 4 spots/minute for the human/web part in my sample (dxheat: 500 spots in 2h01m; dxsummit: 1000 in 3h31m, ~285/hour). RBN skimmer spots are NOT in these numbers (they are a separate feed on most nodes: `-#` suffixed spotters).
- Auth: callsign-only login; no API key. Nodes may block abusive callsigns; sysops expect a real callsign (HamAlert uses `HB9DQM-4`).
- Delivery semantics: at-most-once, no replay on reconnect. HamAlert has no catch-up; spots missed during a reconnect are lost. `sh/dx` can be used to backfill (not currently done).
- New/edited/deleted detection: **not possible**. A cluster spot is immutable and fire-and-forget; there is no edit, delete or "QRT" retraction message. The only identity is the content tuple (spotter, dx call, frequency, minute, comment). Duplicate spots across the several nodes in the network are suppressed by the nodes (DXSpider dupe-checks on a hash of frequency/call/time/spotter/comment), but identical re-spots by the same spotter minutes later are legitimately distinct spots.
- Protocols docs: DXSpider PC protocol wiki https://wiki.dxcluster.org/wiki/DXSpider_PC_Packet_Cluster_Protocol ; CC User manual (G4IFB) https://www.g4ifb.com/CC_User_Manual.pdf (section 1.2 on PC/CC11/CC61) ; DXSpider manuals http://www.dxcluster.org/main/ ; example parser https://github.com/dh1tw/DX-Cluster-Parser ; VE7CC page https://www.bcdxc.org/ve7cc/default.htm (unreachable from here).

### 1.3 HTTP mirrors used for sampling (all anonymous, read-only, used with a handful of requests)
| Mirror | Endpoint | Format | Max seen | Notes |
|---|---|---|---|---|
| DXSummit | `https://www.dxsummit.fi/api/v1/spots?limit=1000` | JSON array | 1000 | Has monotonic `id`, spot time with seconds. Mixes cluster spots with its own web spotters (suffix `-@`). Comment truncated to 30 chars. |
| DXHeat | `https://dxheat.com/source/spots/?a=500` | JSON array | 500 | `Nr` id, enrichment (band, mode, LoTW/eQSL, DXCC flag, locator). HTML entity-escaped comments. Fed from DXSpider via Redis (see the DXSpider `Local.pm` gist by DH1TW). |
| HamQTH | `https://www.hamqth.com/dxc_csv.php?limit=500` | `^`-separated CSV, no header, 200 lines (limit ignored above ~200) | 200 | 11 columns, comment up to 45 chars (not cut to 30). |
| Spothole | `https://spothole.app/api/v1/spots?limit=500&source=Cluster` | JSON array | 210 returned | Aggregator; `source: "Cluster"` is a telnet feed. Comment cut to 30 chars (same as telnet). Has its own mode inference with provenance (`mode_source`). |
| DXWatch | `https://dxwatch.com/dxsd1/dxsd1.php?f=0` | HTML page (JS-loaded) | n/a | Not usable as a data feed. |
| dxcluster.info | https://www.dxcluster.info | HTML directory of nodes | n/a | Telnet node directory only. |
Raw dumps of each are saved under `raw/cluster/`.

---

## 2. Raw record format

### 2.1 DXSpider / AR-Cluster / CC-Cluster "classic" line (what HamAlert's `cluster.js` parses)
Verbatim fixture (dh1tw/DX-Cluster-Parser README; I verified its column positions match HamAlert's `substring()` offsets exactly):

```
DX de UA3ZBK:    14170.0  UR8EW/QRP    POWER 2-GU81+SPYDER            1211Z
```

Five lines I reconstructed with HamAlert's own *emitter* (`notify/telnetconn.js`, which clones the Spider layout) from real spots seen today on the mirrors. They are NOT captured telnet bytes, but have identical geometry to the fixture above:

```
DX de KC9RNK:    21024.0  H49A         up 4.4                         2308Z
DX de EA3AWK:     7074.0  OK1WCF       FT8 JN00kx -> JO80             2306Z
DX de IU6HWW:    10136.0  VU2CPL       FT8 -20 dB 1835 Hz             2307Z
DX de SQ4O:       7144.0  HF0PAS       CQ from Arctowski (AN-010)-UP  2256Z
DX de K4CAE:     14082.5  AE0XJ        US-10308                       2307Z
```

Column map (0-based, the fixed-width layout `cluster.js` relies on; verified on the fixture):

| Cols | Width | Content | HamAlert handling |
|---|---|---|---|
| 0-5 | 6 | literal `DX de ` | `^DX de ` regex test |
| 6-25 | 20 | `SPOTTER:` then spaces then frequency, **frequency right-aligned to end at col 23**, cols 24-25 are spaces. So the first colon is at col 6+len(spotter). | `line.substring(6,26).split(':')` must give exactly 2 parts, else the line is dropped. Spotter = part[0].trim(), frequency = part[1].trim()/1000 (kHz -> MHz float). |
| 26-38 | 13 | DX callsign, left-aligned, 12 chars + 1 space | `substring(26,39).trim()` |
| 39-69 | 31 | comment, left-aligned, **max 30 chars**, +1 pad | `substring(39,70).trim()` |
| 70-73 | 4 | `HHMM` UTC | `HH:MM` string, no date |
| 74 | 1 | literal `Z` | ignored |
| 75-79 | 0-5 | OPTIONAL: space + 4-char spotter locator (e.g. ` JN47`, produced when the client did `set/dxgrid` / node config; Log4YM's regex shows `(?:\s+([A-Z]{2}\d{2}))?` after the `Z`) | ignored by HamAlert |
| end | | optional BEL `\x07` | stripped from `rawText` |

Quirks of this layout:
- Because it is positional, a comment containing multibyte UTF-8 shifts nothing only if read as latin1 (HamAlert does that). Non-ASCII occurs ("Spécial call" seen on two mirrors).
- Frequency is kHz with exactly one decimal on the classic line (100 Hz resolution). Frequencies >= 10,000,000 kHz (QO-100 `10489540.0`) are wider but still right-aligned, so they remain parseable; very long spotter calls (>~8 chars incl. SSID, e.g. `SM7XXX-12-#`) are fine as the node pads, but HamAlert's own emitter truncates the spotter to `16-len(freq)`.
- The DX call is cut to 12 chars; the comment is cut to 30 chars by the origin node on this format (see 3: full-length comments only exist in PC11/PC61/CC11).
- Time is minute resolution, no date, no seconds; HamAlert stamps `receivedDate = new Date()` on arrival, so there is no way to detect late-delivered (stale) spots.

### 2.2 Same spot as the node-to-node PC protocol
Standard (DXSpider wiki), caret-delimited, `^`-terminated, final `~`:
```
PC11^DXfreq^DXcall^date^time^comment-txt^user-rprt^origin-node^hops^~
PC61^DXfreq^DXcall^date^time^comment-txt^user-rprt^origin-node^user-ip^hops^~
```
- PC61 (originated by Lee Sawkins VE7CC) = PC11 + allows several decimals in the frequency + spotter IP.
- PC26 is the "merge" variant of PC11 (same fields, `spotter` and a blank hops field) used during DX database merges; PC92 is the newer routing/topology protocol (not spot-bearing).
- In PC11/PC61 the date is `DD-Mon-YYYY` and time `HHMMZ`, the comment is **not** limited to 30 chars (HamQTH shows up to 45).
- End users never see PC lines unless the node is peering. HamAlert is a user connection, so it only ever sees `DX de` lines (and CC11 if it asked for them).

### 2.3 CC Cluster / VE7CC "CC11" line (`set/ve7cc` on DXSpider; native on CC Cluster)
Activated per-user by `set/ve7cc` (DXSpider) - HamAlert's own telnet *server* emulates this command. Format is the PC11 shape with extra metadata, `^`-delimited, one line per spot. Verbatim example from dj1yfk/cwclubspotter (a producer, so only the 7 core fields are filled; the remaining extension slots are empty):
```
CC11^7021.4^DL2IAD^ 4-May-2020^1352Z^CW    12 dB  23 WPM  CQ^GM6DX^^^DJ5CW^^^^^^^^^^
```
Field order I can establish with confidence:
`0 "CC11"` `1 freq kHz (decimals)` `2 DX call` `3 date` `4 time "HHMMZ"` `5 comment (not truncated to 30)` `6 spotter` then extension slots. The extension slots, per the CC User manual's CC61 field list, are: hops remaining, RX-via node, origin node (`DJ5CW` above is in slot 9, i.e. after two empty fields following the spotter), spotter ITU / CQ zones, DX ITU / CQ zones, spotter state, DX state, spotter DXCC, DX DXCC, spotter grid, DX grid, DX lat/lon, **spot mode type** (manual vs skimmer/FT8), spotter IP, message timestamp. **I could not find a public document giving the exact position of each extension slot** (the CC User groups.io spec thread is JS-rendered; the DXSpider author's list says CC's extension fields drifted from the agreed order). Log4YM's CC11 regex (github.com/brianbruff/Log4YM) captures slots 6, 9, 13 and 15 as spotter / source / country / grid, but that is reverse-engineering by a third party and I flag it as unverified. Recommendation: treat anything after slot 6 as "extras, optional, vendor-specific".
- The date text varies: `09-NOV-2021` (manual), ` 4-May-2020` (cwclubspotter, space-padded).
- HamAlert's emitter outputs only `CC11^freq^call^DD-Mon-YYYY^HHMMZ^comment^spotter^` (7 fields + trailing caret). Note its use of `getHours()` / `getMinutes()` (server-local time, not UTC) and a zero-padded day.

### 2.4 HamAlert's own three output encodings (`notify/telnetconn.js`, user-facing telnet emulation)
Chosen by the user's `set/ve7cc`, `set/json` commands (default `classic`). `sh/dx` replays the last hour of that user's matched spots (max N, default 20).
1. classic: `sprintf("DX de %s  %-12s %-30s %sZ\r\n", spotterFreq, call[0..12], comment[0..30], time-without-colon)`; `spotterFreq = spotter[0..16-len(freq)] + ':' + pad + freq("%.1f" of MHz*1000)`. Comment for non-cluster sources is synthesized: `modeDetail` (pskreporter only) + `{snr}dB` + `{speed}wpm` + summitRef + wwffRef + iotaGroupRef (+ comment in ve7cc mode).
2. `ve7cc`: `CC11^%s^%s^%02d-%s-%04d^%02d%02dZ^%s^%s^` = freq(kHz,1dp), fullCallsign, date, time, comment, spotter (note: here `spot.receivedDate`, not `spot.time`, is used for date and time; classic uses `spot.time`).
3. `json`: `JSON.stringify(hamutil.makeSpotParams(spot))` + `triggerComment`; keys: fullCallsign, callsign, frequency (MHz string, trailing zeros trimmed, min 3 decimals), band, mode, modeDetail, time, spotter, snr, speed, rawText, title, comment, source, state, spotterState, summitName/Height/Points/Ref, wwffRef/Division/Name, iotaGroupRef/Name, qsl (comma list), dxcc, entity, cq, continent, homeDxcc, homeEntity, spotterDxcc, spotterEntity, spotterCq, spotterContinent, triggerComment, actions.

### 2.5 Non-spot line kinds seen on the same stream
Verbatim third-party fixtures (dh1tw README, groups.io CC-User thread):
```
WWV de W0MU <21>:   SFI=118, A=8, K=2, No Storms -> Minor w/G1 
WCY de DK0WCY-1 <22> : K=2 expK=4 A=17 R=23 SFI=77 SA=qui GMF=act Au=no
To ALL de IK8CNT: UA4WHX pse beaming south        
```
- `WWV de <node> <HH>:` PC23/PC27: hour in angle brackets, free-ish text: `SFI=n, A=n, K=n, <text>`.
- `WCY de DK0WCY-1 <HH> : K=.. expK=.. A=.. R=.. SFI=.. SA=.. GMF=.. Au=..` PC73. HamAlert regex `^WCY de DK0WCY.*? : (.+)$`, splits on space then `=`; forwards `sfi,a,k,expK,r,sa,gmf,aurora` to sotl.as `/api/solardata/<YYYY-MM-DD>/<H>` with an api key. (Note: `A=17` etc. parsed with `parseInt`; there are no HamAlert tests for WWV lines - they currently fall into the "No match" log branch.)
- `To ALL de <call>: text` PC12 announcement; also `To LOCAL de ...`, `To <call> de ...` (talk). Also `WX de ...` weather announcements (PC12 with wx flag), login banners, `<call> de <node> <date> <time>Z dxspider >` prompt lines and anything the user sends, such as `sh/dx` replies (which are `DX de`-format lines, same parser).
- All of these hit `console.log("No match: " + line)` in HamAlert except WCY.

---

## 3. Field inventory

### 3.1 What the telnet `DX de` line carries (HamAlert's parse)
| Raw field | Type | Presence | Example | Notes |
|---|---|---|---|---|
| spotter | string | always (line is dropped if `:` count != 1) | `KC9RNK`, `PP2CS-@`, `DK9IP-#`, `N4XT-1` | Trimmed. May carry SSID (`-1`..`-15`), `-#` (RBN/Skimmer), `-@` (DXSummit web) etc. Case: upper in practice. May equal the DX call (self-spot). |
| frequency | number, kHz, 1 decimal | always | `14170.0` | `/1000` -> MHz in code (floating point; 14.1700000000001-style artifacts possible). Sometimes junk (`249440.0` for a 12 m typo). |
| DX call | string <=12 chars | always | `UR8EW/QRP`, `W1AW/5`, `HF0PAS` | Trimmed. Prefix/suffix forms, `/P`, `/QRP`, `/MM`. HamAlert later strips everything outside `[0-9A-Z/]`. Not validated for syntax; garbage appears. |
| comment | string <=30 chars | always present as a field, empty ~26-30% of spots | `up 2`, `FT8 -11 dB 1655 Hz` | Latin1-decoded; trimmed; internal runs of spaces preserved (`FT4  CQ -05dB - 73!`). |
| time | `HHMM` UTC | always | `1211` -> `12:11` | No date, no seconds. |
| (optional) spotter locator | 4-char grid | rarely, node dependent | `JN47` | Not parsed by HamAlert. |
| rawText | string | derived | the whole line minus BEL | Used later by `findSotaRef()` (regex over the whole raw line, which includes spotter and node-formatting text - risk of false positives), used in mode-guess log. |

Not carried: **mode** (except inside the comment), SNR/WPM (inside comment for skimmer-originated), DXCC/continent/zone of either station (CC11/PC extensions only), spotter locator (usually), spot id, spot date, spotter type (human/skimmer/bot - only inferable from call suffix), QSL/LoTW status, LoTW/eQSL flags, delete/QRT flag.

### 3.2 What the HTTP mirrors add (for the schema discussion)
**DXSummit** (`/api/v1/spots`; 1000 records, all fields present on all 1000):
| Field | Type | Presence | Example | Notes |
|---|---|---|---|---|
| id | int | 100% | 68534732 | Monotonic, descending in list. Usable for dedupe/resume. |
| de_call | string | 100% | `AA4BW`, `PP2CS-@` | 19.6% (196) end `-@` (DXSummit web spotters), 4 others `@SWL-@`, `-DX-@`, `_EU-@`. |
| dx_call | string | 100% | `W4S` | |
| frequency | float kHz | 100% | `14037.0` | 999 with 1 decimal, 1 with 2 decimals (so does carry sub-100 Hz when a source gives it). |
| time | ISO local-naive `YYYY-MM-DDTHH:MM:SS` (UTC) | 100% | `2026-10-13T23:08:51` | Has seconds - this is DXSummit's receive/created time, finer than the telnet line. |
| info | string or null | 100% key; null 27.3%, never "" | `FT4  CQ -05dB - 73!` | Cut to 30 chars. |
| dx_country | string | 100% | `United States` | DXCC entity name. |
| de_latitude / de_longitude / dx_latitude / dx_longitude | float | 100% | `33.12`, `82.2` | **Longitude sign inverted (positive = WEST)**: W4S in Georgia has `dx_longitude: 82.2`; a Japanese DX has `-130.53`. |

**DXHeat** (`/source/spots/?a=500`; 500 records):
| Field | Type | Presence | Example | Notes |
|---|---|---|---|---|
| Nr | int | 100% | 68035498 | Id (different number space from DXSummit's). |
| Spotter, DXCall | string | 100% | `AA4BW`, `W4S` | |
| Frequency | **string** kHz | 100% | `"14037.0"` | String-typed. |
| Time / Date | `"23:08"` / `"13/10/26"` | 100% | | Date is DD/MM/YY (UTC), minute resolution. |
| Comment | string | 100% key; `" "` (single space) 33.0%, `""` 0.8% | `up 4.4` | Cut to ~30-37 chars (22 over 30). HTML entities left escaped: `&lt;`, `&gt;` in 25 spots. Leading/trailing whitespace on 33%. |
| Beacon / MM / AM | bool | 100% | false | All false in sample; flags for beacons and maritime/aeronautical mobile (derived from call/comment). |
| Valid | bool | 100% | true (497) / false (3) | DXHeat's own sanity flag. The three `false` were bad data: a frequency typo (`249440.0`, comment says 12 m), a mistyped call (`602M` with digit zero, meant `6O2M`) and a non-call (`DXCall: "NA"`, comment `CQ DX...`). So junk DX calls do reach the stream. |
| DXHomecall | string | 100% | `W4S` | Base call without prefix/suffix. |
| Band | float (metres) | 99.8% | `20.0`, `0.7` | Derived by DXHeat (0.7 = 70 cm). |
| Mode | string | 98.2% | `CW`, `USB`, `LSB`, `DIGITAL` | Derived: DIGITAL 206, USB 166, CW 90, LSB 29, absent 9. Vocabulary = {CW, USB, LSB, DIGITAL}, no FT8/RTTY. |
| Flag | 2-letter DXCC flag code | 99.8% | `us`, `sb` | |
| Continent_dx / Continent_spotter | string | 99.8% / 100% | `NA` | |
| DXLocator | 6-char grid | 99.6% | `EM83VE` | From DXHeat's DB, not the spot. |
| LOTW, LOTW_Date | bool, `MM/DD/YYYY` | 62.4% | true, `04/27/2026` | Only present when true (absent, not false). US date order! |
| EQSL | bool | 41.2% | true | Absent when false. |

**HamQTH** (`dxc_csv.php`, 200 rows, `^` separated, no header; I inferred the columns from the data):
`spotter ^ freq_kHz ^ dx_call ^ comment ^ "HHMM YYYY-MM-DD" ^ LoTW("L" 58% | "") ^ eQSL("E" 41.5% | "") ^ continent ^ band("20M") ^ country name ^ DXCC number`
Comment length up to 45 chars (not cut to 30; 4 over 30), empty 29%. No ids.

**Spothole** (`source=Cluster`, 210 records; an aggregator that normalises): `id` (sha256), `dx_call`, `de_call`, `freq` **Hz float**, `mode`, `mode_type` (PHONE 89 / DATA 89 / CW 30 / null 2), **`mode_source`** (`BANDPLAN` 158 = 75.2%, `COMMENT` 52 = 24.8%), `band`, `comment` (<=30), `time` (epoch float, minute-truncated), `time_iso`, `received_time` (epoch float, seconds-precise, 6-39 s later than `time` in the sample), `qrt` (false everywhere), `sig` / `sig_refs` (POTA, WWFF, SOTA, IOTA, DXpedition, QRP), `dx_*` and `de_*` geolocation and DXCC enrichment (country, flag, continent, dxcc_id, grid, lat, lon, `*_location_source` in {HOME QTH, DXCC, SIG REF LOOKUP, SPOT, null}), `propagation_mode` (always null), `source_id` (always null for Cluster), `icon`.

---

## 4. Semantics and quirks

### 4.1 Time
- Telnet: `HHMMZ` only. UTC. Spot-creation time at the originating node. No date; the consumer assumes "today UTC" or uses arrival time. Around 00:00Z a delayed spot from 2359Z is ambiguous. HamAlert never uses the line's time for ordering; `receivedDate` is arrival time and the `HH:MM` string is carried only for display.
- Mirrors: DXSummit adds seconds; Spothole adds a receive timestamp.

### 4.2 Frequency
- kHz, one decimal on the classic line (100 Hz). PC61/CC11 can carry two decimals (`14005.22` in the CC manual; one such value in the DXSummit sample). HamAlert converts to MHz by dividing by 1000 and later formats with `%.06f`, trailing zeros trimmed (min 3 decimals).
- Data quality: typos produce out-of-band frequencies (`249440.0`, `1296215.0` for a real 23 cm EME/weak-signal spot, `433575.0` is a legitimate 70 cm FM/DV spot), spots on 5 MHz and 70 MHz channels, QO-100 (`10489xxx`). HamAlert's `config.bands` lookup returns no band for junk; the spot is still processed.
- Spotter "-1" style SSIDs do not change frequency, they reflect the spotter's software instance.

### 4.3 Mode: in the comment or not? (the reason HamAlert guesses)
Counts from the 881 unique non-DXSummit-web spots in the pool (HamQTH+DXHeat+Spothole+DXSummit, de-duplicated by spotter/dx/kHz/minute; restricted to `de_call` not ending `-@`; script `scripts/cluster_comments.py`):
- Comment empty: **265 = 30.1%** (blank or single space).
- Any explicit mode token in the comment (cw, ssb, usb, lsb, fm, am, rtty, psk*, ft8/ft4, js8, jt*, msk*, olivia, ...): **194 = 22.0%** of all spots, **31.5% of spots with a non-empty comment**. Including the 196 DXSummit-web spotters: 266/1077 = 24.7%.
- HamAlert's `modeguesser.commentPattern` (which deliberately omits CW/SSB/USB/LSB/FM/AM) fires on **131 = 14.9%**.
- Spothole independent verdict: `mode_source=COMMENT` 24.8%, `BANDPLAN` 75.2% (of 210).
- Digital-segment spots (within +/-3.5 kHz of FT8 dial frequencies 1840, 3573, 5357, 7074, 10136, 14074, 18100, 21074, 24915, 28074, 50313): 306 spots, only **99 (32%)** state the mode in the comment. So ~68% of FT8-frequency spots rely on a band plan to be recognised as FT8. HamAlert's `config.modeguesser.ranges` contains only CW/SSB/FM/QO-100 segments and a 60 m FT8 slot; no FT8 dial frequencies. My simulation of the HamAlert guesser on these 881 spots gives: mode from comment pattern 131, from range table 472 (cw/ssb/fm/ft8-60m), **no guess 278 (31.6%)** - most of them 28/21/14/25/7 MHz FT8/FT4 and VHF/UHF spots with no tag (e.g. 14074.5 with an empty comment).
- False positives of naive regexes: "I AM" matches `am` (seen in `SEE WHAT A GREAT DXER I AM  I SPOT M`). Only 2 of 62 explicit CW/SSB comments disagreed with the guesser, both this false positive. HamAlert's pattern avoids that by excluding AM/FM/CW/SSB; the cost is that explicit "CW" / "USB" in a comment is ignored in favour of the band plan (15 of 62 explicit cw/ssb comments yield no guess at all).
- No spot in the pool had two different mode tokens (0 multi-mode comments).
- Position: the mode word is the first word of the comment in 158/881 spots (it is conventionally the first token).

Mode tokens observed in comments (distinct, case-folded; count of spots): FT8 97, CW 22, FT4 21, USB 20, SSB 13, RTTY 9, PSK31 3, FM 3, AM 2 (false positive), LSB 2, OLIVIA 1, BPSK63 1. (A larger sample would add JS8, MSK144, JT65, SSTV, "DIGI", "DATA", "C4FM", "DMR", "DSTAR" - all well known on the network but not seen today.)
Mirror-derived mode vocabularies (not what the telnet line says): DXHeat {CW, USB, LSB, DIGITAL}; Spothole {SSB, FT8, FT4, CW, RTTY, PSK, DATA, FM, null}.

### 4.4 Spotter
- Human spotters (plain call, optionally `-N` SSID), web/app spotters (`-@` DXSummit, 190/1000 in DXSummit), skimmers (`-#` suffix; RBN, `-2-#`, `-1-#`), FT8/FT4 software that spots to the cluster directly (calls like `IU6HWW`, `K4CAE` posting every few minutes with a templated comment `FT8 -11 dB 1655 Hz` or `US-3038`), bots and "club" spotters. There is no explicit field distinguishing them in the telnet line; CC11 has a spot-mode-type field for this purpose.
- Self-spots (spotter == DX call, ignoring SSID): DXSummit 7.8%, DXHeat 7.2%, HamQTH 5.0%, Spothole 7.6%. These are typically POTA/WWFF activators (`NJ9L` posting `WWFF KFF-1893` on his own call), DXpeditions and special events.
- Frequent spotter repeats: one automated spotter (K4CAE) posted 6 of the 60 most recent spots in the Spothole sample (`K4CAE`, POTA ref only comments `US-6615`).
- HamAlert filters spotter `W3LPL` (a large east-coast US node; my guess is the filter exists because it injects skimmer-derived or duplicate spots under its own call - the reason is not documented in the repo).

### 4.5 Test / QRT / deleted / edited / duplicates
- None exist at the protocol level. A "QRT"-like announcement can appear as text in a comment (e.g. "QRT", "nil", "not heard" - `nil` is dropped by HamAlert's filter). There is no retraction. Spothole exposes a `qrt` boolean, always false in the Cluster sample.
- Duplicates: from my knowledge of DXSpider (not verified here) nodes dupe-check spots network-wide, but you do see the same DX from many spotters in succession (H49A on a Solomon Is. DXpedition: ~10 spots in 5 minutes with `up 2`, `up 2.6`, `up 4.4`) and a single spotter re-spotting the same DX on different frequencies.
- Garbage/abuse: spotter `K4CAE` posting an incrementing POTA ref as comment; "BIGFOOT SES" event call signs (`W4S`, `W7B`, `W7G`, `W7O`...: US special event series), HamAlert blocks band `11m` and DXCC 344 (North Korea, "most likely fake").
- Order: arrival order is not time order across nodes (network latency 1-10 s typical, occasionally minutes).

### 4.6 Comment conventions (where references hide)
There is NO structured field for any reference; everything is free text in the first-30-chars comment. Observed (counts are of the 881 human/digital-spotter pool; percentages of all spots):

| Convention | % of spots | Verbatim examples |
|---|---|---|
| Empty or single space | 30.1% | `` |
| Mode word first | ~18% | `FT8`, `CW up 2.7`, `USB`, `CW Bigfoot special event stati`, `PSK31 Bigfoot SES`, `BPSK63 CQ TEST RSGB-80M-CC`, `RTTY CQ CQ` |
| FT8/FT4 (software) templates | 13.4% | `FT8 -20 dB 1835 Hz`, `FT8 +8 dB 1281 Hz`, `FT4  CQ -05dB - 73!`, `FT8 JN00kx -> JO80` (grid-to-grid "worked") , `f/h ft8 73` (fox-and-hound), `FT8 -10 Thx for qso 73` |
| "UP n" split instructions | 4.3% (UP) + 0.3% (DOWN) | `up 4.4`, `up 2`, `UP5-10`, `UP`, `CQ from Arctowski (AN-010)-UP`, `TNX QSO!  QSX  Up, Up, up...` |
| QSX | 1.9% | `QSX 18075.80 CW`, `QSX 14045.80`, `QSX 14050.70  PSK31` (QSX = listening/transmit on this other frequency, kHz with 2 decimals; HamAlert ignores it) |
| TNX / TU / TY / THX | 10.4% (incl. 73, TU) | `tnx`, `FT8 TNX !`, `59 in MN TNX Antonio`, `57 in FL TY`, `tnx for QSO`, `Thx for qso 73` |
| LoTW / eQSL / QSL | ~0.2% in the comment | `QSL hiro`; LoTW as a mirror enrichment (DXHeat `LOTW`, HamQTH `L`), not a telnet field. HamAlert's `qsl` array comes from its own callsign DB. |
| POTA reference | 5.3% (US-nnnn form) | `US-10308`, `US-3038`, `US-2996 TX`, `CW FB CQ POTA US-4011 73 es 44`, `CQ POTA`-style text. Comment is often *only* the park ref (`US-6179`). Park id has 4-5 digits and prefix = country (US, CA, K-, DL-). HamAlert's `wwffRefRegex` `\b([a-z0-9]{1,5})-(\d{4})\b` then looks up `wwffParks` (which also contains POTA). It would NOT match `US-10308` (5 digits). |
| WWFF reference | 4.2% (`xxFF-nnnn`) | `WWFF KFF-1893`, `WWFF JAFF-0161`, `WWFF KFF-4175` |
| IOTA | 0.7% | `IOTA NA-021`, `IOTA SA-026`, `CCC H4* IOTA OC-047`, `CQ from Arctowski (AN-010)-UP` (no word IOTA at all) |
| SOTA | 0.1% (1 spot) | `CA SOTA W6/NS-248 TFNS` - the only SOTA cluster spot in the sample; SOTA spots usually come from SOTAwatch not from the cluster, and the comment is cut to 30 chars so the ref can be clipped (`W6/NS-248` fits; longer reference + text does not). |
| RST/report | 6.6% | `57 in FL TY`, `59 in MN TNX Antonio`, `54 with qsb hiro`, `booming 59+`, `55 into JA`, `52 into JA` (activators' reports; often contain a QTH/state) |
| Locators | 8.5% | `CN84LV<>PM52IN Nice JA qso` (spotter grid <> DX grid, 6 chars), `USB GG86ix -> FN42hn`, `FT8 JN00kx -> JO80` |
| CQ / CQ DX / calling | 7.7% | `CQ`, `cq dx`, `CQ DX DX!! SA`, `CQ DX QRP 10W`, `Calling DX`, `CQ from Arctowski...` |
| Special events / DXpedition | 3.6% | `Bigfoot SES`, `Cactus Special Event FT8`, `DXPedition mode`, `CCC VU*` |
| Award/marathon text | ~2% | `DXCC 291 DXCC_QSL 291 MARATHON` (bot-spam with counts), `UKAC`-contest strings |
| Operator / QTH names | scattered | `59 in MN TNX Antonio`, `54 with qsb hiro`, `Bril contact eric 73`, `Spotted by EL2BG: CQ cqota.com` (web-spotter text) |
| Non-ASCII | 0.2% | `Spécial call` (2 mirrors); in the telnet stream this is raw latin1/UTF-8 bytes |
| HTML entities | 5% of DXHeat rows (artifact of the mirror, not telnet) | `CN84LV&lt;&gt;EL88TN`; telnet and HamQTH/DXSummit carry plain `<>` |

HamAlert `server.js` consumes these like this: SOTA ref = `summitRefRegex` over `rawText` (whole line!) then DB check; WWFF/POTA = `wwffRefRegex` over `comment`, DB check; IOTA = `iotaRefRegex` `(?:^|\s)(AF|AN|AS|EU|NA|OC|SA)[ -]?(\d{3})\b` over `comment`, DB check. Misses seen today: `(AN-010)` (preceded by `(` not whitespace/start), `US-10308` (5-digit POTA id), and any ref clipped at char 30.

### 4.7 Other quirks
- `set/ve7cc` / `set/dxgrid` / `set/dxitu` / `set/dxcq` etc. change what a user connection receives; HamAlert configures none, so it receives only the classic line and no CC11 extras.
- Different node software shapes: DXSpider (`DX de CALL:`), AR-Cluster (same), CC Cluster (same classic, plus CC11 on request), CLX/DxNet (same family). Lines are the same fixed width; only the optional trailing locator differs. The optional trailing locator is node/user-setting dependent (not verified which nodes emit it).
- Spotter field of a node-originated automatic spot may include SSIDs (`-1`..`-15`) and for skimmers `-#`/`-2-#`; do not strip them naively before dedup.
- Login prompts / banners / `HB9DQM-4 de GB7XXX 13-Oct-2026 2314Z dxspider >` prompt lines fall in the "No match" branch and are logged noise.

---

## 5. Related reference data
The cluster itself needs the same lookups the rest of the pipeline does (it carries none):
- **DXCC / CQ / ITU / continent by call**: HamAlert uses `clublogResolver` (Club Log's `cty.xml`/`cty.dat` family, https://clublog.org/cty.php, CSV `cty.dat` from https://www.country-files.com/ updated several times per month) for the DX call, home call and spotter. Format: cty.dat has one entity header line per DXCC (`Brazil: 11: 15: SA: -10.00: 53.00: 3.0: PY:` style) followed by prefix/exact-call lists. Not fetched by me.
- **Summits**: `config.summitListUrl = https://www.sotadata.org.uk/summitslist.csv` (daily), GMA: `http://cqgma.eu/gma_summits.csv`.
- **WWFF/POTA parks**: collection `wwffParks` (reference, name, program, status, location); POTA park list (from memory, not fetched by me): https://pota.app/all_parks_ext.csv; WWFF directory (from memory): https://wwff.co/wwff-data/wwff_directory.csv. See the POTA/WWFF agents' reports for the authoritative details.
- **IOTA groups**: `config.iotaListUrl` (fulllist.json), keyed `grpRef` (`NA-021`).
- **Band plan**: `config.bands` and `config.modeguesser.ranges` (30 range entries: CW/SSB/FM + QO-100). To lower the 31.6% "no guess" rate you would need ITU-region and national band-plan-based sub-bands (FT8/FT4/RTTY dial frequencies per band). Public lists: IARU region 1/2/3 band plans; WSJT-X frequency list (`FrequencyList.cpp` default table) is the de-facto standard for FT8/FT4 dial frequencies.
- **Cluster node directory** (to diversify servers): https://www.dxcluster.info (telnet directory, HTML), https://www.ve7cc.net/ (blocked here).
- **Skimmer/FT8 spotter markers**: `-#`, `-2-#` (RBN). There is no authoritative list.

---

## 6. Proposed mapping

### 6.1 Base Spot (fields every source can supply; cluster values)
| Base field | Cluster source | Notes |
|---|---|---|
| source | `"cluster"` (config `source`) | Constant (plus optionally node host in an extension). |
| callsign (spotted, "DX") | cols 26-38, trimmed | Keep the full call (`fullCallsign`); derive canonical call in the backend. Never trust syntax. |
| spotter | `substring(6,26)` before `:` | Keep SSID/suffix verbatim in `spotter`; add a derived `spotterKind`. |
| frequency | kHz/1000 | Store canonical in **Hz integer or kHz decimal**: the line has 100 Hz resolution, CC11 up to 10 Hz. Do not store a float MHz (rounding artifacts). Keep `frequencyPrecision`. |
| mode | **absent** | Always optional. See 6.3. |
| time | `HHMM` + arrival date | Provide `spotTime` (UTC, derived from HHMM + arrival date with midnight rollover logic) and `receivedTime` (arrival, authoritative). |
| comment | cols 39-69 trimmed | <=30 chars on classic lines; up to ~45+ on PC11/CC11. |
| rawText | whole line (BEL stripped) | Keep; HamAlert uses it for SOTA ref detection. |
| title | derived (`Cluster spot CALL (14.070)`) | A presentation field; recommend not storing it. |

### 6.2 Cluster-specific extension (`ClusterSpotExt`), all optional
- `node` (host the spot was received from), `format` (`classic` | `cc11` | `pc11` | `pc61`).
- `spotterLocator` (4-char, trailing token on some lines or CC11 grid), `dxLocator`, `spotterIp`? (PC61 only; do not expose).
- `spotterDxcc`, `dxDxcc`, `spotterCq/Itu`, `dxCq/Itu`, `spotterState`, `dxState`, `hops`, `originNode`, `viaNode`, `spotType` (CC11 manual vs skimmer, if present).
- `commentTruncated` (bool: comment length == 30), because the loss is invisible otherwise.
- `modeSource`: `explicit-comment` | `inferred-comment` | `bandplan` | `unknown` (mirrors Spothole's `mode_source` and HamAlert's `modeIsGuessed`).
Non-spot kinds (should be separate record types, not `Spot`): `SolarWWV` (date, hour, SFI, A, K, forecast text, logger), `SolarWCY` (K, expK, A, R, SFI, SA, GMF, Au, hour, source node), `Announcement` (from, to, text; ignored today).

### 6.3 Enrichment the backend must do itself
- **Mode**: extract from comment (cw|ssb|usb|lsb|fm|am|rtty|psk*|ft8|ft4|js8|jt*|msk*|olivia|sstv|fst4|q65|...) else FT8/FT4/CW/SSB by dial-frequency tables else null. Today the guesser: comment pattern (digital only) -> `f/h` -> range table. Based on my numbers ~22% of cluster spots carry a mode word and ~32% of spots end up unguessed. Suggested precision order: explicit comment (incl. CW/USB/LSB, with `AM` word-boundary and not preceded by "I"), then software template (`... dB ... Hz`), then FT8/FT4 dial-frequency table, then CW/SSB segment table; keep `modeSource`.
- **Band** (from frequency), **DXCC/CQ/ITU/continent/state** for both calls, **prefix**, **QSL** flags, **callsign info**.
- **References**: SOTA (regex over comment only, not rawText), POTA (4-5 digit `US-nnnn`; comment may be only the ref), WWFF (`xxFF-nnnn`), IOTA (allow `(AN-010)`), validated against the lists in section 5. Note references are only *claims* in text: store `matchedFrom: comment` and whether the DB lookup succeeded.
- **Normalising HTML entities** is NOT needed for telnet, only for the DXHeat mirror.
- **Spotter classification**: `human`, `skimmer` (`-#`), `web` (`-@`), `self` (spotter base call == dx base call).
- **Dedup**: a hash of (spotter, dx, round(kHz), minute, comment) to prevent duplicate triggers when the same spot arrives from two connected nodes.

---

## 7. Open questions / risks for the schema designers
1. **Mode is unobservable in the stream** for ~70-78% of spots; the base `mode` must be nullable and the data model should say how it was decided (`modeSource`/`modeIsGuessed`). DXHeat's `DIGITAL` and Spothole's `PHONE/DATA/CW` mode-types show a coarser, higher-recall classification (every spot gets one) than FT8-vs-SSB. Decide whether HamAlert triggers need `modeType` as a first-class field.
2. **Time**: the line has no date. Choose arrival-time vs derived spot-time as the canonical `time`; define midnight rollover; and whether to carry the `HHMM` as the display value.
3. **Frequency representation**: kHz with 1 decimal on the wire (CC11: 2). The current float MHz is lossy-looking (`24.9402` vs `24.94`). Prefer integer Hz.
4. **Comment limit**: 30 chars on the classic line truncates references and chops words (`SCI 26 SANTA CATARINA INTEGRAD`). A direct CC11/PC11-capable client would obtain the full text (HamQTH shows 45); HamAlert would need `set/ve7cc` or to connect with `set/dxcomment`-like options. This changes parsing from positional to `^`-split. Worth supporting both.
5. **Identity & edit semantics**: none exist. If the new API wants a spot `id`, it must be synthesized (hash) and can never signal "updated" or "deleted".
6. **Spotter taxonomy**: skimmer/web/self/bot. Should HamAlert expose it? Several observed spot streams are bots (`K4CAE` POTA templates, `IU6HWW` FT8 reports, `WB8VLC` grid-to-grid reports).
7. **Non-spot messages**: WCY/WWV/announcements must not be modeled as `Spot`. WWV lines are currently dropped (log noise), only WCY is parsed, and only if spotter is `DK0WCY`. If the rewrite wants WWV/SFI data from other nodes, it needs its own parser (`WWV de CALL <HH>: SFI=.., A=.., K=.., text`).
8. **Robustness bugs seen in `cluster.js` worth not copying**: positional parse breaks for lines with a >24-char `SPOTTER:freq` field; no validation of frequency/callsign; `Number('')/1000 = 0` for an empty frequency; `wwffMode` re-encodes latin1->utf8 only for WWFF; the 5-minute silence timer is shared by spots and WCY lines; the filter regex only inspects the comment (not the DX call); `solardata` POST has no error handler; the telnet-emulator `CC11` output uses server-local time.
9. **Coverage**: HamAlert listens to only two nodes. A spot posted at a node not linked to them never arrives; no sequence number to measure loss. The mirrors (DXSummit/DXHeat/HamQTH/Spothole) all publish ids or timestamps and could be used to audit completeness.
10. **Unverified / not obtainable here**: live telnet bytes (any node), the precise CC11 extension-slot order beyond field 6, the DXSpider on-wire comment length limit (30 observed from Spothole/DXSummit and the HamAlert emitter; 45 from HamQTH), what `set/dxgrid` appends on specific nodes, AR-Cluster's exact formatting differences.

---

## Evidence base (files)
- `raw/cluster/dxsummit_1000.json` (1000), `raw/cluster/dxheat_500.json` (500), `raw/cluster/hamqth_dxc_500.csv` (200), `raw/cluster/spothole_cluster.json` (210), `raw/cluster/pool_unique.json` (1077 de-duplicated across the four mirrors; fields: spotter, freq(kHz), dx, comment, t, src, optional also/mode).
- `raw/cluster/SAMPLES.txt` verbatim third-party protocol lines. `raw/cluster/docs/` : CC User manual text (`ccuser.txt`), DXSpider PC protocol wiki (`pcproto.html`), DH1TW parser README, cwclubspotter and Log4YM CC11 parsers, PVRC cluster filtering paper.
- Sample window: DXSummit 2026-10-13 19:38:25Z - 23:09:36Z; DXHeat 21:08Z - 23:09Z.
