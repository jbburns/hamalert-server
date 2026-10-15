# Collector report

Data dir: `/home/user/hamalert-server/tools/collector/data`. Generated 2026-10-14T16:08:14.639Z.

Last run: 2026-10-14T14:08:51.093Z to 2026-10-14T16:03:00.064Z (time limit); HTTP 1797 responses, 2 errors.

## Overview

| Source | Legacy spots | Converted | Schema errors | Issues (error/warn/info) | Dropped by receiver |
|---|---|---|---|---|---|
| cluster | 879 | 879 | 0 | 1/42/146 | 1 |
| dstarusers | 260 | 260 | 0 | 0/0/398 | 0 |
| pota | 2314 | 2314 | 0 | 0/2/2323 | 0 |
| pskreporter | 33930 | 33930 | 0 | 0/47/1157 | 834 |
| quadnet | 204 | 204 | 0 | 0/0/206 | 0 |
| rbn | 20988 | 20988 | 0 | 0/7/20996 | 1706 |
| sotawatch | 45 | 45 | 0 | 0/0/0 | 0 |
| wwff | 52 | 52 | 0 | 0/0/0 | 0 |

## cluster

### Field presence (879 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 99.8% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| cluster | 100.0% |
| cluster.commentTruncated | 3.8% |
| cluster.node | 100.0% |
| comment | 81.8% |
| frequency | 99.9% |
| id | 100.0% |
| iota | 0.9% |
| iota.name | 0.9% |
| iota.ref | 0.9% |
| mode | 85.1% |
| modeDetail | 85.1% |
| parks | 6.8% |
| parks[].latitude | 6.8% |
| parks[].locations | 2.0% |
| parks[].longitude | 6.8% |
| parks[].name | 6.8% |
| parks[].prefix | 6.8% |
| parks[].program | 6.8% |
| parks[].ref | 6.8% |
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
| spotter.relay | 14.9% |
| summit | 0.1% |
| summit.activationCount | 0.1% |
| summit.altitude | 0.1% |
| summit.association | 0.1% |
| summit.latitude | 0.1% |
| summit.longitude | 0.1% |
| summit.name | 0.1% |
| summit.points | 0.1% |
| summit.program | 0.1% |
| summit.ref | 0.1% |
| summit.region | 0.1% |
| summit.valid | 0.1% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 878, qrt 1
- **mode**: ssb 387, ft8 234, (none) 131, cw 113, ft2 8, varac 2, ft4 2, rtty 1, fm 1
- **modeDetail**: ssb 352, ft8 234, (none) 131, cw 113, usb 25, lsb 10, ft2 8, varac 2, ft4 2, rtty 1, fm 1
- **spotter.kind**: human 879
- **spotter.relay**: web 131
- **band**: 10m 241, 40m 166, 20m 159, 12m 87, 2m 75, 15m 72, 17m 36, 80m 16, 30m 12, 60m 8, (none) 2, 70cm 2, 6m 1, 160m 1, 3cm_qo100 1
- **provenance**: mode=bandplan 447, mode=comment 247, parks.N.ref=comment-regex 61, mode=comment-word 54, iota.ref=comment-regex 8, summit.ref=comment-regex 1, activity=comment 1
- **precision**: none

### Issues

- **info:mode-missing** 131 (14.9% of spots): `no mode and no guess`
- **warn:callsign-shape** 41 (4.7% of spots): `callsign "3AT110" does not look like a callsign`; `callsign "69PA105" does not look like a callsign`; `callsign "3LE002" does not look like a callsign`
- **info:spotter-shape** 8 (0.9% of spots): `spotter "DXALL" does not look like a callsign`; `spotter "SWL" does not look like a callsign`; `spotter "EARS1-" does not look like a callsign`
- **info:ref-unvalidated** 7 (0.8% of spots): `summit-like text DA/SX-523 not in summit list`; `park-like text ON-0675 not in park lists`; `park-like text OK-5032 not in park lists`
- **error:frequency-missing** 1 (0.1% of spots): `frequency "0"`
- **warn:band-unresolved** 1 (0.1% of spots): `no band for 489900000 Hz`

### Dropped by receiver (1)

