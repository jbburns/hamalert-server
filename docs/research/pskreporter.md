# PSK Reporter (pskreporter.info) - spot source report

Researched 2026-10-13. Raw samples are in
`/tmp/claude-0/-home-user-hamalert-server/89e2a1b4-cf72-50c1-bad7-1287a1913473/scratchpad/sources/raw/pskreporter/`
(`q1.xml` = 303 FT8 reception reports from a global query; `q2_trunc.xml` = a callsign query truncated to 200 reports + 40 active receivers;
`characteristics.json`; `pskdev.txt`; `mqtt_page.txt`; `timing.txt`).

Evidence status, so nobody over-trusts this document:
- VERIFIED LIVE: the HTTP/XML retrieval API (two queries, 1137 reception reports, 6243 active-receiver rows), `/api/characteristics`, and the public docs pages.
- NOT VERIFIED LIVE: the token-protected NDJSON stream (403/400 without a token; format taken from the code in `pskreporter.js` plus a 2018 slide deck by the PSK Reporter author) and the MQTT feed (the sandbox proxy resets the TLS handshake on mqtt.pskreporter.info:1886; I tried a paho-mqtt websocket client and curl; raw TCP is blocked anyway). The MQTT payload below is the author's own documented example, not a capture.

---------------------------------------------------------------------------------------------------

## 1. Access

PSK Reporter is not a "spot" network in the DX-cluster sense. It is a database of **automatic reception reports**: thousands of receivers (mostly WSJT-X/JTDX instances, plus skimmer-style software such as UberSDR/KiwiSDR-based decoders) upload "I decoded callsign X on frequency F with SNR S" over UDP/IPFIX to `report.pskreporter.info:4739`. The server stores them and re-publishes them via three channels:

