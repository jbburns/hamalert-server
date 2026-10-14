# Collector report

Data dir: `/home/user/hamalert-server/tools/collector/data-run1-partial`. Generated 2026-10-14T08:58:06.176Z.

## Overview

| Source | Legacy spots | Converted | Schema errors | Issues (error/warn/info) | Dropped by receiver |
|---|---|---|---|---|---|
| cluster | 18 | 18 | 0 | 0/2/8 | 0 |
| dstarusers | 4 | 4 | 0 | 0/0/8 | 0 |
| pota | 8 | 8 | 0 | 0/0/8 | 0 |
| pskreporter | 2982 | 2982 | 0 | 0/1/103 | 33 |
| quadnet | 10 | 10 | 0 | 0/0/0 | 0 |
| rbn | 783 | 783 | 0 | 0/0/787 | 48 |

## cluster

### Field presence (18 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| cluster | 100.0% |
| cluster.commentTruncated | 11.1% |
| cluster.node | 100.0% |
| comment | 94.4% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 66.7% |
| modeDetail | 66.7% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| spotter.relay | 38.9% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 18
- **mode**: ssb 6, (none) 6, ft8 3, cw 3
- **modeDetail**: ssb 6, (none) 6, ft8 3, cw 3
- **spotter.kind**: human 18
- **spotter.relay**: web 7
- **band**: 40m 7, 20m 2, 70cm 2, 15m 2, 23cm 1, 80m 1, 12m 1, 4m 1, 60m 1
- **provenance**: mode=bandplan 6, mode=comment-word 3, mode=comment 3
- **precision**: none

### Issues

- **info:mode-missing** 6 (33.3% of spots): `no mode and no guess`
- **warn:callsign-shape** 2 (11.1% of spots): `callsign "SWL" does not look like a callsign`; `callsign "DXEUTEAM" does not look like a callsign`
- **info:spotter-shape** 2 (11.1% of spots): `spotter "DXEU" does not look like a callsign`; `spotter "TEAMH4" does not look like a callsign`

### Samples

```json
{"id":"354f4010-9c57-41fb-bd69-4fb1633f0e49","activity":"on-air","source":"cluster","sourceId":"68535473","callsign":"F5ZPH/B","baseCallsign":"F5ZPH","spotter":{"callsign":"F6DRO","kind":"human","isSelf":false},"time":"2026-10-14T05:53:03Z","receivedAt":"2026-10-14T05:53:45.087Z","frequency":432407000,"band":"70cm","comment":"JN03<TR>IN87 above norm 6db","rawText":"DX de F6DRO:    432407.0  F5ZPH/B      JN03<TR>IN87 above norm 6db    0553Z","cluster":{"node":"dxsummit"},"provenance":{},"precision":{}}
{"id":"6a2d9908-4294-4716-b9fd-d429baf34007","activity":"on-air","source":"cluster","sourceId":"68535474","callsign":"FW1P","baseCallsign":"FW1P","spotter":{"callsign":"PA4PA","kind":"human","isSelf":false,"relay":"web"},"time":"2026-10-14T05:53:13Z","receivedAt":"2026-10-14T05:53:45.087Z","frequency":5355000,"band":"60m","mode":"cw","modeDetail":"cw","comment":"350Hz cqcq tnx Janusz!","rawText":"DX de PA4PA-@:    5355.0  FW1P         350Hz cqcq tnx Janusz!         0553Z","cluster":{"node":"dxsummit"},"provenance":{"mode":"bandplan"},"precision":{}}
```

## dstarusers

### Field presence (4 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| dstar | 100.0% |
| dstar.gateway | 100.0% |
| dstar.reflector | 100.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| source | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 4
- **mode**: dstar 4
- **modeDetail**: dstar 4
- **spotter.kind**: (none) 4
- **band**: (none) 4
- **provenance**: none
- **precision**: none

### Issues

- **info:spotter-is-reflector** 4 (100.0% of spots): `reflector REF001 reported this itself; spotter omitted`; `reflector REF068 reported this itself; spotter omitted`; `reflector REF090 reported this itself; spotter omitted`
- **info:band-unknown** 4 (100.0% of spots): `D-STAR spot with neither frequency nor band`

### Samples

