// Board tap probe: a move played through synthetic taps, the way a finger does
// it. Run on the chess demo, desktop or --mobile.
(async () => {
    const game = window.__game;
    if (!game) return { ok: false, reason: 'no game' };
    const board = game.world?.board;
    if (!board) return { ok: false, reason: 'no board' };
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1000);

    const tap = (cell) => {
        const world = board.cellToWorld(cell).setY(0);
        const ndc = world.clone().project(game.camera);
        const rect = game.canvas.getBoundingClientRect();
        const x = rect.left + ((ndc.x + 1) / 2) * rect.width;
        const y = rect.top + ((1 - ndc.y) / 2) * rect.height;
        game.canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, button: 0, clientX: x, clientY: y, bubbles: true }));
    };

    const from = { x: 4, z: 1 }; // e2
    const to = { x: 4, z: 3 }; // e4
    tap(from);
    await sleep(120);
    const selected = board.selected;
    tap(to);
    await sleep(400);
    const landed = board.pieceAt(to);

    return {
        ok: Boolean(selected && landed),
        selected,
        landedAt: landed?.cell,
        type: landed?.data?.type,
        turn: game.world.turn,
    };
})();
