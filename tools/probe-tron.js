// Tron probe: the cycle drives, steering turns it, the trail grows, and
// steering into the arena wall derezzes it. Measured from the first frame,
// because a light cycle with no input reaches a wall in seconds, which is the
// point of the game.
(async () => {
    const game = window.__game;
    const world = game?.world;
    if (!world?.arena) return { ok: false, reason: 'no arena' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // The smoke wait is long enough for a driverless cycle to be dead already,
    // so start from a clean restart and measure that run.
    world.restart();
    for (let i = 0; i < 40 && game.state.current !== 'playing'; i += 1) await sleep(100);
    const cycle = world.cycle;
    await sleep(150);

    const start = cycle.root.position.clone();
    const startYaw = cycle.yaw;
    await sleep(800);
    const moved = cycle.root.position.distanceTo(start);

    // Steer left for a moment and confirm the heading changed.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    await sleep(450);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    const turned = Math.abs(cycle.yaw - startYaw);

    const trail = cycle.samples?.length ?? 0;

    // Aim at the nearest wall and wait for the crash.
    cycle.yaw = Math.atan2(-cycle.root.position.x, -cycle.root.position.z) + Math.PI;
    let alive = cycle.alive;
    for (let i = 0; i < 120 && alive; i += 1) {
        await sleep(100);
        alive = cycle.alive;
    }

    return {
        ok: Boolean(moved > 3 && turned > 0.3 && trail > 0 && !alive),
        moved: +moved.toFixed(1),
        turned: +turned.toFixed(2),
        trail,
        crashedIntoWall: !alive,
        state: game.state.current,
    };
})();
