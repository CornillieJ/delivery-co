// Inventory and shop probe: opens with a key, uses an item, buys with gold,
// refuses a locked item, and checks the toolbar spends.
(async () => {
    const game = window.__game;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1600);
    if (!game?.world) return { error: 'demo world missing' };
    if (game.state.current === 'menu') game.world.flow.start();
    await sleep(300);

    const press = (key) => window.dispatchEvent(new KeyboardEvent('keydown', { key, code: `Key${key.toUpperCase()}`, bubbles: true }));
    const panel = () => document.querySelector('.inventory:not(.is-hidden)');
    const slots = () => [...document.querySelectorAll('.inventory:not(.is-hidden) .inventory-slot')];
    const text = (selector) => document.querySelector(selector)?.textContent ?? null;
    const button = (prefix) => [...document.querySelectorAll('.inventory:not(.is-hidden) .inventory-actions button')].find((b) => b.textContent?.startsWith(prefix));

    const results = {};

    // 1. The bag opens with its key.
    press('i');
    await sleep(250);
    results.bagOpen = !!panel();
    results.bagSlots = slots().length;
    results.bagTitle = text('.inventory-title');
    results.bagGold = text('.inventory:not(.is-hidden) .inventory-resources');

    // 2. Clicking a slot fills the detail pane, and Use consumes one.
    const bread = slots().find((element) => element.dataset.item === 'bread');
    results.foundBreadSlot = !!bread;
    bread?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(150);
    results.detailName = text('.inventory:not(.is-hidden) .inventory-detail-name');
    results.detailStats = text('.inventory:not(.is-hidden) .inventory-detail-stat');
    const before = game.inventory.count('bread');
    button('Use')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(200);
    results.breadUsed = [before, game.inventory.count('bread')];
    results.footer = text('.inventory:not(.is-hidden) .inventory-footer');

    // 3. Escape closes, B opens the shop.
    press('Escape');
    await sleep(200);
    results.bagClosed = !panel();
    press('b');
    await sleep(250);
    results.shopOpen = !!panel();
    results.shopTitle = text('.inventory-title');
    results.shopPrices = [...document.querySelectorAll('.inventory:not(.is-hidden) .inventory-slot-price')].map((el) => el.textContent).slice(0, 4);

    // 4. Buy bread with gold.
    slots().find((element) => element.dataset.item === 'bread')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(150);
    results.goldBeforeBuy = text('.inventory:not(.is-hidden) .inventory-resources');
    button('Buy')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(250);
    results.goldAfterBuy = text('.inventory:not(.is-hidden) .inventory-resources');
    results.breadAfterBuy = game.inventory.count('bread');

    // 5. A locked item refuses and explains itself.
    const axe = slots().find((element) => element.dataset.item === 'axe');
    results.axeSlotLocked = axe?.classList.contains('is-locked') ?? null;
    axe?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(150);
    results.axeLockedReason = text('.inventory:not(.is-hidden) .inventory-detail-locked');
    results.axeBuyDisabled = button('Buy')?.disabled ?? null;

    // 6. Keyboard navigation moves the highlight. Both panels listen for keys, so
    // read the detail name of the visible one to be sure which one reacted.
    const visible = () => document.querySelector('.inventory:not(.is-hidden)');
    const keyboardStart = visible()?.querySelector('.inventory-detail-name')?.textContent ?? null;
    press('d');
    await sleep(200);
    results.keyboardMove = [keyboardStart, visible()?.querySelector('.inventory-detail-name')?.textContent ?? null];
    results.panelsOpen = document.querySelectorAll('.inventory:not(.is-hidden)').length;
    press('Escape');
    await sleep(200);
    results.panelsOpenAfterEscape = document.querySelectorAll('.inventory:not(.is-hidden)').length;

    // 7. The toolbar spends gold on a card.
    const breadBeforeToolbar = game.inventory.count('bread');
    document.querySelector('.build-card[data-id="buy-bread"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(250);
    results.toolbarCards = document.querySelectorAll('.build-card').length;
    results.toolbarSpend = [breadBeforeToolbar, game.inventory.count('bread')];

    // 8. Saving and reloading the bag through the hub's save store.
    game.save.save('inventory');
    const savedCount = game.inventory.count('bread');
    game.inventory.clear();
    game.save.load('inventory');
    results.saveRoundTrip = [savedCount, game.inventory.count('bread')];

    results.state = game.state.current;
    results.frames = game.time.frame;
    results.drawCalls = game.renderer.info.render.calls;
    return results;
})();
