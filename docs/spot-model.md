# HamAlert Spot model: proposal from the source research

Date: 2026-10-13, updated 2026-10-14 after two collector runs (section 6), 2026-10-15 with the API (section 7), 2026-10-18 after the maintainer's review and a second adversarial review (section 8). Based on eight source reports in `docs/research/` (sotawatch, pota, wwff, rbn,
cluster, pskreporter, dstar, other-dv), real samples pulled the same day, the current code in
`hamalert-server`, and the upstream D-STAR implementation. Everything below is a proposal for
the new API contract, not a description of the current database.

---

## 1. What the sources actually give us

The table shows, per source, whether a base field is present and how good it is. Percentages
are from the samples the agents pulled on 2026-10-13 (sizes in the per-source reports).

| Field | SOTAwatch | POTA | WWFF Spotline | DX cluster | RBN | PSK Reporter | D-STAR |
|---|---|---|---|---|---|---|---|
| spotted callsign | always | always | always | always (junk like `602M`, `NA` seen) | always (skimmer mis-copies) | always (`TNX` mis-decodes) | always, but masked `********` on ircDDB unless opted in |
| spotter | always; 18% are the `RBNHOLE` bot with the real skimmer in the comment; `SMS`, `APRS2SOTA`, `SOTAmat` bots | always; 60% are RBN skimmers (`K5EM-#`) | always; RBN origin only visible in remark text | always; `-#` skimmer, `-@` web, bots | always a skimmer | always an automated receiver | a gateway or node callsign, usually the operator's own hotspot (86%) |
| time | ISO, microseconds | ISO without `Z`, seconds, re-spots bump it | epoch seconds (JSON); HHMM only (telnet) | HHMM only | HHMM only (telnet); seconds in CSV/web | epoch seconds; TX start or decode time depending on software | seconds, end of transmission |
| frequency | 97.6% (null or 0 on QRT), MHz float | always, kHz string | always, kHz number | always, kHz 1 decimal; typos reach the stream | always, kHz | 99.7%, Hz integer, includes audio offset | never in the feed; resolved from node directories for 99% of QuadNet events, 12% of dstarusers rows, 0% of reflector rows |
| mode | 95% (CW, SSB, FM, AM, DATA, OTHER); empty on QRT | 99.6%, open vocabulary (C4FM seen) | always, open vocabulary (`DATA-USB`) | only 22% name a mode in the comment; 32% cannot be guessed from the band plan either | always explicit | always explicit, open vocabulary | constant `dstar` |
| comment | 66% | 87%, UTF-8 with emoji | 88% | 70%, truncated at 30 chars | never | never | 80%, a 20-char radio message that usually holds a name and town |
| feed id | `id` (unique, not time-ordered) | `spotId` (reused on re-spot, not monotonic) | `id` (monotonic, gaps) | none | none (telnet) | `sequenceNumber` | none |
| summit | always | no | no | 0.1% in comment | no | no | no |
| park | 3% in comment | always (one ref; n-fers in comment) | always (one ref; second programme in remarks) | 10% in comment (4 and 5 digit POTA ids) | no | no | no |
| IOTA | no | no | via directory | 0.7% in comment, sometimes in parentheses | no | no | no |
| SNR / speed | RBNHole comment | RBN comment (`RBN 10 dB 17 WPM`) | no numbers | FT8 software templates (13%) | always | SNR always | no |
| digital voice fields | no | no | no | no | no | no | event, node, gateway, reflector (52%), group (rare), duration |

Three conclusions fall out of this:

1. **Only three things are universal**: the spotted callsign, some notion of who reported it, and
   a time. Frequency, mode and comment are all optional somewhere, and D-STAR has none of them.
2. **The detail blocks are about the kind of data, not the feed.** A summit reference can come
   from SOTAwatch or a cluster comment. A park reference comes from POTA, WWFF or a cluster
   comment. Skimmer measurements come from RBN, PSK Reporter, POTA's RBN re-spots and SOTA's
   RBNHole. So the extensions should be `summit`, `park`, `signal`, `dstar`, not `sotawatch`,
   `pota`, `rbn`.
3. **Several feeds have a better channel than the one in use today** (section 5), and the
   contract should not bake in the limitations of the current channel, such as minute-only
   times or 30-character comments.

---

## 2. Proposed model

The machine-readable version is `spot-model.yaml` (OpenAPI 3.1 components, no paths); the TypeScript
below is the readable one and the two are kept in step. Producers, the enricher, the matcher, the
streams, the webhook body and the HTTP API all share that one file.

TypeScript, because the spec will be OpenAPI plus generated types. Field names are new where
the old ones were misleading; section 4 maps old to new.

