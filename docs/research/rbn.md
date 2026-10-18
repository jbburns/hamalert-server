# Reverse Beacon Network (RBN) - source report for the HamAlert Spot model

Researched 2026-10-13. Raw samples: `scratchpad/sources/raw/rbn/`. Scripts: `scratchpad/sources/scripts/rbn_analyze.py`, `rbn_sample.py`.

What is and is not verified (read this first):
- Verified by me: the daily CSV archive (downloaded 2026-10-12 file, 383,524 rows, plus header checks on 2018-11-15 and 2020-01-15), the web JSON endpoint `spots.php` (live calls), RBN's own documentation pages, `rbn.js`.
- NOT verified by me: any live telnet session (TCP blocked). The CW/RTTY telnet line format is confirmed from third-party captures (HamQTH relay log, a cqrlog forum post, a GitHub issue). **No verbatim captured FT8/FT4 line from port 7001 could be found anywhere**; the FT8 format below is inferred from `rbn.js` (its regex was written against the live port-7001 feed and the task brief) and is flagged as such.

---

## 1. Access

### 1a. Telnet streaming (what HamAlert uses today)
| Item | Value |
|---|---|
| Host | `telnet.reversebeacon.net` (HamAlert config). A search result also lists `arcluster.reversebeacon.net:7000` as a second relay (unverified). |
| Port 7000 | CW and RTTY (and, in practice, PSK31/PSK63 and a few FM; see mode vocabulary) |
| Port 7001 | FT8 (and FT4) only, since the 2018 "beta" split. Official text: "port 7000 repurposed to handle only CW and RTTY spots, port 7001 set up for FT8 spots only". |
| Port 7002 | A 2021 RBN-OPS forum snippet mentions 7002 but I could not find what it carries (a blog claims 7002 = 7001 plus an offset column; unconfirmed). |
| Auth | None. Login prompt is `Please enter your call: ` (no newline, no telnet option negotiation, observed by a third-party client author). Send a callsign + CRLF. No password. HamAlert logs in as `HB9DQM-4` and sends no further commands (the `commands` array is empty for RBN). |
| Filtering | "These nodes run stripped down relay servers specifically designed for maximum throughput. They have no filtering features." Intent: retail DX clusters connect to these, end users connect to the retail clusters. Official: https://www.reversebeacon.net/pages/Telnet+servers+30 . Do not expect `set dx filter`, `sh/dx` etc. to work. |
| Streaming | Push only, no history/replay on connect, no ids, no heartbeat. HamAlert resets a 180 s idle timer on every line and reconnects on silence (`timeout: 180000`). |
| Volume | 2026-10-12 (an ordinary Monday) CW/RTTY: 383,524 spots/day, ~4.4/s average, much higher in contests. The 2018 announcement showed FT8 was ~86 % of a US node's spots, so port 7001 is a multiple of that. |
| Rate limit | Not documented. One connection per consumer is the expectation. |
| New/edited/deleted | Impossible to detect on telnet: each line is an independent immutable event, no id, no edit, no delete/QRT. Dedup must be done by the consumer (see section 4). |

Related official pages (all saved in raw dir): FT8 announcement https://www.reversebeacon.net/pages/FT8+Announcement+40 , FT4/8 spotting https://www.reversebeacon.net/pages/Spotting+FT4/8+41 , How to get spotted https://www.reversebeacon.net/pages/How+to+get+spotted+by+the+RBN+44 , Aggregator manual (v6.0 PDF) https://cms.reversebeacon.net/sites/cms.reversebeacon.net/files/2019/12/21/Using%20Aggregator%20-%20v6.0.pdf . RBN does **not** publish a formal telnet line grammar.

### 1b. Daily CSV archive (history)
- `https://data.reversebeacon.net/rbn_history/YYYYMMDD.zip` (each zip holds one `YYYYMMDD.csv`). Directory listing returns 403; the file list with sizes is on https://www.reversebeacon.net/raw_data/ (per-day links, e.g. "01 Thursday 6,758KBytes 20260101.zip"). `HEAD` works (200, Cloudflare, `cache-control: max-age=86400`).
- Day D is published shortly after 00:00 UTC of D+1 (20261012.zip had `last-modified: Tue, 13 Oct 2026 00:02:04 GMT`). So it is not usable for alerting, only research/backfill.
- Size: 3.8 MB zip / 25.5 MB CSV on a weekday; contest weekends reach ~43 MB zipped.
- The archive only contains the port-7000 population (CW/RTTY/PSK/FM). **No FT8/FT4 rows in any of the three days checked (2018, 2020, 2026).**
- Sample kept: `raw/rbn/rbn_20261012_sample.csv` (3000 rows, stratified: 2100 CQ, 150 BEACON, 150 NCDXF B, ~600 rare modes/bands/DX type).

