// Playwright probe for the smoke tests. The whole file is one expression so it
// can be passed straight to `web-smoke --eval`.
//   web-smoke http://localhost:5180/ --wait 9000 --eval "$(tr '\n' ' ' < tools/probe.js)"
(async () => {
    const game = window.__game;
    if (!game) return { error: 'no game' };

    const before = game.player.position.clone();
    const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));

    key('KeyW', true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    key('KeyW', false);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const after = game.player.position.clone();
    game.weapon?.fireNow();
    await new Promise((resolve) => setTimeout(resolve, 400));

    return {
        moved: +before.distanceTo(after).toFixed(3),
        grounded: game.player.body.grounded,
        velocityY: +game.player.body.velocity.y.toFixed(3),
        enemies: game.physics.withTag('enemy').length,
        projectiles: game.projectiles.activeCount,
        bodies: game.physics.bodies.size,
        drawCalls: game.renderer.info.render.calls,
        triangles: game.renderer.info.render.triangles,
        frames: game.time.frame,
        objectives: game.objectives.all.map((objective) => `${objective.id}:${objective.completed}`),
        hudObjective: game.hud.root.querySelector('.hud-objective')?.textContent,
        state: game.state.current,
    };
})();
