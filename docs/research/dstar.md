# D-STAR digital voice activity (QuadNet, ircDDB, dstarusers.org)

Researched 2026-10-13 ~23:10 UTC. Raw samples are in `.../scratchpad/sources/raw/dstar/`. Scripts are in `.../scratchpad/sources/scripts/dstar_*.py`.
Upstream reference is `.../scratchpad/upstream/hamalert-server` (`dstar.js`, `dstar_nodes.js`, `dstar_links.js`, `dstar_groups.js`, `config_clean.js`, `server.js`, `simulator.js`, `ratelimit.js`, `notify/telnetconn.js`), `hamalert-web` (`js/trigger_editor.js`, `help.php`, `destinations.php`, `myspot.php`, `simulate.php`) and `hamalert-app` (`www/js/app.js`).

Things I could not do:
- **ircDDB live log unreachable.** `http://live.ircddb.net:8080/jj3.yaws` and `.../ircddblive5.html` time out through the sandbox proxy. Port 8080 is not reachable here; ports 80 and 443 work. I used the real capture that upstream committed at `tools/fixtures/ircddb-jj3.txt` (copy: `raw/dstar/upstream_fixture_ircddb-jj3.txt`, 36 lines, 2026-09-15) plus the upstream parser.
- **Design discussion summary not found.** You mentioned one, but I was given no path. The only design intent I had is the code, its comments and the README. Everything about "privacy / CQ vs directed / NO VIS" below comes from the code and the live data.
- **DCS and XLX dashboards sampled only lightly.** One XLX dashboard (XLX822) and the XLX reflector directory API were fetched. No DCS dashboard was fetched.

## Headline findings

1. **This is presence data, not a DX spot.** Every record says "callsign X keyed up on repeater/hotspot module Y (maybe via reflector Z) for N seconds", or "X sent a link command". There is no frequency, no mode string other than "DV", no spotter, no report and no comment other than the 20-character radio TX message.
2. **Three feeds with different shapes.** HamAlert emits one normalized event per (callsign, event, place) per 15 minutes, with `source` = the feed that saw it first.
   - QuadNet: plain-text log, one line per finished transmission.
   - ircDDB: fixed-width records, with a header record at key-up and a stats record at key-off.
   - dstarusers.org: an HTML table, where each row is "callsign last heard at node".
3. **Frequency is never in the feed.** It is joined later from directories keyed by node. Observed coverage:
   - QuadNet-heard nodes: 75 of 76 distinct nodes resolved from the QuadNet `gateway.php` list (99% of events).
   - dstarusers.org repeater rows: only 2 of 17 resolved from either list. The rest carry only a band label ("440 MHz", "2 Meters").
   - Reflector modules: never have a frequency.
4. **Module-letter band guessing is unreliable** (computed from 3,686 QuadNet entries that have a frequency):

   | Module letter | Result against the QuadNet list |
   |---|---|
   | B | 70cm in 3,644 of 3,686 (99%) |
   | C | 2m in 418 of 644 (65%); 70cm in 226 |
   | A | 23cm in only 16 of 129 (12%); 70cm in 113 |

   The upstream guess `A=23cm, B=70cm, C=2m` is wrong most of the time for hotspots. dstarusers.org's own module-to-band labels are the same convention (A=1.2GHz, B=440, C=2 Meters, D/E="Unknown").
5. **The reflector is absent roughly half the time.**
   - In a 2 h QuadNet sample (810 transmissions), 418 (52%) have a destination reflector/module and 392 have none.
   - Reflector activity on the REF/XRF/DCS/XLX side is not in QuadNet or ircDDB as a separate stream. It is visible only as the last-column "destination" of the repeater's transmission, or via dstarusers.org rows or the reflector dashboards.
6. **The privacy mechanism is explicit in the data.** ircDDB masks MY as `********` unless the operator sent `VIS ON`. In the fixture, 32 of 35 records are masked, and upstream drops those. QuadNet and dstarusers.org have no masking, so a masked ircDDB user can still appear via QuadNet. Details are in section 4.

---

## 1. Access