```ts
/** The feed a spot came from. */
type SpotSource =
  | 'sotawatch' | 'pota' | 'wwff' | 'cluster' | 'rbn' | 'pskreporter'
  | 'quadnet' | 'ircddb' | 'dstarusers'
  | 'amsat'
  | 'simulator';

/** What the station was doing. Triggers default to on-air; today qrt/beacon are silently dropped. */
type Activity =
  | 'on-air'   // the normal spot, from any source; a digital voice transmission heard counts as on-air
  | 'qrt'      // the station signed off (SOTA type QRT; POTA/WWFF "QRT" remarks)
  | 'beacon'   // RBN BEACON / NCDXF B lines; a beacon, not an operator
  | 'monitoring'; // digital voice: the station linked to a reflector or group, listening, no voice

interface Spot {
  id: string;                    // HamAlert id, stable for the record's lifetime
  activity: Activity;
  source: SpotSource;
  sourceId?: string;             // the feed's own id when it has one
  client?: string;               // app that posted it when the feed says (POTA "source", SOTA "[sotl.as]")

  callsign: string;              // as received, uppercase, whitespace removed, hyphens kept: "EA8/HB9DQM/P", "HB9AK-6"
  baseCallsign: string;          // "HB9DQM"; derived
  spotter?: Spotter;             // absent when nobody reported it: reflector self-reports (84% of dstarusers), empty PSK Reporter receivers

  time: string;                  // RFC 3339 UTC; the feed's spot time, seconds 00 when the feed gives HHMM only
  receivedAt: string;            // when HamAlert ingested it; authoritative for ordering

  frequency?: number;            // Hz, integer. Absent for digital voice
  band?: string;                 // "20m", "70cm", "3cm_qo100"; derived from frequency, or from a directory or module letter (see provenance.band); absent for out-of-band junk
  bandSlot?: string;             // "<dxcc>_<band>", e.g. "279_20m"; present when entity and band are both known. The Club Log unworked-slot unit

  mode?: string;                 // normalized family: cw, ssb, fm, am, ft8, ft4, psk, jt, msk, rtty, dstar, ...; trigger condition
  modeDetail?: string;           // as reported, lowercased: "psk63", "olivia 8/250", "jtty"; display only, not a trigger condition

  // How a value was obtained when it was NOT reported by the feed. Absent key = reported.
  // Keys are field paths ("mode", "band", "parks.0.ref"); values are an extensible enum.
  provenance?: Partial<Record<string, Provenance>>;   // omitted when empty

  comment?: string;              // free text from the feed, trimmed; may contain personal data (D-STAR TX message)
  rawText?: string;              // the source line verbatim; only line-based feeds (cluster, RBN, WWFF telnet, PSK Reporter)

  // Enrichment HamAlert adds. Always attempted, may be absent.
  entity?: Entity;               // DXCC of `callsign` (full call)
  homeEntity?: Entity;           // DXCC of `baseCallsign` when it differs
  states?: string[];             // ["US_CA"]; from the callsign database or a park's locations
  qsl?: ('lotw' | 'eqsl')[];

  // Detail blocks. Independent; a spot can carry several (a SOTA spot with a park in the comment).
  summit?: SummitRef;
  parks?: ParkRef[];             // a list because n-fers and WWBOTA-style feeds carry several
  iota?: IotaRef;
  signal?: SignalReport;         // automated reception measurements
  dstar?: DstarDetail;           // D-STAR presence; other digital voice modes get their own blocks later
}

/** Extensible: clients must tolerate unknown values and treat them as "not reported". Informational: triggers never read it. */
type Provenance =
  | 'bandplan'          // mode inferred from frequency                        (guessed)
  | 'comment'           // mode parsed from free text                          (derived)
  | 'comment-regex'     // reference extracted from free text, then validated  (derived)
  | 'module-letter'     // band from a D-STAR module letter                    (guessed)
  | 'directory'         // frequency or band from a node/repeater directory    (derived)
  | 'dashboard'         // reflector from a scraped link table                 (derived)
  | 'decode'            // time is decode time, not transmit start             (guessed)
  | 'receive-clock'     // date part of time taken from receivedAt             (derived)
  | (string & {});

interface Spotter {
  callsign: string;              // the real reporter: the skimmer behind RBNHole, the SMS sender; for skimmers an id that need not be a licensed callsign ("SNAKESHARMER", 2.4% of PSK Reporter)
  instance?: string;             // skimmer instance suffix: "6" from "W1NT-6"
  entity?: Entity;
  state?: string;
}

interface Entity { dxcc: number; name: string; continent?: string; cq?: number; }

interface SummitRef {
  program: 'sota';               // GMA/HEMA later
  ref: string;                   // "W7W/WH-185"
  association: string; region: string;
  name?: string; altitude?: number; points?: number;
  activationCount?: number;
  latitude?: number; longitude?: number;
}

interface ParkRef {
  program: 'pota' | 'wwff';      // WWBOTA etc. later
  ref: string;                   // "US-13471", "KFF-3507"
  prefix: string;                // "US", "KFF" (today "wwffDivision")
  name?: string;
  locations?: string[];          // ["US-DC","US-MD","US-WV"]; can be empty
  latitude?: number; longitude?: number;
}

interface IotaRef { ref: string; name?: string; }

interface SignalReport {
  snr?: number;                  // dB; negative on FT8
  speed?: number;                // WPM for CW, baud for RTTY/PSK
}

interface DstarDetail {
  // The event itself is Spot.activity: on-air (upstream 'active') or monitoring (upstream 'linked').
  node?: string;                 // "W4HFH-C"; absent for reflector-only reports
  gateway?: string;              // "W4HFH"; RPT2 minus G
  reflector?: string;            // "REF030-C"; present on ~52% of transmissions; a repeater module ("SR7UVL-B") for repeater-to-repeater or area-routed links
  group?: string; groupName?: string;   // QuadNet Smart Group
  duration?: number;             // seconds; QuadNet always, ircDDB only when the stats record arrived
  suffix?: string;               // 4-char radio suffix
}
// DMR, YSF and other digital voice networks get their own detail types when they are added
// (see docs/research/other-dv.md for the fields they would carry). Nothing in the base changes.
```

### Example: a cluster spot with three inferred values

```json
{
  "id": "01JA3K7Q9X", "activity": "on-air", "source": "cluster",
  "callsign": "DL1ABC", "baseCallsign": "DL1ABC",
  "spotter": { "callsign": "G4XYZ" },
  "time": "2026-10-14T00:18:00Z", "receivedAt": "2026-10-14T00:18:07.412Z",
  "frequency": 14074000, "band": "20m",
  "mode": "ft8", "comment": "CQ POTA DE-0001",
  "parks": [ { "program": "pota", "ref": "DE-0001", "prefix": "DE", "name": "Nationalpark Bayerischer Wald" } ],
  "provenance": { "mode": "bandplan", "time": "receive-clock", "parks.0.ref": "comment-regex" }
}
```
The UI renders `FT8 (guessed)`. Triggers ignore provenance: `mode in [ft8]` matches this spot,
as it does today.

### What is deliberately not in `Spot`

- **Title and body text for notifications.** Push, Threema and Telnet need rendered text, and
  users template it. The server renders it once per match from the account's app templates
  and puts it on `MatchedSpot.display: {title, body}`, never on the spot.
