# Planned / scheduled amateur radio events as an alert source (`PlannedEvent`)

Researched 2026-10-13/14 (UTC). Raw samples: `.../scratchpad/sources/raw/planned-events/` (file names quoted below). SOTA alerts (`sotawatch.md`, "Alerts") and WWFF agendas (`wwff.md` 2b/3c) are NOT repeated here except where they feed the common shape.

Reachability from this sandbox: OK = pulled with curl; BLOCKED = could not fetch.
- OK: api.pota.app, ng3k.com, danplanet.com, contestcalendar.com, arrl.org, ariss.org, illw.net, lighthouse-weekend.international, parksnpeaks.org, spothole.app.
- BLOCKED: dx-world.net (HTTP 403 to curl on `/feed/` and `/robots.txt`, bot protection; WebFetch also returned empty), dxnews.com (proxy CONNECT denied by org policy; WebFetch DNS failure), iota-world.org (403 to curl). Not evaluated: QRZ DX calendar, 425 DX News.
- sk3bg.se (SM3CER) is reachable but dead (see 3).

## 0. Summary table

| # | Source | Kind | Machine format | Auth | Has timestamps | Has coordinates | Terms verdict | Verdict for HamAlert |
|---|---|---|---|---|---|---|---|---|
| 1 | POTA `api.pota.app/activation` | activation | JSON | none | start/end date+time, UTC | NO (join park ref -> lat/lon) | no ToS found; same API HamAlert already uses | Use. Easiest, structured. |
| 2 | NG3K ADXO `adxo.xml` | dxpedition | RSS 2.0 (plus HTML table, text page) | none | dates only (day resolution) | NO (DXCC entity name; sometimes grid/IOTA in free text) | copyright W.B. Feidt, no reuse statement; robots.txt allows; third parties poll RSS every 30 min | Use RSS (or HTML for richer fields), poll gently. |
| 2b | danplanet `dxcal.ics` | dxpedition | iCal (derived from ADXO) | none | all-day dates | no | unknown | Redundant with 2. |
| 3 | WA7BNM contestcalendar.com | contest | ICS (`fivewkcal.ics`, `weeklycontcustom.php`), RSS | none | UTC start/end | no | **ToS forbids bots/spiders; ICS personal use only; RSS only for display on non-profit sites; JSON/XML only by written agreement** | Needs written permission before use. |
| 3b | SM3CER sk3bg.se | contest | HTML | none | - | - | - | Dead (last modified 2018-12-07). |
| 3c | RSGB contest calendars | contest | not examined directly (Spothole ingests them) | ? | ? | no | ? | Possible, unverified. |
| 4 | ARRL special events | special-event | HTML only (server-rendered list, 8/page) | none | day + UTC time-of-day, free text | NO (city/state text) | robots.txt `Crawl-delay: 5`; ToS not read | Scrape-only; user-submitted free text. |
| 5 | ARISS contacts | ariss-contact | HTML free text | none | exact UTC AOS time | no (school city in text) | none seen | Scrape-only, tiny volume (2 per week). |
| 5b | ARISS SSTV events | sstv | HTML free text (news blog style) | none | UTC start/end in prose | n/a (ISS) | none seen | Scrape-only; manual. |
| 6 | ParksnPeaks `api/ALERTS/` | activation (SOTA/WWFF/ZLOTA/POTA/LLOTA...) | JSON | none for read | local time, NO tz marker | no | PnP API docs; read is open | Aggregator, but duplicates SOTA/WWFF/POTA and has tz trap. Optional. |
| 7 | ILLW (lighthouses) | special-event | HTML per-year table | none | event weekend only (fixed dates) | no in entrants list | none seen | Annual table; scrape. |
| 8 | WWBOTA | - | - | - | - | - | - | **No alert type exists** (see 8). |
| 9 | Spothole `spothole.app/api/v1/alerts` | all of the above | JSON | none | epoch + ISO | yes (resolved) | open-source project; aggregator | Prior art for the model; not a primary source. |

## 1. POTA scheduled activations

### Access
- `GET https://api.pota.app/activation` (also `/activation/` and `/v1/activations`; the three return identical records, saved as `pota_activation.json`, `pota_v1_activations.json`; byte size differs by 64 only because of ordering/whitespace).
- Found in pota.app front-end bundle (`/js/app.54fcf9fc.js`: `getActivations` -> `https://api.pota.app/activation`; `getActivationsv1` -> `/v1/activations`; `/js/main.96f81d8c.js`: activation table/card/form/remove components). Guessed names `/schedule`, `/activations`, `/activation/schedule` return 403 `Missing Authentication Token` (API Gateway "no such route").
- No auth to read. Response headers: `content-type: application/json; charset=utf-8`, `cache-control: public,immutable,max-age=120`, `access-control-allow-origin: *`, CloudFront. No ETag/Last-Modified; so poll no faster than every 2 min (CDN caches 120 s anyway) and diff by id.
- Write side (not for us): `POST /activation` (needs bearer token; body `{activator, reference, startDate, startTime, endDate, endTime, frequency, comments}`; response is the new full list) and `POST /activation/remove` `{activationId}`. There is **no edit** call in the UI: an edit is remove + create, so the id changes.
- Size: 157 records / 59.6 KB. The list is "everything not yet ended": earliest end seen = today 00:20 UTC; 65 of 157 had already ended earlier the same UTC day, 20 were live, 72 future. Furthest start 2027-04-17.
- Per-user history lives behind auth (`/user/activations`).

### Verbatim record
```json
{"scheduledActivitiesId": 162430, "schedulerUserId": 34844, "activator": "CO6XX", "name": "Jardines de la Reina National Park", "reference": "CU-0315", "locationDesc": "CU-CA,CU-CM", "activityStart": null, "activityEnd": null, "startDate": "2026-10-11", "endDate": "2026-10-31", "startTime": "02:15", "endTime": "23:59", "frequencies": "40-30-20-17-12-15-10 mt", "comments": "modo FT2-FT4-FT8-CW power 25 watts"}
```
```json
{"scheduledActivitiesId": 161195, "schedulerUserId": 79627, "activator": "W4WYM", "name": "Wallowa-Whitman National Forest", "reference": "US-4387", "locationDesc": "US-ID,US-OR", "activityStart": null, "activityEnd": null, "startDate": "2026-10-01", "endDate": "2026-10-16", "startTime": "00:00", "endTime": "00:00", "frequencies": "40/20/10", "comments": "No internet connectivity; will need help with spots please : )"}
```