| Feed | Endpoint | Protocol and cadence | New-record detection | Auth |
|---|---|---|---|---|
| QuadNet heard log | `https://www.openquad.net/ics/ics` (the viewer page is `/ics/`, a Daniel Richman "logtail.js" page that tails the file) | Plain-text file, `Accept-Ranges: bytes`. Poll with HTTP Range. Upstream: 15 s poll; first fetch `bytes=-65536` to prime, then `bytes=<offset>-`. Server is nginx. | Byte offset. `Content-Range: bytes a-b/TOTAL` gives the total size. A `416` with `TOTAL < offset` means the file was truncated or rotated. | None |
| ircDDB live log | `http://live.ircddb.net:8080/jj3.yaws?p=N` (plain HTTP, port 8080). `https://ircddb.net/live.htm` is only a frameset around `http://live.ircddb.net:8080/ircddblive5.html`. | HTTP GET, 15 s poll upstream. Per upstream: the server returns lines N to the end if fewer than 100, otherwise the last 100 lines, also when nothing is new. A bare `err` line is possible. **Not reachable from the research sandbox.** | Monotonic line number prefix `N:`. A drop in numbers means the log restarted. | None |
| dstarusers.org last heard | `https://www.dstarusers.org/lastheard.php` | Static HTML table, last hour only. Page has `<meta http-equiv="REFRESH" content="300">`. Upstream polls every 30 s and claims DStarMonitor agents refresh roughly every 30 s. | No ids or offsets. Upstream diffs on key `time|callsign|node` against the previous poll, with a 5 min late-row window. | None. PHP session cookie is set but not needed. |
| Node directory, QuadNet | `https://www.openquad.net/gateway.php` | HTML table, 5,222 rows, 2.2 MB. Hourly refresh upstream. | Per-row "updated" timestamp. | None |
| Node directory, ircDDB | `https://status.ircddb.net/repeater.php?n=<N>` | HTML. Default page shows only 30 rows. Prints "Total available records: 619"; `?n=700` returns all (518 KB). Hourly refresh upstream. | Rows have "Last Act" and "Last Rep" timestamps. | None |
| Repeater directory (dstarusers) | `https://www.dstarusers.org/repeaters.php` | HTML. Default view is USA (851 rows). The country filter is a POST of `countrylisting=<id>&criteriago=Go` and needs the session cookie. `998` = All Reflectors (81 rows), `999` = all entries. | n/a | Cookie only |
| Per-system detail (dstarusers) | `https://www.dstarusers.org/viewrepeater.php?system=REF030` | HTML: system info, per-band frequency, and "Unique Stations Heard In The Last 14 Days". REF030's page is 728 KB. | Rows are time-stamped. | None |
| Smart Group directory | `https://www.openquad.net/starnet.php` | Small HTML page (2.6 KB). Group *definitions* only, not activity. | "Last Update" column. | None |
| REF reflector dashboard | `http://refNNN.dstargateway.org/` (DREFD / DPlus dashboard) | HTML, plain HTTP. Used by upstream to resolve "hotspot X is linked to REF030-C". It also has its own "Last Heard" list. | Timestamped rows. | None |
| XLX | Reflector directory: `http://xlxapi.rlx.lu/api.php?do=GetReflectorList` (XML, 911 reflectors, each with a `dashboardurl`; HTTPS reset in the sandbox, HTTP worked). Per-reflector dashboards are xlxd PHP pages. | HTML | Timestamped rows | None |

**Rate limits and robots:** none are documented for any of these. Upstream uses User-Agent `HamAlert/1.0 (+https://hamalert.org)`. There is a politeness risk: openquad.net and dstarusers.org are volunteer-run (the DStarMonitor program is voluntary, per `https://www.dstarusers.org/howwedoit.html`).

**Log rotation (QuadNet):** the file started at `2026-10-13 04:00:06` and was 918,525 bytes at 23:11 UTC, which is about 19 h and about 8,000 lines. Rotation looks daily and close to 04:00 UTC. That is an inference from one observation. The consumer must handle a shrinking file.

**Official docs:** there is no API documentation for any of the three. Closest references:
- logtail source: `https://www.openquad.net/ics/logtail.js`
- DStarMonitor explanation: `https://www.dstarusers.org/howwedoit.html`
- Local-club page on the ircDDB visibility opt-in: `https://www.sites.google.com/site/wcarasite/digital-comm/d-star-kd8tuz-settings`
- ircDDB project docs: `http://db0fhn-i.ampr.org/doku.php?id=projects:dstar:ircddb` (linked from the ircDDB live header; not fetched)

## 2. Raw record format

### 2a. QuadNet `ics` (verbatim, 2026-10-13)

```
2026-10-13 23:09:22    6.40s:  0%: 0.0% PY2VE___/TH74 CQCQCQ__ PY2VE__B PY2VE__G RUBENS_ARTUR_NOG_SP_ ________
2026-10-13 23:09:09   40.22s:  0%: 0.0% PU2DDZ__/ID51 XLX062CL PU2DDZ_B PU2DDZ_G ELTON_______________ ________
2026-10-13 21:15:33    0.56s:  0%: 8.3% PU2KWD__/5100 CQCQCQ__ PY2KPE_B PY2KPE_G EDMILSON_SAO_PAULO__ XRF018_C
2026-10-13 21:46:58    1.80s:  0%: 0.0% KD0OSS__/92AD WB0VHB__ KD0OSS_B KD0OSS_G Rick,_New_London,_IA WB0VHB_B
2026-10-13 22:34:44    3.20s:  0%: 0.0% F4GZR___/ID52 /IR0CJ_C F4GZR__B F4GZR__G 73's________________ ________
2026-10-13 21:13:17    0.86s:  0%: 0.0% ZL1ER___/ID51 _______U ZL1ER__B ZL1ER__G CRAIG_ROTORUA_______ ________
```

Layout: `YYYY-MM-DD HH:MM:SS` (UTC), then `<dur>s:`, then `<silence%>%:`, then `<BER>%`, then `MY(8)/EXT(4) UR(8) RPT1(8) RPT2(8) MSG(20) DEST(8)`. Spaces inside fixed fields are written as `_`. Upstream regex:
`^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)\s+([\d.]+)s:\s*(\d+)%:\s*([\d.]+)% (.{8})\/(.{4}) (.{8}) (.{8}) (.{8}) (.{20}) (.{8})$`.
All 810 lines in my 2 h sample matched; there were no unparseable lines.

