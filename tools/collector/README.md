# Data collector

Runs HamAlert's real spot receivers for a while, records what every feed sends, converts each
spot into the proposed new `Spot` model and reports everything that does not map cleanly.
No MongoDB, Redis or credentials needed.

```sh
npm install
node tools/collector/index.js --hours 2              # collect
node tools/collector/report.js                        # summarize into tools/collector/data/report.md
```

Options: `--sources sotawatch,pota,dstar,wwff,cluster,rbn,pskreporter`, `--data DIR`
(default `tools/collector/data`, gitignored). Environment: `COLLECTOR_IRCDDB=1` to enable the
ircDDB feed (plain HTTP on port 8080), `COLLECTOR_REFLECTOR_LINKS=1` to enable REF dashboard
scraping, `COLLECTOR_CONTACT=you@example.com` for the PSK Reporter `appcontact` parameter.

## How each source is fed

| Source | How | Notes |
|---|---|---|
| sotawatch | the real `sotaspots.js` | summit lookups answered from the summit list CSV |
| pota | the real `potaspots.js` | |
| dstar (quadnet, dstarusers, ircddb) | the real `dstar.js` | ircDDB off by default (port 8080) |
| wwff | bridge: Spotline `spots.json` every 30 s | emits what `cluster.js` in wwffMode would |
| cluster | bridge: DXSummit JSON, formatted as classic `DX de` lines into the real `cluster.js` parser | telnet is not reachable from the sandbox |
| rbn | bridge: reversebeacon.net web JSON, formatted as telnet lines into the real `rbn.js` parser | no FT8/FT4 on that endpoint |
| pskreporter | bridge: retrieval XML API every 5 min into the real `pskreporter.js` (quorum 1) | a ~20 s sample per poll, not the stream |

Bridges report every record the receiver swallowed without emitting a spot (`dropped-*.ndjson`),
which is how parser gaps such as RBN beacon lines show up.

## Output

```
data/raw/http-<hour>.ndjson        every upstream HTTP response (body stored when it changed)
data/<source>/legacy-<hour>.ndjson spot as today's receiver emitted it, plus _raw (the upstream record)
data/<source>/spots-<hour>.ndjson  the proposed model (validated against schema/spot.schema.json)
data/<source>/issues-<hour>.ndjson one line per finding: code, severity, message, field, value
data/<source>/dropped-<hour>.ndjson
data/summary-<ts>.json             counters
data/report.md                     from report.js
```

Issue codes worth watching: `legacy-field-unmapped` (a field the converter does not know),
`schema` (the converted spot fails the proposed schema), `mode-unmapped`, `callsign-shape`,
`park-unknown` / `summit-unknown` (reference not in the lists), `ref-unvalidated` (reference-
like text in a comment that is not in any list), `time-lossy` (feed gave HH:MM only).

## Reference data

Downloaded once per day into `data/cache/`: SOTA summit list, POTA park CSV, WWFF directory,
IOTA group list. The fake database answers the receivers' lookups from these.

## Caveats

- `potaspots.js` starts a second receiver of its own at module load (a bug in the module), so
  POTA is polled twice; the stray one emits to nobody.
- DXCC, state and QSL enrichment are not done (they need Club Log and the callsign databases),
  so `entity`, `homeEntity`, `qsl` are never populated here.
- The schema in `schema/spot.schema.json` is the draft contract; tighten it as decisions land.
