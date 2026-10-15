# Collector report

Data dir: `/home/user/hamalert-server/tools/collector/data`. Generated 2026-10-14T14:04:41.633Z.

Last run: 2026-10-14T12:03:24.190Z to 2026-10-14T13:57:38.169Z (time limit); HTTP 1805 responses, 1190 errors.

## Overview

| Source | Legacy spots | Converted | Schema errors | Issues (error/warn/info) | Dropped by receiver |
|---|---|---|---|---|---|
| cluster | 551 | 551 | 0 | 0/2/103 | 0 |
| dstarusers | 284 | 284 | 0 | 0/0/478 | 0 |
| pota | 1771 | 1771 | 0 | 0/5/1775 | 0 |
| pskreporter | 33764 | 33764 | 0 | 0/91/1130 | 1011 |
| quadnet | 147 | 147 | 0 | 0/0/148 | 0 |
| rbn | 21232 | 21232 | 0 | 0/9/21309 | 1107 |
| sotawatch | 65 | 65 | 0 | 0/1/0 | 0 |
| wwff | 50 | 50 | 0 | 0/0/0 | 0 |

## cluster

### Field presence (551 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 99.8% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| cluster | 100.0% |
| cluster.commentTruncated | 3.6% |
| cluster.node | 100.0% |
| comment | 80.9% |
| frequency | 100.0% |
| id | 100.0% |
| iota | 0.9% |
| iota.name | 0.9% |
| iota.ref | 0.9% |
| mode | 82.6% |
| modeDetail | 82.6% |
| parks | 10.5% |
| parks[].latitude | 10.5% |
| parks[].locations | 3.4% |
| parks[].longitude | 10.5% |
| parks[].name | 10.5% |
| parks[].prefix | 10.5% |
| parks[].program | 10.5% |
| parks[].ref | 10.5% |
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
| spotter.relay | 13.2% |
| summit | 0.4% |
| summit.activationCount | 0.4% |
| summit.altitude | 0.4% |
| summit.association | 0.4% |
| summit.latitude | 0.4% |
| summit.longitude | 0.4% |
| summit.name | 0.4% |
| summit.points | 0.4% |
| summit.program | 0.4% |
| summit.ref | 0.4% |
| summit.region | 0.4% |
| summit.valid | 0.4% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 551
- **mode**: ssb 187, cw 155, ft8 96, (none) 96, ft2 11, ft4 5, fm 1
- **modeDetail**: ssb 179, cw 155, ft8 96, (none) 96, ft2 11, usb 6, ft4 5, lsb 2, fm 1
- **spotter.kind**: human 551
- **spotter.relay**: web 73
- **band**: 40m 182, 20m 133, 15m 46, 17m 46, 10m 36, 12m 32, 30m 29, 2m 28, 80m 9, 6m 5, 70cm 2, 23cm 2, (none) 1
- **provenance**: mode=bandplan 319, mode=comment 112, parks.N.ref=comment-regex 59, mode=comment-word 24, iota.ref=comment-regex 5, summit.ref=comment-regex 2
- **precision**: none

### Issues

- **info:mode-missing** 96 (17.4% of spots): `no mode and no guess`
- **info:spotter-shape** 5 (0.9% of spots): `spotter "ASIA" does not look like a callsign`; `spotter "OC" does not look like a callsign`; `spotter "SWL" does not look like a callsign`
- **info:ref-unvalidated** 2 (0.4% of spots): `park-like text TS-2000 not in park lists`; `summit-like text DA/HE-249 not in summit list`
- **warn:band-unresolved** 1 (0.2% of spots): `no band for 7000 Hz`
- **warn:callsign-shape** 1 (0.2% of spots): `callsign "8N7I60" does not look like a callsign`

### Samples

