// Board game probe: pieces, coordinate labels, a move and a capture.
(async () => {
    const game = window.__game;
    const world = game.world;
    const board = world.board;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    await sleep(1200);

    const start = board.pieces.length;
    const from = { x: 4, z: 1 };
    const to = { x: 4, z: 3 };
    const piece = board.pieceAt(from);
    if (!piece) return { error: 'no piece on e2' };

    board.select(from);
    board.setLegalTargets([to]);
    const moved = board.movePiece(piece, to);
    const landed = board.pieceAt(to);
    world.endTurn();

    // Troika labels: they only count as rendered if they produced glyph geometry.
    const labels = [];
    game.scene.traverse((node) => {
        if (node.constructor?.name === 'Text') labels.push(node.geometry?.attributes?.position?.count ?? 0);
    });

    return {
        pieces: [start, board.pieces.length],
        moved,
        landedAt: landed?.cell,
        turn: world.turn,
        labels: labels.length,
        renderedLabels: labels.filter((count) => count > 0).length,
        drawCalls: game.renderer.info.render.calls,
        triangles: game.renderer.info.render.triangles,
    };
})();
