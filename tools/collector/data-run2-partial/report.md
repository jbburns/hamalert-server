# Collector report

Data dir: `/home/user/hamalert-server/tools/collector/data`. Generated 2026-10-14T12:02:45.794Z.

## Overview

| Source | Legacy spots | Converted | Schema errors | Issues (error/warn/info) | Dropped by receiver |
|---|---|---|---|---|---|
| cluster | 35 | 35 | 0 | 0/2/10 | 0 |
| dstarusers | 17 | 17 | 0 | 0/0/28 | 0 |
| pota | 37 | 37 | 0 | 0/0/37 | 0 |
| pskreporter | 2931 | 2931 | 0 | 0/1/146 | 87 |
| quadnet | 11 | 11 | 0 | 0/0/0 | 0 |
| rbn | 1125 | 1125 | 0 | 0/1/1127 | 73 |
| sotawatch | 4 | 4 | 0 | 0/0/0 | 0 |

## cluster

### Field presence (35 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 94.3% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| cluster | 100.0% |
| cluster.commentTruncated | 11.4% |
| cluster.node | 100.0% |
| comment | 97.1% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 71.4% |
| modeDetail | 71.4% |
| parks | 5.7% |
| parks[].latitude | 5.7% |
| parks[].locations | 2.9% |
| parks[].longitude | 5.7% |
| parks[].name | 5.7% |
| parks[].prefix | 5.7% |
| parks[].program | 5.7% |
| parks[].ref | 5.7% |
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
| spotter.relay | 17.1% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 35
- **mode**: ssb 16, (none) 10, ft8 6, cw 2, ft2 1
- **modeDetail**: ssb 16, (none) 10, ft8 6, cw 2, ft2 1
- **spotter.kind**: human 35
- **spotter.relay**: web 6
- **band**: 20m 8, 40m 7, 15m 4, 10m 3, 12m 2, 17m 2, (none) 2, 2m 2, 13cm 1, 9cm 1, 6m 1, 6cm 1, 30m 1
- **provenance**: mode=bandplan 16, mode=comment 7, parks.N.ref=comment-regex 2, mode=comment-word 2
- **precision**: none

### Issues

- **info:mode-missing** 10 (28.6% of spots): `no mode and no guess`
- **warn:band-unresolved** 2 (5.7% of spots): `no band for 4048905100 Hz`; `no band for 368905000 Hz`

### Samples

```json
{"id":"c6ce4da3-a766-4c1f-809c-1fa78e222ef0","activity":"on-air","source":"cluster","sourceId":"68536214","callsign":"FK8HA","baseCallsign":"FK8HA","spotter":{"callsign":"IW1GGR","kind":"human","isSelf":false},"time":"2026-10-14T09:01:55Z","receivedAt":"2026-10-14T09:02:27.400Z","frequency":21227000,"band":"15m","mode":"ssb","modeDetail":"ssb","comment":"73","rawText":"DX de IW1GGR:    21227.0  FK8HA        73                             0901Z","cluster":{"node":"dxsummit"},"provenance":{"mode":"bandplan"},"precision":{}}
{"id":"914a9a9a-dde3-48ce-9a8b-768881f36504","activity":"on-air","source":"cluster","sourceId":"68536215","callsign":"7M3XDD","baseCallsign":"7M3XDD","spotter":{"callsign":"LU9XJR","kind":"human","isSelf":false,"relay":"web"},"time":"2026-10-14T09:02:09Z","receivedAt":"2026-10-14T09:02:27.400Z","frequency":14074900,"band":"20m","mode":"ft8","modeDetail":"ft8","comment":"FT8","rawText":"DX de LU9XJR-@:  14074.9  7M3XDD       FT8                            0902Z","cluster":{"node":"dxsummit"},"provenance":{"mode":"comment"},"precision":{}}
```

## dstarusers

### Field presence (17 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 17.6% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 17.6% |
| dstar | 100.0% |
| dstar.gateway | 100.0% |
| dstar.node | 17.6% |
| dstar.reflector | 82.4% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| source | 100.0% |
| spotter | 17.6% |
| spotter.callsign | 17.6% |
| spotter.isSelf | 17.6% |
| spotter.kind | 17.6% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 17
- **mode**: dstar 17
- **modeDetail**: dstar 17
- **spotter.kind**: (none) 14, gateway 3
- **band**: (none) 14, 70cm 2, 2m 1
- **provenance**: band=directory 3
- **precision**: none