- **Per-user match data.** A `Spot` is the immutable event a producer creates. The matcher
  evaluates it against every trigger and, per user with a hit, creates a `MatchedSpot`:
  `{id, spot, triggers[{id, comment}], actions, display}`. That is what goes to
  notifications, the app list, the stream and the Telnet emulation. Stored as a copy per
  user with the 24 h expiry, as the `spots` collection does today, because reads are always
  per user.
- **Planned activations.** SOTA alerts and WWFF agendas are future-dated, have free-form
  frequency lists and no spotter. They are an `Alert` type, not a `Spot`.
- **Solar data and cluster announcements** (WCY, WWV, "To ALL de"). Separate record types.
- **The D-STAR UR field.** Directed calls are never emitted, and the addressee is never stored.

---

## 3. The decisions this forces

Status after review on 2026-10-14: all decided. `activity` (2) with values on-air, qrt, beacon,
monitoring; provenance map (4); reference data via separate loader processes. Time format is decided: RFC 3339 strings with a trailing `Z` in the API
(`2026-10-13T23:08:16Z`, milliseconds allowed), every source normalized to UTC at ingest;
epoch milliseconds only inside Redis stream ids.

1. **Frequency in integer Hz.** (decided) Sources use MHz floats (SOTA), kHz strings (POTA), kHz with
   one decimal (cluster, RBN, WWFF) and Hz integers (PSK Reporter). Hz is lossless for all of
   them and matches WSJT-X and PSK Reporter. Clients format for display. The current MHz
   float gives artifacts like `24.9402`.
2. **Frequency, mode and comment are optional at the base.** The D-STAR source already ships
   without a frequency and the matcher was patched for it. Making the base honest avoids
   `band: "unknown"` string sentinels.
3. **An `activity` field instead of dropping records.** It answers "what was the station
   doing": on-air, qrt, beacon or monitoring. QRT (10% of SOTA spots), beacons (5% of RBN port
   7000 traffic) and D-STAR link commands become first-class and trigger-filterable. Test
   spots are still dropped at ingest. Triggers default to `on-air`, which covers RF spots and
   digital voice transmissions alike (upstream's `dvEvent: active`).
4. **Provenance as one sparse map, not per-field flags.** (decided after the survey in
   `docs/research/provenance-patterns.md`.) Nine fields can be inferred rather than reported. One
   `provenance` map keyed by field path says how, with absent meaning reported. Each value has
   a fixed class, guessed or derived, so a boolean `guessed(mode)` is computed in the shared
   package and in the rule language, never stored. Prior art: Spothole's sibling source enums,
   FHIR's parallel metadata objects, and readsb's sparse list of derived fields; stored
   booleans end up as a second source of truth (Spothole's hand-maintained
   `dx_location_good`).
   Triggers evaluate values regardless of provenance, so `mode in [cw]` matches a band-plan
   guess exactly as today. `provenance` is for display ("FT8 (guessed)"). A per-trigger
   "ignore guessed values" option was proposed and dropped in review (section 8); it can be
   added later without a schema change.
5. **Spotter is an object.** The feeds disagree about what a spotter is: a person, a skimmer,
   a relay bot with the real reporter hidden in the comment, or a D-STAR gateway that is
   usually the operator's own hotspot. `spotter.callsign` is always the real reporter (the
   skimmer behind RBNHole, the SMS sender); `instance` keeps a skimmer's node suffix. Whether
   the spotter is a human or a skimmer follows from `source`, so it is not stored. A `relay`
   field was tried and dropped: 204 of its 233 values were DXSummit's web-client marker.
6. **Detail blocks by data kind.** `provenance["parks.0.ref"] = comment-regex` tells the app a
   park reference was extracted from text rather than structured. A spot can carry a summit
   and a park at once (observed in SOTAwatch comments).
7. **Mode as family plus detail.** `mode` (normalized family, open string, not an enum) is the
   trigger condition; `modeDetail` (what the feed said) is kept for display only, since it
   differed from `mode` on about 100 of 116,536 collected spots (usb/lsb, jtty, psk31). How
   the mode was obtained is `provenance.mode`. The current `psk*`, `jt*`, `msk*` prefix collapsing must become an
   explicit list: `JTTY` is a RTTY-like mode that `startsWith('jt')` wrongly folds into `jt`.
8. **Time is one instant.** Telnet feeds give HHMM only. The instant is resolved against
   `receivedAt` with midnight rollback and `provenance.time = receive-clock`; seconds are 00.
   PSK Reporter decode-time reports get `provenance.time = decode`.
   `receivedAt` is authoritative for ordering and for the 24-hour spot list.
9. **`source` stays the feed, and digital voice keeps `mode` as the family.** A trigger for
   "D-STAR" matches `mode = dstar` across QuadNet, ircDDB and dstarusers, as upstream does.
   DMR, YSF and others get their own detail blocks and types when added (decided 2026-10-14).

---

## 3a. Planned events and satellite passes (deferred)

Researched in `docs/research/planned-events.md` and `docs/research/satellite.md`, and drafted here as a
second top-level type (planned activations, DXpeditions, contests, ARISS contacts) plus a
computed satellite pass type with its own endpoints. Removed from the contract after the
maintainer's review (section 8): HamAlert does not handle planned events and there are no
plans to. The research stays for whoever picks it up; nothing in `Spot` depends on it.

---

## 3b. Producers, matcher and API

The contract and the transport are separate questions. Producers go through the contract (the
shared schema package validates every spot they emit) but not through the HTTP API.

The numbers decide it: PSK Reporter alone is 26 million reports a day with peaks near 300 per
second, and well over 99.9% of spots never match a trigger. Only matched spots are stored
today, which is right, and it means producers should not write the database at all.

| Role | Owns (writes) | Reads | Talks to |
|---|---|---|---|
| **Producers** (one process per source) | nothing persistent | reference data | emit validated `Spot` objects onto an internal Redis Stream |
| **Matcher** | matched spots in MongoDB, per-user Redis streams, notifications | triggers, users, mutes, reference data | consumes the firehose; reloads triggers on a change event instead of a 60 s poll |
| **API service** | users, triggers, mutes, devices, limits, blocked spotters | matched spots (history), per-user streams (SSE/WebSocket) | publishes "triggers changed"; the simulator is an endpoint that puts a user-tagged spot on the firehose |
| **Reference loaders** (one process per dataset) | summits, parks, IOTA, DXCC, DV directories, callsign state, QSL lists | upstream lists | scheduled; the only writers of reference data |

