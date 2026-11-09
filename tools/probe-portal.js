// Portal probe: walk through portal A and come out of portal B, momentum intact.
(async () => {
    const game = window.__game;
    const world = game?.world;
    if (!world?.portals) return { ok: false, reason: 'no portals' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1200);

    const [a, b] = world.portals.portals;
    const teleported = new Promise((resolve) => game.events.on('custom:portal:teleport', resolve));

    // Stand just in front of portal A's plane, face into the opening, walk in.
    const body = game.player.body;
    const inFront = a.position.clone().addScaledVector(a.normal, 1.2);
    body.teleport({ x: inFront.x, y: inFront.y, z: inFront.z });
    // Forward is -z rotated by yaw: face along -normal, into the portal.
    world.controls.look.yaw = Math.atan2(a.normal.x, a.normal.z);
    world.controls.look.pitch = 0;
    await sleep(200);

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    const result = await Promise.race([teleported, sleep(4000).then(() => null)]);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    await sleep(300);

    const position = body.position;
    const nearB = position.distanceTo(b.position) < 3.5;

    return {
        ok: Boolean(result && nearB),
        teleported: Boolean(result),
        nearB,
        position: { x: +position.x.toFixed(1), y: +position.y.toFixed(1), z: +position.z.toFixed(1) },
        b: { x: b.position.x, y: b.position.y, z: b.position.z },
    };
})();