- 1 x parser did not emit

    DX de F6DRO:    432480.0  HB9G/B       JN03<TR>JN45 319 qsb norm nil  1424Z

### Samples

```json
{"id":"45b456d2-416e-40ef-a7f2-fe5dad76adca","activity":"on-air","source":"cluster","sourceId":"68538265","callsign":"EA2DGT","baseCallsign":"EA2DGT","spotter":{"callsign":"EC5BUH","kind":"human","isSelf":false},"time":"2026-10-14T16:01:42Z","receivedAt":"2026-10-14T16:02:01.603Z","frequency":7160000,"band":"40m","mode":"ssb","modeDetail":"ssb","comment":"Diploma botones Sacarino via q","rawText":"DX de EC5BUH:     7160.0  EA2DGT       Diploma botones Sacarino via q 1601Z","cluster":{"commentTruncated":true,"node":"dxsummit"},"provenance":{"mode":"bandplan"},"precision":{}}
{"id":"3b718639-bab9-4adc-b088-e1c897150198","activity":"on-air","source":"cluster","sourceId":"68538266","callsign":"VP2MAW","baseCallsign":"VP2MAW","spotter":{"callsign":"SP2EBG","kind":"human","isSelf":false,"relay":"web"},"time":"2026-10-14T16:01:44Z","receivedAt":"2026-10-14T16:02:01.603Z","frequency":18085000,"band":"17m","mode":"cw","modeDetail":"cw","comment":"Up 1.5","rawText":"DX de SP2EBG-@:  18085.0  VP2MAW       Up 1.5                         1601Z","cluster":{"node":"dxsummit"},"provenance":{"mode":"bandplan"},"precision":{}}
```

## dstarusers

### Field presence (260 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 23.5% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 23.5% |
| dstar | 100.0% |
| dstar.gateway | 100.0% |
| dstar.node | 23.5% |
| dstar.reflector | 76.5% |
| dstar.suffix | 5.0% |
| frequency | 1.5% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| source | 100.0% |
| spotter | 23.5% |
| spotter.callsign | 23.5% |
| spotter.isSelf | 23.5% |
| spotter.kind | 23.5% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 260
- **mode**: dstar 260
- **modeDetail**: dstar 260
- **spotter.kind**: (none) 199, gateway 61
- **band**: (none) 199, 70cm 38, 2m 22, 23cm 1
- **provenance**: band=directory 57, frequency=directory 4
- **precision**: none

### Issues

- **info:spotter-is-reflector** 199 (76.5% of spots): `reflector REF037 reported this itself; spotter omitted`; `reflector REF030 reported this itself; spotter omitted`; `reflector REF012 reported this itself; spotter omitted`
- **info:band-unknown** 199 (76.5% of spots): `D-STAR spot with neither frequency nor band`

### Samples

```json
{"id":"dbf8ee74-0697-4ea3-ad14-1640dae7c9f4","activity":"on-air","source":"dstarusers","callsign":"KC2RXV","baseCallsign":"KC2RXV","time":"2026-10-14T16:01:20Z","receivedAt":"2026-10-14T16:02:31.916Z","modeDetail":"dstar","mode":"dstar","rawText":"16:01 KC2RXV heard on REF030-C [dstarusers]","dstar":{"gateway":"REF030","reflector":"REF030-C"},"provenance":{},"precision":{}}
{"id":"160ff53e-c6ae-4917-84a3-25e3811eff9d","activity":"on-air","source":"dstarusers","callsign":"WB9AZH","baseCallsign":"WB9AZH","spotter":{"callsign":"W9FRG","kind":"gateway","isSelf":false},"time":"2026-10-14T16:02:26Z","receivedAt":"2026-10-14T16:02:31.916Z","band":"2m","modeDetail":"dstar","mode":"dstar","comment":"Cedarburg, WI, USA","rawText":"16:02 WB9AZH heard on W9FRG-C: Cedarburg, WI, USA [dstarusers]","dstar":{"node":"W9FRG-C","gateway":"W9FRG"},"provenance":{"band":"directory"},"precision":{}}
```

## pota