```json
{"id":"6facb1f1-618d-4fa7-8817-8bfbeb271f58","activity":"on-air","source":"dstarusers","callsign":"KC6WOG","baseCallsign":"KC6WOG","time":"2026-10-14T05:50:31Z","receivedAt":"2026-10-14T05:51:44.620Z","modeDetail":"dstar","mode":"dstar","rawText":"05:50 KC6WOG heard on REF090-B [dstarusers]","dstar":{"gateway":"REF090","reflector":"REF090-B"},"provenance":{},"precision":{}}
{"id":"91c076bf-a411-40e8-bf03-d4158ff3ac9b","activity":"on-air","source":"dstarusers","callsign":"KF4UFO","baseCallsign":"KF4UFO","time":"2026-10-14T05:51:52Z","receivedAt":"2026-10-14T05:53:14.377Z","modeDetail":"dstar","mode":"dstar","rawText":"05:51 KF4UFO heard on REF001-E [dstarusers]","dstar":{"gateway":"REF001","reflector":"REF001-E"},"provenance":{},"precision":{}}
```

## pota

### Field presence (8 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| client | 100.0% |
| comment | 100.0% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| parks | 100.0% |
| parks[].latitude | 100.0% |
| parks[].locations | 100.0% |
| parks[].longitude | 100.0% |
| parks[].name | 100.0% |
| parks[].prefix | 100.0% |
| parks[].program | 100.0% |
| parks[].ref | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| signal | 37.5% |
| signal.snr | 37.5% |
| signal.speed | 37.5% |
| signal.speedUnit | 37.5% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 8
- **mode**: cw 5, fm 2, ssb 1
- **modeDetail**: cw 5, fm 2, ssb 1
- **spotter.kind**: human 5, skimmer 3
- **band**: 40m 3, 2m 2, 30m 2, 70cm 1
- **client**: Web 3, RBN 3, Smart HAMLOG POTA Assist 2
- **provenance**: parks.N.ref=comment-regex 1
- **precision**: none

### Issues

- **info:frequency-string** 8 (100.0% of spots): `frequency arrived as string "430.2500"`; `frequency arrived as string "7.0030"`; `frequency arrived as string "7.0060"`

### Samples

```json
{"id":"15a1e646-47e5-4026-9144-7eb9ca3b9493","activity":"on-air","source":"pota","sourceId":"58672263","client":"RBN","callsign":"JR2SSQ/2","baseCallsign":"JR2SSQ","spotter":{"callsign":"JA1CCA","kind":"skimmer","isSelf":false},"time":"2026-10-14T05:53:00Z","receivedAt":"2026-10-14T05:53:44.010Z","frequency":7007000,"band":"40m","modeDetail":"cw","mode":"cw","comment":"RBN 19 dB 21 WPM via JA1CCA-#","rawText":"05:53 JR2SSQ/2 in JP-1918 (Aichiken ryokka center Prefectural Park) 7.0070 CW: RBN 19 dB 21 WPM via JA1CCA-#","parks":[{"program":"pota","ref":"JP-1918","prefix":"JP","name":"Aichiken ryokka center Prefectural Park","locations":["JP-AI"],"latitude":35.1587,"longitude":137.193}],"signal":{"snr":19,"speed":21,"speedUnit":"wpm"},"provenance":{},"precision":{}}
{"id":"a3b098cc-cb16-4a29-ac35-76b02b1a2eb0","activity":"on-air","source":"pota","sourceId":"58672266","client":"RBN","callsign":"JK1MGC/2","baseCallsign":"JK1MGC","spotter":{"callsign":"JA1CCA","kind":"skimmer","isSelf":false},"time":"2026-10-14T05:54:01Z","receivedAt":"2026-10-14T05:54:43.953Z","frequency":10123500,"band":"30m","modeDetail":"cw","mode":"cw","comment":"RBN 20 dB 24 WPM via JA1CCA-#","rawText":"05:54 JK1MGC/2 in JP-1982 (Shizuoka Performing Arts Prefectural Park) 10.1235 CW: RBN 20 dB 24 WPM via JA1CCA-#","parks":[{"program":"pota","ref":"JP-1982","prefix":"JP","name":"Shizuoka Performing Arts Prefectural Park","locations":["JP-SZ"],"latitude":34.9809,"longitude":138.449}],"signal":{"snr":20,"speed":24,"speedUnit":"wpm"},"provenance":{},"precision":{}}
```

## pskreporter

### Field presence (2982 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| signal | 99.5% |
| signal.snr | 99.5% |
| source | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.instance | 2.7% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 2982
- **mode**: ft8 2964, varac 9, ft4 8, ft2 1
- **modeDetail**: ft8 2964, varac 9, ft4 8, ft2 1
- **spotter.kind**: skimmer 2982
- **band**: 40m 1473, 20m 703, 30m 297, 80m 267, 15m 116, 60m 59, 17m 23, 12m 22, 10m 21, 11m 1
- **provenance**: time=decode 2982
- **precision**: none

### Issues