### 1c. Web JSON endpoint (alternative to telnet; undocumented but what the web UI uses)
Discovered by reading https://www.reversebeacon.net/dist/rbn.min.js (the main.php page polls it). Not an official API; unannounced changes likely (it carries a build hash and the client reloads on mismatch).

`GET https://www.reversebeacon.net/spots.php?h=<ver_h>&ma=<max age s>&s=<last id>&r=<rows>[&filters]`
- `h`: the build hash from the page (`window.RBN_version_hash`, was `43326f`; the response echoes `ver_h`). A wrong hash gives `{"error":888,"ver_h":"43326f"}` (HTTP 400, observed), so a client can bootstrap by reading the hash from main.php.
- `s`: last spot id seen (0 = start). Response contains only spots with id > s. The web client polls every 10 s (`PollIntervalMS=10000`), so keep to >= 10 s. This gives a **monotonic id for incremental polling and dedup** which telnet lacks.
- `r`: max rows. `ma`: max age in seconds (`s=0` first call returns newest `r` spots within `ma`).
- Filters: `cde` spotter call(s), `cdx` spotted call(s) (comma lists), `b` band codes, `m` mode codes, `bc` spot types, `e`/`x` DXCC de/dx, `ie`/`ix` ITU, `ce`/`cx` CQ zone, `coe`/`cox` continent, `min_wpm`, `max_wpm`, `min_snr`, `spotters=1` (adds a `spotters` array of `[call, lat, lon]`).
- `GET /spots.php?meta=1` returns schemas and code tables (saved: `spots_meta.json`): `oldest_epoch` (1732147200 = 2024-11-21), `spot_fields`, `call_info_fields`, `bands`, `modes`.
- **FT8/FT4 are not served**: `m=34,45` (ft8, ft4 codes) returned `{"lastid_c":...,"now":...,"ver_h":...}` with no spots. So for FT8/FT4 telnet port 7001 is the only live source.
- The older https://www.reversebeacon.net/dxsd1/dxsd1.php?f=NN is only a canned-filter selector that sets a cookie and 302s to main.php; it is not a data endpoint.
- Live call-info is bundled: each response has `call_info` (per-callsign DXCC prefix, country, continent, ISO country, ITU, CQ zone, lat, lon, grid, and grid source) which would let a consumer skip its own DXCC lookup, but with the stability caveats above.

---

## 2. Raw record format

