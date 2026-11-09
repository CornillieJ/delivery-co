# Parcel van

A cozy delivery shift, Easy Delivery Co. style: drive a small van around a small
town, collect parcels at the depot and get them to the address before the
customer cancels.

Built on [threejs-game-start](https://github.com/CornillieJ/threejs-game-start).
The game-specific code is three files: `content/town.ts` (the town as data),
`game/game.ts` (the shift) and `logic.ts` (the entry point). The van is the
template's ray-cast `VehicleBody`, the delivery loop is its `DeliveryManager`,
and the menu, HUD, toasts and touch controls come from the kit.

## Run it

```bash
npm install
npm run dev      # http://localhost:5250
```

WASD or the left stick to drive, Space to brake. On a phone the on-screen
joystick steers and the round button brakes.

## How a shift works

- Pick up at the depot (drive into the beacon), then drive to the address.
- Up to three parcels fit in the van; the beacon always points at the next stop.
- Each address has a timer. Miss it and the customer cancels.
- After the last delivery you get the shift report: money earned, parcels
  missed, time taken.

## Testing

```bash
npm run typecheck
npm test
node tools/smoke.mjs http://localhost:5250/ tools/probe-shift.js
node tools/smoke.mjs http://localhost:5250/ tools/probe-mobile.js --mobile
```

`probe-shift` starts a shift, drives with real input, collects and delivers a
parcel, and checks the payment. `probe-mobile` does the same checks a phone
would: touch controls visible, joystick moves the van, the brake button works.