- **info:spotter-shape** 103 (3.5% of spots): `spotter "SNAKESHARMER" does not look like a callsign`; `spotter "ON6URE-TEL" does not look like a callsign`; `spotter "KPH" does not look like a callsign`
- **warn:callsign-shape** 1 (0.0% of spots): `callsign "161EE200" does not look like a callsign`

### Dropped by receiver (33)

- 33 x receiver did not emit (filtered or quorum)

    {"receiverCallsign":"MM9PSY","receiverLocator":"IO86ha","senderCallsign":"UA3AMY","senderLocator":"KO85qp18","frequency":"14049976","flowStartSeconds":"17919569
    {"receiverCallsign":"MM9PSY","receiverLocator":"IO86ha","senderCallsign":"SO9C","senderLocator":"JO90KW","frequency":"10128994","flowStartSeconds":"1791956915",
    {"receiverCallsign":"ON6URE-TEL","receiverLocator":"JO11jd","senderCallsign":"SO9C","senderLocator":"JO90KW","frequency":"10129000","flowStartSeconds":"17919569
    {"receiverCallsign":"F8MRQ","receiverLocator":"JN17CT","senderCallsign":"HB9HVG","senderLocator":"JN36TO","flowStartSeconds":"1791956909","mode":"FT8","senderDX
    {"receiverCallsign":"F8MRQ","receiverLocator":"JN17CT","senderCallsign":"UB3PAQ","senderLocator":"KO84hf","flowStartSeconds":"1791956909","mode":"FT8","senderDX
    {"receiverCallsign":"UT3UY","receiverLocator":"KO50fk","senderCallsign":"F4EOT","senderLocator":"JO20AE","flowStartSeconds":"1791956909","mode":"FT8","senderDXC
    {"receiverCallsign":"UT3UY","receiverLocator":"KO50fk","senderCallsign":"DL1BBO","senderLocator":"JO43lg55mj","flowStartSeconds":"1791956909","mode":"FT8","send
    {"receiverCallsign":"F8MRQ","receiverLocator":"JN17CT","senderCallsign":"I0WBX","senderLocator":"JN62hn75","flowStartSeconds":"1791956907","mode":"FT8","senderD

### Samples

```json
{"id":"0f1b9c69-6d1a-41c7-9256-8582f377f581","activity":"on-air","source":"pskreporter","callsign":"D2UY","baseCallsign":"D2UY","spotter":{"callsign":"MM9PSY","kind":"skimmer","isSelf":false},"time":"2026-10-14T05:49:15Z","receivedAt":"2026-10-14T05:53:45.703Z","frequency":14076413,"band":"20m","modeDetail":"ft8","mode":"ft8","rawText":"DX de MM9PSY: 14076.4 D2UY FT8 -14 dB 0549Z","signal":{"snr":-14},"provenance":{"time":"decode"},"precision":{}}
{"id":"823c6896-8d31-40c8-8b77-f43cf63fa2c5","activity":"on-air","source":"pskreporter","callsign":"4X1UF","baseCallsign":"4X1UF","spotter":{"callsign":"UA0FF","kind":"skimmer","isSelf":false},"time":"2026-10-14T05:49:15Z","receivedAt":"2026-10-14T05:53:45.703Z","frequency":28074153,"band":"10m","modeDetail":"ft8","mode":"ft8","rawText":"DX de UA0FF: 28074.2 4X1UF FT8 -14 dB 0549Z","signal":{"snr":-14},"provenance":{"time":"decode"},"precision":{}}
```

## quadnet

### Field presence (10 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 100.0% |
| dstar | 100.0% |
| dstar.duration | 100.0% |
| dstar.gateway | 100.0% |
| dstar.node | 100.0% |
| dstar.reflector | 100.0% |
| dstar.suffix | 90.0% |
| frequency | 90.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| source | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: monitoring 7, on-air 3
- **mode**: dstar 10
- **modeDetail**: dstar 10
- **spotter.kind**: gateway 10
- **band**: 70cm 8, 2m 2
- **provenance**: frequency=directory 9, band=module-letter 1
- **precision**: none

### Issues

None.

### Samples

```json
{"id":"122252cb-bcef-4f1c-81dd-4c631e47ac8b","activity":"monitoring","source":"quadnet","callsign":"KK4UHY","baseCallsign":"KK4UHY","spotter":{"callsign":"KK4UHY-G","kind":"gateway","isSelf":false},"time":"2026-10-14T05:52:02Z","receivedAt":"2026-10-14T05:52:14.047Z","frequency":438800000,"band":"70cm","modeDetail":"dstar","mode":"dstar","comment":"MIDDLE TENNESSEE","rawText":"05:52 KK4UHY linked KK4UHY-B to REF030-C: MIDDLE TENNESSEE [quadnet]","dstar":{"node":"KK4UHY-B","gateway":"KK4UHY-G","reflector":"REF030-C","duration":0.26},"provenance":{"frequency":"directory"},"precision":{}}
{"id":"8b6a48ac-c6d2-4985-bd14-0414fc5829b0","activity":"monitoring","source":"quadnet","callsign":"EA3GIB","baseCallsign":"EA3GIB","spotter":{"callsign":"EA3GIB-G","kind":"gateway","isSelf":false},"time":"2026-10-14T05:53:40Z","receivedAt":"2026-10-14T05:53:44.067Z","frequency":432500000,"band":"70cm","modeDetail":"dstar","mode":"dstar","comment":"SABADELL - JN11BN","rawText":"05:53 EA3GIB linked EA3GIB-B to XLX399-A: SABADELL - JN11BN [quadnet]","dstar":{"node":"EA3GIB-B","gateway":"EA3GIB-G","reflector":"XLX399-A","duration":1.76,"suffix":"ID52"},"provenance":{"frequency":"directory"},"precision":{}}
```

## rbn

### Field presence (783 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| signal | 100.0% |
| signal.snr | 100.0% |
| signal.speed | 99.7% |
| signal.speedUnit | 99.7% |
| signal.spotType | 100.0% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.instance | 10.3% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 783
- **mode**: cw 781, psk 1, rtty 1
- **modeDetail**: cw 781, psk31 1, rtty 1
- **spotter.kind**: skimmer 783
- **band**: 40m 394, 20m 237, 80m 83, 30m 55, 60m 7, 17m 3, 2m 2, 15m 2
- **provenance**: none
- **precision**: none

### Issues

- **info:frequency-string** 783 (100.0% of spots): `frequency arrived as string "7.0196"`; `frequency arrived as string "10.1290"`; `frequency arrived as string "3.5220"`
- **info:spotter-shape** 4 (0.5% of spots): `spotter "JH7CSU1" does not look like a callsign`

### Dropped by receiver (48)

- 48 x parser did not emit

    DX de ES5PC-#:   21149.0  IT9ATQ/B   CW    7 dB  10 WPM  BEACON      0548Z
    DX de VK2RH-#:   14100.0  VK6RBP   CW    2 dB  22 WPM  NCDXF B      0549Z
    DX de WZ7I-#:   28234.4  WS2K/B   CW    19 dB  17 WPM  BEACON      0549Z
    DX de S53A-#:   18110.1  RR9O   CW    12 dB  22 WPM  NCDXF B      0549Z
    DX de OE9GHV-#:   3578.7  IQ5VK/B   CW    21 dB  7 WPM  BEACON      0549Z
    DX de MM0ZBH-#:   10129.4  IZ3DVW/B   CW    12 dB  16 WPM  BEACON      0550Z
    DX de YO2CK-#:   10129.5  IZ3DVW/B   CW    6 dB  15 WPM  BEACON      0550Z
    DX de S50ARX-#:   7043.8  R6OGV/B   CW    10 dB  17 WPM  BEACON      0550Z

### Samples

```json
{"id":"f273926e-8f27-4000-982d-0c777c680b88","activity":"on-air","source":"rbn","sourceId":"2334860103","callsign":"SM5DAJ","baseCallsign":"SM5DAJ","spotter":{"callsign":"RU9CZD","kind":"skimmer","isSelf":false},"time":"2026-10-14T05:54:44Z","receivedAt":"2026-10-14T05:54:44.910Z","frequency":14025100,"band":"20m","modeDetail":"cw","mode":"cw","rawText":"DX de RU9CZD-#:   14025.1  SM5DAJ   CW    17 dB  22 WPM  CQ      0554Z","signal":{"snr":17,"speed":22,"speedUnit":"wpm","spotType":"cq"},"provenance":{},"precision":{}}
{"id":"b87d9d98-500f-4e3a-9310-25155665554c","activity":"on-air","source":"rbn","sourceId":"2334860104","callsign":"TM41SF","baseCallsign":"TM41SF","spotter":{"callsign":"G3YPP","kind":"skimmer","isSelf":false},"time":"2026-10-14T05:54:44Z","receivedAt":"2026-10-14T05:54:44.910Z","frequency":3519900,"band":"80m","modeDetail":"cw","mode":"cw","rawText":"DX de G3YPP-#:   3519.9  TM41SF   CW    23 dB  18 WPM  CQ      0554Z","signal":{"snr":23,"speed":18,"speedUnit":"wpm","spotType":"cq"},"provenance":{},"precision":{}}
```

## Cross-source overlap (same base callsign and band within 10 min)

- cluster+rbn: 60
- cluster+pskreporter: 7
- pota+rbn: 6
- pskreporter+rbn: 2