### 2a. Telnet, port 7000 (CW/RTTY), verbatim third-party captures
```
DX de HB9DCO-#:   7015.1  PG2AA          CW    15 dB  27 WPM  CQ      1102Z
DX de HB9DCO-#:  14011.9  UP2L           CW    17 dB  35 WPM  CQ      1102Z
DX de W3UA-#:     7029.0  KA1AQP         CW    12 dB  26 WPM  CQ      1345Z
DX de K2DB-#:    7029.00  KA1AQP         CW     5 dB  26 WPM  CQ      1345Z
```
(Sources: cqrlog forum https://www.cqrlog.com/node/1925 - there a client appended the country name after `Z`, that is not part of the raw RBN line; HamQTH relay log https://www.hamqth.com/activity.php?callsign=KA1AQP ; GitHub issue sonyccd/longlines#13, which notes: no spot id, no date, only HHMMZ, no comment.) Note `7029.00` in the K2DB line: precision differs between relaying cluster software, do not rely on a fixed number of decimals.

Layout (fixed-width, space-padded, DXSpider/AR-Cluster style): `DX de ` + spotter + `:` (padded so the freq field right-aligns) + freq kHz + DX call (padded to ~13) + mode + SNR + ` dB` + speed + unit (`WPM` for CW; RTTY/PSK use bit/baud rate, see below) + type marker + `HHMMZ`.

Trailing type markers (confirmed from CSV `mode` column and RBN web UI legend "CQ DX BCN /B NCDXF"): `CQ`, `DX`, `BEACON`, `NCDXF B`. Reconstructed examples of the other markers (not captured verbatim; derived from the CSV rows below plus the format above):
```
DX de OE3KLU-#:  28188.0  OE3XAC         CW     8 dB  14 WPM  BEACON  0000Z
DX de K5TR-#:    14100.0  VE8AT          CW    10 dB  24 WPM  NCDXF B 0000Z
DX de HA1VHF-#: 144433.6  9A0BVH         CW    24 dB  15 WPM  DX      0000Z
```
RTTY/PSK lines should carry the bit rate in the speed slot (CSV `speed` = 45 for RTTY, 31 for PSK31, 63 for PSK63); the unit token (`BPS` vs `WPM`) is what I believe but could not verify. `rbn.js` tolerates it either way because its WPM group is optional and `.*` swallows the rest.

### 2b. Telnet, port 7001 (FT8/FT4) - INFERRED, not captured
The brief and `rbn.js`'s regex (`... (\S+)\s+(\S+)\s+dB\s+(?:(\S+)\s+WPM)?.*(?:CQ|DX)\s+(\d+)Z$`: mode token, then signed SNR, then `dB`, WPM optional, CQ/DX, `HHMMZ`) imply:
```
DX de DL1ABC-#:  14074.0  W1AW           FT8   -12 dB  CQ      1147Z
```
i.e. same shape as 2a with `FT8`/`FT4` in the mode slot, a signed (often negative) SNR, no WPM. The Aggregator manual (v6.0) says FT4/FT8 spots come from WSJT-X/JTDX UDP, only CQ messages are forwarded. A related project (vu2cpl/dxca v2.23.0) describes "Aggregator shape" as `<snr> dB <symbol-rate> <mode> [CQ <grid>] [<offset Hz>]`, e.g. `DX de MSHV:  14074.0  K1JT  -10 dB   6 FT8  CQ FN20 1487 1428Z` - that is a third party mimic and shows a symbol-rate/grid/offset variant could exist; **unverified for the real 7001 stream**. Design the parser tolerant: after `dB`, treat everything up to the trailing `HHMMZ` as free "tail" tokens.

### 2c. CSV archive (verbatim, 2026-10-12.csv, header + first rows)
```
callsign,de_pfx,de_cont,freq,band,dx,dx_pfx,dx_cont,mode,db,date,speed,tx_mode
K5TR,K,NA,14027.8,20m,VP2VD,VP2V,NA,CQ,29,2026-10-12 00:00:00,28,CW
W1NT-6,K,NA,7052.3,40m,WA3VSO,K,NA,CQ,13,2026-10-12 00:00:02,16,CW
OE3KLU,OE,EU,28188,10m,OE3XAC,OE,EU,BEACON,8,2026-10-12 00:00:04,14,CW
RU9CZD,UA9,AS,7043.8,40m,R6OGV/B,UA,EU,BEACON,5,2026-10-12 00:00:04,17,CW
K1RA-4,K,NA,14100,20m,VE8AT,VE,NA,NCDXF B,6,2026-10-12 00:00:37,21,CW
HA1VHF,HA,EU,144433.6,2m,9A0BVH,9A,EU,DX,24,2026-10-12 00:00:44,15,CW
K3FEF,K,NA,10133,30m,KD7BCC,K,NA,CQ,6,2026-10-12 00:12:03,45,RTTY
HA8TKS,HA,EU,14071.5,20m,EA7GUL,EA,EU,CQ,13,2026-10-12 06:34:54,31,PSK31
DG6FL,DL,EU,10122.02,30m,F4GOU,F,EU,CQ,17,2026-10-12 08:47:24,17,FM
```
The last line of every file is a footer `(383524 rows)` (a 1-column row; must be skipped; seen in all 3 files).

### 2d. Web JSON (verbatim, live 2026-10-13 23:10Z, from `spots_sample_raw.json`)
```json
{"lastid_c":2334814276,"now":1791933030,
 "spots":{"2334814294":["K6FOD","10110.7","AA6GA",21,16,"2310z 13 Oct",1,17,1,1,1791933030],
          "2334814288":["KM3T-5","5373.0","K3CQR",29,18,"2310z 13 Oct",3,84,1,1,1791933028]},
 "call_info":{"AA6GA":["K","United States","NA","us","6","3","38.9792","-121.042","CM98LX","qrz"],
              "K6FOD":["K","United States","NA","us","6","3","34.1042","-118.1250","DM04WC","skimmer"]},
 "ver_h":"43326f"}
```
Spot array order = `spot_fields`: `[de, freq, dx, db, wpm, time, diff, band, type, mode, epoch]`. Beacon example: `["TI7W","28221.1","WK4DS\/B",6,14,"2310z 13 Oct",16,42,4,1,1791933034]`.

---

## 3. Field inventory

### 3a. CSV archive (20261012.csv, 383,524 data rows; empty-string count = 0 for every column, so all fields are always present)
| Raw field | Type | Presence | Example values | Notes / quirks |
|---|---|---|---|---|
| `callsign` | string | always | `K5TR`, `W1NT-6`, `VE6WZ` | The **spotter** (skimmer), despite the column name. 235 distinct on the day; 27 of them carry a `-N` instance suffix (`-1 -2 -3 -4 -5 -6 -9 -11 -88`). The telnet `-#` is not stored here. |
| `de_pfx` | string | always | `K`, `DL`, `UA9`, `3B8` | Spotter's DXCC prefix (RBN's own cty-style, not ADIF), 48 distinct. |
| `de_cont` | string | always | `EU` 64 %, `NA` 31.5 %, `AS`, `OC`, `SA`, `AF` | Spotter continent. |
| `freq` | decimal string, **kHz** | always | `14027.8`, `14030`, `144433.6`, `10122.02` | Trailing zeros are dropped (`14030`, not `14030.0`). 0-2 decimals seen (0 dp 187,889; 1 dp 194,584; 2 dp 1,051). Spotted frequency, skimmer-measured (CW tone accuracy ~0.1 kHz). Range 473.1 .. 144433.6. |
| `band` | string | always | `40m` 35 %, `20m` 31 %, `80m`, `30m`, `15m`, `17m`, `10m`, `160m`, `12m`, `60m`, `2m`, `6m`, `4m`, `472kHz` | RBN's label. Note `472kHz` rather than `630m` (15 rows), `4m` appears. No `2200m`/`11m`. |
| `dx` | string | always | `VP2VD`, `R6OGV/B`, `JO1XOK/1`, `NP4IW/W6` | The **spotted** call, may contain `/` (19,128 rows, 5 %: `/B` 7,026 beacons, `/P`, `/M`, `/0../9`, `/W6`...). Skimmer mis-copies and special-event calls appear (e.g. `9WH0KASMHJ`, `8J70JARE`). |
| `dx_pfx` | string | always | `VP2V`, `K`, `UA`, `9M2` | Spotted DXCC prefix per RBN's resolver (188 distinct). For `R6OGV/B` it gives `UA`. |
| `dx_cont` | string | always | `EU`, `NA`, `AS`, `SA`, `AF`, `OC` | Spotted continent. |
| `mode` | string | always | `CQ` 364,686 (95.1 %), `NCDXF B` 10,740 (2.8 %), `BEACON` 7,943 (2.1 %), `DX` 155 (0.04 %) | **Despite the name this is the spot *type* (the trailing marker on the telnet line), not the radio mode.** Exactly 4 values. |
| `db` | int | always | `29`, `9`, `-1` | SNR in dB relative to noise at the receiver. Range -2..69 for CW; 353 rows <= 0. |
| `date` | string `YYYY-MM-DD HH:MM:SS` | always | `2026-10-12 00:00:02` | **UTC**, second precision, no TZ marker. File is sorted ascending. |
| `speed` | int | always (3 rows = 0) | `28`, `45`, `31`, `63` | WPM for CW (0..60), baud/bit rate for RTTY (always 45), PSK31 (31), PSK63 (63). For FM rows it is meaningless (14-28 copied CW-like values from the same decoder). |
| `tx_mode` | string | always | `CW` 382,762 (99.8 %), `RTTY` 655, `PSK31` 92, `FM` 13, `PSK63` 2 | The **actual transmission mode**. FM (13 rows, all from spotter `DG6FL` on 30m) is a skimmer mis-configuration, treat as noise. 2020 file additionally had `PSK125`. |