```json
{"id":"59e981a2-5f03-4588-871d-71460a359ec3","activity":"on-air","source":"cluster","sourceId":"68537316","callsign":"C5R","baseCallsign":"C5R","spotter":{"callsign":"DG9MEX","kind":"human","isSelf":false},"time":"2026-10-14T13:56:33Z","receivedAt":"2026-10-14T13:56:38.536Z","frequency":24940000,"band":"12m","mode":"ssb","modeDetail":"ssb","comment":"Tnx 58 near Munich","rawText":"DX de DG9MEX:    24940.0  C5R          Tnx 58 near Munich             1356Z","cluster":{"node":"dxsummit"},"provenance":{"mode":"bandplan"},"precision":{}}
{"id":"9dc34dbf-721e-4501-b586-0f53f6b86993","activity":"on-air","source":"cluster","sourceId":"68537317","callsign":"WA3AAN","baseCallsign":"WA3AAN","spotter":{"callsign":"WA3AAN","kind":"human","isSelf":true},"time":"2026-10-14T13:56:37Z","receivedAt":"2026-10-14T13:56:38.536Z","frequency":14025800,"band":"20m","mode":"cw","modeDetail":"cw","rawText":"DX de WA3AAN:    14025.8  WA3AAN                                      1356Z","cluster":{"node":"dxsummit"},"provenance":{"mode":"bandplan"},"precision":{}}
```

## dstarusers

### Field presence (284 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 15.8% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 15.8% |
| dstar | 100.0% |
| dstar.gateway | 100.0% |
| dstar.node | 15.8% |
| dstar.reflector | 84.2% |
| dstar.suffix | 2.1% |
| frequency | 2.5% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| source | 100.0% |
| spotter | 15.8% |
| spotter.callsign | 15.8% |
| spotter.isSelf | 15.8% |
| spotter.kind | 15.8% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 284
- **mode**: dstar 284
- **modeDetail**: dstar 284
- **spotter.kind**: (none) 239, gateway 45
- **band**: (none) 239, 70cm 34, 2m 10, 23cm 1
- **provenance**: band=directory 38, frequency=directory 7
- **precision**: none

### Issues

- **info:spotter-is-reflector** 239 (84.2% of spots): `reflector REF082 reported this itself; spotter omitted`; `reflector REF056 reported this itself; spotter omitted`; `reflector REF003 reported this itself; spotter omitted`
- **info:band-unknown** 239 (84.2% of spots): `D-STAR spot with neither frequency nor band`

### Samples

```json
{"id":"bee75ef3-4874-46bd-b3ed-e761d42f4577","activity":"on-air","source":"dstarusers","callsign":"MW8LJN","baseCallsign":"MW8LJN","time":"2026-10-14T13:55:25Z","receivedAt":"2026-10-14T13:56:38.447Z","modeDetail":"dstar","mode":"dstar","rawText":"13:55 MW8LJN heard on REF001-C [dstarusers]","dstar":{"gateway":"REF001","reflector":"REF001-C"},"provenance":{},"precision":{}}
{"id":"4fa47907-3761-47c7-83fa-9f84af3142db","activity":"on-air","source":"dstarusers","callsign":"KD4MDW","baseCallsign":"KD4MDW","time":"2026-10-14T13:55:55Z","receivedAt":"2026-10-14T13:57:08.242Z","modeDetail":"dstar","mode":"dstar","rawText":"13:55 KD4MDW heard on REF090-B [dstarusers]","dstar":{"gateway":"REF090","reflector":"REF090-B"},"provenance":{},"precision":{}}
```

## pota

### Field presence (1771 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 99.7% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| client | 99.2% |
| comment | 80.9% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 99.8% |
| modeDetail | 99.8% |
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
| signal | 43.4% |
| signal.snr | 43.4% |
| signal.speed | 32.4% |
| signal.speedUnit | 32.4% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| states | 67.1% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 1718, qrt 53
- **mode**: cw 801, ssb 589, ft8 351, ft4 15, fm 12, (none) 3
- **modeDetail**: cw 801, ssb 586, ft8 351, ft4 15, fm 12, (none) 3, lsb 3
- **spotter.kind**: human 997, skimmer 774
- **band**: 40m 813, 20m 745, 30m 96, 15m 43, 17m 39, 2m 7, 70cm 7, 10m 7, (none) 5, 12m 4, 60m 2, 6m 2, 4m 1
- **client**: RBN 774, Web 644, Ham2K Portable Logger 135, GT2 84, POTACAT 47, Ham2K Logger 20, GT 16, Smart Logger 16, hunterlog 10, hamtrax 3, POTAontheGO 2, POTA Hunter Helper 1, Station Master Pro 1, Greyline FT8 1, HAMRS Pro/2.52.1 1, IZ2WYA Telegram Bot 1, Desktop 1
- **provenance**: parks.N.ref=comment-regex 62, activity=comment 53, mode=bandplan 23
- **precision**: none