### Field table (n=157)
| Field | Type | Presence | Examples | Notes |
|---|---|---|---|---|
| `scheduledActivitiesId` | int | 100% | 149402, 162693 | Monotonic, ids seen 144769..162693. Stable key. Use as `id`. |
| `schedulerUserId` | int | 100% | 91561 | POTA user id of poster. Poster callsign NOT provided (unlike SOTA/WWFF). |
| `activator` | string | 100% | `PF2X/P`, `LW5DR`, `BH9FPK` | Callsign as typed, may carry `/P`. Upper case in sample but not guaranteed; match to spots case-insensitively. 5 of the 61 live `/spot/activator` rows matched a scheduled (activator,reference) pair exactly. |
| `name` | string | 100% | `Wallowa-Whitman National Forest` | Display name = park name + park type description (park record says name `Wallowa-Whitman`, `parktypeDesc` `National Forest`). May contain non-Latin text (`安徽马鞍山和洲湖公园 Regional Park`). |
| `reference` | string | 100% | `NL-0253`, `US-4387` | Always `^[A-Z]{2}-\d{4,5}$` in sample. One park per record (n-fers = separate records or free text). |
| `locationDesc` | string | 100% | `NL-FL`, `US-ID,US-OR`, `CH-GL,CH-GR,CH-SG` | Comma-separated location codes (7/157 multi-valued). |
| `activityStart`, `activityEnd` | null | 100% null | null | Dead/legacy columns. The UI table header says "Start (UTC)" but renders `startDate startTime`. Ignore. |
| `startDate`, `endDate` | string `YYYY-MM-DD` | 100% | `2026-10-11` | UTC (UI card text: `{startDate} {startTime} to {endDate} {endTime} UTC`). |
| `startTime`, `endTime` | string `HH:MM` | 100% | `02:15`, `23:59`, `00:00` | UTC. No seconds. |
| `frequencies` | string, free text | 136/157 non-empty (21 empty) | see below | Not parseable reliably. |
| `comments` | string, free text | 133/157 non-empty | `SSB,CW,FT8`, `QRP Also SOTA I/LO-212`, `TEST OF RBN SPOTTING NOT REAL ACTIVATION` | Modes are often put here. Other refs (SOTA etc.) in free text. |

### Quirks
- Timezone: UTC, confirmed by the UI string and by Spothole's conversion (`startDate+startTime` -> `...+00:00`).
- Interval semantics are ambiguous. Normal case: 110/157 have `endDate == startDate`. But there are 213-227 day spans (`2026-05-18 11:00` -> `2026-12-30 00:00` for PF2X/P, two overlapping records for the same park) and 31-day spans. These are probably "I may be around any time during this period", not 7 months of continuous operation, or possibly a daily window. The API gives no way to tell. Treat > N days (e.g. 3) as `window` events and suppress or down-rank notifications.
- `endTime` `00:00` with `endDate` = the day after is common (end of day), `23:59` also (10 records), `00:00` on the same day as start yields end < start (1 record: start `2026-10-13 11:00`, end `2026-10-13 06:30`, i.e. user error). Validate `end >= start`; if not, add a day or drop end.
- `frequencies` samples, verbatim: `''` (21), `14074` (9, kHz), `7074`, `7217`, `433160`, `5357`, `40 20 17 15 M`, `40 to 10 CW, SSB, FT8`, `HF`, `40-10m`, `14-10-CW `, `40m and 20m`, `40m thru 15m`, `7,032`, `various`, `HF & VHF`, `146520 QSY 146550 backup 146580`, `14074, 18100, 21074`, `None`, `all`, `7MHZ,14MHZ`, `40/20/10`, `40-30-20-17-12-15-10 mt`, `14mhz `, `20m 40m SSB 2m FM`, `10-15-20-49m`, `10/15/20 mtr`, `15M 20M CW SSB`, `7-14 Mhz`. Mixes kHz (`14074`), MHz (`7,032` with a decimal comma-ish typo, `14mhz`), meters, band ranges (`40-10m`), the word `all`/`HF`/`None`/`various`. Need a tolerant tokenizer: numbers 1.8..30 are MHz band centres, >= 1800 are kHz, 100..1300 may be MHz VHF/UHF, `NNm` is metres, ranges between two band names expand to all HF bands between.
- Cancellation: none. A removed activation just disappears from the list (no tombstone). An `activation/remove` call is the only cancel. Disappearance before start = cancelled; after start = ended/removed.
- Test entries exist (`TEST OF RBN SPOTTING NOT REAL ACTIVATION`).
- Duplicates: same activator + park often posted repeatedly (PF2X/P NL-0253 has overlapping ids 149402 and 149390).
- No poster callsign, no mode field, no grid, no park coordinates.

### Related reference data (for "near you")
- Park coordinates: `GET https://api.pota.app/park/{ref}` -> `{"reference":"US-4387","name":"Wallowa-Whitman","latitude":45.3332,"longitude":-117.001,"grid4":"DN15","grid6":"DN15lh","parktypeDesc":"National Forest","locationDesc":"US-ID,US-OR",...}` (`pota_park_US-4387.json`), or the bulk list `GET /program/parks/{PREFIX}` (see `pota.md`). Joining on `reference` is exact.
- Live check ("is the scheduled activation now on air"): join `(activator, reference)` against `/spot/activator` (`pota_spot_activator.json`, 61 rows now). There is no explicit `scheduled`/`live` flag in the schedule record.

## 2. DXpedition calendar: NG3K ADXO (+ derivatives)

### Access
| URL | Format | Notes |
|---|---|---|
| `https://www.ng3k.com/adxo.xml` | RSS 2.0, 69 items (all active + upcoming incl. 2027), 24 KB | `Last-Modified` and `ETag` supported (conditional GET works). Channel `<copyright>Copyright 1996-2024, Bill Feidt</copyright>`. Linked from page as the RSS icon. |
| `https://www.ng3k.com/Misc/adxo.html` | HTML table, 37 KB, one `<tr class="adxoitem">` per op | Richer than RSS (see below). "Last updated: Tuesday, 13-Oct-2026 10:59:28 EDT". |
| `https://www.ng3k.com/Misc/adxoplain.html` | HTML text version: `Date / DXCC / Callsign / QSL / Source / Info` blocks | Easiest to parse. |
| `https://www.ng3k.com/Misc/adxo_exp.html` | Expired this year (109 KB) | History. |
| `https://www.danplanet.com/dxcal.ics` | iCal, 15 KB, KK7DS derived from ADXO | `Last-Modified: Tue, 13 Oct 2026 15:13:02 GMT`. All-day events, no UID, no DTSTAMP. |
| `/Misc/adxo.xml`, `.rss`, `.ics` | 404 | do not exist. |

