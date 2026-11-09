// Deterministic combat + pickup + pause probe.
(async () => {
    const game = window.__game;
    const world = game.world;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const counts = { spawned: 0, hit: 0, dealt: 0, collected: 0, killed: 0 };
    const hitTags = [];
    game.events.on('projectile:spawned', () => { counts.spawned += 1; });
    game.events.on('hit:dealt', () => { counts.dealt += 1; });
    game.events.on('pickup:collected', () => { counts.collected += 1; });
    game.events.on('entity:killed', () => { counts.killed += 1; });
    game.events.on('projectile:hit', ({ object }) => {
        counts.hit += 1;
        hitTags.push((object?.userData?.tag ?? object?.name ?? 'unknown') + '@y' + (object?.position?.y?.toFixed?.(2) ?? '?'));
    });

    // Clear the field, then place one enemy 8 m in front of the camera.
    world.enemies.clear();
    const forward = game.camera.position.clone();
    game.camera.getWorldDirection(forward);
    const spot = game.camera.position.clone().addScaledVector(forward, 8).setY(0.3);
    const aim = game.camera.position.clone().addScaledVector(forward, 8);
    const enemy = world.enemies.spawn({ position: spot, health: 100, speed: 0, damage: 0, color: 0xff5555 });
    await sleep(400);

    // Aim from the eye at the enemy's centre and shoot.
    const healthBefore = enemy.health.current;
    for (let i = 0; i < 4; i += 1) {
        const eye = game.camera.position.clone();
        // Aim horizontally at the enemy's centre, not down at the floor.
        const target = aim.clone().setY(enemy.root.position.y + 0.85);
        const dir = target.clone().sub(eye).normalize();
        // Start outside the player's own capsule, as a real muzzle does.
        const origin = eye.clone().addScaledVector(dir, 0.8);
        const probe = game.physics.raycast(origin, dir, 40);
        if (i === 0) hitTags.push('rayFirst=' + (probe?.object?.name ?? 'none') + '/' + (probe?.object?.userData?.tag ?? '-') + '@' + probe?.distance.toFixed(1));
        game.projectiles.spawn({ origin, direction: dir, speed: 45, damage: 25, ignoreTag: 'player' });
        await sleep(140);
    }
    await sleep(700);
    const healthAfter = enemy.health.current;

    // Pickups: walk into one.
    game.player.body.teleport(world.pickups.objects[0].position.clone());
    await sleep(400);
    const cells = game.inventory.count('cell');
    const pickupsLeft = world.pickups.count;

    const press = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    const states = [game.state.current];
    press('Escape');
    await sleep(150);
    states.push(game.state.current);
    press('Escape');
    await sleep(150);
    states.push(game.state.current);

    return { health: [healthBefore, healthAfter], counts, hitTags, cells, pickupsLeft, states, alive: world.enemies.count };
})();
