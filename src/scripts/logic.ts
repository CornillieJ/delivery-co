//#region Imports

import { boot } from './game/game';

//#endregion Imports

/**
 * Entry point.
 *
 * The game lives in `scripts/game/game.ts`; this file only starts it, so
 * `index.html` never has to change.
 */

window.addEventListener('load', () => {
    void boot();
});