**Enrichment** (band, DXCC, state, QSL flags, reference validation from comments, mode
guessing) is one stage between the firehose and the matcher, not a library each producer
calls: one Club Log cache instead of nine, the digital voice producer never learns what DXCC
is, and a parsing fix deploys once. Producers emit normalized but unenriched spots; the
enricher emits the final spot the matcher and clients see.

**Reference data** is loaded by separate processes, one per dataset, that fetch the upstream
list, normalize it to the shared schema and write it to the database: summits, the POTA and
WWFF park directories, IOTA groups, DXCC, node and reflector directories, callsign state
and QSL lists. They run on their own schedule
and are the only writers of that data. Every reader (source producers, the enricher, the
API's editor pickers) reads it from the database. (Decided 2026-10-14.) No private in-memory copy that can drift from the published one: the cluster
producer validating a summit it finds in a comment and the editor offering that summit must
use the same list. Cross-cutting data nobody's source owns (Club Log DXCC, FCC and Canadian
callsign state, LoTW and eQSL lists, band tables, mode families) belongs to the enricher.

Keep the raw firehose for 24 hours in Redis (cheap): it enables replay after a matcher bug,
"what was on 20m an hour ago", and the near-you queries. Planned events are low volume and
are stored in MongoDB by their producer-side ingester, since clients query them directly.

---

## 4. Mapping from today's fields

| Today | Proposed | Note |
|---|---|---|
| `fullCallsign` / `callsign` | `callsign` / `baseCallsign` | the old `callsign` meant the stripped call |
| `spotter`, `spotterPrefix`, `spotterDxcc`, `spotterState` | `spotter.callsign`, `.entity`, `.state` | prefix is derivable |
| `frequency` (MHz, mixed string/number) | `frequency` (Hz int) | |
| `time` (HH:MM) + `receivedDate` | `time` (instant) + `receivedAt` | |
| `mode`, `modeDetail`, `modeIsGuessed` | `mode`, `modeDetail`, `provenance.mode` | |
| `dxcc {dxcc,country,cq[],continent[]}` | `entity {dxcc,name,cq,continent}` | zones were arrays with one element |
| `callsignDxcc` | `homeEntity` | |
| `state` (string or array) | `states: string[]` | |
| `summitRef/Association/Region/Name/Height/Points/Activations` | `summit.*` | |
| `wwffRef/Division/Name/Program` | `parks[].ref/.prefix/.name/.program` | |
| `iotaGroupRef/Name` | `iota.ref/.name` | |
| `snr`, `speed` | `signal.snr`, `signal.speed` | |
| `dvEvent active/linked` | `activity on-air/monitoring` | one field for all sources |
| `dvNode`, `dvReflector`, `dvReflectorSource`, `dvGroup`, `dvGroupName`, `dvSuffix`, `dvDuration` | `dstar.node`, `.reflector`, `provenance["dstar.reflector"]`, `.group`, `.groupName`, `.suffix`, `.duration` | |
| `bandIsGuessed`, `frequencySource` | `provenance.band`, `provenance.frequency` | |
| `bandslot` (`<dxcc>_<band>`) | `bandSlot`, same value | |
| `title`, `rawText` | `MatchedSpot.display {title, body}`; `rawText` only for line-based feeds | |
| `user_id`, `actions`, `triggerComment(s)` | `MatchedSpot` wrapper | |

Trigger condition fields map one to one: `band`, `mode`, `source`, `callsign`, `fullCallsign`,
`prefix`, `spotter`, `dxcc`, `callsignDxcc`, `spotterDxcc`, `cq`, `continent`, `state`, `qsl`,
`summitRef`, `summitAssociation`, `summitRegion`, `summitPoints`, `summitActivations`, `wwffRef`,
`wwffDivision`, `iotaGroupRef`, `speed`, `snr`, `dvEvent`, `dvNode`, `dvReflector`, `dvGroup`.
New condition candidates the model makes possible: `activity`, `parkProgram`, `parkRef` across both park programmes.

---

## 5. Source-level findings the backend rewrite should act on

These are not schema decisions, but they came out of the same research and several change
what the ingest layer should do. Details and evidence are in the per-source reports.

**SOTAwatch**
- The API terms require joining the SOTA Reflector "API-consumers" group and state a policy
  against AI-generated clients without approval. Settle this with SOTA before the rewrite ships.
- `/api/spots/-24/all/all` returns 24 hours of history (up to 168); use it to backfill after
  downtime. Positive counts cap at 200. The association segment is ignored; the mode segment
  must be lowercase.
- A deprecated-URL response is HTTP 200 with a fake record (`id: null`, `summitCode:
  "DEPRECATED"`). Reject it.
- `type` is null for 39% of real spots (bots and apps). Never filter on truthiness.
- `callsign` is the spotter, `activatorCallsign` the activator. SMS spots hide the real spotter
  as `[CALL{REGION}]:` in the comment; today only RBNHole is unwrapped.
- The summit list is 25 MB daily with a title line before the header and DD/MM/YYYY dates.

**POTA**
- `/spot/activator` keeps only the newest spot per activation; `/spot` has every spot of the
  last 30 minutes. Poll `/spot`.
- A same-content re-spot reuses `spotId` and bumps `spotTime`; the current hash includes the
  time, so every RBN refresh re-alerts. Decide whether a bump is a new event.
- `spotId` is not monotonic (late inserts); keep a bounded seen-set. The current cache never
  evicts.
- 12% of parks have five-digit ids; the comment regex only matches four.
- `spotTime` has no `Z`. Parse as UTC explicitly.
- POTA's `source` is the client app name, open-ended; do not confuse it with HamAlert's source.