### Issues

- **info:spotter-is-reflector** 14 (82.4% of spots): `reflector REF075 reported this itself; spotter omitted`; `reflector REF024 reported this itself; spotter omitted`; `reflector REF091 reported this itself; spotter omitted`
- **info:band-unknown** 14 (82.4% of spots): `D-STAR spot with neither frequency nor band`

### Samples

```json
{"id":"fcb3a0de-a74b-45a5-bf58-e7c8e425797f","activity":"on-air","source":"dstarusers","callsign":"KD9L","baseCallsign":"KD9L","time":"2026-10-14T09:00:37Z","receivedAt":"2026-10-14T09:01:56.987Z","modeDetail":"dstar","mode":"dstar","rawText":"09:00 KD9L heard on REF030-C [dstarusers]","dstar":{"gateway":"REF030","reflector":"REF030-C"},"provenance":{},"precision":{}}
{"id":"cc7d84bf-8f5d-4895-8cb8-fe7515571d47","activity":"on-air","source":"dstarusers","callsign":"IW2IWD","baseCallsign":"IW2IWD","time":"2026-10-14T09:00:42Z","receivedAt":"2026-10-14T09:01:56.987Z","modeDetail":"dstar","mode":"dstar","rawText":"09:00 IW2IWD heard on REF068-B [dstarusers]","dstar":{"gateway":"REF068","reflector":"REF068-B"},"provenance":{},"precision":{}}
```

## pota

### Field presence (37 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| client | 100.0% |
| comment | 73.0% |
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
| signal | 43.2% |
| signal.snr | 43.2% |
| signal.speed | 27.0% |
| signal.speedUnit | 27.0% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 37
- **mode**: ft8 13, ssb 13, cw 11
- **modeDetail**: ft8 13, ssb 13, cw 11
- **spotter.kind**: human 21, skimmer 16
- **band**: 40m 17, 20m 13, 15m 5, 80m 1, 30m 1
- **client**: RBN 16, Web 12, Ham2K Portable Logger 4, GT 2, GT2 2, POTAontheGO 1
- **provenance**: parks.N.ref=comment-regex 4
- **precision**: none

### Issues

- **info:frequency-string** 37 (100.0% of spots): `frequency arrived as string "14.0740"`; `frequency arrived as string "3.5020"`; `frequency arrived as string "7.1130"`

### Samples

```json
{"id":"e027906b-ffcd-464d-bb0b-77fa0c81a41e","activity":"on-air","source":"pota","sourceId":"58673516","client":"Web","callsign":"PD7PIN","baseCallsign":"PD7PIN","spotter":{"callsign":"DK8AP","kind":"human","isSelf":false},"time":"2026-10-14T09:02:13Z","receivedAt":"2026-10-14T09:02:26.355Z","frequency":7076000,"band":"40m","modeDetail":"ft8","mode":"ft8","rawText":"09:02 PD7PIN in FR-0142 (Lorraine Regional Park) 7.0760 FT8","parks":[{"program":"pota","ref":"FR-0142","prefix":"FR","name":"Lorraine Regional Park","locations":["FR-GES"],"latitude":48.9078,"longitude":5.80583}],"provenance":{},"precision":{}}
{"id":"78af317b-9c7f-4e9c-a776-8fa387470cc0","activity":"on-air","source":"pota","sourceId":"58673513","client":"Web","callsign":"G5ACE","baseCallsign":"G5ACE","spotter":{"callsign":"G5ACE","kind":"human","isSelf":true},"time":"2026-10-14T09:02:07Z","receivedAt":"2026-10-14T09:02:26.356Z","frequency":14074000,"band":"20m","modeDetail":"ft8","mode":"ft8","comment":"20m FT8 twofer with GB-3161","rawText":"09:02 G5ACE in GB-6143 (Filsham Reed Bed Local Nature Reserve) 14.0740 FT8: 20m FT8 twofer with GB-3161","parks":[{"program":"pota","ref":"GB-6143","prefix":"GB","name":"Filsham Reed Bed Local Nature Reserve","locations":["GB-ENG"],"latitude":50.8596,"longitude":0.52521},{"program":"pota","ref":"GB-3161","prefix":"GB","name":"Combe Valley Countryside Park","locations":["GB-ENG"],"latitude":50.8579,"longitude":0.506717}],"provenance":{"parks.1.ref":"comment-regex"},"precision":{}}
```

## pskreporter

