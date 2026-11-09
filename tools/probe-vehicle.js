// Vehicle probe: the van accelerates, steers, and brakes to a stop.
(async () => {
    const game = window.__game;
    const world = game?.world;
    if (!world?.vehicle) return { ok: false, reason: 'no vehicle' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1500);

    const vehicle = world.vehicle;
    const start = vehicle.root.position.clone();

    // Full throttle for three seconds.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    let topSpeed = 0;
    for (let i = 0; i < 30; i += 1) {
        await sleep(100);
        topSpeed = Math.max(topSpeed, vehicle.speedKmh);
    }
    const moved = vehicle.root.position.distanceTo(start);

    // Steer left and check the heading changed.
    const yawBefore = vehicle.yaw;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    await sleep(700);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    const turned = Math.abs(vehicle.yaw - yawBefore);

    // Brake to a stop.
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    let stopped = false;
    for (let i = 0; i < 60 && !stopped; i += 1) {
        await sleep(100);
        stopped = vehicle.speedKmh < 4;
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    return {
        ok: Boolean(topSpeed > 25 && moved > 10 && turned > 0.05 && stopped),
        topSpeed: +topSpeed.toFixed(0),
        moved: +moved.toFixed(1),
        turned: +turned.toFixed(2),
        stopped,
        grounded: vehicle.grounded,
    };
})();