**WWFF**
- Spotline (June 2025) publishes `https://spots.wwff.co/static/spots.json`, last 50 spots,
  refresh no faster than 30 s, with structured ref, name, coordinates and epoch time. The
  telnet port does not carry RBN-derived spots, which were 32% of the sample. Switch to JSON.
- The directory CSV header has changed (camelCase, new `dxccEnum`, `qsoCount`, `lastAct`), has
  a `national` status that the `active` filter rejects, two junk `Select-000x` rows, and
  1,420 active parks without coordinates.

**RBN**
- `BEACON` and `NCDXF B` lines (5% of port 7000) are dropped by the regex. RTTY/PSK speed is
  never captured. The quorum code can never fire (reads a `date` field nobody sets).
- The FT8/FT4 line format on port 7001 is unverified anywhere public. Capture 100 lines before
  writing the parser.
- `https://data.reversebeacon.net/rbn_history/YYYYMMDD.zip` gives full days for testing.
- The same spot can arrive twice: directly and via a cluster relay as `CALL-#`.

**DX cluster**
- Only 22% of spots name a mode in the comment; 32% get no guess at all. The guesser table has
  no FT8/FT4 dial frequencies. `provenance.mode` is the honest answer.
- Comments are cut at 30 characters on the classic line, which clips references. `set/ve7cc`
  gives untruncated comments in the CC11 format.
- The IOTA regex misses `(AN-010)`; the SOTA regex runs over the whole line including the
  spotter; junk calls and frequencies reach the stream.
- WWV lines and announcements are log noise today; model them as separate records or drop
  them explicitly.

**PSK Reporter**
- The NDJSON stream needs a private token. `mqtt.pskreporter.info` is a public, documented
  alternative with the same data (QoS 0, no decoder software in the message, callsign `/`
  becomes `.` in topics). Abstract the transport.
- `flowStartSeconds` is TX start for 62% of reports and decode time for the rest;
  `/api/characteristics` says which software does which.
- The `HH:MM` time is built from server local time. The mode collapse swallows `JTTY`.
- 26 million reports a day; filter early.

**D-STAR**
- The module-letter band guess is wrong most of the time for hotspots: B is 70cm in 99% of
  QuadNet entries, but C is 2m in only 65% and A is 23cm in only 12%. Prefer the directory,
  and flag the guess.
- dstarusers' second token after the callsign is a module letter, not a radio suffix; upstream
  stores it as `dvSuffix`.
- MY values like `KB3MHB02` (8 chars with digits) fail the callsign regex silently.
- 86% of events are the operator's own hotspot, so node location is home location, and the
  TX message usually holds a name and town. Decide what the public API republishes.
- The reflector is absent on 48% of transmissions; the node is absent on reflector-only rows.

**DMR, YSF, APRS (future)**
- BrandMeister last-heard is an undocumented Socket.IO feed (`wss://api.brandmeister.network`,
  path `/lh`, join `everything`): about 10k callsign-bearing group key-ups an hour, no CQ
  marker, private calls mixed in (drop by call type), talkgroup ids unique only per network,
  `SourceCall` empty on 34% of events (resolve via radioid.net). Ask BrandMeister first.
- YSF has no standard feed; EUROPELINK's JSON is the best public one. NXDN, P25 and M17 have
  only dashboards. aprs.fi's terms forbid server-side collection; APRS-IS is the right source
  and is a position report, not a digital voice event.
- Each would get its own detail block (talkgroup, DMR id, slot; YSF room, DG-ID) alongside
  `dstar`; nothing in the base changes.

---

## 6. What the collector run showed (2026-10-14)

`tools/collector` on the `collector` branch ran the real receivers for 1 h 54 min (12:03 to
13:57 UTC) and converted 57,864 spots into this model. Full report: `docs/research/collector-run-2026-10-14.md`.
WWFF, cluster, RBN and PSK Reporter were fed over HTTP bridges because telnet and the stream
token are unavailable in the sandbox; the bridged feeds carry full timestamps, so the
minute-precision case never appeared in this run and the RBN web endpoint has no FT8.

| Source | Spots | Dropped by today's receiver | Note |
|---|---|---|---|
| pskreporter | 33,764 | 1,011 (736 CW by policy, 254 no frequency, 14 no mode) | 20 s sample per 5 min |
| rbn | 21,232 | 1,107 (748 NCDXF, 358 BEACON, all by the regex) | 5.0% of RBN lines are beacons |
| pota | 1,771 | 0 | 53 QRT from comments (3%) |
| cluster | 551 | 0 | DXSummit mirror |
| dstarusers | 284 | 0 | 84% are reflector self-reports |
| quadnet | 147 | 0 | 75 monitoring, 72 on-air |
| sotawatch | 65 | 0 | 18 via RBNHole |
| wwff | 50 | 0 | Spotline JSON |

Schema: one failure in 57,864 before the fix below, zero after.

### What the data decided

1. **`spotter` is optional everywhere, not just for D-STAR.** 239 dstarusers rows were the
   reflector reporting its own module (no reporting station), and 51 PSK Reporter reports
   arrived with an empty receiver callsign.
2. **`band` is optional for RF spots too.** Junk frequencies reach every human-sourced feed:
   7 kHz and 368 MHz on the cluster, 140 MHz and 28 GHz on POTA, 21.669 MHz on SOTAwatch.
   The frequency is kept as given; band is derived only when it resolves.
3. **Callsigns are kept verbatim apart from whitespace.** The current `[^0-9A-Z/]` stripping
   turned `HB9AK-6` into `HB9AK6`. Shape validation is advisory: `8N7I60` is a real Japanese
   special event call that a strict pattern rejects, while `RR73` and `1AT1566` are PSK
   Reporter mis-decodes that only a sanity filter at ingest should drop.
4. **`dstar.reflector` can be a repeater module.** A QuadNet link to `SR7UVL-B` (repeater to
   repeater) failed the `REFnnn` pattern. The field keeps its name and accepts any `CALL-M`.