- No auth. `robots.txt`: `Disallow: /temp, /cgi-bin/, /css/` only.
- Update cadence (from `aboutadxo.html`): "unusual to update ADXO fewer than two or three times a week", several times a day around major contests; automatic "new/archive/highlight" processing once a day at ~04:00-05:00Z. Poll hourly with conditional GET; DXLook polls the RSS every 30 minutes (their blog says so).
- Terms: only "Copyright (c) W.B. Feidt 1996-2026"; no API terms. Contact Bill@ng3k.com for corrections. Courtesy: ask permission / credit "NG3K ADXO". Note ADXO itself aggregates from OPDX, DXW.Net, 425DXN, TDDX, etc. ("Reported by" column).

### Verbatim RSS item
```xml
<item>
<title>Wallis and Futuna: Sep 26-Oct 17, 2026 -- FW1P -- QSL via: LoTW</title>
<description>
Sep 26-Oct 17, 2026 --
Wallis and Futuna --
FW1P --
QSL: LoTW --
Source: MM0NDX (Sep 28, 2026) --
By SP9FIH fm Wallis I (IOTA OC-054, AH16vq); 80 40 60m; SSB RTTY FT8 FT4; 100w; QRV for Oceania DX Contest, SSB
</description>
<link>https://www.qrz.com/db/FW1P</link>
</item>
```
Verbatim HTML row (adds the real spotting callsign in the DX Watch link, and an explicit "new" flag):
```html
<tr class="adxoitem" bgcolor="#FFDAB9"><td class="date">2026 Oct07</td><td class="date">2026 Oct17</td><td class="cty">Iceland</td><td><span class="call">TF</span><br><span class="spots"> <a href="http://www.dxwatch.com/dxsd1.php?f=0&amp;t=dx&amp;c=TF/PD9DX">[spots]</a></span></td><td class="qsl">M0URX</td><td class="rep"><a href="http://dx-world.net/">DXW.Net</a><br>20260829</td><td class="info">By PD9DX as TF/PD9DX; HF; SSB FT8 FT4; QRV for Scandinavian Activity Contest, SSB</td></tr>
```
Verbatim ICS (danplanet):
```
BEGIN:VEVENT
SUMMARY:Montserrat (VP2MAW)
DTSTART;VALUE=DATE:20261010
DTEND;VALUE=DATE:20261020
DESCRIPTION:By DK8YY DL8AKI DL1AOB DL1AWD DG0OHD\; also with personal calls VP2MBJ VP2MBK VP2MBN VP2MBL VP2MAU VP2MBM\; HF\; CW SSB FT8 RTTY\; QRV for WAG Contest
END:VEVENT
```

### Fields
| Concept | RSS | HTML table / text | ICS |
|---|---|---|---|
| DXCC entity | in `<title>` before `:` and 2nd line of description (`Wallis and Futuna`) | `td.cty` (`Wallis &amp; Futuna`, different spelling: `&`/`and`) | in SUMMARY `Wallis & Futuna (FW1P)` |
| Callsign | `-- FW1P --` in title; **may be only a prefix** (`TF`, `ZA`, `PJ7`, `V4`, `T8`, `3A`) when the call is not issued yet | `span.call`; the real call to spot is only in the `[spots]` link (`c=TF/PD9DX`) and in Info ("By PD9DX as TF/PD9DX") | SUMMARY |
| Start/end | `Sep 26-Oct 17, 2026` in title/description (year suffix once; ranges can span months and, in principle, years) | `2026 Sep26` / `2026 Oct17` | `DTSTART;VALUE=DATE:20260926`, `DTEND` = **end date, not exclusive +1** (ICS says `20261017` for "Oct 17"; the iCal convention would be Oct 18). Verify before using. |
| QSL via | `QSL: LoTW` / title `QSL via: LoTW` (also `TBA`, `?`, `See Info`) | `td.qsl` | absent |
| Reported by + date | `Source: MM0NDX (Sep 28, 2026)` (NOTE: RSS shows `MM0NDX`, `OPDX`, `TDDX`; the HTML shows `DXW.Net`, `OPDX`, `TDDX`: the RSS apparently prints the originating person/bulletin differently) | `td.rep` link + `20260928` | absent |
| Info | free text after `By ...` | `td.info` | DESCRIPTION |
| URL | `<link>` = QRZ page, op's own website, or the ADXO page | link on the callsign | none |
| New flag | none | `<img alt="NEW (Oct08)">` for 7 days | none |
| id / guid / pubDate | **none** (0 `<guid>`, 0 `<pubDate>`) | none | none (no UID) |

Info free text conventions (69 ops at fetch): `By <call(s)> [as <call>] [fm <place>] (IOTA XX-nnn, <6-char grid>); <bands>; <modes>; <power>; QSL via ...; QRV for <contest>`. 14 of 69 mention IOTA, 11 contain a 6-char Maidenhead locator, 4 say `QRV for <contest>`. Bands are written as `80 40 60m`, `80-10m`, `HF`, `HF + 6m`, `40-10m`. Modes as `SSB RTTY FT8 FT4`, `CW SSB FT8`, `mainly FT8, some SSB`.

### Quirks
- Day resolution only; times are not given. Treat start as `00:00Z` and end as `23:59:59Z` of the end date (the DXpedition can start on local date, which can be previous UTC day).
- No ids. Derive `id = sha1(dxcc_entity + "|" + callsign + "|" + start_date)` and accept that edits to those fields look like delete+create. If the same entity and call are re-announced with new dates, you cannot tell it from a new one.
- Cancellation: no marker in HTML, RSS or the expired page (grep for cancel/postpone found nothing). A cancelled op is silently removed; an op that is removed before its start date should be flagged `cancelled`, one removed after start as `ended early`.
- Order: RSS is sorted by start date; items span current + next year (2027 ops are present, 16 of 69).
- Encoding: HTML is ISO-8859-1; RSS declared XML with no encoding (UTF-8 default; fetched content was ASCII). `&amp;` entities in titles and ICS.
- Contest-tied ops: ADXO also keeps separate per-contest tables ("CQ WW DX SSB" etc.); only the main table is in the RSS.
- Multiple operator callsigns in Info ("also with personal calls VP2MBJ VP2MBK ...") are free text, so alert matching on those calls needs a text scan of `Info`.
- No coordinates anywhere; location = DXCC entity (join to your DXCC table for lat/lon of the entity centroid), sometimes a place name (`Calpso Bay, St Kitts I`) and sometimes a grid in Info.

### DX World / dxnews / QRZ
- DX World (`dx-world.net`): BLOCKED (403 to curl). Cited by RSGB as a main free weekly bulletin along with 425 DX News. No evidence found of an RSS/ICS. ADXO already credits "DXW.Net" as a source, so it adds nothing structured we can reach.
- dxnews.com: BLOCKED by proxy policy, not evaluated.
- Others that exist downstream of ADXO: DXLook (pulls ADXO RSS every 30 min), danplanet dxcal.ics, Spothole `NG3K` alerts.