Cross-tab type x mode: CQ/CW 363,927; NCDXF B/CW 10,740; BEACON/CW 7,940; CQ/RTTY 652; DX/CW 155; CQ/PSK31 92; CQ/FM 13; BEACON/RTTY 3; CQ/PSK63 2.
Files from 2018/2020 have the same 13 columns and footer line.

### 3b. Telnet line (as parsed by `rbn.js`; same information minus country/continent/date)
| Telnet token | `rbn.js` use | Always present? | Notes |
|---|---|---|---|
| `DX de <spotter>:` | `spotter` = text with `-#` removed (`W3LPL-#` -> `W3LPL`; `W1NT-6-#` -> `W1NT-6`) | always | the `-#` is appended by the RBN server to **every** skimmer, see section 4. |
| freq (kHz, 1 dp typical) | `frequency = (kHz/1000).toFixed(4)` -> MHz string, e.g. `"14.0250"` | always | |
| DX call | `fullCallsign` | always | may contain `/`. |
| mode | `mode` (raw case: `CW`, `RTTY`, `PSK31`, `FT8`...), later lowercased by `normalizeSpot` | always | 4th whitespace token. |
| SNR | `snr = parseInt` | always | may be negative on 7001. |
| `dB` | literal | always | |
| `<n> WPM` | `speed` (optional group) | CW only | For RTTY/PSK the unit token is not `WPM` (unverified), so `speed` stays unset today. |
| CQ / DX / BEACON / NCDXF B | **only `CQ` and `DX` are accepted** | always | `BEACON` and `NCDXF B` lines do not match the regex and are logged as `No match:` and dropped (about 4.9 % of lines on 7000). |
| `HHMMZ` | `time` = `"HH:MM"` | always | minute resolution, no date. |