### Issues

- **info:frequency-string** 1771 (100.0% of spots): `frequency arrived as string "10.1110"`; `frequency arrived as string "14.2650"`; `frequency arrived as string "7.0490"`
- **warn:band-unresolved** 5 (0.3% of spots): `no band for 140615000 Hz`; `no band for 28470000000 Hz`
- **info:mode-missing** 3 (0.2% of spots): `no mode and no guess`
- **info:ref-unvalidated** 1 (0.1% of spots): `park-like text IC-7300 not in park lists`

### Samples

```json
{"id":"4e6c2798-7815-42cd-b922-5555c0f7908b","activity":"on-air","source":"pota","sourceId":"58683645","client":"RBN","callsign":"K2DM","baseCallsign":"K2DM","spotter":{"callsign":"WA7LNW","kind":"skimmer","isSelf":false},"time":"2026-10-14T13:57:29Z","receivedAt":"2026-10-14T13:57:37.886Z","frequency":14074000,"band":"20m","modeDetail":"ft8","mode":"ft8","comment":"RBN -5 dB via WA7LNW-#","rawText":"13:57 K2DM in US-10614 (Roline State Conservation Area) 14.0740 FT8: RBN -5 dB via WA7LNW-#","parks":[{"program":"pota","ref":"US-10614","prefix":"US","name":"Roline State Conservation Area","locations":["US-FL"],"latitude":30.5643,"longitude":-82.7268}],"states":["US_FL"],"signal":{"snr":-5},"provenance":{},"precision":{}}
{"id":"65b6d261-d5d2-4016-8679-1941b25be578","activity":"on-air","source":"pota","sourceId":"58683588","client":"Web","callsign":"VA3HYK","baseCallsign":"VA3HYK","spotter":{"callsign":"VE3HYK","kind":"human","isSelf":false},"time":"2026-10-14T13:56:31Z","receivedAt":"2026-10-14T13:57:37.886Z","frequency":7210000,"band":"40m","mode":"ssb","modeDetail":"ssb","comment":"yl","rawText":"13:56 VA3HYK in CA-1621 (Shirleys Bay Conservation Reserve) 7.2100: yl","parks":[{"program":"pota","ref":"CA-1621","prefix":"CA","name":"Shirleys Bay Conservation Reserve","locations":["CA-ON"],"latitude":45.3924,"longitude":-75.9318}],"states":["CA_ON"],"provenance":{"mode":"bandplan"},"precision":{}}
```

## pskreporter

### Field presence (33764 spots)

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
| signal | 99.2% |
| signal.snr | 99.2% |
| source | 100.0% |
| spotter | 99.8% |
| spotter.callsign | 99.8% |
| spotter.instance | 2.1% |
| spotter.isSelf | 99.8% |
| spotter.kind | 99.8% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 33764
- **mode**: ft8 32640, ft4 813, varac 125, ft2 83, js8 82, rtty 16, msk 3, safecom 1, freedv 1
- **modeDetail**: ft8 32640, ft4 813, varac 125, ft2 83, js8 82, jtty 16, msk144 3, safecom 1, freedv 1
- **spotter.kind**: skimmer 33713, (none) 51
- **band**: 20m 8748, 15m 7683, 40m 6763, 17m 4307, 10m 2792, 30m 1527, 12m 1261, 80m 456, 2m 77, 60m 43, 11m 32, 13cm 30, 160m 19, 6m 13, 3cm 10, 3cm_qo100 2, 70cm 1
- **provenance**: time=decode 33764
- **precision**: none

### Issues

