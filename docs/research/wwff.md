# WWFF (World Wide Flora & Fauna) spot source: "Spotline"

Researched 2026-10-13. Raw samples: `.../scratchpad/sources/raw/wwff/` (spots.json, agendas*.json, wwff_directory_head50.csv, wwbota_openapi.json, saved HTML pages). Scripts: `.../sources/scripts/wwff_csv.py`.

Reachability: the telnet feed (spots.wwff.co:7300) was NOT reachable (raw TCP blocked). Everything about the telnet line format below is inferred from (a) the current HamAlert parser in `cluster.js`, (b) the one real line quoted in a Log4OM forum post (login-walled; I saw it only as a search-engine excerpt), and (c) the structure of the JSON feed. The HTTP/JSON side and the park CSV were fetched live and are verified.

IMPORTANT discovery: WWFF replaced its old spotting system with a new in-house service called **Spotline** ("ON AIR starting 1st of June 2025", written by Jouni OH3CUF; https://spots.wwff.co/info, https://wwff.co/spotline/). It has a first-party **JSON file feed** (`/static/spots.json`) that is much cleaner than parsing the telnet comment. Spotline's own info page lists HamAlert among the apps that integrate with it. Before that, HamAlert only saw WWFF refs that humans typed into ordinary DX-cluster comments (HamAlert forum threads #812, #902; HB9DQM added a "WWFFwatch" source in March 2025, which I could not inspect).

---

## 1. Access

| Channel | URL | Format | Auth | Notes |
|---|---|---|---|---|
| Telnet "DXspider-mimic" | `spots.wwff.co:7300` | DX-cluster text lines | none for read (current code sends no login; server says it is read-only and ignores commands, per Log4OM post) | streaming; not testable here |
| **Recent spots JSON** | `https://spots.wwff.co/static/spots.json` | JSON array, newest first, **last 50 spots only** | none | official; recommended refresh **30 s**, "do not exceed" |
| Active agendas | `https://spots.wwff.co/static/agendas_active.json` | JSON array | none | scheduled activations (alerts) |
| All agendas | `https://spots.wwff.co/static/agendas.json` | JSON array | none | past/current/future |
| Reference check | `https://spots.wwff.co/api/references/validate?reference=KFF-3507` | JSON | none | returns `{"valid":true,"is_active":true,"reference":"KFF-3507","name":"Lost Maples"}`; unknown: `{"valid":false,"is_active":false,"message":"Reference not found"}`. Found by reading the web form JS; undocumented. |
| API root | `https://spots.wwff.co/api` | JSON | API key for the real API | returns `{"message":"Spotline API","version":"1.0"}`. Info page: "To request an API key, please contact the administrator"; docs given to developers on request (not public). `/api/spots`, `/api/references` return the same banner. No OpenAPI found (`/openapi.json`, `/docs`, `/swagger` = 404). |
| Web UI | `https://spots.wwff.co/` (`/spots`, `/agenda`, `/search`, `/info`, `/spots/create`) | HTML | login-less read | the HTML table is the same data as spots.json |
| Third-party GMA mirror | `https://www.cqgma.org/api/spots/wwff/` | JSON | **now returns 401 `missing_api_key`** ("GMA WWFF API", website gma.rocks) | was recommended in 2024 forum posts as an open source; as of 2026-10-13 needs a key. `https://www.cqgma.org/api/` and `/api/spots/` return 403. GMA DXSpider `www.cqgma.org:7300` is described on cqgma.org as "wieder öffentlich erreichbar". |
| ParksnPeaks | `https://www.parksnpeaks.org/api/WWFF` (also `/ALL`, `/SOTA`, `/WWFF/RSS`) | JSON/RSS | none for read | returned `[]` when I called it (so little/no WWFF there now, or empty at that moment). Docs: https://www.parksnpeaks.org/api/ |

No rate limit is stated other than the 30 s refresh request. I made ~25 requests in total.

**Detecting new/edited/deleted spots (spots.json)**
- Each record has a monotonically increasing integer `id` (156803 newest at fetch time) and an epoch `spot_time`. Poll every >=30 s and remember the highest `id` seen (or the set of ids).
- **ids are NOT dense**: within the 50 returned records the id range was 156484..156803 (320 ids) but only 50 records were present, i.e. ~84% of ids in the window are absent from the feed. Near the top they are almost dense (156803, 156802, 156800, 156799 ...), then gaps widen. I could not determine why (possible: ids are shared with agendas/hidden/duplicate-suppressed/deleted spots, or the file is capped at 50 while more were posted). Do not use "id contiguity" for loss detection.
- The 50-record window covered ~23 h at the time (1791849495 to 1791932796), so a 30 s poll cannot miss spots at current volumes (about 50 per day, the web page shows 8 at a time). Peak days (e.g. WWFF weekend contests/Marathon) might exceed 50 per polling interval only if >50 spots appear in 30 s: practically impossible.
- There is no edit or delete signal in the feed: spots are append-only from our point of view. QRT is expressed as a new spot with remarks "QRT" (see section 4).
- Dedup done by the server (info page): a new spot is rejected as duplicate if same callsign + same reference + frequency within +/-1 kHz within 10 minutes (any source). So HamAlert will still see the same activator several times per hour on shifting frequencies.

Official docs: https://spots.wwff.co/info (same text mirrored at https://wwff.co/spotline/). Forum with real-world context: https://forum.hamalert.org/t/get-wwff-and-other-gma-spots-from-gma-cluster/902 and https://forum.hamalert.org/t/ff-park-spots-not-appearing/812.

---

## 2. Raw record format

### 2a. spots.json (verified, verbatim, 2 of 50 records)

```json
[
    {
        "id": 156803,
        "activator": "K5G",
        "frequency_khz": 14062,
        "mode": "CW",
        "reference": "KFF-3507",
        "reference_name": "Lost Maples",
        "remarks": "Auto-spotted via RBN",
        "spotter": "K3FEF",
        "latitude": 29.8235,
        "longitude": -99.5773,
        "spot_time": 1791932796,
        "spot_time_formatted": "2026-10-13 23:06:36"
    },
    {
        "id": 156799,
        "activator": "WB0RLJ",
        "frequency_khz": 10118.5,
        "mode": "CW",
        "reference": "KFF-4011",
        "reference_name": "Chalco Hills",
        "remarks": "Re-spotted via RBN",
        "spotter": "W2NNN",
        "latitude": 41.1709,
        "longitude": -96.1556,
        "spot_time": 1791931488,
        "spot_time_formatted": "2026-10-13 22:44:48"
    }
]
```

A human-spotted example from the same file:

```json
{"id": 156796, "activator": "KD9ADR", "frequency_khz": 14196, "mode": "SSB", "reference": "KFF-4175", "reference_name": "Tillery Hill on Patoka Lake", "remarks": "QRT", "spotter": "KD9ADR", "latitude": 38.42549, "longitude": -86.61484, "spot_time": 1791931216, "spot_time_formatted": "2026-10-13 22:40:16"}
```

### 2b. Agenda record (agendas.json, verbatim)

```json
{"id": 5433, "activator_call": "K5G", "reference": "KFF-3507", "utc_start": "2026-10-13 20:00:00", "utc_end": "2026-10-14 14:00:00", "band": "40m, 30m, 20m, 17m, 15m", "mode": "SSB, CW, FT8, FT4", "remarks": "GYPO - ESW - Camping Overnight", "poster": "KG5OWB", "created_at": "2026-10-08 15:48:49"}
```

### 2c. Telnet line (UNVERIFIED reconstruction; only the first form was seen as an actual quote)

Real line quoted by a Log4OM user (June 2025, whitespace-collapsed by the search excerpt):

```
DX de VE6JY: 14063.3 N7JTT KFF-3528 CW Re-spotted via RBN 0120Z
```

Fixed-column DXSpider layout it must follow (this is what `cluster.js` slices: spotter = cols 6..25 up to ':', frequency after ':' in kHz, callsign = cols 26..38, comment = cols 39..69, time = cols 70..73, then `Z`), so the padded form is:

```
DX de VE6JY:     14063.3  N7JTT        KFF-3528 CW Re-spotted via RBN 0120Z
```

Interesting: "KFF-3528 CW Re-spotted via RBN" is exactly 30 characters, the DXSpider comment width. So the telnet comment is `"<REF> <MODE> <remarks>"` and the remarks part is almost certainly **truncated** to whatever fits in 30 chars (e.g. the remarks "Verified WWFF activator - https://cqparks.net/dual-activator/" cannot survive). I could not confirm truncation; if HamAlert keeps using telnet, test it. The JSON feed has no such limit. Also seen on the generic clusters (from HamAlert forum, HamAlert's own rawText): `DX de OK1VEI: 7024.5 OH3CUF/P OHFF-0201 1011Z` (no mode token) and on the GMA cluster `DX de OH2NOS: 10123.0 OH2NOS/P x01f OHFF-1785 New one! 0750Z` (a mode-like token `x01f` is GMA's own, unexplained; ref is not in first position there, hence the regex fallback in `findWwffRef`).

---

## 3. Field inventory

### 3a. spots.json (50 records observed; percentages are of those 50)

| Field | Type | Presence | Examples | Notes |
|---|---|---|---|---|
| `id` | int | 100% | 156803 | Spotline-internal spot id, monotonic, gaps (see section 1). Not in telnet. |
| `activator` | string | 100% | `K5G`, `DF7DF/P`, `OK1COW/P` | Full callsign as spotted, incl. portable suffix (15/50 had `/P`). Uppercase. No `-#`. |
| `frequency_khz` | number | 100% | `14062` (int, 44/50), `10118.5`, `7016.8`, `145500` (float when fractional, 6/50) | **kHz** (not MHz). Up to 1 decimal seen. JSON type varies int/float. |
| `mode` | string | 100% | `CW`(22) `SSB`(18) `FT8`(6) `FT4`(2) `DATA-USB`(1) `FM`(1) | Uppercase. Web form offers SSB, CW, FT8, FT4, RTTY, PSK, FM, AM, Other. `DATA-USB` is an RBN/software-supplied value, not on the form list. Never null/empty in sample. |
| `reference` | string | 100% | `KFF-3507`, `JAFF-0161`, `Z3FF-xxxx`, `FFF-xxxx` | WWFF ref `<PREFIX>FF-<4 digits>`; uppercase. Prefixes in sample: KFF 24, OHFF 5, VEFF 4, OKFF 4, HBFF 2, PAFF 2, VKFF 2, JAFF, Z3FF, DLFF, SPFF, HLFF, CTFF, FFF. Exactly one reference per spot (see quirks: dual refs go into remarks). |
| `reference_name` | string | 100% | `Lost Maples`, `Marais Réal-D.-Carbonneau` | Park name from WWFF directory (already joined by server). Proper UTF-8 JSON. |
| `remarks` | string | 100% key, 12% empty (6/50) | `""`, `Auto-spotted via RBN`, `QRT`, `QRP`, `with VE9GLF` | Free text; empty string, never null. No length limit seen (up to ~60 chars here); not trimmed (checked: no leading/trailing space). |
| `spotter` | string | 100% | `K3FEF`, `NJ9L`, `SP9WPN/P` | Plain callsign. 21/50 (42%) have spotter == activator (self-spot). For RBN auto-spots the spotter is the skimmer's callsign WITHOUT the `-#` suffix (e.g. `K3FEF`), so you can't tell skimmer from human by spotter alone. 4/50 have `/P`. |
| `latitude` | number | 100% | `29.8235`, `-99.5773` | park centroid from directory (not the activator's position). Up to 5 decimals. Never null in sample, but ~2% of directory rows have no coords, so can be absent in general. |
| `longitude` | number | 100% | | as above |
| `spot_time` | int | 100% | `1791932796` | Unix epoch **seconds, UTC** = time the spot was created in Spotline. |
| `spot_time_formatted` | string | 100% | `2026-10-13 23:06:36` | Same instant, UTC, `YYYY-MM-DD HH:MM:SS`, no zone marker (verified equal to `spot_time` in UTC for 50/50). |

### 3b. Telnet line (inferred)

| Field | Location | Notes |
|---|---|---|
| spotter | after `DX de `, up to `:` | same as JSON `spotter`; in practice may include `-#` for RBN? Unknown; JSON shows none. |
| frequency | kHz, after `:` | one decimal, e.g. `14063.3`; HamAlert divides by 1000 |
| DX call | cols 26-38 | `activator` |
| comment | cols 39-69 | `<reference> <mode> <remarks...>` (remarks possibly truncated to the 30-char comment width) |
| time | cols 70-73 + `Z` | HHMM UTC only, **no date, no seconds** |

### 3c. Agenda (agendas.json): `id` int, `activator_call` string, `reference` string, `utc_start`/`utc_end` `YYYY-MM-DD HH:MM:SS` UTC, `band` comma+space-separated string ("40m, 30m, ..."), `mode` comma-separated string, `remarks` string, `poster` callsign of user who posted, `created_at` string. 4 agendas upcoming at fetch time. Not currently used by HamAlert; could drive "scheduled activation" alerts.

---

## 4. Semantics & quirks

**Time.** JSON: precise epoch seconds UTC, plus a formatted copy. Telnet: HH:MM only, no date (the existing code builds `time` as "HH:MM"); midnight rollover must be handled by the consumer. Spot time is the creation time inside Spotline (spots are either typed by a user on the web/app/API or generated by the RBN bridge); there is no separate receive time. For an RBN-generated spot the time is when the skimmer report arrived at Spotline.

**Frequency.** kHz in both feeds, with up to one decimal (RBN gives 0.1 kHz resolution). Observed range 3644 to 21275 plus one 145500 (2 m FM). Internally HamAlert uses MHz (`/1000`).

**Mode vocabulary observed** (spots.json, 50 records): `CW`, `SSB`, `FT8`, `FT4`, `DATA-USB`, `FM`. Mode is always provided by Spotline (required field in the form; form choices SSB, CW, FT8, FT4, RTTY, PSK, FM, AM, Other). Contrast with generic clusters where HamAlert has to guess mode from frequency (`ModeGuesser`) because the mode is missing. Note `Other` and `DATA-USB` need a normalisation rule (HamAlert has a `normalizeSpot` mode normaliser).

**Spotter representation.** Humans and RBN-bridge are indistinguishable in structured fields; origin only appears as remark text:
- `Auto-spotted via RBN` (3/50): activator has an active agenda; spot created automatically.
- `Re-spotted via RBN` (13/50, 26%): activator seen again within 30 min of previous spot.
- `Re-spot from web` (5/50): human clicked the "Re-spot" button on the website (spotter is the clicker, often the activator themself).
- others free text. So ~32% of spots are RBN-derived and always CW (the RBN only decodes CW/RTTY; in the sample all `*RBN*` spots are CW; RBN `DATA-USB` unseen with RBN).
- Spotter == activator in 42% (self-spots).
The info page says RBN spots are currently **not re-spotted to the DX cluster** ("Currently, RBN spots are not re-spotted to the DX Cluster"), i.e. the telnet port 7300 may carry fewer spots than spots.json. This matters: the JSON feed is the only complete public feed (verify by comparing both for a day; I could not).

**QRT / test / deleted / edited.** No flag. QRT is a spot with `remarks` = `QRT` (5/50 = 10%), also `Qrt next park`, `Last calls`. There is no deleted/edited state visible. The info page begs users not to post comments as spots; the sample contains comment-spots: `ON AIR NOW`, `QRV`, `Cq cq`, `TEST-4-2morrow`, `#2 for today`, `Going back new day`, `QSY WWFF`. HamAlert's existing `filterRegex: /\b(nil)\b/i` is cluster-wide; for WWFF a "QRT" suppression/flag would be a business decision.

**Duplicates.** Server-side dedup: same call + ref + freq within 1 kHz within 10 minutes dropped. Different frequency or later than 10 min is a new row, so one activator generates many rows; HamAlert's own rate limiter must handle it.

**Reference placement.** In the new feed the reference is its own field (`reference`) and first token of the telnet comment. On other clusters (GMA, DX clusters generally) WWFF refs hide inside free comments (`OHFF-0201`, sometimes without leading zeros or with a space, e.g. `FF-0001`, "also US-1543" for POTA dual refs), hence the loose regex `\b([a-z0-9]{1,5})-(\d{4})\b`. Dual-programme activators: Spotline carries a single WWFF ref per spot; the second programme's ref (POTA `US-1543`, `QC POTA/VEFF`) appears in `remarks`, e.g. `"Straits State Park also US-1543"`. HamAlert's POTA-state override in `findWwffRef` (potaLocationStateRegex) only applies to POTA rows loaded from the POTA API into `wwffParks`.

**Callsigns.** `/P` suffixes are kept; also seen on spotters. Callsign may be a club/special call. Need base-call extraction (`callsign` vs `fullCallsign` in the current code).

**Encoding.** The telnet byte stream appears to be UTF-8 (current code reads as latin1 to keep column widths, then re-decodes only the post-token remarks as UTF-8, which is why `Buffer.from(...,'latin1').toString('utf8')` exists). JSON is proper UTF-8/`\u` escapes. The park CSV has **some double-encoded mojibake** in names (see section 5).

**Reliability notes.** Spotline is a new (June 2025) one-person-run service; the JSON file is "updated automatically". The cqgma WWFF API that people used in 2024-25 is now key-gated. The agendas are not spots; the existing system doesn't use them.

---

## 5. Related reference data

### 5a. WWFF directory CSV (verified)

- URL: `https://wwff.co/wwff-data/wwff_directory.csv` (`http://` redirects to https; current config URL still works). `Content-Type: application/octet-stream`, **24.5 MB** (24,518,660 B), `Last-Modified: Tue, 13 Oct 2026 04:45:48 GMT` (appears to be regenerated daily/overnight). UTF-8, no BOM, CRLF-free `\n` rows, quoted CSV with embedded commas. 68,982 lines = **68,981 data rows** + 1 header, all rows have 26 columns.
- Existing loader `tools/updateWwffParks.js` expects >30000 rows, drops a stray repeated header row, dedupes by `reference`, deletes empty/`-`/`n/a`/`0000-00-00` fields, removes `changeLog`, derives `division` from the reference prefix, forces `program='wwff'`.

**Header changed since the brief was written.** Current header (26 columns):

`reference,status,name,program,dxcc,state,county,continent,iota,iaruLocator,latitude,longitude,IUCNcat,validFrom,validTo,notes,lastMod,changeLog,reviewFlag,specialFlags,website,country,region,dxccEnum,qsoCount,lastAct`

Differences vs the list in the task: `iaru_locator`->`iaruLocator`, `iucncat`->`IUCNcat`, `valid_from/valid_to`->`validFrom/validTo`; **new columns** `dxccEnum` (numeric DXCC entity, e.g. 260 Monaco), `qsoCount` (int), `lastAct` (date of last activation, max seen 2026-10-12). The loader uses `columns: true`, so it is header-name-driven and will pass these through to Mongo; any code reading `iaru_locator`-style names would break (only `reference`, `name`, `program`, `status`, `location` are used in server.js, `location` exists only for POTA rows).

Sample rows (verbatim, from raw/wwff/wwff_directory_head50.csv):

```
reference,status,name,program,dxcc,state,county,continent,iota,iaruLocator,latitude,longitude,IUCNcat,validFrom,validTo,notes,lastMod,changeLog,reviewFlag,specialFlags,website,country,region,dxccEnum,qsoCount,lastAct
3AFF-0002,active,"Corail rouge",3AFF,3A,3A,3A,EU,-,JN33RR,43.73326,7.43332,"Cat IV",0000-00-00,0000-00-00,"Marine Protected Areas","2023-08-23 by M0YMA - Updated","2023-08-23 by M0YMA - Updated: Lat/Lon, Locator<br>2023-03-13 by OK2APY - Updated: Name, Website, IUCN category, Lat/Lon, Locator, Notes",0,,https://www.protectedplanet.net/306190,Monaco,-,260,,
3AFF-0003,active,"Parco di Fontvieille",3AFF,3A,3A,3A,EU,-,-,43.72698,7.00000,,2026-06-24,0000-00-00,-,"2026-06-24 by DF6EX_MANFRED - Up","2026-06-24 by DF6EX_MANFRED - Updated: Lat/Lon",0,,https://www.visitmonaco.com/en/approfittate/parchi-e-giardini/fontvieille-landscaped-park,,-,260,,
```
(Other examples: `KFF-3507` Lost Maples dxcc `K`, state/county `K-TX`, 29.8235/-99.5773; `OHFF-0201` Soukonvuoren luonnonsuojelualue, county `OH-PM`; `VKFF-0001` Abercrombie River National Park, state `VK-NSW`.)

**Column notes (whole-file statistics, 68,981 rows)**

| Column | Notes |
|---|---|
| `reference` | `<PREFIX>FF-<4 digits>`; prefix 3-5 chars (3 chars 16,819; 4 chars 52,144; 5 chars 15 e.g. `3D2FF`; plus 2 junk rows). 200 distinct prefixes ("divisions"). Unique (0 duplicates besides the stray header row). Prefix may start with a digit (`3AFF`, `9AFF`). |
| `status` | **`active` 67,573; `deleted` 1,374; `national` 33**; (1 empty = the stray header row). No `proposed`/`pending` exist in the current file. `deleted` rows have names starting `DELETED AREA - ...` and `validTo` set. **`national` (nationally-recognised but non-WWFF-listed areas such as `FFF-0893`, `OEFF-0047`) is not `active`, so HamAlert's `status:'active'` lookup silently rejects spots for these 33 refs** (decide whether that is intended). KFF: 7,370 active, 139 deleted. |
| `name` | free text, up to 128 chars; 13,780 names contain non-ASCII (UTF-8 OK) but ~a few (e.g. "VÃ¡rios", "ConservaciÃ³n", "Ã\x81vila") are **double-encoded UTF-8 mojibake**; a few contain `<...>`, `&nbsp;`. |
| `program` | NOT a constant: it is the programme/division code (`KFF`, `VKFF`, `SMFF` (9,894), `GxFF`...). 190 distinct values. For 1,220 rows the reference prefix differs from `program` (`CYFF-0001` has program `VEFF`; `GDFF-xxxx` has `GxFF`). The loader overwrites `program` with `'wwff'` and re-derives `division` from the prefix. |
| `dxcc`, `state`, `county` | WWFF's own codes, not ISO: `dxcc` = prefix like `K`, `DL`, `3A`; `state`/`county` like `K-TX`, `VK-NSW`, `OH-PM`; for small DXCC they repeat the dxcc (`3A`,`3A`). Empty only for 3 rows. |
| `continent` | `EU` 43,264, `NA` 13,026, `OC` 6,870, `AS` 2,436, `SA` 1,800, `AF` 1,398, `AN` 186. |
| `iota` | `-` for 59,326 rows; value like `AF-049`, `EU-005`; empty 6,199. |
| `iaruLocator` | Maidenhead 6-char or `-` (4,013) or empty (2,742). |
| `latitude`,`longitude` | decimal degrees, 5 decimals, signed; empty for 1,602 rows (1,421 of them `active`), e.g. `0.00000` in the stray header row. |
| `IUCNcat` | `Cat IV`, `Cat Ia`, `Cat V`, `Cat II`, `Cat III`, `Cat VI`, `Cat Ib`, `Natura2000`, `Ramsar`, `Biosphere`..., or `n/a` (10,775) or empty (20,029). |
| `validFrom` / `validTo` | `YYYY-MM-DD`, `0000-00-00` = unset (11,458 / 67,785 are zero). `validTo` set on 1,189 deleted + 7 still-`active` rows. |
| `notes` | free text, `-` (16,701) or empty. |
| `lastMod` | `"YYYY-MM-DD by CALL - Action"`, **truncated to 32 chars** (e.g. `... by DF6EX_MANFRED - Up`); empty 136, `-` 53. |
| `changeLog` | HTML-ish (`<br>`-separated) history; empty for 9,892. Dropped by the loader. |
| `reviewFlag` | always `0`. |
| `specialFlags` | `''` (68,689), `1` (190), `MRPA` (72), `NP-SD` (8), `NP-NF`, `NP-YM`, ... a few. |
| `website`, `country`, `region` | `website` URL or `-`/empty; `country` is English name only for 15k rows (empty for 53k); `region` is sub-region text or `-`/empty (e.g. `Laen O`, `ON`, `QC`). |
| `dxccEnum` | numeric ARRL DXCC entity id (empty 754). **New column.** |
| `qsoCount`, `lastAct` | **New columns**: number of logged QSOs and last-activation date; empty for 26,790 rows. |

**Junk rows to guard against**: (1) one repeated header row (reference == `reference`, status `''`), already handled; (2) `Select-0001` ("Special Takahe Area", ZLFF) and `Select-0002` ("Hackpen Hill SAC", GxFF), status `active` but with 6-char non-WWFF prefix `Select` and missing `dxcc`; HamAlert's ref regex (`[a-z0-9]{1,5}-\d{4}`) will never match them. Also `VPFF-9013/9015` have empty `dxcc`.

### 5b. Spotline itself as reference resolver
`/api/references/validate?reference=X` gives name + active flag live, but the CSV is the bulk source. Spotline spots already carry `reference_name`, `latitude`, `longitude`, so with the JSON feed the park lookup is only needed for DXCC/state/division and for telnet-sourced spots.

---

## 6. Proposed mapping

**Base Spot** (all sources):

| Base field | Source (spots.json) | Source (telnet) | Notes |
|---|---|---|---|
| `source` | const `"wwff"` | const | keep the current key; add a sub-origin in extension |
| `callsign` (full, as spotted) | `activator` | cols 26-38 trim | base call derived by backend (`/P` stripping) |
| `spotter` | `spotter` | text before `:` | may equal callsign |
| `frequency` (store kHz or MHz consistently; HamAlert uses MHz) | `frequency_khz` | after `:` | 0.1 kHz precision; compute band in backend |
| `mode` | `mode` | 2nd comment token | normalise `DATA-USB`/`Other`/`PSK`; always present, no guessing needed |
| `time` | `spot_time` (epoch UTC) | HHMM + Z, date inferred from receive time | prefer JSON for exact seconds |
| `comment` | `remarks` | rest of comment after ref+mode | free text, may be empty; may be truncated on telnet |
| `rawText` | n/a (store the JSON record serialised) | original line | |
| `sourceSpotId` | `id` | n/a | for dedupe across restarts |

**WWFF extension (`WwffSpot` / reference-bearing extension):**

| Field | Type | Optionality | Source |
|---|---|---|---|
| `reference` | string `[A-Z0-9]{1,5}FF-\d{4}` | required for Spotline feed; optional if WWFF is ever parsed from other clusters | `reference` / first comment token |
| `referenceName` | string | optional (JSON always; telnet needs lookup) | `reference_name` / directory `name` |
| `division` | string (prefix, e.g. `KFF`, `3D2FF`) | derived | from ref |
| `latitude`/`longitude` (park) | number | optional (JSON has them; directory misses ~2%) | JSON / directory |
| `origin` | enum `human`, `rbn_auto`, `rbn_respot`, `web_respot`, derived from `remarks` text | optional heuristic | `remarks` strings above |
| `isQrt` | bool, heuristic | optional | `remarks` matches /^qrt/i |
| `additionalReferences` | string[] (POTA `US-1543` etc.) | optional | regex over `remarks` |

Keep in the base/enrichment layer (not WWFF-specific): `band`, DXCC/entity/CQ/continent for callsign and spotter, `state` (including POTA state override), IOTA from directory `iota`, `homeDxcc`. Fields current HamAlert emits for WWFF spots: `wwffRef`, `wwffDivision`, `wwffName`, `wwffProgram` (always `'wwff'` for CSV rows, `'pota'` for POTA rows loaded into the same collection). The park collection should also keep `status`, `dxccEnum`, `state` (WWFF-style code), `lat/lon`, `iota`, `validTo`, `lastAct`.

Mode: since WWFF supplies mode, mark mode as "authoritative" vs. "guessed" for the other cluster sources (the `modeDetail`/guess flag in current output).

---

## 7. Open questions / risks

1. **Telnet vs JSON completeness**: Spotline says RBN spots are not forwarded to the telnet port. The JSON file seems to be the only complete public feed, but cannot verify here (telnet blocked). HamAlert's current `config.cluster` `wwff` entry (telnet) may therefore miss ~30% of WWFF spots (all RBN ones). Recommendation: poll `spots.json` every 30 s (respect it) and treat telnet as optional/duplicate. Dedupe by `id`.
2. **Telnet comment truncation** (30-char DXSpider comment) and exact padding unverified.
3. **spots.json holds only the last 50**; the id sequence has large gaps; if the service restarts or a burst occurs we cannot backfill. No documented API for history without a key. Contact: Jouni OH3CUF (cuf.fi) for an API key if desired (HamAlert is already listed as an integrator).
4. **Origin and QRT only in free text** (`remarks`); decide whether HamAlert should surface a first-class `qrt` / `origin` or keep them as text.
5. **Comment-as-spot abuse** (`QRV`, `Cq cq`, ...) pollutes alerts; the info page itself mentions that HamAlert cannot distinguish them.
6. **Directory CSV**: header renamed/extended (`iaruLocator`, `IUCNcat`, `validFrom`, new `dxccEnum`, `qsoCount`, `lastAct`); `national` status refs (33) are currently rejected; ~1,420 active parks have no coordinates; mojibake in some names; two junk `Select-000x` rows; `program` != ref prefix for 1,220 rows (e.g. `CYFF` under `VEFF`, `GDFF` under `GxFF`), and the loader discards `program` so `wwffProgram` = `'wwff'` is non-informative. 24.5 MB download: keep daily refresh with `If-Modified-Since`/ETag (server sends `ETag` and `Last-Modified`).
7. **Single-ref model**: one reference per Spotline spot; dual activations (WWFF + POTA) are posted as two spots or put the second ref in remarks. Decide whether the schema allows multiple references per spot (WWBOTA's API does; see below).
8. **cqgma WWFF API** is now API-key gated (401), so the previously suggested GMA route is closed unless HamAlert gets a key (gma.rocks).
9. Timezone: JSON epoch is unambiguous UTC; telnet HHMM requires date inference around midnight.

---

## Appendix: neighbouring programmes (brief survey, 2026-10-13)

| Programme | Reference style | Spot API found | Notes |
|---|---|---|---|
| **GMA** (Global Mountain Activity, cqgma.org / gma.rocks) | Summits `DL/AM-123` (association/region-number; HamAlert's `summitRefRegex` is the ADIF-3.0.4 summit regex), castles, lighthouses, mills, parks, "any site with a reference number"; GMA also recognises SOTA, HuMPs, COTA, WWFF, POTA, lighthouse refs | DXSpider telnet `www.cqgma.org:7300` ("wieder öffentlich erreichbar" per front page); `https://www.cqgma.org/api/spots/wwff/` -> **401 `{"ok":false,"error":"missing_api_key","message":"An API key is required for this API.","source":"GMA WWFF API","website":"https://gma.rocks"}`**; `/api/` and `/api/spots/` -> 403; docs `https://www.cqgma.org/doc/DX_Spider_EN.pdf` | A GMA cluster line looks like `DX de OH2NOS: 10123.0 OH2NOS/P x01f OHFF-1785 New one! 0750Z` (HamAlert forum). API key needed. The old "WCA" castle reference style is not verified; GMA treats castles as normal GMA references (I did not fetch a castle list). |
| **WWBOTA** (Worldwide Bunkers on the Air) | `B/ON-0084` (scheme `B/<DXCC-prefix>-<4 digits>`), `references` array, multiple refs per spot | `GET https://api.wwbota.org/spots/` (also `api.wwbota.net`) open JSON, FastAPI/ReDoc, OpenAPI 1.12.0 at `https://api.wwbota.org/openapi.json` (saved); `POST /spots/` for spotters; telnet not checked | Verbatim record: `{"comment":"B/ON-0084 B/ON-2772","call":"ON3MOH/P","freq":14.074,"time":"2026-10-13T22:26:20.418815Z","mode":"FT8","spotter":"ON3MOH","type":"Live","references":[{"scheme":"ONBOTA","dxcc":209,"reference":"B/ON-0084","name":"Duitse Bunker Query Farm 1","type":"WW I","lat":50.798212,"long":3.100151,"extra":{},"locator":"JO10NT"}, {...second ref B/ON-2772}]}`. Notes: freq is MHz (float), time ISO-8601 UTC with microseconds, `type` is `Live`/others (Test/QRT/Historic/Alert type enum, see schema `SpotType`), many refs per spot, comment must contain a ref (regex in schema). Best-structured of the neighbours; good model for multi-reference extension. |
| **HEMA** (HuMPs Excluding Marilyns) | `GW/HMW-078`, `G/HSB-001`, `ZL3/HSL-028` (SOTA-like `assoc/region-NNN`) | No JSON found. Only an HTML "Spotting Engine" at `https://hema.org.uk/spots.jsp` (latest 50 spots, refresh 1 min, login needed for posting). Rows look like `12/10/2026 12:26 2W0KIO/P GW/HMW-078 - Clipyn Du [...] 7.194 (SSB) (G7LAS)` (date DD/MM/YYYY UTC, freq MHz, mode in parens, spotter in parens) | Would need HTML scraping; very low volume (about 10 spots in a month). Also surfaces via ParksnPeaks? unknown. |
| **SiOTA** (Silos on the Air, silosontheair.com) | `VK-0001`-style silo refs (not verified here) | No public spot API found: `/api/`, `/spots`, `/rss` -> 404 on the main site | ParksnPeaks lists SIOTA as a site class in its API docs, so PnP is the likely aggregator route. |
| **ParksnPeaks** | WWFF, SOTA, POTA, SiOTA, ZLOTA, KRMNPA, SANPCPA, SHIRES, ... | `https://www.parksnpeaks.org/api/ALL`, `/SOTA`, `/WWFF`, `/SPOTS`, each with `/RSS`; JSON default; post spots needs per-user APIKey; docs https://www.parksnpeaks.org/api/ | Already requested by HamAlert users (forum). `/api/WWFF` returned `[]` at fetch time. |
| **POTA** (already ingested) | `US-1234`, `K-1234` | `https://api.pota.app/spot/activator` (reachable, 30 KB JSON) | for comparison; WWFF Spotline JSON is simpler. |
| **SOTA** (already ingested) | `G/LD-001` | `api2.sota.org.uk` (not re-tested) | `api.sota.org.uk` host does not resolve through the proxy. |

Everything in the appendix is from 1-2 requests per site; treat as a pointer list, not a spec.