Fields `rbn.js` stores on the spot: `source:'rbn'`, `time`, `fullCallsign`, `spotter`, `frequency` (MHz string), `mode`, `snr`, optional `speed`, `title` (`"RBN spot X (freq mode)"`), `rawText` (the whole line, which includes the `-#`). `normalizeSpot` then adds `receivedDate`, lowercases `mode` (and collapses `psk*` -> `psk`, `jt*` -> `jt`, `msk*` -> `msk`, keeping `modeDetail`), derives `callsign`, `prefix`, `band`, `dxcc`, `spotterDxcc`, `spotterPrefix`.

### 3c. Web JSON `spots.php`
| Index / key | Name | Type | Example | Notes |
|---|---|---|---|---|
| object key | spot id | string-number, ascending | `"2334814294"` | Global monotonic id; use for `s=` and dedup. `lastid_c` is the newest id of the cached stream. |
| 0 | `de` | string | `"KM3T-5"` | Spotter; instance suffixes preserved, never `-#`. |
| 1 | `freq` | string, kHz, 1 dp | `"10110.7"`, `"14032.0"` | Strings with a fixed decimal point, normally 1 dp (`"14032.0"`); 2 of 100 sampled had 2 dp (`"14088.00"`, an RTTY spot), so not strictly fixed. Unlike the CSV, trailing zeros are kept. |
| 2 | `dx` | string | `"AA6GA"`, `"WK4DS\/B"` | Spotted call; `/` JSON-escaped. |
| 3 | `db` | int | `21` | |
| 4 | `wpm` | int | `16` | Speed for the mode (WPM or bps). |
| 5 | `time` | string | `"2310z 13 Oct"` | Display string, UTC, minute resolution. Do not parse; use `epoch`. |
| 6 | `diff` | int | `1` | Seconds since spot at response time. |
| 7 | `band` | int code | `17` | Codes: 91=630m, 3=160m, 7=80m, 84=60m, 12=40m, 17=30m, 22=20m, 27=17m, 32=15m, 37=12m, 42=10m, 50=6m, 55=4m, 62=2m. |
| 8 | `type` | int code | `1` | 1=CQ, 2=DX, 3=BCN, 4=BCN (a `/B` beacon call), 5=NCDXF. (From the JS label table `{1:"CQ",2:"DX",3:"BCN",4:"BCN",5:"NCDXF"}`; in a 100-spot sample: 1 x91, 4 x5, 5 x2.) |
| 9 | `mode` | int code | `1` | 1=cw, 2=phone, 5=fm, 10=psk31, 11=rtty, 12=bpsk, 13=gmsk, 14=fsk, 15=sstv, 16=mfsk, 17=qpsk, 20=eme, 21=jt65, 22=hell, 23=dominoex, 24=mt63, 25=rttym, 26=thor, 27=throb, 28=olivia, 29=contestia, 30=psk63, 31=psk125, 32=jt9, 33=opera, 34=ft8, 35=sim31, 36=psk32, 37=ros, 38=msk144, 39=fsk441, 40=psk, 41=qpsk31, 42=t10, 43=sim63, 44=js8, 45=ft4, 999=other. The table is the RBN schema's capability list; only 1, 11, 10, 30 (and rarely 31, 5) ever occur in practice, 34/45 are defined but unserved. |
| 10 | `epoch` | int | `1791933030` | Unix seconds UTC, second precision, same as CSV `date`. Best timestamp. |
| `call_info[call]` | `pfx,country,cont,ccode,ituz,cqz,lat,long,grid,gsrc` | string array | `["K","United States","NA","us","6","3","38.9792","-121.042","CM98LX","qrz"]` | `gsrc` = `skimmer` for spotters (locator from RBN node registry), `qrz` for DX stations, or empty. Lat/long are grid-centre approximations; ITU/CQ zones are strings. |
| `spotters` (with `spotters=1`) | `[call, lat, lon]` | list | `["NA3M",39.1875,-77.2083]` | Active skimmer positions, includes `N0CALL`. |

---

## 4. Semantics and quirks

**Time.** A telnet line has only `HHMMZ` (UTC minute); date is implied "now". `rbn.js` keeps `time` and relies on `receivedDate` for the full timestamp (the quorum code reads a `cachedSpot.date` field that `handleLine` never sets, see risks). The CSV/JSON give the second-precision UTC time of the *spot at the RBN server*, which is receive-to-publish within about a second. There is no separate "decoded at the skimmer" time.