### 2b. ircDDB live (`jj3.yaws`): real capture, 2026-09-15 (upstream fixture)

```
1739:20260915115708********VA3PMO_B0VA3PMO_GCQCQCQ__000000____00____________________________
1740:20260915115717********VA3PMO_B1VA3PMO_GCQCQCQ__000000____00________9.4s_S:0%_E:0.0%____
1749:20260915115905********WA0RC__B0WA0RC__GREF030CL000000____00REF030_C____________________
1751:20260915093344EB1EGO__ED1ZAB_B0ED1ZAB_G_______I000000ID5100________
1752:20260915093344EB1EGO__ED1ZAB_B1ED1ZAB_G_______I000000ID5100________0.3s_S:0%_E:0.2%____
1766:20260915120000********PY2KPE_B0PY2KPE_GCQCQCQ__000000____00XRF018_C
1767:20260915120000********PY2KPE_B1PY2KPE_GCQCQCQ__000000____00________1.6s_S:98%_E:0.0%___
```

Fixed-width record after the `N:` prefix (offsets verified against the fixture and the upstream parser):

| Offset (0-based) | Length | Content |
|---|---|---|
| 0 | 14 | `YYYYMMDDHHMMSS` (UTC) |
| 14 | 8 | MY, or `********` if masked |
| 22 | 8 | RPT1 (repeater, module in column 8) |
| 30 | 1 | type flag: `0` = header at key-up, `1` = stats at key-off, `2` = header from an unregistered station |
| 31 | 8 | RPT2 (gateway, normally ends in `G`) |
| 39 | 8 | UR |
| 47 | 6 | `000000` (meaning unknown, always zeros here) |
| 53 | 4 | MY suffix (`ID51`, `____` if none) |
| 57 | 2 | `00` (unknown) |
| 59 | 8 | DEST (reflector + module the transmission was routed to) |
| 67 | 20 | header record: TX message; stats record: `<dur>s_S:<silence>%_E:<BER>%` |

Records can be short (the PY2KPE header is truncated after DEST). The parser pads to 99 characters.
- **No spaces:** unlike QuadNet, spaces in fields are `_` here too, but a header and its stats record are separate lines. The message exists only on the header line; the duration exists only on the stats line. Upstream joins them by key `MY|RPT1` with a 10 min TTL.
- **Control commands:** record 1751 shows an ircDDB control transmission (UR `_______I` = info) with a real MY.

### 2c. dstarusers.org `lastheard.php` (verbatim rows)

```html
<table class="systemtbl" width="95%">
  <tr class="rowreshdr">
   <td>...Callsign...</td> <td>...Time Heard...</td> <td>...Reporting Node...</td>
   <td>253 Unique callsigns heard in the last hour</td>
  </tr>
  <tr class="rowres2">
    <td><a href="https://www.qrz.com/db/N3JAY" target="_blank"><b>N3JAY</b></a></td>
    <td>10/13/26 23:10:26 UTC</td>
    <td><a href="/viewrepeater.php?system=KJ6LJZ">KJ6LJZ B  440 MHz</a></td>
    <td>Wrightwood, CA, USA</td>
</tr>
  <tr class="rowres1">
    <td><a href="https://www.qrz.com/db/KJ5MWY" target="_blank"><b>KJ5MWY</b></a></td>
    <td>10/13/26 23:09:37 UTC</td>
    <td><a href="/viewrepeater.php?system=REF054">REF054 A  1.2GHz DVD</a></td>
    <td>Charlotte, NC, USA</td>
</tr>
  <tr class="rowres1">
    <td><a href="https://www.qrz.com/db/ZL2TWS" target="_blank"><b>ZL2TWS A</b></a></td>
    <td>10/13/26 23:07:52 UTC</td>
    <td><a href="/viewrepeater.php?system=ZL2VH">ZL2VH  Dongle User DVD</a></td>
    <td>Upper Hutt, Wellington, New Zealand</td>
</tr>
```

The time format is `MM/DD/YY HH:MM:SS UTC`. The header cell says "N Unique callsigns heard in the last hour". The page time "Current Time is 10/13/2026 23:09:39 UTC" is older than the first row (`23:10:26`), so row timestamps come from remote reporter clocks and can run ahead of the server (about 47 s here).

### 2d. Reflector and other dashboards (for the "who is on module X" view)

REF030 DPlus dashboard "Last Heard" section (text extract, 2026-10-13):
```
Last Heard | Callsign | User Message | Last TX on | Time
LU4CN   |Carlos              |C|2026/10/13 23:11:52
KB1YAP  |C|2026/10/13 23:11:39
W7WHB   |C|2026/10/13 23:11:05
W8JJ   B|Tim - Michigan, USA |C|2026/10/13 22:07:29
M7PHB   |E|2026/10/13 21:45:21
906 remote users - 37 gateways | Status as of 2026/10/13-23:12:28.374
```
Here "Last TX on" is the reflector module, and the callsign carries its 8th-char module letter (`W8JJ   B`). The same dashboard has a "Remote Users" table (hotspots "listening", type HotSpot) and a "Linked Gateways" matrix.

