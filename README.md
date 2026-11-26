# Skyline Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/laithzz21/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/laithzz21/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A little prop plane, three delivery routes, one sky. Fly a courier plane over a
seeded valley, thread the glowing rings for score and fuel, and land gently on
the far runway. An entry for make.fun's **best flight game** bounty
(`best-flight-game-20261126-0057`).

## Play

Open `game/index.html` in a desktop browser (or serve `game/` with any static
server). No build step, no libraries, no network requests — just static files.

- **↑ / ↓** (or **W / S**) — pitch the nose up / down
- **→ / ←** (or **D / A**) — throttle up / down
- **Mouse** — hold to steer toward the pointer and open the throttle
- **1 / 2 / 3** — pick a route on the title screen
- **P** — pause, **M** — mute, **Enter** — fly / fly again

## The routes

| Route | Rings | Clock | Fuel | The job |
| --- | --- | --- | --- | --- |
| Valley Mail Run | 8 | 150 s | 100 | Gentle hills, an easy first delivery |
| River Rush | 10 | 120 s | 100 | Low rings over the river, against the clock |
| Mountain Pass | 10 | 150 s | 78 | High rings over the peaks — fuel is the enemy |

Climbing bleeds speed, diving gives it back, and below stall speed the wing
gives up and the nose drops. Rings pay 100 points (plus a combo bonus) and
top up the tank. A landing only counts if it is gentle, slow and on a runway
— anything else is a crash. Landing with every ring done pays a 250-point
bonus plus a time bonus.

## Scoring

- Ring threaded: **100 points**, plus **25 per combo step** (thread rings
  without missing one and the payout grows: 100, 125, 150, …)
- Every ring done and wheels down on the far runway: **+250 landing bonus**
- Time left on the clock at landing: **+4 points per second**
- Landing early, out of time or out of fuel ends the sortie with the rings
  banked so far; a crash keeps the ring score but pays no bonuses

## Screenshots

The three screenshots in `screenshots/` are real renders of the game's own
code, staged deterministically with `?shot=start|play|end` and the route's
fixed seed, so the same route gives the same frame every time:

1. `1-start.jpg` — the title screen, the plane parked on runway 27
2. `2-play.jpg` — mid-flight on the Valley Mail Run, ring 6 ahead
3. `3-end.jpg` — the end screen after a clean landing: 8/8 rings, 2,169 points

## How it is built

Plain 2D canvas, split into one file per job:

- `game/src/config.js` — constants, the flight model, the three routes
- `game/src/random.js` — seeded random source (mulberry32)
- `game/src/terrain.js` — terrain, river, fields, rings and runways
- `game/src/physics.js` — one fixed step of the plane, landing vs crash
- `game/src/world.js` — sortie state, fuel, clock, scoring, events
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sounds (engine, ring, crash, landing)
- `game/src/render.js` — sky, ground, plane, rings, HUD and instrument panel
- `game/src/shots.js` — the autopilot that stages the screenshots
- `game/src/main.js` — boot and the one game loop

Screenshots are real renders of the game's own code, staged with
`?shot=start|play|end` and a fixed seed so the same route gives the same
frame every time. `main.ts` (Node 22, standard library only) copies `game/`
and `screenshots/` to `/output` and writes `dossier.json` with the vendored
`vendor/makefun-game.ts`.

Run it locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

It prints the game file count, the screenshot count and the dossier size, and
writes the same bytes on every run.

## License

MIT — see [LICENSE](LICENSE).