**Frequency.** kHz everywhere (telnet 1 dp typically, CSV trims zeros, 2 dp occasionally on FM/specific nodes). HamAlert converts to MHz string with 4 decimals. For FT8/FT4, aggregator spots are expected at the dial frequency (e.g. 14074.0), not dial plus audio offset (unverified on RBN; offset may be in a trailing token or absent).

**Mode vocabulary actually observed.**
- CSV `tx_mode` (3 days sampled): `CW`, `RTTY`, `PSK31`, `PSK63`, `PSK125` (2018/2020 only), `FM` (spotter misconfiguration).
- CSV `mode` (= spot type): `CQ`, `DX`, `BEACON`, `NCDXF B`.
- Web mode codes served: 1 (cw), 10, 11, 30 and no 34/45.
- Telnet 7001: `FT8` and `FT4` (per docs); nothing else documented.
- The `mode` slot on the telnet line is always an explicit mode, so HamAlert's `modeGuesser` is never needed for RBN. But the same field name `mode` means *type* in the CSV, do not mix them up.

**Spot types.** `CQ` is generic: the skimmer heard a CQ-type message from the station ("TEST", "CQ", "QRZ", also FD/SS/NA/UP in the right context, per N4ZR). `DX` = "CQ DX" (155 rows, 138 from HA1VHF on 2 m). `BEACON` = a beacon-like callsign (`/B` suffix etc., 7,026 of 7,943 have `/B`) and `NCDXF B` = the NCDXF/IARU international beacons (17 distinct seen: CS3B, 4U1UN, 4X6TU, OH2B, OA4B, LU4AA, W6WX, VE8AT, RR9O, KH6RS, 5Z4B, ZS6DN, JA2IGY, ZL6B, 4S7B, VK6RBP, VR2B) on 14100/18110/21150/24930/28200 kHz. **These are 7.7 % of 7000 traffic and are not useful for "someone is calling CQ" alerts; HamAlert drops them accidentally via a non-matching regex.** The new model should carry a `spotType`/`kind` so triggers can opt in or out.

**Spotter representation (skimmers vs human cluster spotters).**
- RBN spotters are automated **CW Skimmer / Skimmer Server / RTTY Skimmer / FT8 decoder (WSJT-X, JTDX, CWSL_DIGI)** nodes run by volunteers and combined by "Aggregator" before upload. The spotter callsign is the operator's call, and operators with several receivers/instances append `-N` (`W1NT-6`, `VE6WZ-2`, `KM3T-5`). The RBN telnet server then appends **`-#`** to every spotter (`W3LPL-#`, `W1NT-6-#`): the `#` is a placeholder meaning "automated skimmer spot" in DXSpider/AR-Cluster convention, used by cluster software to filter skimmer spots (`set dx filter not skimmer`, HamAlert's commented-out `not skimbusted`). It carries no instance information.
- A *human cluster spotter* (DXSpider/AR-Cluster) is a person typing `DX 14025 N0CALL comment`; the line is `DX de DL5WP:  18100.0  KA1AQP  ft8   1208Z` with a free-text comment and no `-#`, no SNR/WPM. A human spot is an opinion that the station is active; a skimmer spot is a measurement with SNR, speed and a type marker, and in volume (one real CQ produces 5-20 near-simultaneous spots from different nodes).
- Cluster relays re-broadcast RBN spots with `-#` (HamQTH log has `DX de W3UA-#: ... CW 12 dB 26 WPM CQ 1345Z` between human lines). HamAlert's cluster source filters this with `spotterFilterRegex: /^W3LPL$/i`, i.e. after stripping `-#` W3LPL's relay copy is dropped, and a `filterRegex` on `nil`. So **the same RBN spot can enter HamAlert from two routes** (direct RBN + cluster relay) unless relayed `-#` spotters are dropped in the cluster path.
- Mapping rule suggested: `spotter.kind = "skimmer"` for RBN (and for any cluster line whose spotter ends in `-#`); strip `-#`, keep `-N`; optionally expose `spotterInstance`.
- The set of spotters is small (235 distinct callsigns on 2026-10-12, 27 with `-N` suffix); the busiest spotters have 5,000+ spots/day each. Spotter location is in the node registry (`/nodes/`, `call_info` with `gsrc: skimmer`).

**Duplicates and repeats.**
- Same RBN spot arrives once per hearing skimmer. A node suppresses re-spotting the same call/frequency for ~10 min unless QSY by 300 Hz+ (N4ZR page), but across nodes there are 5-20 simultaneous spots.
- Exact-duplicate CSV rows (all 13 columns identical): 4,144 (1.1 %). They come from the same node call with multiple instances (e.g. `VE6WZ` x2 identical lines at 00:00:05). Same (spotter, dx, freq, second) occurs 5,447 times. Therefore **no natural unique key** on telnet/CSV; the web endpoint's numeric id is the only true id.
- A single QSY of one station by 0.1 kHz often yields consecutive lines (e.g. `VP2VD` 14027.7 / 14027.8).