5. **Mode provenance is not optional.** Of 551 cluster spots, 0 had a reported mode: 319 came
   from the band plan (58%), 136 from the comment (25%), 96 had nothing (17%). A trigger on
   `mode in [ssb]` matches guesses most of the time on the cluster, which `provenance.mode`
   now says. On POTA 23 of 1,771 modes were guessed; everywhere else the feed reports it.
6. **Mode table additions**: `FT2` (83 on PSK Reporter, 11 on cluster), `SAFECOM`, and RBN web
   mode codes 4 and 6 that its own metadata does not define, all from one misconfigured
   skimmer. `JTTY` (16) maps to the `rtty` family here; production folds it into `jt`.
7. **`beacon` carries real volume**: 5.0% of RBN lines, two thirds of them NCDXF beacons.
   All are silently dropped today.
8. **References in comments are worth extracting, and must be validated.** 10.7% of cluster
   spots carried a park reference in the comment that resolved against the park lists, 3.5%
   of POTA spots named extra parks (n-fers), 12% of SOTA comments named a park. The same
   regex also matched `TS-2000`, `IC-7300` and `IC-7100` (radio models), which the list lookup
   rejected. `provenance["parks.N.ref"] = comment-regex` marks every one.
9. **The `signal` block is cross-source as designed**: present on 100% of RBN, 99% of PSK
   Reporter, 43% of POTA (RBN re-spots) and 28% of SOTAwatch (RBNHole).
10. **Duplicates across sources dominate the firehose.** Same base callsign and band within
    10 minutes: POTA and RBN 9,212 pairs, cluster and RBN 2,788, POTA and PSK Reporter 799,
    PSK Reporter and RBN 730, RBN and SOTAwatch 319. That is the matcher's rate-limit problem,
    not the schema's, but the API should expose `sourceId` and `source` so a client can group.
11. **POTA re-spot bumps did not occur**: 1,771 distinct `spotId`s, none emitted twice in two
    hours. The research observation may be rarer than it looked.
12. **D-STAR frequency resolution works**: 146 of 147 QuadNet spots got a frequency from the
    node directory; the module-letter guess was needed once. dstarusers reflector rows (84%)
    have neither, so `band` absent is the normal D-STAR case on that feed.
13. **PSK Reporter carries satellite traffic**: 30 reports on 13 cm, 12 on 3 cm including two
    in the QO-100 narrowband segment. A `satellite` block can be derived from frequency for
    QO-100 without any new source.
14. **11 m reaches the model**: 32 PSK Reporter reports on 11 m with CB-style ids. The band
    drop belongs in the ingest filter, as today.

### Second run (14:08 to 16:02 UTC, 58,672 spots; report `docs/research/collector-run-2026-10-14-b.md`)

Same shape, one new failure and three confirmations:

- **Area-routed D-STAR calls.** Upstream normalizes reflectors to `REF030-C` but leaves an
  area-routed destination as `IR0CD C` with a space, which failed the pattern. The converter
  now normalizes every D-STAR place name to `CALL-M`; worth a one-line fix upstream too.
- **Zero-frequency spots exist.** A DXSummit web spotter posted `H49A` on `0.0` with the
  comment "please all call". Frequency optional at the base is right; dropping frequency 0 on
  RF spots is an ingest rule.
- **11 m via the cluster mirror**: 41 CB-style callsigns (`14CMB41`, `3AT110`) in two hours.
  The 11 m drop has to apply to every source, not only PSK Reporter.
- **Mode vocabulary keeps growing**: `PSK125` and `ROS` appeared on PSK Reporter, and a third
  undefined RBN web mode code. Open string, explicit family table, confirmed.
- Cross-source overlap at the same scale as the first run: POTA and RBN 13,141 pairs, PSK
  Reporter and RBN 3,469, cluster and RBN 2,176.
- The `nil` comment filter fired once (a 70 cm beacon spot), the only cluster line the
  production parser dropped in two hours.

Combined: 116,536 spots over 3 h 46 min of tracked collection, zero schema failures after the
five converter and schema changes listed above.

### Tool notes

- `reconvert.js` replays recorded legacy spots through the current converter; every change
  above was validated that way without collecting again.
- Detached runs died when the sandbox paused; only harness-tracked runs survive. The PSK
  Reporter receiver's idle timer tried the token stream every 5 s until the bridge disabled
  it (fixed).
- Not exercised here: telnet line parsing on live bytes, RBN FT8/FT4 lines, the PSK Reporter
  stream schema, ircDDB. Those need a run on the production host.

## 7. The API

Everything the PHP site, the app's routes, the Telnet emulation and the upstream additions do
today maps onto twelve resources. The contract is two files: `spot-model.yaml` (the schemas every
stage shares, section 2) and `openapi.yaml` (the HTTP paths and the API-only schemas, which reference
the first by `$ref`). Both lint clean with `npx @redocly/cli lint` from `docs/`, and `redocly bundle
openapi.yaml` folds them into one document for publishing and type generation. This section records
the shape and the reasoning, not every field. Backwards compatibility with any current route, payload or id is not a goal.

### 7.1 Cross-cutting rules

| Rule | Choice |
| --- | --- |
| Base path | `/v1`. Everything under it is JSON unless the path says otherwise. |
| Auth | Bearer tokens. Opaque, one session per device, short-lived access token plus refresh token. No HTTP Basic, no password on every request. Sessions are listable and revocable; a password change or reset revokes the others. |
| Errors | RFC 9457 `application/problem+json`. Validation errors carry `errors[]` with a JSON pointer per field. |
| Lists | Cursor pagination (`cursor` in, `nextCursor` out). Never offsets. |
| Time and frequency | RFC 3339 UTC strings and integer Hz everywhere, exactly as in `Spot`. |
| Reference data | `ETag` on every response, `If-None-Match` from clients, `304` when unchanged. |
| Open vocabularies | `source`, `mode`, provenance values are open strings. Clients tolerate unknown values. Closed enums are closed: `activity`, `action`, `spotter.kind`. |
| Types | TypeScript types for server and clients are generated from the spec. Nothing hand-writes a request or response shape. |

