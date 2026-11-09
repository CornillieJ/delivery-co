// Farm probe: plant, water, watch a growth stage, harvest.
(async () => {
    const game = window.__game;
    const world = game?.world;
    if (!world?.farm) return { ok: false, reason: 'no farm' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1200);

    const farm = world.farm;
    const plot = farm.plots[0];
    

    // Make sure there is a seed to plant, then plant it.
    if (game.inventory.count('turnip-seed') === 0) game.inventory.add('turnip-seed', 1);
    const planted = farm.plant(plot, 'turnip');
    const stageAfterPlant = plot.stage;

    // Watering lifts the dry-soil penalty.
    farm.water(plot);
    const watered = plot.watered;

    // Jump to just before the next stage boundary and let one tick cross it.
    plot.elapsed = 7.9;
    plot.stage = 0;
    await sleep(600);
    const grew = plot.stage > stageAfterPlant;

    // A ripe plot harvests: the manager reports the produce and clears the plot.
    // Adding it to the bag is the template's job (`collectHarvest`), tested by
    // the demo's interact path rather than here.
    plot.stage = 2;
    plot.ripe = true;
    const harvested = farm.harvest(plot);
    const cleared = !plot.crop && !plot.ripe;

    return {
        ok: Boolean(planted && watered && grew && harvested && cleared),
        planted,
        watered,
        grew,
        harvested,
        cleared,
    };
})();
