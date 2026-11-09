// Tower defence probe, written against the kit API:
// toolbar selection, placement, wave spawning, shooting, economy, selling.
(async () => {
    const game = window.__game;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1500);
    const world = game?.world;
    if (!world?.towers || !world?.walkers) return { error: 'tower defence world not ready' };
    if (game.state.current === 'menu') world.flow.start();
    await sleep(300);

    const results = { moneyStart: world.money.value(), livesStart: world.lives ?? null };

    // The toolbar lists the towers and hands one to the placement ring.
    results.toolbarCards = document.querySelectorAll('.build-card').length;
    document.querySelector('.build-card[data-id="gun"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(150);
    results.selected = world.toolbar.selected;
    results.toolbarMoney = world.money.value();

    // The best plot is the buildable cell closest to the route but clear of it.
    let best = null;
    for (let z = 0; z < world.grid.depth; z += 1) {
        for (let x = 0; x < world.grid.width; x += 1) {
            const cell = { x, z };
            if (!world.towers.canBuild(cell)) continue;
            const distance = world.path.closestProgress(world.grid.cellToWorld(cell), 80).distance;
            if (!best || distance < best.distance) best = { cell, distance };
        }
    }
    results.plotsAvailable = best ? { ...best.cell, distanceFromRoad: +best.distance.toFixed(2) } : null;

    const before = world.money.value();
    results.built = world.placeTower(best.cell);
    results.moneyAfterBuild = world.money.value();
    results.spent = before - world.money.value();
    results.towerCount = world.towers.towers.length;
    results.towerInRange = best.distance < world.towers.towers[0]?.range;

    // Stop the countdown and watch a wave walk into the tower.
    world.startWave();
    const started = { gold: world.money.value(), lives: world.lives ? world.lives.value() : null };
    let seen = 0;
    let damageEvents = 0;
    game.events.on('hit:dealt', () => { damageEvents += 1; });
    for (let tick = 0; tick < 70; tick += 1) {
        await sleep(400);
        seen = Math.max(seen, world.walkers.enemies.length);
        if (world.wave >= 2 || (started.lives !== null && world.lives.value() < started.lives)) break;
    }
    results.enemiesSeen = seen;
    results.damageEvents = damageEvents;
    results.wave = world.wave;
    results.goldGainedAfterKills = world.money.value() - started.gold;
    results.livesLost = started.lives === null ? null : started.lives - world.lives.value();

    // Upgrades and selling go through the same click path the game uses.
    const upgradeBefore = world.towers.towers[0]?.damage ?? null;
    results.upgraded = world.towers.upgrade(best.cell);
    results.upgradeDamage = [upgradeBefore, world.towers.towers[0]?.damage ?? null];
    const goldBeforeSell = world.money.value();
    results.sold = world.towers.sell(best.cell);
    results.sellRefund = world.money.value() - goldBeforeSell;
    results.towersLeft = world.towers.towers.length;

    results.hudGold = document.querySelector('[data-name="gold"] .hud-stat-value, .hud-extra-row .hud-stat-value')?.textContent ?? null;
    results.drawCalls = game.renderer.info.render.calls;
    results.frames = game.time.frame;
    return results;
})();
