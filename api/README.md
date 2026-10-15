# HamAlert API specification

`openapi.yaml` is the contract between the HamAlert backend and its clients (Vue/Ionic app, web,
third-party webhook consumers). It is OpenAPI 3.1 and lints clean with
`npx @redocly/cli lint api/openapi.yaml`. The TypeScript types for both server and client are
generated from it (`openapi-typescript`); nothing hand-writes a request or response shape.

This is draft 1. It is meant to move to its own repository (`hamalert/api`) once agreed; it lives
here so it can be reviewed next to the spot model (`docs/spot-model.md`, PR #1) it builds on.

## Decisions baked into the spec

Backwards compatibility with the current PHP site, the Cordova app routes and the legacy webhook
format is not a goal. Everything below is new.

| Area | Decision |
| --- | --- |
| Auth | Opaque per-device session tokens with refresh (`/auth/login`, `/auth/refresh`). No HTTP Basic. Sessions are listable and revocable. Password change and reset revoke other sessions. |
| Errors | RFC 9457 `application/problem+json`; validation errors carry `errors[]` with JSON pointers. |
| Pagination | Cursor based (`cursor` / `nextCursor`). No offsets. |
| Time and frequency | RFC 3339 UTC strings; integer Hz. `precision` says when the source only had minutes or kHz. |
| Triggers | One flat `conditions` map. Lists are always arrays (OR within, AND across keys), ranges are `{from, to}`. New conditions over today's: `activity`, `modeDetail`, `bandSlot`, `frequency`, `spotterKind`, `selfSpot`, `parkProgram`, `parkLocation`, `parkRef` (POTA and WWFF), `satellite`. `dvEvent` is replaced by `activity`; `wwffRef`/`wwffDivision` by `parkRef`/`parkPrefix`; `callsignDxcc` by `homeDxcc`; `iotaGroupRef` by `iota`. |
| Guessed values | `options.ignoreGuessed` on a trigger: skip the match when any conditioned field has guessed provenance. The spot itself carries `provenance` so clients can show why. |
| Webhook (`url` action) | HTTP POST of the `MatchedSpot` JSON, `X-HamAlert-Signature: sha256=<HMAC>` with a per-account secret, two retries, auto-disable after 24 h of failures. No query-string or form encoding. |
| Simulate | Synchronous: the response lists the triggers that matched, the enriched spot, and near misses (one failed condition). Alerts are still sent. |
| Live feed | Server-sent events at `/spots/stream`, resumable for 24 h with `Last-Event-ID`. |
| Planned events | Read-only now (`/events`, `/satellites/passes`). Triggers on planned events come later; the `PlannedEvent` schema is the one the matcher will consume then. |
| Reference data | Served by the API with `ETag`; written only by the reference loaders (see `docs/spot-model.md` §3b). Clients cache by ETag. |
| Telnet emulation | Stays, but is specified from DXSpider / CC Cluster conventions rather than today's ad-hoc output; its `set/json` mode emits `MatchedSpot`. It is not part of this HTTP spec. |
| Spot ids | New, server-assigned, time-ordered. Nothing maps to old MongoDB ids. |

## Resource map

```
/auth/*                      login, refresh, logout, sessions, register(+confirm), password forgot/reset
/account                     get, patch (username), delete; /password; /email(+confirm); /clublog
/account/destinations        app templates, telnet, url (+secret), threema (+verify)
/account/limits              rate limits + exceeded counter;  /account/blocked-spotters
/devices                     push registrations
/triggers                    CRUD, enable toggle, helpers (Club Log unworked DXCC, SOTA complete candidates)
/mutes                       list, create, delete one / all
/spots                       matched history (cursor), delete, badge, /stream (SSE)
/simulate                    synchronous test
/reference/*                 vocabularies, dxcc, sota, parks, iota, satellites (+orbits)
/events, /satellites/passes  planned events, pass prediction
/public/*, /health           stats, last spot, MySpot PNG, feed health
```

## Open points

- `Vocabularies.registrationQuestion` keeps the anti-spam question; swap for a captcha if abuse returns.
- `bandSlot` names (`40m_cw` …) need the band plan table published in `/reference/vocabularies`; the
  current matcher's `bandslot` list is the starting point.
- `SimulatedSpot` is deliberately minimal; add fields as the simulator UI needs them.
- Rate limiting of the API itself (429) is left to the gateway; only the auth endpoints declare it.