**Bogus callsigns.** Skimmer mis-copies produce call-shaped garbage, especially where the callsign pattern file is loose. `rbn.js` drops calls with length >= 8, a digit-letter-digit run and no `/`. On 2026-10-12 this rule would drop exactly 10 rows, and examples include **real special-event calls** (`8J70JARE`, `9WH0KASM`) alongside likely mis-copies (`9WH0KASMHJ`). It is a heuristic, document it as such. Also note callsign cleaning in `normalizeSpot` (`[^0-9A-Z/]` removed).

**Quorum (optional, disabled in config).** Settings are commented out for port 7001: `quorum: 3` (distinct spotters needed per call+band+mode within `quorumInterval` 15 min), `maxAge` 15 min, `pruneInterval` 10 min. Implementation (rbn.js `checkQuorumAndEmit`) holds spots in a TTL cache keyed `call-band-mode`, emits all held spots once N distinct spotters are seen, then keeps minimal `{emitted,date,spotter}` records. Two latent bugs in the current code which the new model must not copy: it reads `cachedSpot.date` but `handleLine` never sets `date` (so `now - undefined` = NaN and every cached spot is filtered out, meaning quorum can never be met), and it compares `spot.frequency` (a string) against numeric band limits. The concept is to be kept as an optional "confirmed by >= N independent spotters" filter, not required by the data model. It is mainly relevant to FT8 where false decodes are frequent and the RBN alone cannot confirm.

**Deleted/edited/test spots.** None. No QRT, no retraction, no comment text at all (the line has no free-text comment). `N0CALL` appears as a real active skimmer position in the spotter list (a test/placeholder spotter, returned in the `spotters` array), so there is no test-spot flag; a consumer may want to ignore spots by `N0CALL`.

**Comment conventions.** There is no comment, hence **no summit/park/IOTA/WWFF reference can come from RBN**; any such lookup (`findSotaRef`, `findWwffRef`, `findIotaGroupRef`) only matches by callsign/frequency against other data, never by text. All 13 CSV columns and all 11 web fields are structured, with no free text.

**Band edge cases.** HamAlert's `config.bands` has no 630m entry that matches RBN's `472kHz` label but has a 600m band (0.472-0.479 MHz), so frequency-based lookup is fine. RBN's 60 m band spans 5.3-5.4 MHz (observed `5373.0` -> code 84). 4 m (70 MHz) and 2 m appear (HA1VHF, DK2GOX).

---

## 5. Related reference data
| Data | URL | Format / cadence | Use |
|---|---|---|---|
| RBN node list (skimmer registry, location, bands, grid) | https://www.reversebeacon.net/nodes/ and https://www.reversebeacon.net/nodes/detail.php | HTML tables; changes as nodes join | Spotter location/grid, to compute distance spotter -> DX; `gsrc:skimmer` in spots.php `call_info` shows the same grid |
| Beacons list | https://www.reversebeacon.net/beacons/list.php | HTML | Identify NCDXF/other beacons (also derivable from `type`) |
| spots.php `call_info` | `spots.php?...` | JSON per response | RBN's own prefix/country/continent/zones/lat/long/grid for both ends. Not authoritative DXCC (see `dx_pfx` e.g. `K` for US, `UA` for European Russia). |
| `meta=1` | `spots.php?meta=1` | JSON | Band code (14), mode code (about 40) and type code tables (section 3c) |
| CW Skimmer callsign pattern file `patt3ch.lst` | https://www.reversebeacon.net/pages/patt3ch.lst+36 | text, updated semi-annually | Explains which calls Skimmer accepts (2-4 repetitions); sample line `+ 4U1@@`. Useful for bogus-call heuristics, not required. |
| DXCC / entity data | HamAlert uses ClubLog resolver (`clubLogResolver.lookup`) for `fullCallsign`/`spotter` | existing | Backend must resolve DXCC itself (RBN prefixes are not ADIF entity ids) |

Sample node `call_info`: `"VE6WZ":["VE","Canada","NA","ca","2","4","51.8125","-114.4583","DO21ST","skimmer"]`.

---

## 6. Proposed mapping