### Field presence (2314 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 99.9% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| client | 99.9% |
| comment | 78.2% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 99.7% |
| modeDetail | 99.7% |
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
| signal | 42.5% |
| signal.snr | 42.5% |
| signal.speed | 27.4% |
| signal.speedUnit | 27.4% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| states | 77.7% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 2231, qrt 83
- **mode**: cw 896, ssb 772, ft8 550, ft4 88, (none) 8
- **modeDetail**: cw 896, ssb 763, ft8 550, ft4 88, usb 9, (none) 8
- **spotter.kind**: human 1323, skimmer 991
- **band**: 20m 1494, 40m 318, 15m 163, 17m 145, 30m 80, 12m 54, 10m 39, 4m 10, 6m 6, 80m 3, (none) 2
- **client**: RBN 991, Web 878, GT2 161, Ham2K Portable Logger 135, POTACAT 59, GT 35, Ham2K Logger 15, Smart Logger 8, parkwatch 7, HAMRS Pro/2.52.1 5, RigBook 4, HAMRS Pro/2.52.0 3, Greyline FT8 2, Offline Spotter for iOS (W1ADV) 1, hunterlog 1, HAMRS Pro/2.50.0 1, POTA New Park Alert Monitor 1, IZ2WYA Telegram Bot 1, APSPOT-APRS 1, Desktop 1, hamtrax 1, HAMRS Pro/2.49.0 1
- **provenance**: activity=comment 83, parks.N.ref=comment-regex 57, mode=bandplan 39
- **precision**: none

### Issues

- **info:frequency-string** 2314 (100.0% of spots): `frequency arrived as string "21.0740"`; `frequency arrived as string "14.0540"`; `frequency arrived as string "7.2790"`
- **info:mode-missing** 8 (0.3% of spots): `no mode and no guess`
- **warn:band-unresolved** 2 (0.1% of spots): `no band for 143200000 Hz`; `no band for 1401859000 Hz`
- **info:ref-unvalidated** 1 (0.0% of spots): `park-like text IC-7300 not in park lists`

### Samples

```json
{"id":"2d40f440-848f-4f5b-a6ea-19164f76d5a7","activity":"on-air","source":"pota","sourceId":"58692209","client":"Ham2K Portable Logger","callsign":"OE1KEB/P","baseCallsign":"OE1KEB","spotter":{"callsign":"OE1KEB/P","kind":"human","isSelf":true},"time":"2026-10-14T16:01:18Z","receivedAt":"2026-10-14T16:02:01.212Z","frequency":18153000,"band":"17m","modeDetail":"ssb","mode":"ssb","rawText":"16:01 OE1KEB/P in AT-0105 (Guntschacher Au National Reserve) 18.1530 SSB","parks":[{"program":"pota","ref":"AT-0105","prefix":"AT","name":"Guntschacher Au National Reserve","locations":["AT-KA"],"latitude":46.5474,"longitude":14.3436}],"provenance":{},"precision":{}}
{"id":"f471b626-62ac-442c-a548-08d963694e79","activity":"on-air","source":"pota","sourceId":"58692211","client":"Web","callsign":"PA1BRI","baseCallsign":"PA1BRI","spotter":{"callsign":"PA1BRI","kind":"human","isSelf":true},"time":"2026-10-14T16:01:20Z","receivedAt":"2026-10-14T16:02:01.212Z","frequency":14276000,"band":"20m","modeDetail":"ssb","mode":"ssb","comment":"cq pota","rawText":"16:01 PA1BRI in NL-0150 (Lage Bergse Bos Provincial Park) 14.2760 SSB: cq pota","parks":[{"program":"pota","ref":"NL-0150","prefix":"NL","name":"Lage Bergse Bos Provincial Park","locations":["NL-ZH"],"latitude":51.9701,"longitude":4.51355}],"provenance":{},"precision":{}}
```

## pskreporter

### Field presence (33930 spots)

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
| spotter.instance | 1.3% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 33930
- **mode**: ft8 32744, ft4 928, varac 150, ft2 51, js8 46, rtty 8, psk 2, ros 1
- **modeDetail**: ft8 32744, ft4 928, varac 150, ft2 51, js8 46, jtty 5, rtty 3, psk31 2, ros 1
- **spotter.kind**: skimmer 33925, (none) 5
- **band**: 20m 10571, 10m 6259, 15m 6160, 17m 3774, 40m 2823, 12m 2019, 30m 1923, 80m 126, 60m 89, 2m 60, 13cm 44, 11m 41, 3cm 23, 160m 12, 70cm 3, 6m 2, 33cm 1
- **provenance**: time=decode 33930
- **precision**: none

