// Delivery probe: teleport to the pickup, carry the parcel, teleport to the
// drop off, get paid.
(async () => {
    const game = window.__game;
    const world = game?.world;
    if (!world?.delivery) return { ok: false, reason: 'no delivery' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1200);

    const delivery = world.delivery;
    const order = delivery.active[0]?.order;
    if (!order) return { ok: false, reason: 'no active order' };

    const moneyBefore = delivery.money;
    const body = game.player.body;

    // Walk in by hand: stand at the pickup and call the same method the
    // proximity system calls.
    body.teleport(order.pickup.clone().setY(body.position.y));
    await sleep(300);
    const pickedUp = delivery.pickupAt(game.player.position) || delivery.carrying > 0;

    body.teleport(order.dropoff.clone().setY(body.position.y));
    await sleep(300);
    const delivered = delivery.dropoffAt(game.player.position) || delivery.carrying === 0;

    return {
        ok: Boolean(pickedUp && delivered && delivery.money > moneyBefore),
        pickedUp,
        delivered,
        moneyBefore,
        moneyAfter: delivery.money,
        carrying: delivery.carrying,
    };
})();