| Channel | Endpoint | Auth | Format | Notes |
|---|---|---|---|---|
| **Stream** (used today) | `https://stream.pskreporter.info/stream/report?token=...` | Private token, issued by the author on request ("Missing token= argument. Contact pjsg-psktoken@nospam.gladstonefamily.net", HTTP 400 without it; 403 on `/`) | NDJSON over a long-lived HTTP response, one report per line | Node.js/Express behind nginx. Not publicly documented anywhere I could find; the 2018 HamSCI slides (https://pskreporter.info/hamsci-pskreporter.pdf) describe it as "URL to get almost real-time stream (possibly filtered). Authenticated by API key. One report per line in JSON format". Reconnect on error/timeout (HamAlert does: 5 s delay, 300 s idle timeout). No resume/cursor documented (each line carries `sequenceNumber`, but I found no way to ask the stream to resume from one; the XML API has `lastseqno` instead). |
| **MQTT** (public, third-party operated) | `mqtt.pskreporter.info` ports 1883 (TCP), 1884 (TLS), 1885 (WS), 1886 (WSS) | None (anonymous) | JSON per MQTT message, QoS 0 (at-most-once, so reconnects lose spots) | Operated by Tom M0LTE "with permission" from Philip Gladstone, fed from the same data. Docs: https://www.mqtt.pskreporter.info/ , timing/rxinfo: https://www.mqtt.pskreporter.info/timing.html , discussion: https://groups.io/g/pskr-mqtt . See section 2b. |
| **Retrieval API** (public, polled) | `https://retrieve.pskreporter.info/query?...` (also GET/POST) | None; `appcontact=you@example.com` is requested | XML (or JS via `callback=`) | Docs: https://pskreporter.info/pskdev.html . Cloudflare-fronted, `cache-control: public,max-age=90`. |

Rate limits / etiquette (pskdev.html, verbatim sense): "retrieve reception data no more often than once every five minutes", the author "reserves the right to block or rate limit anybody who imposes a significant load", may in future require compression, and asks for `appcontact=` so he can contact heavy users. The retrieval API is therefore **not suitable for HamAlert's real-time purposes**; it is useful for per-callsign look-ups and for research. Default retrieval returns the last 100 records / max 6 h per callsign query; `flowStartSeconds` (negative number) may reach back at most 24 h.

Retrieval API parameters (full list from pskdev.html): `senderCallsign`, `receiverCallsign`, `callsign` (only one of the three), `flowStartSeconds` (negative seconds, max 24 h), `mode` (accepts a trailing `*` wildcard, e.g. `PSK*`, as used by the pskmap UI), `rptlimit`, `rronly` (non-zero: reception reports only, no active-monitor list), `noactive`, `frange` (`14000000-14100000`), `nolocator`, `callback`, `statistics`, `modify=grid`, `lastseqno`.
Observed behaviour that differs from the docs:
- `rptlimit=300` on a global query returned 303 rows; `rptlimit=10` on a callsign query returned 834 reports. Treat `rptlimit` as unreliable.
- A global query `flowStartSeconds=-900&mode=FT8&rronly=1` returned only the newest ~20 seconds (303 reports, 23:08:59-23:09:18Z), not 15 minutes. Global queries are capped/sampled; do not rely on them to backfill.
- Without `rronly=1`, a callsign query also returns ~6000 `<activeReceiver>` rows (1.6 MB response). Always send `rronly=1` (or `noactive=1`) unless you want the receiver list.

Detecting new/edited/deleted: reports are immutable inserts; there is no edit/delete concept for HamAlert's purposes. Identity = `sequenceNumber` (stream, MQTT `sq`, XML `<lastSequenceNumber>` per response and `lastseqno` param). The XML per-report element carries no sequence number, so for the XML API dedupe on (senderCallsign, receiverCallsign, frequency, flowStartSeconds).

Other reference endpoint: `https://pskreporter.info/api/characteristics` (JSON, ~100 KB, 1971 entries) maps each decoder-software version string to `{"time_start": 0|1, "id": n}`; see section 4 (time semantics).

Official docs: https://pskreporter.info/pskdev.html (UDP/IPFIX report protocol + retrieval API), https://www.mqtt.pskreporter.info/ , https://www.mqtt.pskreporter.info/timing.html , https://pskreporter.info/hamsci-pskreporter.pdf (2018 architecture slides, includes the stream line format).

---------------------------------------------------------------------------------------------------

## 2. Raw record format

### 2a. Stream NDJSON (what `pskreporter.js` consumes)

Not capturable without a token. The only verbatim sample available is from the author's 2018 slides (line breaks in the PDF removed):

```json
{"sequenceNumber":2400358267,"frequency":7074294,"mode":"FT8","sNR":-3,"flowStartSeconds":1515857114,"senderCallsign":"JK1OZS","senderLocator":"QM05GR","receiverCallsign":"JI1SZR","receiverLocator":"QM06an","receiverDecoderSoftware":"WSJT-X v1.8.0 r8193"}
```

HamAlert's code reads exactly: `mode`, `receiverDecoderSoftware`, `receiverCallsign`, `senderCallsign`, `flowStartSeconds`, `frequency`, `sNR` (checked `!== null`, so the live stream emits `"sNR":null` when SNR is absent). The code tolerates malformed lines (`ndjson.parse({strict:false})`). The current stream may contain additional keys (the XML API now adds DXCC/LoTW enrichment, see below); I could not confirm.

Synthetic text HamAlert builds from it (there is no raw text in PSK Reporter):
`DX de JI1SZR: 7074.3 JK1OZS FT8 -3 dB 1205Z (WSJT-X v1.8.0 r8193)`.

### 2b. MQTT JSON (documented example from https://www.mqtt.pskreporter.info/, not a live capture)

Topic: `pskr/filter/v2/{band}/{mode}/{tx_call}/{rx_call}/{tx_grid}/{rx_grid}/{tx_dxcc}/{rx_dxcc}`
Example payload as documented (comments are the author's):

```json
{
  "sq": 30142870791,   // sequence number
  "f": 21074653,       // frequency, Hz
  "md": "FT8",         // mode
  "rp": -5,            // SNR report, dB
  "t": 1662407712,     // epoch, varies by software
  "t_tx": 1662407700,  // epoch, derived tx start; may be absent
  "sc": "SP2EWQ",     // sender call
  "sl": "JO93fn42",    // sender locator
  "rc": "CU3AT",      // receiver call
  "rl": "HM68jp36",    // receiver locator
  "sa": 269,           // sender ADIF DXCC
  "ra": 149,           // receiver ADIF DXCC
  "b": "15m"           // band
}
```

Retained receiver-info messages on `pskr/rxinfo/{callsign}` ("/" in a callsign becomes "."), documented example:

```json
{"call":"K5RAV","antenna":"OCF at 40 feet","rig":"Icom IC-7600","decoder":"WSJT-X v2.6.1","grid":"EM12kx","time_start":0,"ts":1782438765}
```
An empty (zero-length) retained message means "receiver gone". Each message also expires after 7 days. Spots for WSPR are said to be published on a separate `wspr/` topic tree (timing page: "Spots on wspr/ never carry t_tx"); the exact topic layout of that tree is not documented on the pages I read.

### 2c. Retrieval API XML (VERIFIED LIVE, 2026-10-13 23:09Z)

Global query `?flowStartSeconds=-900&mode=FT8&rronly=1&rptlimit=300&statistics=1` (q1.xml):

```xml
<?xml version="1.0"?>
<receptionReports >
  <lastSequenceNumber value="73693038052"/>
  <maxFlowStartSeconds value="1791932958"/>
  <receptionReport receiverCallsign="W1HBR" receiverLocator="FN31gk20" senderCallsign="KN4EBW" senderLocator="EL98io46" frequency="7075137" flowStartSeconds="1791932958" mode="FT8" senderDXCC="United States" senderDXCCCode="K" senderDXCCLocator="EM47" senderLotwUpload="2026-07-30" senderEqslAuthGuar="A" sNR="-7" />
  <receptionReport receiverCallsign="IZ1ERR" receiverLocator="JN35UI" senderCallsign="7Z1IS" senderLocator="LL34HN" frequency="7075156" flowStartSeconds="1791932939" mode="FT8" senderDXCC="Saudi Arabia" senderDXCCCode="HZ" senderDXCCLocator="LL14" senderLotwUpload="2026-10-09" senderEqslAuthGuar="A" sNR="-21" />
</receptionReports>
```

Callsign query `?callsign=N1DQ&flowStartSeconds=-3600&statistics=1` (q2_trunc.xml) adds direction flags and receiver enrichment, plus several other child elements:

```xml
<receptionReports currentSeconds="1791933052.6721">
  <activeReceiver callsign="KB4KC" locator="EM78fg52" frequency="7075300" region="Kentucky" DXCC="United States" decoderSoftware="WSJT-X v2.6.1 6b6d74" antennaInformation="5 Elem Yagi 55&#39;" mode="FT8" />
  <activeReceiver callsign="N9EAT" locator="EN41WT" frequency="14080903" bands="10m,11m,12m,15m,160m,17m,20m,30m,40m,60m,80m" region="Illinois" DXCC="United States" decoderSoftware="UberSDR 0.1.66" antennaInformation="1/4 vertical " mode="FT4" rigInformation="N/A (DXLab)" />
  <activeCallsign callsign="KA2GJV" reports="3" DXCC="United States" DXCCcode="K" frequency="7074655"/>
  <senderSearch callsign="N1DQ" recentFlowStartSeconds="1791927387"  />
  <rawReports last24hours="20981" lastweek="135005"/>
  <countriesSeen last24hours="116" lastweek="128"/>
  <receiverInfo flowStartSeconds="1791932580" callsign="N1DQ"/>
  <countriesSeenDetail flowStartSeconds="1791767685" locator="JP90XI" DXCC="Aland Islands" callsign="OH0Z" DXCCCode="OH0"/>
  <receptionReport receiverCallsign="N1DQ" receiverLocator="FN42hn50" senderCallsign="K7HRT" senderLocator="DN17JO" frequency="10137285" flowStartSeconds="1791932580" mode="FT8" isSender="0" isReceiver="1" senderRegion="Washington" senderDXCC="United States" senderDXCCCode="K" senderDXCCLocator="EM47" receiverRegion="Massachusetts" receiverDXCC="United States" senderLotwUpload="2026-04-21" senderEqslAuthGuar="A" sNR="-12" />
</receptionReports>
```
(Elements shown abbreviated to one example each and not in document order; see q2_trunc.xml for the real file.)

Quirks seen in the XML: attribute values are XML-entity-escaped (`&#39;`, `&amp;`, `&#244;` for o-circumflex), `<receptionReports >` has a stray space, the pskdev.html sample shows unquoted attribute values (`frequency=14070987`) which is NOT what the server emits (all quoted).

---------------------------------------------------------------------------------------------------

## 3. Field inventory

### 3a. `receptionReport` XML attributes (observed on 303 global-query rows (G) and 834 callsign-query rows (C))

| Raw field | Type | Presence (G / C) | Example | Notes |
|---|---|---|---|---|
| `receiverCallsign` | string | 100% / 100% | `W1HBR`, `K1RA-4`, `EA8-DF4UE`, `VU2OY-9` | The "spotter". Often has `-N` suffixes for multiple instances/SDR channels, or `PREFIX-CALL` forms that are NOT valid callsigns (`EA8-DF4UE`). Uppercase in all 1137 rows. |
| `receiverLocator` | string | 100% / 100% | `FN31gk20`, `JN35UI`, `EM79SM` | Maidenhead, length 6 (73%), 8 (24%) or 10 (2%) in G; 8 in C (N1DQ's own). Case is inconsistent: some mixed (`FN31gk20`), some all upper (`JN35UI`). Normalise case yourself. |
| `senderCallsign` | string | 100% / 100% | `KN4EBW`, `PJ4/DH8BQA`, `DU1/NF0O` | The "spotted" station. As reported by the sender's software, so can include garbage (see quirks). Uppercase. |
| `senderLocator` | string | 100% / 100% | `EL98io46`, `KO01oj`, `LL34HN` | Taken from the decoded message (4-char in FT8 message) or from a call-sign DB; length 4 (3%), 6 (67%), 8 (25-27%), 10 (5%). Mixed case as above. Never empty in my samples, but the dev page says it is only "sometimes" known. |
| `frequency` | int string | 99.7% / 100% | `7075137` | Hz, the signal's **actual RF frequency** (dial + audio offset), not a rounded channel. 1 of 303 global rows had NO `frequency` attribute. Range 1,841,105-50,313,651 Hz in my samples. |
| `flowStartSeconds` | int string | 100% / 100% | `1791932958` | Unix epoch seconds UTC. Meaning depends on reporter software (decode time or transmit start), see section 4. |
| `mode` | string | 100% / 100% | `FT8` | Case: upper. See mode vocabulary in section 4. Only FT8 in my samples because I asked for FT8 (G) / N1DQ is an FT8 monitor (C). |
| `sNR` | int string | 100% / 100% | `-7`, `14` | dB, range -26..+22 in samples. Note the capital N R. XML always had it; the stream emits `null` when absent (per code). |
| `isSender` | "0"/"1" | absent in G / 100% in C | `0` | Only when query is by `callsign=`/`senderCallsign=`/`receiverCallsign=`. Tells which side the queried callsign was. |
| `isReceiver` | "0"/"1" | absent in G / 100% in C | `1` | idem. |
| `senderDXCC` | string | 100% / 100% | `United States`, `Fed. Rep. of Germany`, `Bonaire` | PSK Reporter's own DXCC entity NAME (spellings follow the author's table, not ARRL's: "Fed. Rep. of Germany"). Enrichment done by server on query; NOT in the original uploads. |
| `senderDXCCCode` | string | 100% / 100% | `K`, `DL`, `PJ4`, `DU`, `HZ` | PSK Reporter's DXCC prefix code (main prefix of entity; `K` for USA, `I` for Italy, `PJ4` Bonaire). Not an ADIF number. |
| `senderDXCCLocator` | string | 100% / 100% | `EM47`, `JO51` | 4-char locator of the **entity's** reference/centroid (all US stations show `EM47`), NOT the sender's. |
| `senderRegion` | string | 0% in G (rronly) / 96.9% in C | `Washington`, `Michigan` | State/province/region name. Absent in 26 of 834 C rows. Absent when `rronly=1` global query. (Request-dependent.) |
| `receiverRegion` | string | 0% in G / 100% in C | `Massachusetts` | Only in callsign queries. |
| `receiverDXCC` | string | 0% in G / 100% in C | `United States` | Only in callsign queries. (No `receiverDXCCCode` seen.) |
| `senderLotwUpload` | date `YYYY-MM-DD` | 79% / 75% | `2026-10-11` | Date of sender's last LoTW upload; absent if not a LoTW user. |
| `senderEqslAuthGuar` | string | 51% / 56% | `A` | eQSL "Authenticity Guaranteed" flag, only ever `A` or absent. (The task brief called it `senderEqslAuthSign`; the actual attribute is **`senderEqslAuthGuar`**.) |
| `receiverDecoderSoftware` | - | NOT in XML reports | - | In the XML API decoder software is only on `<activeReceiver decoderSoftware=...>`. It IS in the stream (and via `pskr/rxinfo`), which is why HamAlert gets it. |
| `senderAntennaInformation` / `receiverAntennaInformation` | - | NOT present in XML reports | - | Antenna is on `<activeReceiver antennaInformation=...>` only. Did not see `senderAntennaInformation` anywhere. |
| `iMD`, `rigInformation`, `messageBits`, `deltaT`, `fractionalFrequency`, `persistentIdentifier`, `informationSource` | - | not exposed | - | Exist in the upload protocol (IPFIX ids 30351.x); `informationSource` bit 0x80 marks test transmissions and `1`=auto-extracted, `2`=from QSO log, `3`=manual (pskdev.html). Not in any output I saw. `rigInformation` appears on `<activeReceiver>`. |

### 3b. `<activeReceiver>` attributes (6243 rows, q2)

`callsign` 100%, `locator` 100%, `decoderSoftware` 99.98%, `mode` 99.9%, `frequency` 99.4%, `DXCC` 99%, `region` 97%, `rigInformation` 75%, `antennaInformation` 50% (can be `" "` whitespace-only), `bands` 15% (comma list, only for wideband SDR skimmers). These are receivers that were active in the last window, one row per (callsign, mode/frequency) so a callsign repeats (N9EAT appeared with FT8, JS8 and FT4).

### 3c. Other child elements of `<receptionReports>`

`lastSequenceNumber@value`, `maxFlowStartSeconds@value`, `currentSeconds` (attribute on the root), `activeCallsign` (callsign, reports, DXCC, DXCCcode, frequency), `senderSearch`, `receiverInfo`, `rawReports@last24hours/lastweek`, `countriesSeen`, `countriesSeenDetail` (flowStartSeconds, locator, DXCC, callsign, DXCCCode). Only present with `callsign` queries and/or `statistics=1`.

### 3d. Stream NDJSON keys

| Key | Type | Presence | Notes |
|---|---|---|---|
| `sequenceNumber` | int | always (2018 sample) | monotonically increasing global id; ~73.7 billion by 2026 (see `lastSequenceNumber` 73693038052); exceeds 2^32, still safe in JS double. Not used by HamAlert. |
| `frequency` | int (Hz) | assumed always | divided by 1e6 by HamAlert. A report without frequency (seen 1/303 in XML) would yield `NaN` MHz and be dropped as "unknown band". |
| `mode` | string | sometimes missing | code returns early if falsy. |
| `sNR` | int or null | | |
| `flowStartSeconds` | int | always | |
| `senderCallsign`, `receiverCallsign` | string | always (sender checked for falsy) | |
| `senderLocator`, `receiverLocator` | string | usually | not used today. |
| `receiverDecoderSoftware` | string | usually | free text with versions; used to drop `N1DQ-Importer-KA9Q-Radio`. |

### 3e. MQTT keys

`sq` (int sequence), `f` (Hz int), `md` (mode string), `rp` (SNR dB, int), `t` (epoch, reporter-defined meaning), `t_tx` (derived transmit start epoch, optional), `sc`/`sl` (sender call/locator), `rc`/`rl` (receiver call/locator), `sa`/`ra` (sender/receiver ADIF DXCC number), `b` (band label e.g. `15m`). Reported quirks: locators in the payload are 4, 6, 8 or 10 chars (a consumer regex limited to 4/6 blanked 28% of grids); a missing `t` led one consumer to store 1970; `v2raw` topics "may have empties" (no `tx_grid`/DXCC segments). There is **no decoder-software or antenna field in a spot message**; that lives on `pskr/rxinfo/{call}`.

---------------------------------------------------------------------------------------------------

## 4. Semantics & quirks

**Who is the "spotter"?** The receiver (`receiverCallsign`) is an automatic decoder, almost always a WSJT-X/JTDX/MSHV instance run by an amateur (decoder counts from 2018: WSJT-X ~13,000, JTDX ~3,000), plus SDR skimmer-style software (UberSDR, "KA9Q-Radio" importer, FT8TW, "cli_skimmer", "CWSL_DIGI", Nexus, etc.; 1971 distinct software-version strings in `/api/characteristics`). The "spotted station" is merely whoever transmitted the decoded message. Nobody types anything: no human comment, no QRT/QSY semantics.

**Why a quorum (HamAlert uses 3 distinct receivers per call/band/mode in 15 minutes):** because reports are fully automatic, a single decoder can produce a false decode (corrupted callsign, spurious CQ, a call mangled by a weak decode, a wrong frequency because of a missing CAT connection; the author's own slides say "1-2% [of monitors] seem to report bad frequencies"). Requiring three independent receivers hits the sweet spot between noise rejection and latency. Also relevant: one transmission is heard by dozens of receivers; the quorum is per call/band/mode so subsequent receivers of the same transmission are immediately emitted once the quorum has been met in the window. (HamAlert emits every individual report as its own "spot": the same sender with different `spotter`.)

**Time semantics.** `flowStartSeconds` is "the time of the transmission (absolute seconds since 1/1/1970)" per IPFIX definition, but what receivers actually put there is software dependent:
- Some report the **start of the transmission period** (e.g. FT8 slot start, :00/:15/:30/:45), others report the **decode time** (about :11 to :14 into an FT8 slot, up to a whole slot later on slow machines). Evidence: in the 303-row FT8 sample 62% of `flowStartSeconds % 15 == 0` (start-time reporters) and the remainder cluster at 11-14 seconds past (decode-time reporters); in the callsign sample (N1DQ as receiver, software reporting start time) 100% were multiples of 15.
- The author publishes `https://pskreporter.info/api/characteristics`: `{"WSJT-X v3.0.1":{"time_start":1,...}}` where `time_start` = 1 means the software reports the transmission start. 786 entries have 1 and 1185 have 0 (an unknown software defaults to "decode time").
- The MQTT bridge derives `t_tx`: copy `t` if software is flagged time_start=1; for FT8 decode-time reporters snap to the 15 s boundary nearest `t - 13 s`; for other modes with decode time, `t_tx` is omitted ("not set to t"). WSPR never has `t_tx`.
- Time is always Unix epoch UTC, whole seconds. There is no sub-second timing in outputs (deltaT exists in upload protocol only). Delivery latency: the sender transmits, the receiver batches UDP uploads with a 5-minute max interval ("datagrams ... no more than one every five minutes (unless the packet becomes full)"), so the real arrival lag can be seconds to many minutes; hence HamAlert's `maxAge` 15 min filter on `flowStartSeconds`. Receivers' clocks can be wrong; the server corrects skew only if the packet send time is >1 minute off.
- HamAlert's `time` field is built with `getHours()/getMinutes()` (local server time, not UTC); fine only if the server runs in UTC. Worth fixing in the rewrite.

**Frequency.** Integer Hz in stream/XML/MQTT (`f`). It is the signal's absolute RF frequency including the audio offset, so FT8 spots on 20m span 14,074,000-14,077,000, not one channel. Precision 1 Hz (sub-Hz `fractionalFrequency` exists in uplink only). Wrong by the dial offset when the receiver has no CAT/uses the wrong band (documented 1-2% of monitors). Bands: need own band table (MQTT supplies `b` as `160m`...`23cm`, `2200m`, `600m`, `11m` exist as well).

**Mode vocabulary.** PSK Reporter follows ADIF MODE/SUBMODE values (pskdev.html: "One of the ADIF values for MODE or SUBMODE") but receivers send free strings, uppercase. Observed LIVE as `<activeReceiver mode=...>` (6238 receivers on 2026-10-13, counts): FT8 5458, FT4 220, JS8 198, VARAC 169, WSPR 68, CW 51, JTTY 22, FREEDV 17, FSQ 9, PSK31 5, FST4W 4, PI4 2, Q65 2, FT2 2, RTTY 2, ROS 2, OPERA 2, JT65 1, Q65D 1, TEMPOFAS 1, MSK144 1, PKT 1. Observed on reception reports: only FT8 (queries were FT8 only). Additional values referenced by documentation: the MQTT topic builder lists FT8, FT4, CW, MFSK, JT9, JT65, PSK31, PSK63, RTTY, OLIVIA, SSB; the pskmap UI offers FT8, JT65, `PSK*` (wildcard in `mode=`), PSK31; HamAlert's code handles `OLIVIA...` (ADIF submodes like `OLIVIA 8/250` etc.); WSJT-X emits JT4, JT9, JT65, FST4, FST4W, Q65, MSK144, WSPR, FT8, FT4 and also ISCAT, Echo (not spotted); mixture-of-traffic share over a long period (ham-stats.com): FT8 92.2%, WSPR 4.2%, FT4 2.5%, CW 0.49%, JS8 0.32%, VARAC 0.17%, FT2 0.08%, RTTY 0.01%, FREEDV 0.01%, JT65 <0.01%. I could not enumerate every mode ever used; a full census requires watching the stream/MQTT for a day. SSB was said to be not captured by one consumer, but the topic builder lists it.
Mode strings are mostly bare names with no submode (`Q65` vs `Q65D`, `FST4` vs `FST4W`, `PSK31`/`PSK63`/`PSK125`...).

**How HamAlert collapses modes.** `pskreporter.js`: drops `CW` (RBN is better), drops `WSPR` and `FST4W` (beacon modes), and rewrites any mode starting with `OLIVIA` to `OLIVIA`. Then in `server.js normalizeSpot()`: lowercase, keep the original lowercase string in `modeDetail`, then `psk*` -> `psk`, `jt*` -> `jt`, `msk*` -> `msk`, then the mode guesser may override (`modeIsGuessed`, only for modes it recognises as ambiguous). Consequence: JT65/JT9/JT4 -> `jt`, MSK144 -> `msk`, PSK31/PSK63/PSK125 -> `psk`. Gotcha: the `startsWith('jt')` rule also swallows PSK Reporter's `JTTY` (a RTTY-like mode) into `jt`. `FT8`, `FT4`, `FST4`, `Q65`, `JS8`, `VARAC`, `FREEDV`, `FSQ`, `RTTY`, etc. pass through unchanged (lowercased) and the quorum is keyed per exact original mode string (`call-band-mode`), so `JT65` and `JT9` reports of the same call do not combine.

**Other filters in the current code (keep or consciously drop):** missing `mode`; `senderCallsign` missing or starting `TNX` (thank-you messages decoded as callsigns) or ending `/R`, `/RX` (receive-only markers); receiver callsign matching `^(N0CALL|W/SWL)` (placeholder default calls); decoder software containing `N1DQ-Importer-KA9Q-Radio` (importer that invents spotter calls with odd suffixes); `maxAge` 15 min. Receiver DXCC lookup is skipped when the spotter callsign does not match a structured callsign regex (so `EA8-DF4UE`, `VU2OY-9` style names don't wrongly resolve). In XML data I also saw receivers named `K1RA-4`, `VU2OY-9`: the `-N` suffix passes the regex.

**Duplicates.** Within one response no exact duplicates (same sender, receiver, time, frequency) were found. But the same transmission is reported by every receiver in range (that is the point), and multiple instances of one receiver can report one transmission (suffix callsigns, same operator, multiple SDR channels). A receiver with decode-time software and one with start-time software report the same transmission with timestamps up to a slot apart (see the authors' worked example: 26 reports of one FT8 transmission produced t of :00, :11, :12 and :57 -> t_tx all :00).

**Test / bad data.** The upload protocol marks tests with `informationSource & 0x80`; not visible downstream. Spurious sender callsigns come from mis-decodes ("TNX" etc.). Placeholder/garbage receivers exist (N0CALL). `sNR` can be missing (stream `null`). 1/303 XML report had no frequency. Locators of both parties can be wrong or user-supplied. `senderDXCC*` come from PSK Reporter's prefix table and may be wrong for portable/prefixed calls (e.g. `DU1/NF0O` correctly Philippines, `PJ4/DH8BQA` Bonaire).

**Comment conventions.** None. There is no free text, so no summit/park/IOTA hidden references. Any SOTA/POTA matching must come from the callsign (e.g. cross-matching with the SOTA/POTA spot feeds), not from this source.

**Volumes.** About 26 million spots/day, peak ~300/s, 92% FT8 (ham-stats.com, collected from MQTT since Feb 2026). The rewrite must filter early (drop WSPR/CW) and keep only a small per-key window in memory; HamAlert already minifies emitted entries.

---------------------------------------------------------------------------------------------------

## 5. Related reference data

| Data | URL | Format | Cadence | Sample |
|---|---|---|---|---|
| Decoder characteristics (which software reports TX start vs decode time) | https://pskreporter.info/api/characteristics | JSON map name -> `{time_start,id}` | refreshed by author; MQTT bridge refetches hourly | `{"WSJT-X v3.0.1":{"time_start":1,"id":...},"AT-FT8/1.0":{"time_start":0,"id":1},"CWSL_DIGI 0.82":{"time_start":1,"id":2}}` (1971 entries; 786 with time_start=1) |
| Active receivers (software, antenna, rig, bands) | the `<activeReceiver>` list in any non-`rronly` XML query; or MQTT `pskr/rxinfo/#` retained | XML / JSON | live (hourly in MQTT) | see section 2 |
| DXCC entities (name/prefix/locator) | built into the API output (`senderDXCC`, `senderDXCCCode`, `senderDXCCLocator`); MQTT uses ADIF DXCC numbers `sa`/`ra` (and in topics) | n/a | n/a | `United States` / `K` / `EM47`; MQTT example `sa`=269 (Poland, sender SP2EWQ), `ra`=149 (Azores, receiver CU3AT) |
| ADIF DXCC enumeration (to decode `sa`/`ra`) | https://adif.org/ (Enumeration "DXCC Entity Code") | ADIF | rarely | |
| HamAlert's own DXCC/band tables | `config_clean.js` / `server.js` | | | PSK Reporter data does not replace HamAlert's DXCC resolution because the entity naming is non-standard |

Note the PSK Reporter DXCC code (`K`, `DL`, `HZ`) is the entity's main prefix, not necessarily HamAlert's prefix key.

---------------------------------------------------------------------------------------------------

## 6. Proposed mapping

Base Spot (shared across sources):

| Base field | From PSK Reporter | Notes |
|---|---|---|
| `source` | constant `"pskreporter"` | |
| `callsign` (full, as sent) | `senderCallsign` | uppercase; strip nothing; drop `TNX*`, `*/R`, `*/RX`; HamAlert derives the base callsign (`callsign`) and prefix itself. |
| `spotter` | `receiverCallsign` | uppercase. Non-human, automated. Drop `N0CALL`, `W/SWL`. |
| `frequency` | `frequency` Hz / 1e6 (MHz, float) or keep integer Hz | keep Hz as the integer to avoid rounding; the rest of HamAlert uses MHz. Missing frequency -> drop. |
| `mode` | `mode` | normalise per section 4 (keep original in `modeDetail`). |
| `time` | `flowStartSeconds` as UTC instant (or MQTT `t_tx ?? t`) | Always UTC. State clearly that it may be decode time rather than TX start. |
| `comment` | none | Could synthesize `FT8 -7 dB` but better leave null. |
| `rawText` | synthesize `DX de {rc}: {kHz} {sc} {mode} {snr} dB {HHMM}Z ({software})` as today | purely cosmetic; keep for notification text and UI. |
| `title` | synthesize `PSK Reporter spot {call} ({freq} {mode})` | |

PSK Reporter / "automatic reception report" extension (suggested name `ReceptionReportSpot`; also a good fit for RBN, so consider a shared "skimmer-ish" kind):

| Field | Type | Optional? | Raw |
|---|---|---|---|
| `snr` | int dB or null | optional (null in stream) | `sNR` / `rp` |
| `spotterSoftware` | string or null | optional (stream only; MQTT only via rxinfo) | `receiverDecoderSoftware` |
| `spotterLocator` | string (4/6/8/10 chars, normalise case) or null | optional | `receiverLocator` / `rl` |
| `senderLocator` | string or null | optional | `senderLocator` / `sl` |
| `timeIsTxStart` | bool or null | optional | from `characteristics.time_start` / presence of `t_tx` |
| `reportedAt` / `txStart` | instant | | `t` and `t_tx` if MQTT is used |
| `sequenceNumber` | int64 | optional | `sequenceNumber` / `sq` (dedupe/resume) |
| `quorum` (spotters count) | int | computed | HamAlert-side: unique spotters in window when emitted |
| `spotterNoDxccLookup` | bool | computed | today `noSpotterDxccLookup` |
| `senderDxccName/Code/Locator`, `senderLotw`, `senderEqsl` | | optional, XML only | `senderDXCC*`, `senderLotwUpload` (date), `senderEqslAuthGuar` ('A') |

Enrichment the backend must still do: band (`config.bands`; or use MQTT `b`), DXCC of sender (do not trust PSK Reporter's naming; fall back from `senderDXCCCode` only as a hint) and of spotter (regex-gated), continent/state/prefix, mode normalisation and mode guessing (not needed here; mode is always explicit), quorum/dedupe, age filter. Fields that cannot exist for this source: summit/park/IOTA references, comment, QRT/delete state, spotter "human" flag, speed (WPM), spot id (use `sequenceNumber`).

---------------------------------------------------------------------------------------------------

## 7. Open questions / risks

1. **Stream access is a private favour.** Token issued by the author by email; no public documentation or SLA, and the author calls the retrieve API's limits "may be rate limited in future". MQTT (https://www.mqtt.pskreporter.info/) is the public, documented alternative, but it is a third-party relay (M0LTE) of the same data. Decide whether the rewrite should abstract "PSK Reporter source" behind an interface so either transport works.
2. **MQTT lacks `receiverDecoderSoftware` in the spot message** (it is on a separate `pskr/rxinfo/{call}` retained topic, keyed by receiver). HamAlert's N1DQ-importer filter and the `spotterSoftware` field would need a join against a locally cached rxinfo map. Also MQTT QoS 0 means spots are lost on reconnect, and callsigns with `/` use `.` in topic names (`JW/WE9G` -> `JW.WE9G`), which a user found to break filtering; consumers should subscribe broadly (`pskr/filter/v2/#`) and filter locally.
3. **Unverified stream schema.** I could not capture a live stream line. The 2018 sample has 10 keys; today there may be more (e.g. DXCC enrichment as in XML). Ask the maintainer or capture a minute of the stream from the existing server before finalising the schema; make the parser tolerant of added/missing keys, `sNR: null`, missing `mode`, and missing `frequency`.
4. **Time semantics are not uniform.** `flowStartSeconds` is sometimes decode time, sometimes TX start (up to a full FT8 slot difference). Decide whether `Spot.time` means "transmit start where known else report time" and carry a flag. Today's code ignores this; the quorum window (15 min) is large enough that it doesn't matter, but UI "age" displays may be off by up to ~15 s (FT8) or 2 min (slow modes).
5. **Local-time bug** in current `time` HH:MM (server timezone). Use UTC instants in the new model.
6. **Mode vocabulary is open-ended.** New modes appear (FT2, VARAC, FREEDV, JTTY, ROS, OPERA, TEMPOFAS, PI4, FSQ...). Do not enumerate in an enum; keep `mode` as normalised string plus `modeDetail`. The `startsWith('jt')` collapse wrongly captures `JTTY`; the `psk*`/`jt*`/`msk*` family rules should be an explicit allow-list (`JT4`, `JT9`, `JT65`, `JT6M`, `PSK*`, `MSK144`) in the rewrite.
7. **Quality gating.** Quorum 3 within 15 min, plus callsign sanity checks (`TNX`, `/R`). Consider also validating the sender callsign against a callsign regex and dropping obviously invalid receivers (`EA8-DF4UE`), and filtering by `informationSource` if exposed. Also whether the quorum should apply to rare/new modes (VARAC, JS8) the same way.
8. **Volume** (~26 M/day, 300/s peak) means notification matching for this source should be cheap and filtered early; WSPR/CW are already dropped.
9. **Frequency absent** in ~0.3% of XML reports; stream behaviour unknown. Drop rather than crash.
10. **Sender locator** is rarely used by HamAlert but is a free way to give a "heard in grid X" or distance filter; consider carrying it.
