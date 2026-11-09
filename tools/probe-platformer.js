// Platformer probe: the jump arc, from grounded to airborne and back.
(async () => {
    const game = window.__game;
    if (!game?.player) return { ok: false, reason: 'no player' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const body = game.player.body;
    await sleep(1500);

    const startY = body.position.y;
    const groundedAtStart = body.grounded;

    // Press Space like a player would.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    let leftGround = false;
    let apex = startY;
    for (let i = 0; i < 30; i += 1) {
        await sleep(60);
        apex = Math.max(apex, body.position.y);
        if (!body.grounded) leftGround = true;
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    // Wait for the landing.
    let landed = body.grounded;
    for (let i = 0; i < 50 && !landed; i += 1) {
        await sleep(100);
        landed = body.grounded;
    }

    const rise = apex - startY;
    return {
        ok: Boolean(groundedAtStart && leftGround && landed && rise > 0.5),
        groundedAtStart,
        leftGround,
        landed,
        startY: +startY.toFixed(2),
        apex: +apex.toFixed(2),
        rise: +rise.toFixed(2),
    };
})();
