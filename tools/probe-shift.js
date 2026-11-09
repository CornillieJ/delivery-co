// Shift probe: start the shift, collect at the depot, deliver, get paid.
(async () => {
    const game = window.__game;
    const world = game?.world;
    if (!world?.vehicle || !world?.deliveries) return { ok: false, reason: 'no world' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1200);

    // Start from the main menu, like the player pressing the big button.
    if (game.state.current === 'menu') world.flow.start();
    await sleep(400);

    const deliveries = world.deliveries;
    const vehicle = world.vehicle;

    // The van drives, checked with real input over a few seconds of acceleration.
    const start = vehicle.root.position.clone();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await sleep(3000);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    const drove = vehicle.root.position.distanceTo(start);

    // Park at the depot marker to collect the first parcel.
    const order = deliveries.currentOrder;
    if (!order) return { ok: false, reason: 'no order queued' };
    vehicle.teleport({ x: order.pickup.x, y: 0, z: order.pickup.z }, Math.PI);
    let collected = false;
    for (let i = 0; i < 30 && !collected; i += 1) {
        await sleep(200);
        collected = deliveries.carrying > 0;
    }

    // Park at the drop off and expect payment.
    const moneyBefore = deliveries.money;
    vehicle.teleport({ x: order.dropoff.x, y: 0, z: order.dropoff.z }, Math.PI);
    let paid = false;
    for (let i = 0; i < 30 && !paid; i += 1) {
        await sleep(200);
        paid = deliveries.money > moneyBefore;
    }

    return {
        ok: Boolean(drove > 4 && collected && paid),
        drove: +drove.toFixed(1),
        collected,
        carrying: deliveries.carrying,
        paid,
        money: deliveries.money,
        state: game.state.current,
    };
})();