### 7.2 Resources

```
/auth/*                      login, refresh, logout, sessions, register (+confirm), password forgot/reset
/account                     get, rename, delete; /password; /email (+confirm); /clublog
/account/destinations        app templates, telnet, url (+secret), threema (+verify)
/account/limits              four scoped rate limits + exceeded counter; /account/blocked-spotters
/devices                     push registrations (ios | android | web)
/triggers                    CRUD, enable toggle, helpers (Club Log unworked DXCC, SOTA complete candidates)
/mutes                       list, create, delete one / all
/spots                       matched history (cursor), delete, badge, /stream (SSE)
/simulate                    synchronous test against this account's triggers
/reference/*                 vocabularies, dxcc, sota, parks, iota
/public/*, /health           stats, last spot, MySpot PNG, per-source feed health
```

**Account and destinations.** The account is the login, email, Club Log link and the master
`alertsEnabled` switch (vacation mode: everything stays configured, nothing is delivered). Destinations are
where alerts go, one object with four parts: `app` (title and body templates), `telnet` (enabled,
password), `url` (enabled, URL, HMAC secret), `threema` (id, verified). Secrets are write-only;
the response says `secretSet: true`. Setting a new Threema id sends a verification code.

**Devices.** A device is a push registration: platform, push token, name, `pushEnabled`, sound.
Registration is idempotent on the push token. A device whose token the provider rejected shows
`pushFailing: true` instead of silently dropping alerts, which is what happens today.

**Limits.** Four scoped limits, each `{count, intervalSec}` or null: total, per callsign, per
callsign+band+mode, per callsign+frequency+mode, plus `separateSotawatch`. Same semantics as
`ratelimit.js`, named instead of positional. The exceeded counter is read-only with a reset
endpoint. Blocked spotters are a plain callsign list, replaced whole.

**Triggers.** One flat `conditions` map. Every key is optional, all present keys must hold, lists
are OR within the list, `not*` lists exclude, ranges are `{from, to}`. Values match after
enrichment, so `dxcc` and `band` apply to a cluster spot that reported neither.

| Today | Spec | Why |
| --- | --- | --- |
| `dvEvent` | `activity` | The spot-level activity enum replaces the D-STAR-only event names. |
| `wwffRef`, `wwffDivision` | `parkRef`, `parkPrefix`, plus `parkProgram`, `parkLocation` | POTA and WWFF are one `parks[]` block in the spot, so one set of conditions. |
| `callsignDxcc` | `homeDxcc` | Matches the spot field name. |
| `iotaGroupRef` | `iota` | Shorter, matches the spot field. |
| `bandslot` | `bandSlot` | Same value, `<dxcc>_<band>`, the Club Log unworked-slot unit. Written nightly by `options.clublogUnworked`. |
| `timeFrom`/`timeTo` | `timeOfDay: {from, to}` | Range shape like the others; `from > to` wraps midnight. |
| `band` | `band` | Unchanged; accepts single bands and the groups `vlf lf mf hf vhf uhf shf ehf`, which the matcher expands. |
| `summitRegion` | `summitRegion` | Unchanged; the two-letter region code, combined with `summitAssociation`. |
| (none) | `parkProgram`, `parkLocation`, `activity` | New fields in the spot that are worth matching on. |

List conditions take up to 5000 values; the trigger `comment` up to 1000 characters. Matching
is on discrete values only, so there is no frequency range condition. An absent `activity`
means `[on-air]`, so a plain callsign trigger never fires on QRT or D-STAR link events.

`options` carries what is not a condition: `clublogUnworked` (nightly rewrite of
`conditions.bandSlot` from the Club Log chart, for the bands in `conditions.band`),
`sotaCompleteAuto` (nightly sync of `conditions.summitRef`). `actions` is a set of
`app | telnet | url | threema`. Read-only: `matchCount`, `lastMatchedAt`, `autoDisabled {at, reason}`.
Replacing a trigger resets the count and clears `autoDisabled`; today's silent disable becomes
visible.

**Mutes.** Base callsign plus optional band or summit, with a duration, so muting `HB9DQM` from
an `HB9DQM/P` alert works. An identical mute is extended, not duplicated.

**Matched spots.** `GET /spots` returns `MatchedSpot[]` newest first, cursor paginated, 24 h
window, filterable by action. `MatchedSpot` is `{id, spot, triggers[{id, comment}], actions[],
display {title, body}}`; `display` is the rendered notification text every channel shows.
Spots that were matched but suppressed by a limit, mute or blocked spotter are not stored, as
today. `PUT /spots/badge` replaces today's badge reset. `GET /spots/stream` is server-sent events, one
event per matched spot with `id` = matched spot id, resumable for 24 h with `Last-Event-ID`.
This replaces polling and is what the web client and the app use when in the foreground.

**Webhook.** The `url` action POSTs the `MatchedSpot` JSON. Headers:
`X-HamAlert-Signature: sha256=<hex HMAC of the body>` with the account's secret, and
`X-HamAlert-Delivery: <matched spot id>` for idempotency. Two retries on non-2xx; a destination
that fails for 24 h is disabled and `lastError` is set on the destination. No query-string or
form encoding, no legacy field names.

**Limits.** The `total` limit is mandatory and capped at 100 alerts per hour; the three scoped
limits are optional. That cap is what protects the push providers and the server.

**Simulate.** `POST /simulate` with a minimal raw spot (callsign plus whatever the test needs).
The server enriches and matches it for this account only, sends the alerts, and returns the
enriched spot, the triggers that matched, and near misses: enabled triggers that failed exactly
one condition, with that condition named. That is what makes it useful as a trigger debugger.
Limits and mutes do not apply to simulated spots.

**Reference data.** Served by the API, written only by the reference loaders (§3b). Vocabularies
(bands, band slots, modes, sources, actions, states, the registration question), DXCC entities,
SOTA associations and summits, park programmes and parks, and IOTA groups. Vocabularies also
publish the band groups and band slots the trigger editor offers.