### Field presence (2931 spots)

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
| signal | 99.3% |
| signal.snr | 99.3% |
| source | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.instance | 2.5% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 2931
- **mode**: ft8 2781, ft4 103, varac 23, js8 18, ft2 6
- **modeDetail**: ft8 2781, ft4 103, varac 23, js8 18, ft2 6
- **spotter.kind**: skimmer 2931
- **band**: 20m 861, 40m 663, 15m 526, 17m 333, 30m 291, 10m 130, 12m 70, 80m 26, 160m 21, 2m 4, 60m 1, 3cm 1, 6m 1, 11m 1, 3cm_qo100 1, 13cm 1
- **provenance**: time=decode 2931
- **precision**: none

### Issues

- **info:spotter-shape** 146 (5.0% of spots): `spotter "GI3JMC/UBERSDR" does not look like a callsign`; `spotter "STUEY3D" does not look like a callsign`; `spotter "SNAKESHARMER" does not look like a callsign`
- **warn:callsign-shape** 1 (0.0% of spots): `callsign "19AT208" does not look like a callsign`

### Dropped by receiver (87)

- 87 x receiver did not emit (filtered or quorum)

    {"receiverCallsign":"KR4IXC","receiverLocator":"FM18cr50","senderCallsign":"KC4YDP","senderLocator":"EL98pj55lv","frequency":"3524000","flowStartSeconds":"17919
    {"receiverCallsign":"EI4HQ","receiverLocator":"IO51uu43","senderCallsign":"IT9BCC","senderLocator":"JM67jq","frequency":"28028000","flowStartSeconds":"179196817
    {"receiverCallsign":"EI4HQ","receiverLocator":"IO51uu43","senderCallsign":"9A3A","senderLocator":"JN85ei","frequency":"21014100","flowStartSeconds":"1791968175"
    {"receiverCallsign":"K9AHO","receiverLocator":"EM12TQ","senderCallsign":"K4DND","senderLocator":"FM08TE","flowStartSeconds":"1791968174","mode":"VARAC","senderD
    {"receiverCallsign":"DB0GIE-11","receiverLocator":"jo30fk","senderCallsign":"DL7VKD/P","senderLocator":"JO62sn72co","frequency":"7015000","flowStartSeconds":"17
    {"receiverCallsign":"EI4HQ","receiverLocator":"IO51uu43","senderCallsign":"SV2TTC","senderLocator":"KN10lm","frequency":"21015200","flowStartSeconds":"179196817
    {"receiverCallsign":"EI4HQ","receiverLocator":"IO51uu43","senderCallsign":"DJ1OJ","senderLocator":"JN58se69","frequency":"14030900","flowStartSeconds":"17919681
    {"receiverCallsign":"STUEY3D","receiverLocator":"IO92NH","senderCallsign":"DJ1OJ","senderLocator":"JN58se69","frequency":"14030900","flowStartSeconds":"17919681

### Samples

```json
{"id":"0205f787-eab6-47b2-a2c4-9c3639579813","activity":"on-air","source":"pskreporter","callsign":"OA4ENG","baseCallsign":"OA4ENG","spotter":{"callsign":"KK7YIW","kind":"skimmer","isSelf":false},"time":"2026-10-14T09:00:42Z","receivedAt":"2026-10-14T09:01:28.146Z","frequency":7075868,"band":"40m","modeDetail":"ft8","mode":"ft8","rawText":"DX de KK7YIW: 7075.9 OA4ENG FT8 -9 dB 0900Z","signal":{"snr":-9},"provenance":{"time":"decode"},"precision":{}}
{"id":"a14e01af-e573-4e4d-994c-2beb010c11bf","activity":"on-air","source":"pskreporter","callsign":"FW1P","baseCallsign":"FW1P","spotter":{"callsign":"G4IRN","kind":"skimmer","isSelf":false},"time":"2026-10-14T09:00:30Z","receivedAt":"2026-10-14T09:01:28.146Z","frequency":18100318,"band":"17m","modeDetail":"ft8","mode":"ft8","rawText":"DX de G4IRN: 18100.3 FW1P FT8 -15 dB 0900Z","signal":{"snr":-15},"provenance":{"time":"decode"},"precision":{}}
```

## quadnet

### Field presence (11 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 72.7% |
| dstar | 100.0% |
| dstar.duration | 100.0% |
| dstar.gateway | 100.0% |
| dstar.node | 100.0% |
| dstar.reflector | 63.6% |
| dstar.suffix | 100.0% |
| frequency | 100.0% |
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

- **activity**: on-air 7, monitoring 4
- **mode**: dstar 11
- **modeDetail**: dstar 11
- **spotter.kind**: gateway 11
- **band**: 70cm 11
- **provenance**: frequency=directory 11
- **precision**: none

### Issues

None.

### Samples

```json
{"id":"688748ef-ca24-4bf1-9668-0325f3332971","activity":"on-air","source":"quadnet","callsign":"IZ6HDE","baseCallsign":"IZ6HDE","spotter":{"callsign":"IR6UDC-G","kind":"gateway","isSelf":false},"time":"2026-10-14T09:01:03Z","receivedAt":"2026-10-14T09:01:11.539Z","frequency":430825000,"band":"70cm","modeDetail":"dstar","mode":"dstar","rawText":"09:01 IZ6HDE heard on XLX068-F via IR6UDC-B (5.68s) [quadnet]","dstar":{"node":"IR6UDC-B","gateway":"IR6UDC-G","reflector":"XLX068-F","duration":5.68,"suffix":"E880"},"provenance":{"frequency":"directory"},"precision":{}}
{"id":"5c2ba011-3838-45d8-a1e2-dfc4c7dbbc62","activity":"on-air","source":"quadnet","callsign":"DL5VB","baseCallsign":"DL5VB","spotter":{"callsign":"DL5VB-G","kind":"gateway","isSelf":false},"time":"2026-10-14T09:01:07Z","receivedAt":"2026-10-14T09:01:11.542Z","frequency":438087500,"band":"70cm","modeDetail":"dstar","mode":"dstar","rawText":"09:01 DL5VB heard on DL5VB-B (6.78s) [quadnet]","dstar":{"node":"DL5VB-B","gateway":"DL5VB-G","duration":6.78,"suffix":"IC92"},"provenance":{"frequency":"directory"},"precision":{}}
```

## rbn

### Field presence (1125 spots)

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
| signal.speed | 99.9% |
| signal.speedUnit | 99.9% |
| signal.spotType | 100.0% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.instance | 9.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 1125
- **mode**: cw 1124, mode4 1
- **modeDetail**: cw 1124, mode4 1
- **spotter.kind**: skimmer 1125
- **band**: 20m 507, 40m 388, 30m 117, 17m 57, 15m 33, 10m 7, 80m 7, 160m 4, 12m 3, 60m 2
- **provenance**: none
- **precision**: none

### Issues

- **info:frequency-string** 1125 (100.0% of spots): `frequency arrived as string "7.0113"`; `frequency arrived as string "14.0050"`; `frequency arrived as string "7.0340"`
- **info:spotter-shape** 2 (0.2% of spots): `spotter "JH7CSU1" does not look like a callsign`
- **warn:mode-unmapped** 1 (0.1% of spots): `no family for mode "MODE4"`

### Dropped by receiver (73)

- 73 x parser did not emit

    DX de DL8LAS-1-#:   18110.0  4X6TU   CW    5 dB  22 WPM  NCDXF B      0856Z
    DX de S53A-#:   18110.0  4X6TU   CW    12 dB  20 WPM  NCDXF B      0856Z
    DX de LZ4UX-#:   18110.0  OH2B   CW    11 dB  21 WPM  NCDXF B      0856Z
    DX de LZ4UX-#:   21150.0  4X6TU   CW    14 dB  20 WPM  NCDXF B      0856Z
    DX de MM9PSY-#:   18110.0  OH2B   CW    3 dB  22 WPM  NCDXF B      0856Z
    DX de M9PSY-2-#:   18110.0  OH2B   CW    2 dB  21 WPM  NCDXF B      0856Z
    DX de DC8YZ-#:   21150.0  4X6TU   CW    11 dB  22 WPM  NCDXF B      0856Z
    DX de ON6URE-#:   18110.0  CS3B   CW    4 dB  23 WPM  NCDXF B      0856Z

### Samples

```json
{"id":"c40d8949-a06a-4bb8-a601-a056f210d4a3","activity":"on-air","source":"rbn","sourceId":"2334902034","callsign":"DL1AWI","baseCallsign":"DL1AWI","spotter":{"callsign":"3B8GL","kind":"skimmer","isSelf":false},"time":"2026-10-14T09:02:56Z","receivedAt":"2026-10-14T09:02:57.222Z","frequency":21016200,"band":"15m","modeDetail":"cw","mode":"cw","rawText":"DX de 3B8GL-#:   21016.2  DL1AWI   CW    13 dB  29 WPM  CQ      0902Z","signal":{"snr":13,"speed":29,"speedUnit":"wpm","spotType":"cq"},"provenance":{},"precision":{}}
{"id":"6dac7c11-a990-4197-b28d-ac80dc5ffdfb","activity":"on-air","source":"rbn","sourceId":"2334902035","callsign":"W4SJP","baseCallsign":"W4SJP","spotter":{"callsign":"W1NT","kind":"skimmer","isSelf":false,"instance":"2"},"time":"2026-10-14T09:02:57Z","receivedAt":"2026-10-14T09:02:57.222Z","frequency":3534000,"band":"80m","modeDetail":"cw","mode":"cw","rawText":"DX de W1NT-2-#:   3534.0  W4SJP   CW    13 dB  24 WPM  CQ      0902Z","signal":{"snr":13,"speed":24,"speedUnit":"wpm","spotType":"cq"},"provenance":{},"precision":{}}
```

## sotawatch

### Field presence (4 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| client | 50.0% |
| comment | 75.0% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| signal | 50.0% |
| signal.snr | 50.0% |
| signal.speed | 50.0% |
| signal.speedUnit | 50.0% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| spotter.relay | 50.0% |
| summit | 100.0% |
| summit.activationCount | 100.0% |
| summit.altitude | 100.0% |
| summit.association | 100.0% |
| summit.latitude | 100.0% |
| summit.longitude | 100.0% |
| summit.name | 100.0% |
| summit.points | 100.0% |
| summit.program | 100.0% |
| summit.ref | 100.0% |
| summit.region | 100.0% |
| summit.valid | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 4
- **mode**: cw 4
- **modeDetail**: cw 4
- **spotter.kind**: skimmer 2, human 2
- **spotter.relay**: RBNHOLE 2
- **band**: 40m 2, 30m 2
- **client**: RBNHole 2
- **provenance**: none
- **precision**: none

### Issues

None.

### Samples

```json
{"id":"0724756f-2b90-4773-bf0f-a2fc3ad41b67","activity":"on-air","source":"sotawatch","sourceId":"409705","callsign":"F5HTR/P","baseCallsign":"F5HTR","spotter":{"callsign":"F5HTR","kind":"human","isSelf":true},"time":"2026-10-14T08:58:37Z","receivedAt":"2026-10-14T08:58:57.193Z","frequency":10117000,"band":"30m","modeDetail":"cw","mode":"cw","comment":"Qrv now","rawText":"08:58 F5HTR/P on F/PE-322 (Roc d'Anduze, 230m, 1pt) 10.117 CW: Qrv now","summit":{"program":"sota","ref":"F/PE-322","association":"F","region":"PE","name":"Roc d'Anduze","altitude":230,"points":1,"activationCount":21,"valid":true,"latitude":43.4806,"longitude":3.7308},"provenance":{},"precision":{}}
{"id":"174d5bec-260d-476a-bdde-8ecbdee3fe73","activity":"on-air","source":"sotawatch","sourceId":"409706","client":"RBNHole","callsign":"9A/S53XX/P","baseCallsign":"S53XX","spotter":{"callsign":"DM5GG","kind":"skimmer","isSelf":false,"relay":"RBNHOLE"},"time":"2026-10-14T08:59:04Z","receivedAt":"2026-10-14T08:59:27.039Z","frequency":10120000,"band":"30m","modeDetail":"cw","mode":"cw","comment":"[RBNHole] at DM5GG 23 WPM 19 dB SNR","rawText":"08:59 9A/S53XX/P on 9A/PH-034 (Gorice, 648m, 2pt) 10.12 CW: [RBNHole] at DM5GG 23 WPM 19 dB SNR","summit":{"program":"sota","ref":"9A/PH-034","association":"9A","region":"PH","name":"Gorice","altitude":648,"points":2,"activationCount":12,"valid":true,"latitude":45.07804,"longitude":14.34611},"signal":{"speed":23,"speedUnit":"wpm","snr":19},"provenance":{},"precision":{}}
```

## Cross-source overlap (same base callsign and band within 10 min)

- pota+rbn: 105
- rbn+sotawatch: 53
- cluster+rbn: 34
- cluster+pskreporter: 18
- pota+pskreporter: 9
- cluster+pota: 6
- dstarusers+quadnet: 1