## 3. Contest calendars

### 3a. WA7BNM Contest Calendar (contestcalendar.com)
- Feeds found:
  - `https://www.contestcalendar.com/calendar.rss` (RSS 2.0, 8-day window; 9.6 KB; `Last-Modified`/ETag present; `<lastBuildDate>` set at 00:00 UTC; items have `title`, `link` (contestdetails or weeklycontdetails page), `description` = `0030Z-0230Z, Oct 14`, `guid`).
  - `https://www.contestcalendar.com/weeklycontcustom.php` (ICS of the weekly mini-contests, 12 KB).
  - `https://www.contestcalendar.com/fivewkcal.ics` (ICS, 5-week calendar, 69 VEVENTs).
  - HTML pages: `contestcal.php` (12-month), `fivewkcal.php`, `perpetualcal.php`, `historicalcal.php`, `alphabetical.php`, `contestdetails.php?ref=N`; Google Calendar embed on the home page. The 12-month ICS name was not found (`contestcal.ics`, `calendar.ics`, `12monthcal.ics` = 404).
- **Terms (https://www.contestcalendar.com/terms.php, revision 2025-03-07), verbatim essentials:** "You may not use any software robot, spider or other automated means to access, monitor or copy the content of the Site, except as specifically allowed in these Terms or by written authorization from the Owner." "You may use an ICS feed, when available, to load a calendar of contests into a calendar software application for personal use. You may also use an RSS feed, when available, to display a limited contest calendar on a club or other non-profit website, as long as the display is labeled 'WA7BNM Contest Calendar' and includes one or more links to the Site's web pages." "A subset of data associated with contests may be available in XML or JSON format to contest-related software authors at the discretion of the Owner and upon execution of a written agreement by the Owner." => A commercial/rewrite service polling these feeds is not covered; get a written agreement with Bruce Horn WA7BNM (bhorn@hornucopia.com) first. (Spothole ingests it anyway, which is not an endorsement.)
- Verbatim ICS event:
```
BEGIN:VEVENT
DTSTAMP:20261014T000007Z
UID:417610787@contestcalendar.com
DTSTART:20261013T180000Z
DTEND:20261013T192900Z
SUMMARY:DARC RTTY Sprint
DESCRIPTION:https://www.contestcalendar.com/fivewkcal.html
URL:https://www.contestcalendar.com/contestdetails.php?ref=744
END:VEVENT
```
- Verbatim RSS item:
```xml
<item>
<title>NAQCC CW Sprint</title>
<link>https://www.contestcalendar.com/weeklycontdetails.php?ref=003fbit2</link>
<description>0030Z-0230Z, Oct 14</description>
<guid>https://www.contestcalendar.com/?g=00tmvg20020713</guid>
</item>
```
| Field | Source | Notes |
|---|---|---|
| UID | ICS `417610787@contestcalendar.com` | Same UID in `weeklycontcustom.php` and `fivewkcal.ics` for the same instance, so stable across feeds. It identifies an instance (the 8-day feed's `UID:417610890` for the Worldwide Sideband Activity Contest is a different number from its `ref=672`). |
| DTSTART/DTEND | UTC `...Z` | End minutes are inclusive-style: `DTEND:20261013T192900Z` for a contest starting `180000Z` (1 h 29 min 00 s), and `...015900Z`; HTML shows `0000Z to 2359Z`. Do not round; treat end as inclusive minute. |
| SUMMARY | contest name | e.g. `CWops Test (CWT)`, `Phone Weekly Test`. |
| URL | `contestdetails.php?ref=N` | `ref` = stable contest id (498 = CWT). Instances of one contest repeat the same `ref`. |
| DESCRIPTION | feed page URL only | No bands/modes/exchange in the ICS. |
| Contest metadata | `contestdetails.php?ref=784` HTML: `Status: Active, confirmed`, `Geographic Focus`, `Participation`, `Mode: FT8/4`, `Classes`, `Max power`, `Exchange`, rules URLs | HTML scrape only, which the terms forbid. |
- Quirks: multi-window contests (e.g. NRAU 10m, `1700Z-1800Z (CW) and 1800Z-1900Z (SSB) and ...`; Walk for the Bacon `0000Z-0100Z, Oct 1 and 0200Z-0300Z, Oct 2`) appear as several VEVENTs in ICS, a single multi-line row in HTML; modes appear in parentheses in HTML text only; no cancellation field (a cancelled contest disappears or `Status` changes on the details page); "not all contests appear for later months" (12-month page); no geography beyond "Geographic Focus: North America". ICS has no LOCATION/CATEGORIES.

### 3b. SM3CER (sk3bg.se/contest)
HTML page that states it "is not currently updated because Jan is home from hospital"; `last-modified: Fri, 07 Dec 2018 09:54:14 GMT`; shows a March (2018) contest list. No feed. Drop.

### 3c. RSGB contest calendars
Not fetched directly. Spothole carries `RSGB HF Contests` and `RSGB VHF Contests` as alert sources (e.g. `"RSGB 432MHz FT8 AC (4 hours)"`, start `2026-10-14T17:00:00+00:00`, end `20:59:59`, `freqs_modes: "432MHz, FT8"`), implying a structured feed exists (RSGB publishes ICS); unverified here.

## 4. Special event stations

### 4a. ARRL "Special Event Stations" (https://www.arrl.org/special-event-stations)
- Format: HTML only. The form posts to `/special-event-stations`, but results are a server-rendered list at a CakePHP URL that can be GET with filters: `https://www.arrl.org/special_events/search/Date.start:2026-10-13/Date.end:2026-12-31/model:Event` (8 results/page, "Results 1 to 8 of 47"; paginated with `/page:N/` segment). Fields on the search form (`data[...]`): `Search[call_sign]`, `Search[keywords]`, `Location[zip]` + radius (25/50/100/250 miles), `Location[city]`, `Location[state]`, `Location[division_id]`, `Location[section_id]`, `Location[country]`, `Date[start]`, `Date[end]`.
- No JSON, no RSS, no ICS. A plain POST with only `state=Ohio` returned the form with no list (results appear to need the GET/date form).
- Volume: 47 events from 2026-10-13 through 2026-12-31; 566 from 2025-01-01 through 2026-12-31; 3185 over 2014-07-01..2023-03-22. Data source: user submissions via https://www.arrl.org/special-events-application (the dropdown for `Country` contains raw user-typed junk like `EN`, `BU`, `OT`, `PO`, `SP`, `SW`, `UN`, `WO`, `BELGIUM` and `Belgium`, so the underlying data is free text).
- Robots: `https://www.arrl.org/robots.txt` has `Crawl-delay: 5` and disallows several admin paths, not the `/special_events/` path. ToS for the site not read; check before bulk scraping.
- Verbatim result item (HTML):
```html
<li>
 <h3>
 <span>10/12/2026 | </span>
 3rd Annual National Sasquatch Awareness Day </h3>
 <p>
 <B>Oct 12-Oct 21, 0001Z-2359Z, W7DK</B>, Tacoma. Radio Club Of Tacoma. 14.255. Certificate &amp; QSL. Radio Club of Tacoma c/o Bigfoot, PO Box 1188, Tacoma, WA 98411. Callsigns W7B, W7I, W7G, W7F, W7O, W7T, W4S (Bonus Station) ALL Bands Modes: CW, SSB, FT-8/4, RTTY <A HREF="http://w7dk.org" class="spevlink">w7dk.org</A> </p>
 </li>
```
and
```html
<span>10/13/2026 | </span> US Navy 251st Birthday </h3>
<B>Oct 13, 1700Z-2359Z, NI6BB</B>, San Pedro, CA. Battleship IOWA ARA. 1074 14261 18161 21361. QSL. BIARA, c/o QSL Manager, 250 S. Harbor Blvd., San Pedro, CA 90731. <A HREF="http://biara.org" class="spevlink">biara.org</A>
```
| Piece | Where | Notes |
|---|---|---|
| title | `<h3>` | free text |
| list date | `<span>MM/DD/YYYY \|</span>` | US month-first; = start date |
| dates | `<B>Oct 12-Oct 21, 0001Z-2359Z, W7DK</B>` | `Mon D[-Mon D], HHMMZ-HHMMZ, CALL`. Year is implied from the span. The time range applies **daily** ("Times are daily" seen in older entries), not to the whole span. |
| callsign | after last comma inside `<B>` | primary call only; others in the free text ("Callsigns W7B, W7I, ..."). |
| location | text after `</B>` | `Tacoma.` / `San Pedro, CA.` ; city (+ state sometimes). No coordinates; no zip in output (zip search is server-side). |
| sponsor | next sentence | |
| frequencies | next sentence | free text: `14.255`, `1074 14261 18161 21361` (kHz mixed with a typo `1074`), `145.350MHz`, `14.320MHz 40m depending upon band cond. 15M band conditions .`, `SSB 28.465 21.365 12.265 7.270 3.850; CW PSK31 10 15 20 40 meters` (older). |
| QSL/certificate | `QSL.`, `Certificate.`, `Certificate & QSL.` | |
| address | free text | |
| URL | `<A class="spevlink">` | sometimes empty `http://` (2 of 8 in current sample) |
- Quirks: no ids (use hash of `call|start|title`); no cancellation concept; edits invisible; overlapping dates for multi-call events ("W7B ... W4S (Bonus)"); no timezone issue (Z times) but the whole-span+daily-window semantics are only in the text; the date in `<span>` can differ from the real first day for events carried over from earlier months.

### 4b. Other special-event sources
- RSGB lists permanent special-event callsigns (https://rsgb.org/main/?p=116), a static page, not events. Ofcom publishes special event call sign guidance as PDF (not events). No other machine-readable special-event calendar was found. ADXO sometimes covers major special event DX calls. Spothole has no dedicated special event source.

## 5. ARISS

### 5a. Educational contacts schedule
- `https://www.ariss.org/upcoming-contacts.html` (the URL in the brief) is **404**. The live page is `https://www.ariss.org/upcoming-educational-contacts.html` (Weebly/Square site; 301 KB HTML). Also linked: `/upcoming-sstv-events.html`, `/news-archive.html`, `/press-releases.html`, `/current-iss-crew.html`.
- No feed. Format: HTML free text, two blocks (top: confirmed upcoming contacts "As of October 12, 2026"; below: the latest ARISS news release in prose).
- Verbatim (stripped from HTML):
```
As of October 12, 2026
EcoTarium, Worcester, MA telebridge via AB1OC (Luke Delaney KJ5PPF)
Contact is go for: Thu 2026-10-15 15:25:33 UTC 40 deg (***)
Watch for Livestream at https://youtube.com/live/F04UKyV1LIA

Ecole Internationale PACA de Manosque, Manosque, France, direct via F4KKM (Joshua Kutryk KJ5BFU)
Contact is go for: Fri 2026-10-16 11:37:19 UTC 25 deg
```
- Meaning: `<school>, <city, region>, <telebridge|direct> via <ground-station call> (<astronaut name> <astronaut call>)`; `Contact is go for: <DoW> <YYYY-MM-DD> <HH:MM:SS> UTC <N> deg` where `deg` is the maximum ISS elevation at the ground station (inferred); `(***)` appears to be an editor flag (unknown meaning). Timestamp is AOS time to the second in UTC: 15:25:33 UTC.
- The news release (ARISS News Release No. 26-59) adds, in prose: downlink `145.800 MHz`, ground station call `GB4WHS`, astronaut `KJ5BFU`, local time conversions (BST, EDT...), school description, the students' questions. A school location is only the city name; no coordinates. Contacts before the event are 2 per page here; ARISS says 60-100 contacts/year.
- Quirks: items appear/disappear without ids; the "Contact is go" line is replaced by the next contact once done; contacts get postponed by editing the page; the page is hand-edited so format is only roughly constant. Frequencies: downlink 145.800 MHz (FM) typically, may differ (ISS-footprint listening, packet 145.825). Per the brief, overlaps with the satellite colleague: keep to schedule shape.

### 5b. ISS SSTV events
- `https://www.ariss.org/upcoming-sstv-events.html` (61 KB), HTML blog-style, newest first, free text:
```
2026-09-23 SSTV Expedition 75 Series 33 featuring "Student Education" Begins Friday October 2, 2026 9:00 UTC. Concludes Tuesday October 6, 2026 at 15:55 UTC. Images will be transmitted at 437.550 MHz (+/- Doppler shift), decode with Robot 36 mode. Submit your images to the SSTV gallery for event certificate. Transmission 36 seconds on 2 minutes off
```
- Shape: announcement date, series number, theme, start and end UTC (prose, formats vary: `Begins Friday October 2, 2026 9:00 UTC`, `The SSTV event begins Friday May 8 10:30 UTC`, `should begin shortly after 11:15 UTC on April 10`, `start time TBD`), frequency 437.550 MHz (or 437.825 MHz on satellite RS-38S for the Series 30 retread), mode `Robot 36`, duty cycle. Updates (interruptions for school contacts: "switched off Nov. 16, 2025 at 14:30 UTC ... switched on 15:05 UTC") are separate blog entries. Gallery/certificates at ariss-usa.org/ARISS_SSTV. Cadence: roughly 3-6 events a year.
- Not machine-parseable; maintain as a manually curated list or parse with a tolerant regex and a human check. Cancellation/interruption is expressed in later prose entries.

## 6. ParksnPeaks alerts (aggregator for SOTA/WWFF/POTA/ZLOTA/LLOTA...)

- `GET https://www.parksnpeaks.org/api/ALERTS/` (documented at https://www.parksnpeaks.org/api/ "ALERTS: Alerts are upcoming activity"); `content-type: text/html` but body is JSON; no auth for read (creating an ALERT needs per-user APIKey). 21 records, 4.9 KB. Header `x-server-cache: true`.
- Verbatim:
```json
{"alID":"132916","WWFFID":"","CallSign":"VK1AD","Class":"SOTA","Location":"VK1\/AC-043","alDay":"0","alTime":"2026-10-14 10:00:39","Freq":"HF","MODE":"SSB 144-","Comments":"HF followed by 2m","Alerter":"VK1AD"}
{"alID":"132822","WWFFID":"","CallSign":"ZL4DE","Class":"ZLOTA","Location":"ZLP\/SL-0008 - Conservation Are","alDay":"0","alTime":"2026-10-16 20:00:00","Freq":"7090","MODE":"SSB","Comments":"(de ZL4DE)","Alerter":"ZLOTA"}
```
| Field | Notes |
|---|---|
| `alID` | string number; stable key. |
| `WWFFID` | WWFF ref cross-reference if known (`VKFF-1890` on a SOTA row), else `""`. |
| `CallSign`, `Class` (`SOTA` 11, `WWFF` 5, `ZLOTA` 3, `POTA` 1, `LLOTA` 1), `Location` | `Location` is a summit code for SOTA and a free-text park name for WWFF; for ZLOTA it is `ZLP/SL-0008 - Conservation Are` (**truncated** to ~30 chars). |
| `alDay` | string `"0"`/`"2"`: unknown meaning (likely days offset / duration). |
| `alTime` | `YYYY-MM-DD HH:MM:SS`, **no timezone**. |
| `Freq`, `MODE` | free text; `Freq` values seen: `7090` (kHz), `14`, `144.2`, `7.144`, `7`, `HF`, `7.090 14.062 14.310 146.5 144.2`, `7SSB`; `MODE`: `SSB`, `''`, `cw`, `SSB 144-`, `14SSB 7CW`, `28 CW S`, `SSB 14-CW 7-SSB 7`. |
| `Alerter` | poster; for mirrors `ZLOTA`. |
- **Time-zone trap, verified:** the VK1AD row `alTime 10:00:39` mirrors SOTA alert 69071 whose `dateActivated` is `2026-10-13T23:00:39Z`; therefore for SOTA-mirrored rows `alTime` is Australian Eastern Daylight Time (UTC+11), not UTC. Spothole's `ParksNPeaks` alerts treat the NZ rows (`alTime 2026-10-16 20:00:00`) as UTC (`start_time_iso 2026-10-16T20:00:00+00:00`), which may be wrong for them as well (NZDT is UTC+13). Treat PnP alert times as untrustworthy local time; prefer the primary feeds (SOTA, WWFF, POTA).
- Because the same activation is a mirror of the SOTA/WWFF/POTA alert, ingesting PnP creates duplicates; its unique value is ZLOTA/LLOTA/SiOTA/KRMNPA/etc. (regional programs).

## 7. IOTA / ILLW / Castles / Bunkers

- **ILLW (Lighthouses)**: the event is a fixed weekend (30th ILLW: 0001 UTC 21 Aug 2027 to 2400 UTC 22 Aug 2027; 28th was 16-17 Aug 2025). Entrants are published as per-year HTML tables at `https://illw.net/index.php/entrants-list-2025` (434 registered, 200 KB) and `https://www.lighthouse-weekend.international/index.php/entrants-list-2027` ("Total= 75"; the `-2026` URL is 404 now since the event is over). Columns: `Country | Call | Lighthouse Name | ILLW No. | QSL Route and other information | Web`. Example rows: `Australia | VK3ILH | Cape Otway | AU0011 | Buro`, `England | GB1BHL | Beachy Head | UK0104 | QRZ`. Free-text quirks: `San Matias. Cancelled` and `Claromenco (Cancelled)` in the *name* column are the only cancellation signals; same callsign appears on several lighthouses (AZ2D). The `illw.net` RSS (`/index.php?format=feed&type=rss`) is just the Joomla homepage article, not the entrants. No coordinates in the entrants table (the "Lighthouse List" page, not fetched, is the reference list). Planned-event shape: one event per entrant, start/end = event weekend, reference = ILLW number (`AU0011`; also ARLHS numbers are common cross-references but not provided here).
- **IOTA**: `iota-world.org` announcements page returned 403 to curl. Island operations are announced mostly through NG3K (`Info` has `IOTA OC-054`) and the IOTA site; no feed found.
- **Castles (COTA / WCA)**, **Mills (MOTA)**, **SiOTA**, **GMA**: no alert feed found. GMA's WWFF API needs a key (see `wwff.md`). ParksnPeaks `ALERTS` carries SiOTA/ZLOTA/LLOTA classes.
- **WWBOTA (Bunkers)**: the brief says the OpenAPI has an `Alert` spot type. **It does not.** In `raw/wwff/wwbota_openapi.json` (v1.12.0), schema `SpotType` is exactly `enum: ["Live","QRT","Test"]` (default `Live`), the string "Alert" is not in the document, and the paths are `/spots/`, `/bunkers/`, `/awards`, `/logs/...`, `/stats/...` only; there is no alerts/agenda endpoint. (The WWFF colleague's appendix mentions "Test/QRT/Historic/Alert type enum" which is also not accurate.) Also note that `Spot.freq` there says "must be provided for a Live spot", which hints `freq` can be null for other types, but no planned type exists.
- **HEMA, SiOTA, POTA-like other programs**: no alerts feed beyond PnP.

## 8. Prior art: Spothole's alert model (`GET https://spothole.app/api/v1/alerts`)
Aggregates exactly this class of source (counts in the first 200: SOTA 75, POTA 57, NG3K 36, WA7BNM Contest Calendar 16, RSGB VHF Contests 6, ParksNPeaks 4, WWFF 2, RSGB HF Contests 2, Hamsat 2). Saved: `spothole_alerts.json` (first 60 of 200). Verbatim records (trimmed to the key fields):
```json
{"id":"629cf6a4...","dx_calls":["FW1P"],"dx_names":["Janusz Wegrzyn"],"dx_country":"Wallis and Futuna","dx_continent":"OC","dx_dxcc_id":298,"dx_grid":null,"dx_latitude":null,"dx_longitude":null,"freqs_modes":"80 40 60m; SSB RTTY FT8 FT4","start_time":1790380800.0,"start_time_iso":"2026-09-26T00:00:00+00:00","end_time":1792281540.0,"end_time_iso":"2026-10-17T23:59:00+00:00","comment":"By SP9FIH fm Wallis I (IOTA OC-054, AH16vq); 100w; QSL: LoTW","url":null,"sig_refs":[],"received_time_iso":"2026-10-05T16:05:56+00:00","source":"NG3K","source_id":null,"sig":"DXpedition"}
{"id":"22b718ad...","dx_calls":["N6JFD/P"],"freqs_modes":"14-cw, 21-cw, 7-cw","start_time_iso":"2026-10-13T21:15:00+00:00","end_time":null,"comment":"Last day in Tahoe, gotta hit my 2nd favorite peak","sig_refs":[{"sig":"SOTA","id":"W6/NS-248","name":"7008","ref_type":"SUMMIT","url":"https://www.sotadata.org.uk/en/summit/W6/NS-248","latitude":38.8959,"longitude":-120.0083,"altitude":2136.0,"grid":"CM98XV","activation_score":6}],"source":"SOTA","source_id":69152,"sig":"SOTA"}
```
Design points worth copying: `dx_calls` is an array; reference list `sig_refs[]` each with `sig, id, name, ref_type, url, lat, lon, altitude, grid, activation_score`; `freqs_modes` kept as one raw string (even Spothole does not structure it); `end_time` nullable; `start/end` as epoch + ISO; `received_time`; `id` = hash (so no edit semantics); no cancelled flag; contests carry no callsigns.
Things it shows: Spothole resolves coordinates for POTA/WWFF/SOTA refs but leaves DXpedition location empty; for contests it fills only the country of the sponsoring society.

## 9. "Discover near you": which sources carry a location
| Source | Native location | Geo-query possible? | What you need |
|---|---|---|---|
| POTA schedule | none; `reference` -> park `latitude/longitude/grid6` via `/park/{ref}` or `/program/parks/{PREFIX}` (park list is already needed by the Spot side) | yes, after join | park table with lat/lon, refreshed hourly; on-miss fetch `/park/{ref}`. |
| SOTA alerts | `associationCode` + `summitCode`, `summitDetails` "Name, 1177m, 4 pts" (no coords) | yes after join | SOTA summit list CSV (lat/lon in summit list per `sotawatch.md`). |
| WWFF agendas | `reference` (KFF-3507) | yes after join | WWFF directory CSV (lat/lon). |
| PnP alerts | WWFF/SOTA code or park-name string | partial | same lists; name-only rows (ZLOTA/LLOTA) need PnP site lists. |
| ADXO DXpedition | DXCC entity name; sometimes IOTA ref and a 6-char grid in Info; place name | coarse (entity centroid) or grid when present | DXCC table with entity centroid + a regex for `\b[A-R]{2}\d\d[a-x]{2}\b` and `IOTA [A-Z]{2}-\d{3}`; IOTA list for island coordinates. |
| WA7BNM contests | none | no (global events); at most "Geographic Focus" | n/a: contests are matched by name/band/mode, not location. Region filter = sponsor country if wanted. |
| ARRL special events | city (+ state) text in the entry; zip search done server-side by ARRL | needs geocoding | gazetteer (GeoNames US cities by name+state; ARRL entries often omit state for foreign events); callsign DXCC as fallback. |
| ARISS contacts | school city/country in text; ground-station call | needs geocoding | gazetteer; more relevant is **footprint**: ISS pass visibility at user's QTH (satellite colleague's domain) rather than school location. |
| ILLW | none in entrants table | needs lighthouse list (ILLW/ARLHS number -> lat/lon) | ILLW "Lighthouse List" page or ARLHS list (not fetched). |
| Spothole | resolved lat/lon/grid for `dx_*` and `sig_refs[]` | yes | n/a |

A geo query ("events within R km of lat/lon, starting in the next N days") therefore needs a **resolved point** stored on the event: `references[].lat/lon` when a program reference exists, else `location_point` from geocoding/DXCC centroid, with a `location_precision` enum (`exact`, `grid6`, `city`, `dxcc`, `none`). Store a geohash/H3 cell or use PostGIS/R-tree; compute great-circle distance server-side. Cache reference tables (park/summit/WWFF) and resolve at ingest, not at query time.

## 10. Proposed common `PlannedEvent`

```ts
PlannedEvent {
  id: string                 // `${source}:${sourceId}`; sourceId from the table below
  source: 'pota'|'sota'|'wwff'|'pnp'|'ng3k'|'wa7bnm'|'arrl-se'|'ariss'|'ariss-sstv'|'illw'|...
  kind: 'activation'|'dxpedition'|'contest'|'special-event'|'ariss-contact'|'sstv'
  callsigns: string[]        // activator / DX call(s) / event call; [] for contests
  title: string              // display; contest name / event name / "{call} @ {ref}"
  start: string              // ISO-8601 UTC
  end: string|null           // ISO-8601 UTC or null
  timePrecision: 'minute'|'second'|'day'   // NG3K and ILLW are 'day'
  recurrence?: 'daily-window'|'continuous'|'unknown'   // POTA long ranges, ARRL "times are daily"
  references: { scheme: 'POTA'|'SOTA'|'WWFF'|'IOTA'|'ILLW'|'ARLHS'|'BOTA'|'ZLOTA'|...,
                ref: string, name?: string, lat?: number, lon?: number, grid?: string,
                altitude_m?: number, points?: number }[]
  location?: { lat: number, lon: number, precision: 'exact'|'grid6'|'city'|'dxcc', dxcc?: number, text?: string }
  frequencies: { raw: string,                       // always keep the original text
                 bands?: string[], modes?: string[], // only when parsed, e.g. ['40m','20m'] ['SSB','CW']
                 freq_khz?: number[] }              // only when explicitly given as a tunable frequency
  poster?: string            // callsign of whoever posted it (SOTA, WWFF, PnP); POTA only has a user id
  comment?: string
  url?: string
  extra?: object             // source specific: qsl, reported_by, exchange, school, ground_station, astronaut, ...
  updatedAt: string          // ISO, first seen / last changed by us (see below)
  cancelled: boolean         // see below
  firstSeenAt: string
}
```

Fill matrix (Y = natively, p = by parsing free text, j = by joining a reference table, - = not available):

| Field | POTA | SOTA alerts | WWFF agendas | PnP | NG3K | WA7BNM | ARRL SE | ARISS | ILLW |
|---|---|---|---|---|---|---|---|---|---|
| source id | `scheduledActivitiesId` | `id` (+`epoch` feed) | `id` | `alID` | derive (hash) | `UID` | hash | hash(school,AOS) | `ILLW No.`+call+year |
| kind | activation | activation | activation | activation | dxpedition | contest | special-event | ariss-contact / sstv | special-event |
| callsigns | Y (`activator`) | Y (`activatingCallsign`) | Y (`activator_call`) | Y | p (prefix only sometimes; real call in Info/spots link) | - | p (primary in `<B>`; others in text) | p (ground station + astronaut) | Y |
| title | build | build | build | build | build `{entity} {call}` | Y (SUMMARY) | Y (`<h3>`) | build | `{lighthouse name}` |
| start | Y min, UTC | Y sec, UTC | Y sec, UTC | **local tz, no marker** | day only | Y min, UTC | day + daily UTC window (p) | Y sec, UTC (p) | event weekend |
| end | Y min | **-** (SOTA has no end) | Y | - | day only | Y | day (p) | - (pass ~10 min) | event weekend |
| references | Y `reference` | Y summit (split assoc/code) | Y `reference` | Y class+location | p (IOTA ref in Info) | - | - | - | Y ILLW no. |
| lat/lon | j (park) | j (summit list) | j (WWFF dir) | j | p/j (grid, entity) | - | j geocode | j geocode / n/a | j |
| frequencies raw | Y `frequencies` (junk-prone) | Y `frequency` (`7-cw, 14-ssb`) | Y `band`+`mode` | Y free | p (bands/modes in Info) | - (contest page) | p | p (145.800 MHz) | - |
| structured bands/modes | p | p (MHz-mode pairs) | Y (comma lists) | p | p | p from details page | p | p | - |
| poster | - (user id only) | Y `posterCallsign` | Y `poster` | Y `Alerter` | p (`Reported by`) | - | - | - | - |
| comment | Y | Y (`comments`, null possible) | Y `remarks` | Y | Y Info | - | Y | Y | Y QSL/Info |
| url | build park page | build | build | - | Y `<link>` | Y | Y (may be empty `http://`) | livestream url p | - |
| updatedAt | not provided: use `firstSeenAt` and detect change by field hash | SOTA `timeStamp` = post time; edits keep id (`sotawatch.md`) | `created_at` only | - | not provided; RSS `Last-Modified` for the whole file | `DTSTAMP` = feed build time | - | page `As of` date | - |
| cancelled | disappearance | comment `CANCELLED` or disappearance | (see `wwff.md`) | disappearance | disappearance | disappearance | none | page edit | text "Cancelled" in name |

Notes on specific fields:
- **Time**: use ISO UTC everywhere. Source-specific normalisation: POTA `startDate+startTime` (UTC); SOTA `dateActivated`; WWFF `utc_start`; PnP needs per-class tz handling (see 6); NG3K day-level, store `timePrecision: 'day'` and notify "today" style; ARRL daily window + span.
- **Frequencies** must remain `raw` text first. Provide a best-effort parser producing `bands[]`/`modes[]`; do not invent a single `frequency`. SOTA: `"144.300-ssb, 145.500-fm, 7-ssb"` (MHz-mode pairs). POTA: kHz numbers or band words. ADXO: `80-10m; CW SSB FT8`. WWFF: `band: "40m, 30m"`, `mode: "SSB, CW, FT8, FT4"` (best structure). ARRL: kHz/MHz mixed. Contests: bands only in the rules page.
- **Cancellation semantics** (the real design question): no source has a first-class cancel flag. Observed: POTA remove = row vanishes; NG3K = row vanishes; WA7BNM = vanishes; SOTA = `CANCELLED` text in comment or deletion; ILLW = word "Cancelled" in the name; ARISS = page edit. Recommended: the ingester diffs each poll against its previous snapshot of that source; a previously seen id whose `end` (or `start` when no end) is still in the future and that is absent now becomes `cancelled: true`, kept for a grace period so users get a "cancelled" notification; ids whose end has passed are expired silently. Add a text heuristic `/cancel|postpon|not happening|called off/i` on comment/title.
- **Edits**: POTA edits = new id (remove + create); SOTA edits keep id (changes `dateActivated`/`frequency`/`comments`); the others unknown/none. Therefore `id` is the source id when stable; for sources with no id use a hash of a normalised key (`call|start_day|ref`) and treat key changes as delete+create. Keep a `contentHash` so `updatedAt` can be set to the time WE saw a change.
- **Multiple records for the same real-world activation** (POTA double postings, SOTA + PnP + WWFF mirror, ADXO + WA7BNM for contest-linked DXpeditions): dedup key suggestion `(callsign upper no /P suffix, reference, start rounded to 1 h)`; keep `sources[]`.

## 11. Open questions / risks for schema designers
1. **Licensing/ToS**: WA7BNM forbids automated access without written agreement (ICS personal-use only). NG3K, ARRL, ARISS have no stated API terms; ARRL has Crawl-delay 5. A production rewrite should ask NG3K and WA7BNM for permission and attribute. Spothole ingests them regardless.
2. **POTA long-range schedules** (7 months) look like "available some time" and could generate noisy notifications; need `recurrence`/`window` semantics or a max-duration filter. Also POTA gives no poster call and no coordinates.
3. **Frequency tokens are free text** in every source; plan a shared parser and keep `raw`.
4. **No stable ids** for ADXO, ARRL, ARISS, ILLW; hash keys will churn on edits. Decide whether churn = new notification.
5. **Timezone**: only PnP is a trap (local, unmarked, differs per mirror); NG3K dates are probably local dates of the DXpedition; ARRL times are `Z`.
6. **Day-precision events** (DXpeditions) cannot be "starting in N minutes" alerts. Likely a notification rule on "on air now" needs live DX-cluster spots joined by callsign (the ADXO call may be only a prefix such as `TF` or `ZA`, with the real spot call in the Info and `[spots]` link).
7. **End semantics**: SOTA alerts have no end time; ILLW and ADXO have day ends; ARISS has none (pass ~10 min). `end` must be nullable and clients must default a window.
8. **Geo**: only program-reference events have exact points; the rest needs gazetteer geocoding or entity centroids, so the schema should carry `location.precision`.
9. **Alert-to-spot link**: scheduled activation -> live spot join key = `(callsign, reference)`; POTA schedule and spot use the same strings, but `/P` suffixes and case vary. Consider `PlannedEvent.state: scheduled|live|ended` derived from time + presence of spots.
10. Not verified: RSGB contest calendar feeds, DX World / dxnews / QRZ calendars, IOTA announcements, ILLW lighthouse list coordinates, ARRL site ToS, WWFF/SOTA behaviour beyond what colleagues documented, whether POTA's `/activation` ever emits non-null `activityStart/End` (all 157 were null).