### Issues

- **info:spotter-shape** 1157 (3.4% of spots): `spotter "ON6URE-TEL" does not look like a callsign`; `spotter "DPH207" does not look like a callsign`; `spotter "DIG647" does not look like a callsign`
- **warn:callsign-shape** 42 (0.1% of spots): `callsign "14CMB41" does not look like a callsign`; `callsign "12CV49" does not look like a callsign`; `callsign "1SF072" does not look like a callsign`
- **warn:spotter-missing** 5 (0.0% of spots): `no spotter`

### Dropped by receiver (834)

- 834 x receiver did not emit (filtered or quorum)

    {"receiverCallsign":"M9PSY-2","receiverLocator":"IO86ha","senderCallsign":"OE5BAY","senderLocator":"JN77GV","frequency":"18069992","flowStartSeconds":"179198693
    {"receiverCallsign":"PD2RPS","receiverLocator":"JO22vw59","senderCallsign":"LZ1WX","senderLocator":"KN22jp","frequency":"14011800","flowStartSeconds":"179198692
    {"receiverCallsign":"DL0AO","receiverLocator":"JN59vk","senderCallsign":"LZ1WX","senderLocator":"KN22jp","frequency":"14011800","flowStartSeconds":"1791986928",
    {"receiverCallsign":"OE8TED","receiverLocator":"JN76AO","senderCallsign":"UA3IKI","senderLocator":"KO76DG","frequency":"21013500","flowStartSeconds":"1791986928
    {"receiverCallsign":"OE8TED","receiverLocator":"JN76AO","senderCallsign":"SQ9JS/P","senderLocator":"JO90ke","frequency":"7032000","flowStartSeconds":"1791986927
    {"receiverCallsign":"K3GMQ","receiverLocator":"FN20LH","senderCallsign":"CS3B","senderLocator":"IM12jt","frequency":"21150000","flowStartSeconds":"1791986925","
    {"receiverCallsign":"M9PSY-2","receiverLocator":"IO86ha","senderCallsign":"LZ7DL","senderLocator":"KN32rm","frequency":"21020071","flowStartSeconds":"1791986922
    {"receiverCallsign":"M9PSY","receiverLocator":"IO86ha","senderCallsign":"LZ7DL","senderLocator":"KN32rm","frequency":"21020100","flowStartSeconds":"1791986922",

### Samples

```json
{"id":"40cb658a-4d6a-4d88-a36d-81da0d4cb8bb","activity":"on-air","source":"pskreporter","callsign":"SU3YM","baseCallsign":"SU3YM","spotter":{"callsign":"F5VBD","kind":"skimmer","isSelf":false},"time":"2026-10-14T15:58:15Z","receivedAt":"2026-10-14T15:59:10.062Z","frequency":24916730,"band":"12m","modeDetail":"ft8","mode":"ft8","rawText":"DX de F5VBD: 24916.7 SU3YM FT8 -20 dB 1558Z","signal":{"snr":-20},"provenance":{"time":"decode"},"precision":{}}
{"id":"2d79e99b-dc32-4238-8d00-bf8bdf6d8699","activity":"on-air","source":"pskreporter","callsign":"HI3RRR","baseCallsign":"HI3RRR","spotter":{"callsign":"W4NXC","kind":"skimmer","isSelf":false},"time":"2026-10-14T15:58:15Z","receivedAt":"2026-10-14T15:59:10.062Z","frequency":14075385,"band":"20m","modeDetail":"ft8","mode":"ft8","rawText":"DX de W4NXC: 14075.4 HI3RRR FT8 -7 dB 1558Z","signal":{"snr":-7},"provenance":{"time":"decode"},"precision":{}}
```

## quadnet

### Field presence (204 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 84.3% |
| dstar | 100.0% |
| dstar.duration | 100.0% |
| dstar.gateway | 100.0% |
| dstar.node | 100.0% |
| dstar.reflector | 71.6% |
| dstar.suffix | 91.7% |
| frequency | 98.5% |
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

- **activity**: on-air 115, monitoring 89
- **mode**: dstar 204
- **modeDetail**: dstar 204
- **spotter.kind**: gateway 204
- **band**: 70cm 167, 2m 37
- **provenance**: frequency=directory 201, band=module-letter 3
- **precision**: none

### Issues

- **info:spotter-shape** 204 (100.0% of spots): `spotter "E25UHK-G" does not look like a callsign`; `spotter "SP1OP-G" does not look like a callsign`; `spotter "TA1SA-G" does not look like a callsign`
- **info:ref-unvalidated** 1 (0.5% of spots): `summit-like text IVAN/IC-880 not in summit list`
- **info:dstar-place-unnormalized** 1 (0.5% of spots): `reflector "IR0CD C" normalized to "IR0CD-C"`

### Samples

```json
{"id":"cf2f2b1f-f2a4-45bc-b4b1-79e9b0b2d93c","activity":"monitoring","source":"quadnet","callsign":"E26CHX","baseCallsign":"E26CHX","spotter":{"callsign":"E26CHX-G","kind":"gateway","isSelf":false},"time":"2026-10-14T16:01:25Z","receivedAt":"2026-10-14T16:01:33.661Z","frequency":145550000,"band":"2m","modeDetail":"dstar","mode":"dstar","comment":"AR Chonburi@ID51","rawText":"16:01 E26CHX linked E26CHX-C to XLX138-X: AR Chonburi@ID51 [quadnet]","dstar":{"node":"E26CHX-C","gateway":"E26CHX-G","reflector":"XLX138-X","duration":0.26,"suffix":"ID51"},"provenance":{"frequency":"directory"},"precision":{}}
{"id":"9c8bfbf6-e6fd-4f6e-a6b9-048e432c6918","activity":"on-air","source":"quadnet","callsign":"BD7LMA","baseCallsign":"BD7LMA","spotter":{"callsign":"BD7IIS-G","kind":"gateway","isSelf":false},"time":"2026-10-14T16:02:41Z","receivedAt":"2026-10-14T16:02:48.772Z","frequency":438800000,"band":"70cm","modeDetail":"dstar","mode":"dstar","comment":"Have a nice day ^ ^","rawText":"16:02 BD7LMA heard on BD7IIS-B (11.68s): Have a nice day ^ ^ [quadnet]","dstar":{"node":"BD7IIS-B","gateway":"BD7IIS-G","duration":11.68,"suffix":"D75"},"provenance":{"frequency":"directory"},"precision":{}}
```

## rbn

### Field presence (20988 spots)

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
| signal.speed | 99.6% |
| signal.speedUnit | 99.6% |
| signal.spotType | 100.0% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.instance | 11.6% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| time | 100.0% |

### Vocabularies

- **activity**: on-air 20988
- **mode**: cw 20903, rtty 66, psk 12, mode4 4, fm 1, mode3 1, mode6 1
- **modeDetail**: cw 20903, rtty 66, psk31 11, mode4 4, fm 1, mode3 1, psk125 1, mode6 1
- **spotter.kind**: skimmer 20988
- **band**: 20m 8066, 40m 4702, 15m 3125, 30m 1667, 17m 1521, 10m 1117, 12m 464, 80m 255, 60m 48, 160m 14, 2m 9
- **provenance**: none
- **precision**: none

### Issues

- **info:frequency-string** 20988 (100.0% of spots): `frequency arrived as string "10.1230"`; `frequency arrived as string "10.1090"`; `frequency arrived as string "21.0261"`
- **info:spotter-shape** 8 (0.0% of spots): `spotter "JH7CSU1" does not look like a callsign`
- **warn:mode-unmapped** 6 (0.0% of spots): `no family for mode "MODE4"`; `no family for mode "MODE3"`; `no family for mode "MODE6"`
- **warn:callsign-shape** 1 (0.0% of spots): `callsign "UA6LAUUUW" does not look like a callsign`

### Dropped by receiver (1706)

- 1706 x parser did not emit

    DX de PT2FHC-#:   21150.0  CS3B   CW    5 dB  22 WPM  NCDXF B      1409Z
    DX de K3GMQ-#:   28237.9  LA5TEN   CW    9 dB  20 WPM  BEACON      1409Z
    DX de K3GMQ-#:   21150.0  CS3B   CW    5 dB  22 WPM  NCDXF B      1409Z
    DX de EI4HQ-#:   21150.0  CS3B   CW    12 dB  22 WPM  NCDXF B      1409Z
    DX de MM0ZBH-#:   24929.9  CS3B   CW    13 dB  17 WPM  NCDXF B      1409Z
    DX de N2EPE-#:   24930.0  CS3B   CW    7 dB  21 WPM  NCDXF B      1409Z
    DX de K3FEF-#:   28230.8  F5ZEH   CW    13 dB  15 WPM  BEACON      1409Z
    DX de WA7LNW-#:   14100.0  4U1UN   CW    15 dB  22 WPM  NCDXF B      1409Z

### Samples

```json
{"id":"106c6a6d-b27a-4c31-86a0-3be9874567d1","activity":"on-air","source":"rbn","sourceId":"2335062643","callsign":"DL8KUD","baseCallsign":"DL8KUD","spotter":{"callsign":"S50ARX","kind":"skimmer","isSelf":false},"time":"2026-10-14T16:02:32Z","receivedAt":"2026-10-14T16:02:32.271Z","frequency":7030400,"band":"40m","modeDetail":"cw","mode":"cw","rawText":"DX de S50ARX-#:   7030.4  DL8KUD   CW    25 dB  18 WPM  CQ      1602Z","signal":{"snr":25,"speed":18,"speedUnit":"wpm","spotType":"cq"},"provenance":{},"precision":{}}
{"id":"c59ce3ec-5637-4999-afff-c9263f513409","activity":"on-air","source":"rbn","sourceId":"2335062644","callsign":"SV7BIO","baseCallsign":"SV7BIO","spotter":{"callsign":"S50ARX","kind":"skimmer","isSelf":false},"time":"2026-10-14T16:02:32Z","receivedAt":"2026-10-14T16:02:32.271Z","frequency":7017000,"band":"40m","modeDetail":"cw","mode":"cw","rawText":"DX de S50ARX-#:   7017.0  SV7BIO   CW    12 dB  28 WPM  CQ      1602Z","signal":{"snr":12,"speed":28,"speedUnit":"wpm","spotType":"cq"},"provenance":{},"precision":{}}
```

## sotawatch

### Field presence (45 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| client | 46.7% |
| comment | 66.7% |
| frequency | 100.0% |
| id | 100.0% |
| mode | 100.0% |
| modeDetail | 100.0% |
| precision | 100.0% |
| provenance | 100.0% |
| rawText | 100.0% |
| receivedAt | 100.0% |
| signal | 24.4% |
| signal.snr | 24.4% |
| signal.speed | 24.4% |
| signal.speedUnit | 24.4% |
| source | 100.0% |
| sourceId | 100.0% |
| spotter | 100.0% |
| spotter.callsign | 100.0% |
| spotter.isSelf | 100.0% |
| spotter.kind | 100.0% |
| spotter.relay | 24.4% |
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

- **activity**: on-air 45
- **mode**: cw 23, ssb 20, fm 2
- **modeDetail**: cw 23, ssb 20, fm 2
- **spotter.kind**: human 33, skimmer 11, bot 1
- **spotter.relay**: RBNHOLE 11
- **band**: 20m 15, 40m 13, 30m 5, 15m 4, 2m 3, 10m 2, 17m 2, 12m 1
- **client**: RBNHole 11, sotl.as 9, SOTA Activator 1
- **provenance**: none
- **precision**: none

### Issues

None.

### Samples

```json
{"id":"718a5f4a-a988-4a1a-b907-4fdbee60856d","activity":"on-air","source":"sotawatch","sourceId":"409971","client":"sotl.as","callsign":"DL/HB9EIV/P","baseCallsign":"HB9EIV","spotter":{"callsign":"HB9EIV","kind":"human","isSelf":true},"time":"2026-10-14T15:58:13Z","receivedAt":"2026-10-14T15:58:32.273Z","frequency":14290000,"band":"20m","modeDetail":"ssb","mode":"ssb","comment":"[sotl.as]","rawText":"15:58 DL/HB9EIV/P on DM/BW-057 (Lupfen, 977m, 10pt) 14.29 SSB: [sotl.as]","summit":{"program":"sota","ref":"DM/BW-057","association":"DM","region":"BW","name":"Lupfen","altitude":977,"points":10,"activationCount":359,"valid":true,"latitude":48.0239,"longitude":8.6711},"provenance":{},"precision":{}}
{"id":"17fb481b-27c7-4cb4-a84a-fdac1cf0e9a4","activity":"on-air","source":"sotawatch","sourceId":"409973","callsign":"WJ7WJ","baseCallsign":"WJ7WJ","spotter":{"callsign":"WJ7WJ","kind":"human","isSelf":true},"time":"2026-10-14T15:58:56Z","receivedAt":"2026-10-14T15:59:02.250Z","frequency":144100000,"band":"2m","modeDetail":"cw","mode":"cw","rawText":"15:58 WJ7WJ on W7O/CS-019 (Mount Ashland, 2296m, 6pt) 144.1 CW","summit":{"program":"sota","ref":"W7O/CS-019","association":"W7O","region":"CS","name":"Mount Ashland","altitude":2296,"points":6,"activationCount":87,"valid":true,"latitude":42.0808,"longitude":-122.7169},"provenance":{},"precision":{}}
```

## wwff

### Field presence (52 spots)

| Field | Present |
|---|---|
| activity | 100.0% |
| band | 100.0% |
| baseCallsign | 100.0% |
| callsign | 100.0% |
| comment | 53.8% |
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

- **activity**: on-air 50, qrt 2
- **mode**: cw 28, ssb 23, ft8 1
- **modeDetail**: cw 28, ssb 23, ft8 1
- **spotter.kind**: human 40, skimmer 12
- **band**: 20m 26, 15m 10, 40m 7, 12m 4, 17m 3, 10m 2
- **provenance**: activity=comment 2
- **precision**: none

### Issues

None.

### Samples

```json
{"id":"998dbcd0-ea23-475f-adc9-b82a6e4287c9","activity":"on-air","source":"wwff","sourceId":"156994","callsign":"KD8IE","baseCallsign":"KD8IE","spotter":{"callsign":"VE6JY","kind":"skimmer","isSelf":false},"time":"2026-10-14T16:01:03Z","receivedAt":"2026-10-14T16:01:32.136Z","frequency":14057000,"band":"20m","modeDetail":"cw","mode":"cw","comment":"Re-spotted via RBN","rawText":"DX de VE6JY: 14.057 KD8IE KFF-6517 CW Re-spotted via RBN 1601Z","parks":[{"program":"wwff","ref":"KFF-6517","prefix":"KFF","name":"State Game Land PA 173 ","latitude":40.6754,"longitude":0}],"provenance":{},"precision":{}}
{"id":"1aa74765-d19f-493c-9c9f-d654661d6b65","activity":"on-air","source":"wwff","sourceId":"156995","callsign":"K5OHY","baseCallsign":"K5OHY","spotter":{"callsign":"K5EM","kind":"skimmer","isSelf":false},"time":"2026-10-14T16:01:40Z","receivedAt":"2026-10-14T16:02:02.005Z","frequency":21044100,"band":"15m","modeDetail":"cw","mode":"cw","comment":"Re-spotted via RBN","rawText":"DX de K5EM: 21.0441 K5OHY KFF-3041 CW Re-spotted via RBN 1601Z","parks":[{"program":"wwff","ref":"KFF-3041","prefix":"KFF","name":"Monahans Sandhills","latitude":31.6194,"longitude":-102.81165}],"provenance":{},"precision":{}}
```

## Cross-source overlap (same base callsign and band within 10 min)

- pota+rbn: 13141
- pskreporter+rbn: 3469
- cluster+rbn: 2176
- pota+pskreporter: 1826
- cluster+pskreporter: 601
- cluster+pota: 339
- rbn+wwff: 326
- pota+wwff: 293
- rbn+sotawatch: 214
- cluster+wwff: 51
- dstarusers+quadnet: 3
- pota+sotawatch: 3
- cluster+sotawatch: 1
- pskreporter+wwff: 1