XLX822 dashboard row (xlxd):
```html
<th>#</th><th>Flag</th><th>Callsign</th><th>Suffix</th><th>DPRS</th><th>Via / Peer</th><th>Last heard</th><th>Listening on</th>
... <td>HS3SXW</td><td>DVSW</td><td>HS3SXW  C</td><td>14.10.2026 06:13</td><td align="center">U</td>
```
The time is in the **reflector's local time** (this one was 06:13 for 23:13 UTC, so UTC+7), with no timezone marker, and the dashboard's own layout.

### 2e. Smart Group row (`starnet.php`)
```html
<tr><td>Subscribe</td><td>Unsubscribe</td><td>Reflector</td><td>Status</td><td>Timeout</td><td>Rx Only</td><td>Module</td><td>Description</td><td>Last Update</td></tr>
<tr><td>DSTAR1&nbsp;&nbsp;</td><td>DSTAR1&nbsp;T</td><td>XRF757&nbsp;A</td><td>LINKED</td><td align="right">300</td><td align="center">no</td><td>KN4RSC&nbsp;A</td><td>QuadNet&nbsp;Array&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td><td align="right">42 min</td></tr>
<tr><td>QNET20&nbsp;C</td><td>QNET20&nbsp;Z</td><td>XRF587&nbsp;C</td><td>LINKED</td><td align="right">300</td><td align="center">no</td><td>KN4RSC&nbsp;C</td><td>QuadNet&nbsp;Tech&nbsp;Chat&nbsp;&nbsp;&nbsp;</td><td align="right">42 min</td></tr>
```
There are 8 groups: CTDSTR C, DELINK, DSTAR1, HTSPOT, NYCQNS T, PISTAR, QK4NWS, QNET20 C. Some are linked to an XRF reflector, which is why the Smart Group entity can have its own reflector (upstream ignores that).

### 2f. Node directory rows

QuadNet `gateway.php` (columns: repeater, frequency, offset, map, location, software, url, updated):
```
<tr><td><font size=1>2E0CMS_B</td><td><font size=1>00434.0000</td><td><font size=1>+000.00000</td><td>...+51.30322,+000.44171</a></td><td>Larkfield, JO01fh United Kingdom</td><td>linux_mmdvm-dvmega-20240210_PS4</td>...<td>2026-08-19 12:13:06</td></tr>
```
The first row is a junk entry `0______0` with no frequency (a placeholder, lat/long in California).

ircDDB `repeater.php`: columns Nr., RPT status, Repeater, GW status, Gateway, Last Act (UTC), Last Rep (UTC), QTH, URL, Lat/Long, `QRG/Offset (MHz)` ("145.70000<br>-0.600"), Range/AGL, Software.

dstarusers `repeaters.php` row: `AA1HD | Vernon | CT | 145.26000MHz -0.600 | 442.15000MHz +5.000 | | ` (columns 2m / 70cm / 23cm / 23cmDD, per-callsign not per-module, so the module letter is implied by the band column).

## 3. Field inventory

### 3a. QuadNet `ics` line (810 records, 2026-10-13 21:06 to 23:11 UTC, 76 distinct MY)

| Raw field | Type | Presence | Examples | Notes and quirks |
|---|---|---|---|---|
| timestamp | `YYYY-MM-DD HH:MM:SS` | 100% | `2026-10-13 23:09:22` | UTC, 1 s resolution, no zone marker. It is **the end of the transmission** (a line is written per completed transmission), not key-up. |
| duration | float seconds + `s` | 100% | `6.40s` | Min 0.08, median 3.46, max 136.76. 312 of 810 (38%) are under 2 s. |
| silence | int percent | 100% | `0%`; 12 records non-zero (`92`, `2`, `1`, `84`) | Percentage of silence/lost frames. |
| BER | float percent | 100% | `0.0%`, `8.3%` | Bit error rate. 23 of 810 non-zero. |
| MY | 8 chars, `_`-padded | 100% in this sample; **sometimes empty** | `PY2VE___`, `KB3MHB02` | One record had an all-underscore MY (`________`, an `_______E` echo command). 10 records have an 8-char value with digits appended (`KB3MHB02`): operators or software append 2 extra characters. Upstream's `callsignRegex` rejects these. Callsigns with `/` suffixes were not observed because the field is only 8 characters. |
| MY suffix (EXT) | 4 chars | 84% | `DVSW` (42%), `ID52`, `ID51`, `TH74`, `4100`, `D75`, `7100`, `92AD`, `5100`, `705`, `880H`, free text such as `TOM`, `NICK`, `JIM`, `CLUB`, `BILL`, `OWEN` | 16% (129) empty (`____`). The "4-char suffix" is often a radio model, but it can be a name. `DVSW` is the Pi-Star/WPSD/MMDVM default, which is why 42% of this sample is hotspots. |
| UR | 8 chars | 100% | `CQCQCQ__` (79%), `REF030CL`, `XLX062CL`, `/IR0CJ_C`, `WB0VHB__`, `_______U` | See the UR classification table below. |
| RPT1 | 8 chars: call + module in col 8 | 100% | `PY2VE__B`, `KD0OSS_B` | Module letter distribution: B 596, C 113, E 50, W 16, D 11, A 10, M 7, H 6, F 1. In 695 of 810 (86%) the RPT1 callsign equals MY (a personal hotspot). |
| RPT2 | 8 chars: call + `G` | 100% | `PY2VE__G` | Always `G` here (810 of 810). Always the same callsign as RPT1 in this sample. |
| TX message | 20 chars | 80% | `RUBENS_ARTUR_NOG_SP_`, `San_Angelo,_TX_MMDVM`, `73's`, `BKK,TH@ID-51` | 162 of 810 empty. Free text from the radio. Often contains name and QTH, so it is personal data. `_` stands for a space (and also legitimately appears in text). |
| DEST | 8 chars: call + module | 52% (418 of 810) | `DCS237_A` (282), `XLX…` (72), `REF…` (40), `XRF…` (12), `WB0VHB_B` (9), `F1Z…`, `IR4…` | The reflector (or repeater) the transmission was routed to or heard on, **including module**. Empty `________` otherwise. For a link command it is the link target (`REF030_C`) on success; empty on failure (for example `XLX585RL`). It is never equal to UR in this sample. |