- **info:spotter-shape** 1130 (3.3% of spots): `spotter "K1RA-PI" does not look like a callsign`; `spotter "30HS200" does not look like a callsign`; `spotter "DPH207" does not look like a callsign`
- **warn:spotter-missing** 51 (0.2% of spots): `no spotter`
- **warn:callsign-shape** 39 (0.1% of spots): `callsign "1AT1566" does not look like a callsign`; `callsign "RR73" does not look like a callsign`; `callsign "HB9AK-6" does not look like a callsign`
- **warn:mode-unmapped** 1 (0.0% of spots): `no family for mode "SAFECOM"`

### Dropped by receiver (1011)

- 1011 x receiver did not emit (filtered or quorum)

    {"receiverCallsign":"K3GMQ","receiverLocator":"FN20LH","senderCallsign":"WE6M","senderLocator":"CM87un26tq","frequency":"7012000","flowStartSeconds":"1791979408
    {"receiverCallsign":"AK6RI-1","receiverLocator":"CM87xi","senderCallsign":"K4WJ","senderLocator":"EL89np","frequency":"7020300","flowStartSeconds":"1791979404",
    {"receiverCallsign":"KG6NFJ","receiverLocator":"EM79WP","senderCallsign":"K4WJ","senderLocator":"EL89np","frequency":"7020300","flowStartSeconds":"1791979404","
    {"receiverCallsign":"M9PSY-2","receiverLocator":"IO86ha","senderCallsign":"WX1S","senderLocator":"FN43KH","frequency":"14061996","flowStartSeconds":"1791979403"
    {"receiverCallsign":"K1RA-4","receiverLocator":"FM18cr","senderCallsign":"K4WJ","senderLocator":"EL89np","frequency":"7020331","flowStartSeconds":"1791979403","
    {"receiverCallsign":"K3GMQ","receiverLocator":"FN20LH","senderCallsign":"OM5DX","senderLocator":"JN98hf12rs","frequency":"21014600","flowStartSeconds":"17919793
    {"receiverCallsign":"STUEY3D","receiverLocator":"IO92NH","senderCallsign":"UA2FR","senderLocator":"KO04fw06cl","frequency":"14026000","flowStartSeconds":"179197
    {"receiverCallsign":"F5OVQ","receiverLocator":"IN98we63","senderCallsign":"RZ0SW","senderLocator":"OO13MD","flowStartSeconds":"1791979395","mode":"FT8","senderD

### Samples

```json
{"id":"f0608746-da01-4c0c-84d5-2e65cecb44b9","activity":"on-air","source":"pskreporter","callsign":"ZL2NU","baseCallsign":"ZL2NU","spotter":{"callsign":"K5EM","kind":"skimmer","isSelf":false},"time":"2026-10-14T13:53:00Z","receivedAt":"2026-10-14T13:53:43.598Z","frequency":10136713,"band":"30m","modeDetail":"ft8","mode":"ft8","rawText":"DX de K5EM: 10136.7 ZL2NU FT8 -15 dB 1353Z","signal":{"snr":-15},"provenance":{"time":"decode"},"precision":{}}
{"id":"2606bb58-d048-4546-88ca-8c07cf22122b","activity":"on-air","source":"pskreporter","callsign":"SV9COL","baseCallsign":"SV9COL","spotter":{"callsign":"LB9KJ","kind":"skimmer","isSelf":false,"instance":"1"},"time":"2026-10-14T13:53:00Z","receivedAt":"2026-10-14T13:53:43.598Z","frequency":28074969,"band":"10m","modeDetail":"ft8","mode":"ft8","rawText":"DX de LB9KJ-1: 28075.0 SV9COL FT8 -16 dB 1353Z","signal":{"snr":-16},"provenance":{"time":"decode"},"precision":{}}
```

## quadnet

### Field presence (147 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 74.8% |
| dstar | 100.0% |
| dstar.duration | 100.0% |
| dstar.gateway | 100.0% |
| dstar.node | 100.0% |
| dstar.reflector | 70.1% |
| dstar.suffix | 92.5% |
| frequency | 99.3% |
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

- **activity**: monitoring 75, on-air 72
- **mode**: dstar 147
- **modeDetail**: dstar 147
- **spotter.kind**: gateway 147
- **band**: 70cm 123, 2m 24
- **provenance**: frequency=directory 146, band=module-letter 1
- **precision**: none

### Issues

- **info:spotter-shape** 147 (100.0% of spots): `spotter "K4PGM-G" does not look like a callsign`; `spotter "N8MFN-G" does not look like a callsign`; `spotter "W2ECR-G" does not look like a callsign`
- **info:ref-unvalidated** 1 (0.7% of spots): `park-like text IC-7100 not in park lists`

### Samples

```json
{"id":"75741b86-f43a-408f-bb01-163bc1a7191c","activity":"monitoring","source":"quadnet","callsign":"E26CHX","baseCallsign":"E26CHX","spotter":{"callsign":"E26CHX-G","kind":"gateway","isSelf":false},"time":"2026-10-14T13:56:44Z","receivedAt":"2026-10-14T13:56:53.107Z","frequency":145550000,"band":"2m","modeDetail":"dstar","mode":"dstar","comment":"AR Chonburi@ID51","rawText":"13:56 E26CHX linked E26CHX-C to XLX138-X: AR Chonburi@ID51 [quadnet]","dstar":{"node":"E26CHX-C","gateway":"E26CHX-G","reflector":"XLX138-X","duration":0.26,"suffix":"ID51"},"provenance":{"frequency":"directory"},"precision":{}}
{"id":"f622cf30-11ff-4fe6-8de0-364bf76d46e8","activity":"on-air","source":"quadnet","callsign":"SA7BKX","baseCallsign":"SA7BKX","spotter":{"callsign":"SA7BKX-G","kind":"gateway","isSelf":false},"time":"2026-10-14T13:56:52Z","receivedAt":"2026-10-14T13:56:53.107Z","frequency":433775000,"band":"70cm","modeDetail":"dstar","mode":"dstar","comment":"www.SK7DS.se","rawText":"13:56 SA7BKX heard on SA7BKX-B (4.2s): www.SK7DS.se [quadnet]","dstar":{"node":"SA7BKX-B","gateway":"SA7BKX-G","duration":4.2,"suffix":"5200"},"provenance":{"frequency":"directory"},"precision":{}}
```

## rbn

### Field presence (21232 spots)

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
| signal.speed | 99.8% |
| signal.speedUnit | 99.8% |
| signal.spotType | 100.0% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.instance | 13.3% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 21232
- **mode**: cw 21199, rtty 16, psk 8, mode6 7, mode4 2
- **modeDetail**: cw 21199, rtty 16, psk31 8, mode6 7, mode4 2
- **spotter.kind**: skimmer 21232
- **band**: 20m 8748, 40m 6758, 15m 2955, 17m 952, 30m 896, 80m 389, 10m 273, 12m 224, 160m 21, 60m 8, 2m 6, 6m 2
- **provenance**: none
- **precision**: none

### Issues

- **info:frequency-string** 21232 (100.0% of spots): `frequency arrived as string "14.0055"`; `frequency arrived as string "7.0120"`; `frequency arrived as string "14.0350"`
- **info:spotter-shape** 77 (0.4% of spots): `spotter "JH7CSU1" does not look like a callsign`
- **warn:mode-unmapped** 9 (0.0% of spots): `no family for mode "MODE4"`; `no family for mode "MODE6"`

### Dropped by receiver (1107)

- 1107 x parser did not emit

    DX de OE3KLU-#:   28188.0  OE3XAC   CW    6 dB  10 WPM  BEACON      1203Z
    DX de DR4W-#:   10129.4  IZ3DVW/B   CW    19 dB  15 WPM  BEACON      1203Z
    DX de EI4HQ-#:   28218.5  5B4CY/B   CW    7 dB  11 WPM  BEACON      1203Z
    DX de AK6RI-1-#:   18110.0  W6WX   CW    12 dB  22 WPM  NCDXF B      1203Z
    DX de K3GMQ-#:   24930.0  4U1UN   CW    8 dB  22 WPM  NCDXF B      1203Z
    DX de K1RA-4-#:   14100.0  VK6RBP   CW    13 dB  19 WPM  NCDXF B      1204Z
    DX de OE3KLU-#:   28170.4  ZB2TEN/B   CW    14 dB  16 WPM  BEACON      1204Z
    DX de ES2RR-#:   18110.1  RR9O   CW    11 dB  20 WPM  NCDXF B      1204Z

### Samples

```json
{"id":"c9734bcf-7293-4c72-8f9f-185663488d3e","activity":"on-air","source":"rbn","sourceId":"2335009679","callsign":"IK4VFD","baseCallsign":"IK4VFD","spotter":{"callsign":"KW7MM","kind":"skimmer","isSelf":false},"time":"2026-10-14T13:57:08Z","receivedAt":"2026-10-14T13:57:08.476Z","frequency":21023000,"band":"15m","modeDetail":"cw","mode":"cw","rawText":"DX de KW7MM-#:   21023.0  IK4VFD   CW    24 dB  26 WPM  CQ      1357Z","signal":{"snr":24,"speed":26,"speedUnit":"wpm","spotType":"cq"},"provenance":{},"precision":{}}
{"id":"9ed110f6-bb2d-4d33-b765-11045f2b1727","activity":"on-air","source":"rbn","sourceId":"2335009680","callsign":"F6HKA","baseCallsign":"F6HKA","spotter":{"callsign":"SP5GQ","kind":"skimmer","isSelf":false},"time":"2026-10-14T13:57:08Z","receivedAt":"2026-10-14T13:57:08.476Z","frequency":21026000,"band":"15m","modeDetail":"cw","mode":"cw","rawText":"DX de SP5GQ-#:   21026.0  F6HKA   CW    23 dB  34 WPM  CQ      1357Z","signal":{"snr":23,"speed":34,"speedUnit":"wpm","spotType":"cq"},"provenance":{},"precision":{}}
```

## sotawatch

### Field presence (65 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 98.5% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| client | 53.8% |
| comment | 78.5% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| parks | 12.3% |
| parks[].latitude | 12.3% |
| parks[].locations | 12.3% |
| parks[].longitude | 12.3% |
| parks[].name | 12.3% |
| parks[].prefix | 12.3% |
| parks[].program | 12.3% |
| parks[].ref | 12.3% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| signal | 27.7% |
| signal.snr | 27.7% |
| signal.speed | 27.7% |
| signal.speedUnit | 27.7% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| spotter.relay | 27.7% |
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

- **activity**: on-air 65
- **mode**: cw 33, ssb 27, fm 5
- **modeDetail**: cw 33, ssb 27, fm 5
- **spotter.kind**: human 47, skimmer 18
- **spotter.relay**: RBNHOLE 18
- **band**: 20m 23, 2m 12, 40m 9, 30m 8, 10m 4, 17m 3, 15m 3, 12m 2, (none) 1
- **client**: RBNHole 18, sotl.as 9, SOTA Activator 4, H2K 4
- **provenance**: parks.N.ref=comment-regex 8
- **precision**: none

### Issues

- **warn:band-unresolved** 1 (1.5% of spots): `no band for 21669000 Hz`

### Samples

```json
{"id":"c959209a-1f32-43cb-a0bb-d18d063caf63","activity":"on-air","source":"sotawatch","sourceId":"409918","client":"RBNHole","callsign":"SQ9JS/P","baseCallsign":"SQ9JS","spotter":{"callsign":"ES2RR","kind":"skimmer","isSelf":false,"relay":"RBNHOLE"},"time":"2026-10-14T13:52:02Z","receivedAt":"2026-10-14T13:52:08.385Z","frequency":14062000,"band":"20m","modeDetail":"cw","mode":"cw","comment":"[RBNHole] at ES2RR 24 WPM 24 dB SNR","rawText":"13:52 SQ9JS/P on SP/BZ-078 (Jaroszowska Góra (Jaroszowicka Góra), 544m, 1pt) 14.062 CW: [RBNHole] at ES2RR 24 WPM 24 dB SNR","summit":{"program":"sota","ref":"SP/BZ-078","association":"SP","region":"BZ","name":"Jaroszowska Góra (Jaroszowicka Góra)","altitude":544,"points":1,"activationCount":69,"valid":true,"latitude":49.8465,"longitude":19.5374},"signal":{"speed":24,"speedUnit":"wpm","snr":24},"provenance":{},"precision":{}}
{"id":"0c506af4-220d-4df0-8f77-c6934dbb2d5c","activity":"on-air","source":"sotawatch","sourceId":"409920","client":"RBNHole","callsign":"DL1GKC/P","baseCallsign":"DL1GKC","spotter":{"callsign":"DK9IP","kind":"skimmer","isSelf":false,"relay":"RBNHOLE"},"time":"2026-10-14T13:54:02Z","receivedAt":"2026-10-14T13:54:08.532Z","frequency":14061000,"band":"20m","modeDetail":"cw","mode":"cw","comment":"[RBNHole] at DK9IP 23 WPM 4 dB SNR","rawText":"13:54 DL1GKC/P on DM/RP-287 (Weinbiet, 554m, 4pt) 14.061 CW: [RBNHole] at DK9IP 23 WPM 4 dB SNR","summit":{"program":"sota","ref":"DM/RP-287","association":"DM","region":"RP","name":"Weinbiet","altitude":554,"points":4,"activationCount":33,"valid":true,"latitude":49.3758,"longitude":8.1214},"signal":{"speed":23,"speedUnit":"wpm","snr":4},"provenance":{},"precision":{}}
```

## wwff

### Field presence (50 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 58.0% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| parks | 100.0% |
| parks[].latitude | 100.0% |
| parks[].longitude | 100.0% |
| parks[].name | 100.0% |
| parks[].prefix | 100.0% |
| parks[].program | 100.0% |
| parks[].ref | 100.0% |
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
| time | 100.0% |

### Vocabularies

- **activity**: on-air 50
- **mode**: cw 24, ssb 21, ft8 5
- **modeDetail**: cw 24, ssb 21, ft8 5
- **spotter.kind**: human 35, skimmer 15
- **band**: 40m 28, 20m 15, 30m 5, 17m 1, 10m 1
- **provenance**: none
- **precision**: none

### Issues

None.

### Samples

```json
{"id":"900429a8-50b7-456b-b515-29abd39875c9","activity":"on-air","source":"wwff","sourceId":"156934","callsign":"WA1VEI","baseCallsign":"WA1VEI","spotter":{"callsign":"WA1VEI","kind":"human","isSelf":true},"time":"2026-10-14T13:55:07Z","receivedAt":"2026-10-14T13:55:08.464Z","frequency":28029000,"band":"10m","modeDetail":"cw","mode":"cw","rawText":"DX de WA1VEI: 28.029 WA1VEI KFF-1573 CW  1355Z","parks":[{"program":"wwff","ref":"KFF-1573","prefix":"KFF","name":"Gambrill","latitude":39.4647,"longitude":-77.49558}],"provenance":{},"precision":{}}
{"id":"4bfd9b85-d5e1-42d5-b756-d944213425c0","activity":"on-air","source":"wwff","sourceId":"156935","callsign":"PA/DM7KN/P","baseCallsign":"DM7KN","spotter":{"callsign":"PA/DM7KN/P","kind":"human","isSelf":true},"time":"2026-10-14T13:56:16Z","receivedAt":"2026-10-14T13:56:38.396Z","frequency":7117000,"band":"40m","modeDetail":"ssb","mode":"ssb","rawText":"DX de PA/DM7KN/P: 7.117 PA/DM7KN/P PAFF-0015 SSB  1356Z","parks":[{"program":"wwff","ref":"PAFF-0015","prefix":"PAFF","name":"Oosterschelde","latitude":51.66472,"longitude":4.4151}],"provenance":{},"precision":{}}
```

## Cross-source overlap (same base callsign and band within 10 min)

- pota+rbn: 9212
- cluster+rbn: 2788
- pota+pskreporter: 799
- pskreporter+rbn: 730
- rbn+sotawatch: 319
- cluster+pskreporter: 318
- cluster+pota: 286
- rbn+wwff: 208
- pota+wwff: 178
- cluster+wwff: 51
- pota+sotawatch: 47
- cluster+sotawatch: 10
- pskreporter+wwff: 7
- dstarusers+quadnet: 1