Base Spot fields:
| Base field | From RBN | Notes |
|---|---|---|
| `callsign` | telnet DX call / CSV `dx` / JSON `[2]` | uppercase; may be `/B`, `/P`, ... |
| `spotter` | telnet text before `:` minus `-#` / CSV `callsign` / JSON `[0]` | keep `-N`; set `spotterKind='skimmer'` (always for RBN) |
| `frequency` | kHz decimal -> store MHz (current code) or kHz; pick one project-wide | RBN native unit is kHz; 0.1 kHz resolution; do not assume 1 dp |
| `mode` | telnet mode token / CSV `tx_mode` / JSON mode code | lowercase `cw`, `rtty`, `psk31`, `psk63`, `ft8`, `ft4`; **no guessing needed**; keep detail (`psk31`) plus normalised family (`psk`) as `normalizeSpot` does today |
| `time` | telnet `HHMMZ` (+ receive date) / CSV `date` / JSON `epoch` | Resolve full UTC time at ingest (midnight rollover: telnet HHMM > now implies yesterday). Telnet gives only minute resolution; web/CSV give seconds. |
| `comment` | none | always empty; RBN has no text. Optionally synthesise `"CW 24 dB 28 WPM"` for display only. |
| `source` | `'rbn'` | Two feeds: `rbn` port 7000 (CW/RTTY), port 7001 FT8/FT4. Suggest `source='rbn'` plus `feed` or just the mode. |
| `rawText` | the telnet line (includes `-#`) | |
| `receivedAt` | local clock | existing `receivedDate` |

RBN extension (all "always present" for RBN unless marked):
| Field | Type | Presence | From |
|---|---|---|---|
| `snr` | int dB | always (negative possible on FT8) | `db` |
| `speed` | int | CW: always; RTTY/PSK: bit rate, present in CSV (45/31/63) but not captured by `rbn.js` today; FT8: absent | `wpm` / `speed` |
| `speedUnit` | `wpm` / `bps` | derive from mode (web `modes[x].speed`) | |
| `spotType` | enum `cq`, `dx`, `beacon`, `ncdxf` | always on CSV/web; on telnet `CQ`/`DX` only match today, extend regex for `BEACON`/`NCDXF B` | trailing marker / CSV `mode` / JSON type 1-5 |
| `spotterInstance` | string | optional (only when `-N` present) | split `W1NT-6` into call+instance |
| `spotterGrid`, `spotterLat/Lon` | strings | optional, from node registry or `call_info` | |
| `rbnSpotId` | int | web endpoint only | object key |
| `dxContinent`, `dxPrefix`, `spotterContinent`, `spotterPrefix` | strings | CSV/web only, RBN's own labels | recompute from our DXCC table instead |
| `ft8Grid`, `ft8OffsetHz` | optional | rarely/unverified on 7001 | tail tokens |

Enrichment backend must do itself: `band` (from frequency, existing `config.bands`; the 7000 feed has no band field), DXCC/prefix for DX and spotter, CQ/ITU zone, callsign canonicalisation, reference lookups by callsign (no text), mode family. Beacon filtering and quorum are consumer policies.

---

## 7. Open questions / risks
1. **FT8/FT4 telnet line format on port 7001 is unconfirmed** (no capture found; TCP blocked). Before finalising the parser, capture 100 lines from 7001 and check: position of mode vs SNR, presence of a speed/symbol-rate token (`6`/`21`?), grid, audio offset, FT4 label, and whether `CQ` is always the marker (Aggregator only forwards CQs).
2. RTTY/PSK speed unit token on 7000 (probably `BPS`) unverified; current code silently drops speed for these.
3. `BEACON`/`NCDXF B` lines are currently dropped as "No match"; decide whether beacons are wanted (maybe as an opt-in `spotType`).
4. No stable unique id on telnet: dedup/idempotency must use a synthetic key such as (spotter, dx, freq rounded, minute). The web `spots.php` provides ids but is undocumented, hash-gated (`h`), FT8-less and may change; consider it a fallback/backfill source only, not a replacement.
5. Duplicate routes: RBN spots also arrive via cluster feeds as `X-#` spotters; define canonical dedup between sources.
6. Spot volume (FT8 especially) is large; define per-source throttling/quorum configuration. The existing quorum implementation is broken (undefined `date`, string/number frequency compare).
7. Skimmer mis-copies: the bogus-call heuristic both misses garbage and drops real special-event calls (`8J70JARE`); consider quorum or the pattern-file approach instead.
8. `freq` precision varies by source (telnet 1 dp, CSV trimmed, occasional 2 dp); store as a number, not a fixed-format string. Pick kHz or MHz globally (RBN native is kHz).
9. Weak time: telnet carries HH:MM only; never trust it over the receive time near midnight UTC.
10. FM/odd modes (e.g. `DG6FL` FM on 30 m) and `N0CALL` spotter exist; consider an allow-list of modes (cw, rtty, psk31/63/125, ft8, ft4).
11. Spotter naming: column `callsign` in the CSV is the spotter and `dx` is the spotted call; `mode` there is the type. Keep the new API's names unambiguous.