**UR classification observed (810 lines):**

| Kind | Count | UR examples | Meaning |
|---|---|---|---|
| CQ call | 639 (79%) | `CQCQCQ  ` | General call, routed to whatever the repeater is linked to |
| Link command | 103 (13%) | `XLX062CL`, `REF030CL`, `XLX585RL`, `JP6YIDAL` | 6-char reflector + 1 char module + `L` |
| Unlink | 17 | `       U` | Leading seven spaces + `U` |
| Info | 20 | `       I` | Same shape with `I` |
| Echo | 4 | `       E` | Same shape with `E` |
| Directed call (callsign) | 14 | `WB0VHB  `, `IU5IBK  `, `IU2VPA  ` | UR is a callsign. DEST is that callsign's repeater module. |
| Area routing | 7 | `/IR0CJ C`, `/F1ZKO B` | `/` + repeater callsign + module |
| Other commands | 6 | `SHUTDOWN` (4), `DPRS RPT` (2) | Hotspot or gateway control |

HamAlert sim (reimplementing upstream rules on this sample): 48 `linked` spots, 59 `active` spots (29 with a reflector, 30 without), 462 suppressed by the 15 min dedupe, 283 dropped as under the minimum voice duration, 14 directed calls ignored.

### 3b. ircDDB live record

Same logical fields as QuadNet, from the fixed offsets in 2b. Differences:
- **MY is masked** as `********` for stations that did not enable visibility. 32 of 35 records in the fixture are masked. When visible, MY is a normal callsign.
- **Type flag** at offset 30: `0` header, `1` stats, `2` header from an unregistered station.
- **Two lines per transmission**: the header (TX message, no duration) and the stats record (duration, silence %, BER; no message). There is no way to confirm a header ever gets its stats record, so a dropped stats line means no duration.
- **Duration** exists only in the stats record: `9.4s_S:0%_E:0.0%`.
- `000000` at offset 47 and `00` at 57 are always zero in the fixture; the meaning is undocumented.
- **No heard-time at key-off**: the timestamp is key-up for the header and key-off for the stats record (the fixture shows the same second for both on short transmissions).
- RPT1 and RPT2 as in QuadNet.

### 3c. dstarusers.org row

| Raw field | Type | Presence | Examples | Notes and quirks |
|---|---|---|---|---|
| Callsign cell | text + QRZ link | 100% | `N3JAY`, `ZL2TWS A`, `VK5DP  D` | 51 of 253 (20%) have a second token after the callsign. It is a **single letter** (D 42, B 3, A 2, P 2, L 1, one more), not a 4-char radio suffix. It looks like the 8th-character module/port letter of a DPlus login (`VK5DP  D`) and appears mostly on dongle/hotspot logins (48 of 51). Upstream puts it into `dvSuffix`; that is probably wrong. |
| Time Heard | `MM/DD/YY HH:MM:SS UTC` | 100% | `10/13/26 23:10:26 UTC` | UTC, 1 s. Newest row can be ahead of the page's own clock. Rows are newest first. Exact duplicate rows occur (two `N4LMC` rows at `23:09:27`). |
| Reporting Node | text + link to `viewrepeater.php?system=<CALL>` | 100% | `KJ6LJZ B  440 MHz`, `GB3DY  C  2 Meters`, `REF054 A  1.2GHz DVD`, `REF090 D  Unknown DVD`, `REF030  Dongle User DVD` | Four shapes. (1) **Reflector module** (`REF030 C  2 Meters DVD`): 65 rows. (2) **Repeater/gateway module** (`KJ6LJZ B 440 MHz`): 17 rows. (3) **No module, "Dongle User"**: 171 of 253 rows (68%) are dongle or hotspot logins with no module and no transmission, which upstream drops. (4) Trailing ` DVD` marks that the reporter runs DStarMonitor (present on 238 of 253 rows). The band text after the module is `2 Meters`, `440 MHz`, `1.2GHz` (no space), or `Unknown` (D/E modules); it is a label tied to the module letter, **not** a measured frequency. |
| Location (4th cell) | text | 100% | `Wrightwood, CA, USA`, `Unknown`, `USA` | Location of the **reporting node or reflector**, not the operator. |
| (no MY suffix, UR, RPT1/2, duration, message, or reflector link) | | | | A repeater-module row says nothing about whether the transmission was routed to a reflector. |

