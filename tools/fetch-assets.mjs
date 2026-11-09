#!/usr/bin/env node
/**
 * Download the starter's asset pack.
 *
 * Real models beat primitives: a platformer character with a run cycle, enemies
 * that walk, a bird that flies. All of these come from the three.js examples
 * collection, which is the safest place to get them: they are the assets the
 * library itself tests with, they are small, and their licences are stated.
 *
 *   node tools/fetch-assets.mjs [--only fox,robot] [--list]
 *
 * Files land in `static/models/` and an attribution file is written next to
 * them. Keep that file: two of these are CC-BY and require the credit.
 */
import { mkdirSync, writeFileSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/';

/** The pack. Everything here is used by a demo or a game in this organisation. */
export const ASSETS = [
    // There used to be a fox here. It is no longer in the three.js collection, so
    // the animated robot is the character the platformer uses instead.
    {
        id: 'robot',
        file: 'robot.glb',
        url: `${BASE}RobotExpressive/RobotExpressive.glb`,
        author: 'Quaternius',
        license: 'CC0',
        note: 'Animated robot: Idle, Walking, Running, Jump, Punch, Death and more.',
    },
    {
        id: 'stork',
        file: 'stork.glb',
        url: `${BASE}Stork.glb`,
        author: 'mirada',
        license: 'CC0',
        note: 'Animated flying bird. The flying enemy in the tower defence.',
    },
    {
        id: 'flamingo',
        file: 'flamingo.glb',
        url: `${BASE}Flamingo.glb`,
        author: 'mirada',
        license: 'CC0',
        note: 'Animated flying bird, a second wing shape.',
    },
    {
        id: 'parrot',
        file: 'parrot.glb',
        url: `${BASE}Parrot.glb`,
        author: 'mirada',
        license: 'CC0',
        note: 'Animated flying bird, third wing shape.',
    },
    {
        id: 'horse',
        file: 'horse.glb',
        url: `${BASE}Horse.glb`,
        author: 'mirada',
        license: 'CC0',
        note: 'Animated galloping horse. A fast enemy, or a mount.',
    },
    {
        id: 'duck',
        file: 'duck.glb',
        url: `${BASE}duck.glb`,
        author: 'three.js examples',
        license: 'CC0',
        note: 'Small textured prop. A collectible or a critter.',
    },
    {
        id: 'collision-world',
        file: 'collision-world.glb',
        url: `${BASE}collision-world.glb`,
        author: 'three.js examples',
        license: 'CC0',
        note: 'Physics playground: blocks, ramps and stairs to walk on.',
    },
    {
        id: 'boombox',
        file: 'boombox.glb',
        url: `${BASE}BoomBox.glb`,
        author: 'Microsoft',
        license: 'CC-BY-4.0',
        note: 'PBR showcase prop. Good for testing materials and lighting.',
    },
    {
        id: 'littlest-tokyo',
        file: 'littlest-tokyo.glb',
        url: `${BASE}LittlestTokyo.glb`,
        author: 'Glen Fox',
        license: 'CC-BY-4.0',
        note: 'A full animated diorama. Good for a title screen or a backdrop.',
    },
];

const args = process.argv.slice(2);
const only = (() => {
    const index = args.indexOf('--only');
    return index >= 0 ? (args[index + 1] ?? '').split(',').filter(Boolean) : undefined;
})();

if (args.includes('--list')) {
    console.log('id                 size    licence      note');
    for (const asset of ASSETS) console.log(`${asset.id.padEnd(18)} ${''.padEnd(8)}${asset.license.padEnd(13)}${asset.note}`);
    process.exit(0);
}

const targetDir = resolve('static/models');
mkdirSync(targetDir, { recursive: true });

const downloaded = [];
for (const asset of ASSETS) {
    if (only && !only.includes(asset.id)) continue;
    const target = resolve(targetDir, asset.file);
    if (existsSync(target)) {
        downloaded.push({ ...asset, size: statSync(target).size, cached: true });
        console.log(`cached  ${asset.file}`);
        continue;
    }
    try {
        const response = await fetch(asset.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, buffer);
        downloaded.push({ ...asset, size: buffer.byteLength, cached: false });
        console.log(`fetched ${asset.file} (${(buffer.byteLength / 1024).toFixed(0)} KB)`);
    } catch (error) {
        console.warn(`failed  ${asset.file}: ${String(error)}`);
    }
}

// Some published models are Draco compressed, so the decoder has to ship with
// the app. It comes out of the installed three.js, which keeps the version in
// step with the loader.
const dracoSource = resolve('node_modules/three/examples/jsm/libs/draco/gltf');
const dracoTarget = resolve('static/draco');
if (existsSync(dracoSource)) {
    mkdirSync(dracoTarget, { recursive: true });
    for (const file of ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
        const from = resolve(dracoSource, file);
        if (existsSync(from)) copyFileSync(from, resolve(dracoTarget, file));
    }
    console.log('copied the Draco decoder into static/draco/');
} else {
    console.warn('no Draco decoder in node_modules; run npm install first');
}

// The attribution file only mentions what is actually on disk.
const lines = [
    '# Asset attribution',
    '',
    'Models fetched by `tools/fetch-assets.mjs` from the three.js examples collection',
    '(https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf), which states',
    'the licence of each model. Keep this file: CC-BY requires the credit.',
    '',
    '| File | Author | Licence | What it is |',
    '| --- | --- | --- | --- |',
];
for (const asset of downloaded) {
    lines.push(`| \`${asset.file}\` | ${asset.author} | ${asset.license} | ${asset.note} |`);
}
lines.push('', 'Regenerate with `node tools/fetch-assets.mjs`.', '');
writeFileSync(resolve(targetDir, 'ATTRIBUTION.md'), `${lines.join('\n')}\n`);

const total = downloaded.reduce((sum, asset) => sum + asset.size, 0);
console.log(`\n${downloaded.length} models in static/models/ (${(total / 1024 / 1024).toFixed(1)} MB)`);
console.log('wrote static/models/ATTRIBUTION.md');