**Public.** Daily stats per source and per action, last spot of a callsign, the MySpot PNG
(HMAC-protected as today), and `/health` with per-source `lastSpotAt` and `ok | stale | down`.

### 7.3 Telnet emulation

Stays, because it is how logging programs consume HamAlert. It is not part of the HTTP spec. It
is re-specified from DXSpider and CC Cluster conventions (login prompt, `set/json`, `show/dx`,
`bye`) rather than from today's output, and its JSON mode emits `MatchedSpot`. Authentication
is username plus the Telnet password from destinations.

### 7.4 What is deliberately not there

- No legacy routes, no Basic auth, no old spot or trigger ids. Clients are rewritten with the
  server.
- No per-field `guessed` booleans in the API and no trigger switch on them; `provenance` is
  display information (§2).
- No planned events or satellite passes (§3a).
- No WebSocket. SSE covers the push case with less machinery; the Telnet feed covers the rest.
- No API rate limiting in the spec beyond `429` on the auth endpoints; that belongs to the
  gateway.
- Dropped on purpose, as feature parity only (second review, §8): webhook GET and form-POST
  methods (JSON POST only), Discourse forum single sign-on, "clear MySpot", Telnet login with
  the account password, the `*` wildcard for "any IOTA group", trigger and user counts on the
  stats page. Any of these can be added if asked for.

### 7.5 Open points

- `SimulatedSpot` is minimal; add fields as the simulator UI needs them.
- The anti-spam registration question is kept; swap for a captcha if abuse returns.

---

## 8. Maintainer review, 2026-10-17

Manuel (manuelkasper) reviewed the model and the API on the PR and asked for a KISS pass. All of
it was applied on 2026-10-18; the reasoning is recorded so the next person does not re-add them.

| Removed | Why it was there | Why it goes |
|---|---|---|
| `Spot.precision` | Telnet HHMM, kHz feeds | Never populated in 116,536 collected spots; no consumer. Seconds are 00, Hz digits are 000. |
| `Spot.cluster`, `ClusterDetail` | mirror node, 30-char truncation flag | Truncation hit 53 of 1,430 cluster spots; node is which mirror. Not worth a block. |
| `Spot.satellite`, `SatelliteDetail` | AMSAT status, QO-100 traffic | No producer, no plans. |
| `Spotter.kind` | human / skimmer / bot / gateway | A pure function of `source` and `relay`. |
| `Spotter.isSelf` | self-spot flag | Computable from the two base callsigns. |
| `MatchedSpot.matchedAt`, `.suppressed` | match time; why not delivered | `spot.receivedAt` is within seconds; suppressed spots are not stored. |
| Trigger `frequency` range | 40 m CW segment | The matcher looks up discrete values; `bandSlot` covers it. |
| Trigger `spotterKind`, `selfSpot`, `satellite`, `modeDetail` | new conditions | Follow from the field removals; `modeDetail` differs from `mode` on under 0.1% of spots. |
| Trigger `options.ignoreGuessed` | skip band-plan-guessed modes | Today's HamAlert matches guessed modes and nobody asks for a filter. Addable later. |
| `/events`, `/satellites/passes`, `/reference/satellites*`, `PlannedEvent`, `SatellitePass` | planned events, pass prediction | Out of HamAlert's scope. Research kept in `docs/research/`. |

| Changed | From | To |
|---|---|---|
| Trigger `band` | single bands only | also the groups `vlf lf mf hf vhf uhf shf ehf`, expanded by the matcher |
| Trigger `summitRegion` | `ASSOC/RG` | two-letter region code, as today |
| Trigger `comment` | 100 chars | 1000 |
| List conditions | 1000 callsigns, 5000 refs | 5000 everywhere |

### Second review, 2026-10-18

An adversarial review (pre-registered checklist, every field counted in the 116,536 spots, every
claim traced to the PHP site, app or server code) ran after the maintainer's cuts. Findings
that were only "today does it" were discarded, since neither compatibility nor feature parity
is required. What remained:

| Fixed | Was | Now |
|---|---|---|
| `bandSlot` | Described as a band-plan segment (`40m_cw`), which nothing produces and nobody asked for; the doc called it "the same thing" as today's condition | `<dxcc>_<band>`, the Club Log unworked-slot pair that `tools/updateBandslots.js` writes nightly; `options.clublogUnworked` is its writer |
| Alerts pause | No endpoint | `Account.alertsEnabled`, settable via `PATCH /account` |
| `Band` pattern | Rejected `3cm_qo100`, a band in today's config and editor and the only pattern violation in the data (3 spots) | Admits the `_suffix` form |
| Mute semantics | "Matched against full callsign"; today's app passes the base call | `baseCallsign`; `mode` narrowing dropped (no client sends it) |
| `total` limit | Nullable | Required, at most 100 per hour (today's server rule) |
| `activity` condition | No default; absent would match QRT and link events | Absent means `[on-air]` |
| Notification text | `display {title, body}` promised in prose, absent from the schema | On `MatchedSpot`, required; default templates in vocabularies |
| `rawText` | "As received", but synthesised by us on 4.5% of spots | Only for line-based feeds |
| `provenance` | Required, `{}` on 40% of spots | Optional, omitted when empty |

| Removed | Evidence |
|---|---|
| `signal.speedUnit` | 43,339 values, all `wpm` |
| `signal.spotType` | 42,204 `cq`, 16 `dx`; beacons never reach the converter |
| `signal.senderLocator`, `signal.software`, `signal.spotterCount`, `spotter.locator`, `dstar.ber`, `dstar.silencePct` | 0 values in 116,536 spots |
| `summit.valid` | 113 values, all `true` |
| `entity.itu`, trigger `itu` | No editor has ever offered ITU zones |
| `spotter.relay` | 204 of 233 values were DXSummit's `-@` web marker, not a relay |
| `MuteInput.mode` | No client sends it |

Kept despite "no consumer today", because the product is being built forward: `sourceId`,
`client`, `spotter.instance`, summit and park coordinates, `parks[].locations`, cursor
pagination, SSE resume, mute listing, session listing.