Page-level stats at 23:09 UTC: 253 rows = "253 Unique callsigns heard in the last hour". After dropping 171 "Dongle User" rows, 82 rows are usable (65 reflector-module + 17 repeater-module). All 65 reflector-module rows were REF; no XRF/DCS/XLX nodes appeared.

### 3d. Directory feeds (join data, not events)

| Directory | Key | Fields |
|---|---|---|
| QuadNet `gateway.php` (5,222 rows) | 8-char `CALL___M` | `frequency` (MHz, `00434.0000`; 73 rows blank or zero; one `00043.0725`; one outlier that looks like a unit error (about 1.47e8)), `offset` (`+000.00000` for hotspots), lat/long, location text, software, url, updated. 70cm: 4,571; 2m: 551; 23cm: 17. |
| ircDDB `repeater.php` (619 rows) | 8-char callsign in `ircddb-log?` link | status lights, gateway callsign, Last Act, Last Rep, QTH, lat/long, `QRG/Offset`, range/AGL, software. Overlaps QuadNet on only 141 nodes; 473 are ircDDB-only. They can disagree (VA3ODC-C is 443.875 in QuadNet and 145.1 in ircDDB). |
| dstarusers `repeaters.php` | system callsign (no module) | city, state, 2m / 70cm / 23cm / 23cmDD frequency + offset. |
| REF dashboards | gateway callsign + module | "Linked Gateways": a matrix with Module A-E columns, each cell `CALL  M` (the gateway's own module). |

## 4. Semantics and quirks

**Time**
- All times are UTC, to the second, except the XLX dashboards (reflector-local time, no zone).
- QuadNet and ircDDB-stats timestamps are **end of transmission**. The ircDDB header timestamp is key-up.
- dstarusers timestamps are when the reporting gateway saw the station; they can run ahead of the dstarusers page clock.
- Feed latency is small (QuadNet: last line was 2 s old at fetch time). Upstream ignores records older than 10 min (`maxAge`).

**Frequency and band**
- No feed carries a frequency. Only the dstarusers repeater row has a band label.
- Frequencies for hotspots are whatever the owner entered; they are often not amateur-coordinated. Observed values in the QuadNet list include `433.55`, `434.0`, `438.8`, and an outlier that looks like a unit error. Offsets are `0` for hotspots.
- Because a hotspot's "frequency" is its simplex TX channel, a D-STAR "spot" does not equal someone on that frequency in the sense DX users expect.

**Mode vocabulary**
- Always one mode: D-STAR digital voice (`dstar`). Upstream uses `mode: 'dstar'` and a `source` that names the feed (`quadnet`, `ircddb`, `dstarusers`). The `dv*` fields are the details.
- The feeds contain no mode text (no "DV", no "DMR"). Radios and hotspots that bridge from other digital modes through XLX/DCS show up as ordinary D-STAR.

**Who is the "spotter"**
- There is no human spotter. The gateway callsign (RPT2 minus `G`, which equals the repeater callsign in this sample) is used as `spotter`. For dstarusers rows the reporting node or reflector is used. This is a *station*, not a person who reported it.
- Hotspots are overwhelmingly the operator's own station (86% of sample events have RPT1 callsign = MY), so `spotter` is usually the operator themself.

**Event kinds (what HamAlert derives):**

| Event | Detected from | Fields available |
|---|---|---|
| Voice transmission heard ("active") | QuadNet/ircDDB: UR is `CQCQCQ`, area routing `/CALL M`, a Smart Group subscribe code, or a link command held at least 5 s. Duration at least 2 s. dstarusers: every module row. | time, MY, suffix (not dstarusers), node (RPT1), gateway (RPT2), message, reflector (DEST, if any), duration (QuadNet and ircDDB stats only), BER, silence |
| Link ("linked") | UR = `REFnnnML` / `XLXnnnML` / `DCSnnnML` / `XRFnnnML` | same as above, plus link target parsed from UR, not DEST. The link may fail: DEST is then empty and the transmission still shows. |
| Unlink, info, echo | UR = 7 spaces + `U`/`I`/`E` | Never produces an event |
| Directed call | UR = a callsign | Ignored by default (`ignoreDirectedCalls: true`). The target repeater is in DEST. |
| Smart Group subscribe/unsubscribe | UR = group code (`DSTAR1`, `QNET20 C`) / unsubscribe code (`DSTAR1 T`) | subscribe = voice with a group and no reflector; unsubscribe = ignored |
| Other commands | `SHUTDOWN`, `DPRS RPT`, `VIS ON` | Ignored |
| Dongle/hotspot login (no transmission) | dstarusers "Dongle User" row | Dropped by upstream |

**Privacy considerations**
- **CQ vs directed.** A `CQCQCQ` call is a general call to everyone listening. A directed call (UR = a callsign) is addressed to one person, and its UR value names the addressee. Upstream does not alert on directed calls by default and does not store UR. So the HamAlert spot reveals "X is on the air" but not "X called Y".
- **Operator visibility on ircDDB.** ircDDB masks MY as `********` unless the operator sent `VIS ON` (callsign in UR, spaces literal). Note: the README states "Stations on the ircddb.net network only appear if they have sent the `VIS ON` command at least once." I did not find a field called `NO VIS` in any feed; masking is the only expression of it in the data. A local-club page confirms the opt-in/out model (`VISsssON` / `VISssOFF`) but nothing found states the default. The ircDDB and QuadNet networks otherwise relay the same transmission, so a masked ircDDB station can still show in QuadNet's log under its real MY. The QuadNet and dstarusers.org logs are public and unmasked.
- **TX message** (20 chars) often contains names and QTH ("Rick, New London, IA"). Upstream puts it in `comment`.
- **Location (dstarusers)** is the node's location. For a personal hotspot that is the operator's home town.
- **Home-location proxy.** A hotspot callsign equals MY in 86% of events, so the node's registered lat/long in `gateway.php` is the operator's home position (including 5-decimal precision in the raw table).

**Duplicates and noise**
- The same transmission appears in multiple feeds (QuadNet and dstarusers for a hotspot; QuadNet and ircDDB for the same repeater), and as a header + stats pair in ircDDB.
- Many stations repeat: `W2ECR` produced 276 of 810 lines (34%) with `DVSW`/`DCS237_A`, apparently a bot or unattended bridge. 44 of the 103 link commands are the same `XLX062CL` from one station (`PU2DDZ`). Upstream dedupes on `MY|event|place` for 15 min; in my sample that suppressed 462 events and kept about 107.
- Short key-ups: 38% of transmissions are under 2 s (squelch tails, PTT taps, echo).

**Deleted/edited/QRT**: none. There is no notion of editing or deletion. Records are append-only. The nearest thing to "QRT" is an explicit `U` unlink or `SHUTDOWN`.

**Reflector name forms**: `REFnnn` (DPlus), `XRFnnn` (DExtra), `DCSnnn` (DCS), `XLXnnn` (xlxd). 3 letters + 3 digits + module letter; upstream normalizes to `REF030-C`. XLX reflectors bridge D-STAR/DMR/YSF/NXDN, so "activity on XLX062-C" does not mean D-STAR RF at the other end.

## 5. Related reference data

| List | URL | Format | Cadence | Sample row |
|---|---|---|---|---|
| QuadNet repeater/hotspot list | `https://www.openquad.net/gateway.php` | HTML table, 5,222 rows, 2.2 MB | Upstream hourly. Each row has an "updated" time (rows seen from 2026-07 to 2026-09). | `2E0CMS_B / 00434.0000 / +000.00000 / +51.30322,+000.44171 / Larkfield, JO01fh United Kingdom` |
| ircDDB repeater list | `https://status.ircddb.net/repeater.php?n=700` | HTML, 619 rows, 518 KB | Hourly | `4O0VBA C … 145.70000 -0.600 Bjelasica Montenegro` (offline since 2023) |
| dstarusers repeater directory | `https://www.dstarusers.org/repeaters.php` (POST for other countries) | HTML | Unknown, manual | `AA1HD Vernon CT 145.26000MHz -0.600 442.15000MHz +5.000` |
| dstarusers reflector list | same, `countrylisting=998` | HTML, 81 rows | Unknown | `REF003 Sydney New South Wales` |
| REF link table | `http://refNNN.dstargateway.org/` | HTML "Linked Gateways" matrix | Live | `GB7ME B` in the Module C column of REF030 |
| XLX reflector directory | `http://xlxapi.rlx.lu/api.php?do=GetReflectorList` | XML: name, lastip, dashboardurl, uptime, lastcontact, country, comment | Live | `XLX822 http://xlx822.dstarthailand.com …` |
| Smart Groups | `https://www.openquad.net/starnet.php` | HTML, 8 groups | Hourly upstream | `DSTAR1 / DSTAR1 T / XRF757 A / LINKED / KN4RSC A / QuadNet Array` |
| DXCC / prefix | existing HamAlert data | n/a | n/a | Used to derive `dxcc` from MY callsign |

Coverage check (2 h QuadNet sample): QuadNet's list resolved 75 of 76 distinct RPT1 nodes (802 of 810 events). For dstarusers repeater rows: 1 of 17 in QuadNet, 1 more in ircDDB only; 15 unresolved.

## 6. Proposed mapping

### Base Spot (fields every source can supply)

| Base field | D-STAR source | Notes |
|---|---|---|
| `callsign` / `fullCallsign` | MY (trim; strip `_`) | Reject empty and masked (`********`). Beware 8-char values like `KB3MHB02` (not a valid callsign; decide whether to truncate or reject). |
| `spotter` | RPT2 minus `G`, falling back to RPT1 callsign, or the dstarusers reporting node/reflector | A station, not a person. Often equals the spotted callsign. Optional in principle. |
| `frequency` | **Optional.** Lookup from node directory | Absent for reflector-only rows, unlisted nodes and many dstarusers repeater rows. |
| `band` | From frequency if known, else dstarusers label, else module-letter guess | See finding 4. Keep `bandIsGuessed`. |
| `mode` | `"dstar"` | Constant. |
| `time` | Record timestamp (UTC) | Key-off for QuadNet and ircDDB stats; the dstarusers value is when the reporting gateway saw it. |
| `comment` | TX message (20 chars) | Optional; often absent. Contains personal data. |
| `source` | `quadnet` / `ircddb` / `dstarusers` | Upstream keeps `mode` constant and uses `source` for the feed. |
| `rawText` | Synthesized (`"23:09 PU2DDZ heard on XLX062-C via PU2DDZ-B (8.6s): ELTON [quadnet]"`) | There is no native raw text. |

### D-STAR extension (suggested names; upstream names in brackets)

| Field | Type | Presence | Notes |
|---|---|---|---|
| `kind` / `event` [`dvEvent`] | `"active" \| "linked"` | always | Possibly extend with `"unlinked"` if wanted (currently never emitted). |
| `node` [`dvNode`] | string `CALL-M` | present except dstarusers reflector-module rows | RPT1 normalized. |
| `nodeCallsign`, `nodeModule` | string | derived | Split for matching ("W4HFH" or "W4HFH-C"). |
| `gateway` | string | QuadNet/ircDDB only | RPT2 minus `G`. Equals node callsign in all 810 samples. |
| `reflector` [`dvReflector`] | string `REF030-C` | **optional**: about 52% of QuadNet transmissions; always present for dstarusers reflector rows; **absent for local-only key-ups** | Call out the source: `reflectorSource: "feed" \| "dashboard"` [`dvReflectorSource`]. Upstream may fill it from the REF dashboard link table. |
| `reflectorProtocol` | `REF\|XRF\|DCS\|XLX` | derived | Useful for UI. |
| `group`, `groupName` [`dvGroup`, `dvGroupName`] | string | rare (Smart Group traffic only) | Mutually exclusive with `reflector` in upstream. |
| `suffix` [`dvSuffix`] | string(4) | about 84% for QuadNet and ircDDB; **dstarusers' second token is a module letter, not a radio suffix, so do not map it to this** | |
| `durationSeconds` [`dvDuration`] | float | QuadNet always; ircDDB only if the stats record arrived; never dstarusers | |
| `ber`, `silencePct` | float / int | QuadNet and ircDDB-stats | Currently discarded. |
| `frequencySource` | `"nodelist" \| undefined` | | Plus `offset` (MHz) if wanted. |
| `bandIsGuessed` | bool | | |
| `urKind` | `"cq" \| "link" \| "area" \| "group"` | internal | Directed calls are never emitted. |

Backend enrichment needed: spotter fallback, frequency lookup by node, band guess or label, DXCC from MY, group-name lookup, and reflector resolution from dashboards for key-ups with no DEST.

### Mapping from upstream spot to proposed model

`{source:"quadnet", fullCallsign:"PU2DDZ", mode:"dstar", dvEvent:"linked", dvNode:"PU2DDZ-B", dvReflector:"XLX062-C", spotter:"PU2DDZ", frequency:…|absent, band:…, dvSuffix:"ID51", dvDuration:40.22}`. The upstream `notifySpot` also builds `title` and `rawText`; the app builds its own title string from `dvEvent`/`dvReflector`/`dvNode` and omits the frequency in the headline when absent.

## 7. Open questions and risks

1. **Optional everything.** Downstream code must treat `frequency`, `band`, `reflector`, `node`, `gateway`, `suffix`, `duration` and `comment` as optional for D-STAR. `band` can be `"unknown"` or guessed. The current app handles absence of frequency (it prints "unknown"/omits it), but the shared base class must not make `frequency` required.
2. **Does D-STAR belong in the same Spot model at all?** It is a presence event with a place (node or reflector), not a callsign on a frequency. Consider a separate `kind` of spot, not a degenerate DX spot. Upstream's `dvEvent` default ("active" only) shows the product already treats it separately.
3. **Is the "spotter" meaningful?** It is the gateway, usually the spotted operator's own hotspot. Spotter-based triggers (blocked spotters, spotter DXCC/continent) behave oddly.
4. **Privacy.** Decide whether to carry masked ircDDB users (currently dropped), the TX message (names/QTH), and node lat/long (home locations) in the public Spot, and whether to emit UR/directed-call data at all (currently never). The mapping above keeps UR out of the model.
5. **Guessed band.** The A/B/C to 23cm/70cm/2m heuristic is wrong for 35% of C-module and 88% of A-module entries in the QuadNet list. Either drop it or use a better heuristic (frequency from the directory first; module letter only as a last resort, with the flag).
6. **Reliability and politeness.**
   - ircDDB live is HTTP port 8080 only; I could not validate its current behavior.
   - dstarusers.org is PHP 5.4 on CentOS and its layout is parsed with regexes.
   - Reflector dashboards are one-by-one scrapes (3 shapes: classic HTML, DREFD JSON, WebSocket-only).
   - XLX dashboards are in local time with no timezone.
   Consider caching and per-feed health reporting.
7. **dstarusers "suffix" misparse.** Upstream stores the module-letter token in `dvSuffix`. Fix or drop in the rewrite.
8. **Callsign validity.** MY values like `KB3MHB02` and empty MY exist. Upstream's regex rejects them silently (10 of 810 events in my sample, plus the empty echo).
9. **Dedupe key and identity.** Upstream's key `MY|event|place` collapses across feeds, so `source` on a spot is the *first* feed to report, not all. If the new model wants `sources: []`, the dedupe must keep it.
10. **Unverified.** ircDDB live format beyond the fixture (type flag `2` meaning, the always-zero fields), DCS dashboard format, and whether QuadNet rotates exactly daily.
