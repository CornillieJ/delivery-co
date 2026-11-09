import * as THREE from 'three';

import { SYSTEM_ORDER } from '../core/systems';
import { Grid, formatChessCell, type Cell } from '../helpers/grid';
import { createLabel } from '../helpers/text';
import { dampVector } from '../helpers/vector';
import { checkerTexture } from '../helpers/build';
import { setUserData, tag } from '../helpers/object';

/**
 * A clickable grid board with pieces on it.
 *
 * Built for board games: everything is a cell or a piece, picking and moving is
 * handled, and the board highlights the cells you tell it to. Click detection
 * raycasts the board plane, so empty cells are clickable too.
 */
export type BoardOptions = {
    /** Cells along x and z. A chess board is 8 by 8. */
    columns?: number;
    rows?: number;
    /** Distance between cell centres in meters. */
    cellSize?: number;
    /** Height of the playing surface. */
    y?: number;
    /** Thickness of the base plate. */
    thickness?: number;
    /** Two colours, alternating. */
    colors?: [THREE.ColorRepresentation, THREE.ColorRepresentation];
    /** Draw file and rank labels around the board. */
    coordinates?: boolean;
    /** Parent object, defaults to the scene. */
    parent?: THREE.Object3D;
    /** Let pieces hover and bob. */
    animatePieces?: boolean;
};

/** A piece placed on the board. */
export type BoardPiece<T = unknown> = {
    /** Object that gets moved around, usually a group holding meshes. */
    object: THREE.Object3D;
    /** Cell the piece currently occupies. */
    cell: Cell;
    /** Free-form data: colour, type, owner, whatever the game needs. */
    data: T;
    /** Called when the piece is captured. */
    onCaptured?: ((game: Game, piece: BoardPiece<T>) => void) | undefined;
};

export type BoardHighlightKind = 'select' | 'move' | 'attack' | 'hover' | 'check';

/** Highlights rebuilt from the current selection on every refresh. */
const DYNAMIC_HIGHLIGHTS = new Set<BoardHighlightKind>(['select', 'move', 'attack']);

export class Board<T = unknown> {
    readonly grid: Grid;
    readonly root: THREE.Group;
    /** Every piece currently on the board. */
    readonly pieces: BoardPiece<T>[] = [];
    /** Cell under the cursor, updated every frame. */
    hovered: Cell | undefined;
    /** Currently picked cell, `undefined` when nothing is picked. */
    selected: Cell | undefined;
    /** Cells the selected piece may move to. */
    legalTargets: Cell[] = [];

    private readonly game: Game;
    private readonly cellSize: number;
    private readonly y: number;
    private readonly animatePieces: boolean;
    private readonly highlights = new Map<string, THREE.Mesh>();
    private readonly highlightGroup: THREE.Group;
    private readonly hoverPoint = new THREE.Vector3();
    private readonly hoverMesh: THREE.Mesh;
    private readonly clickListeners = new Set<(cell: Cell, piece: BoardPiece<T> | undefined) => void>();
    private readonly hoverListeners = new Set<(cell: Cell | undefined) => void>();
    private readonly planes: THREE.Mesh[] = [];

    constructor(game: Game, options: BoardOptions = {}) {
        this.game = game;
        this.cellSize = options.cellSize ?? 1;
        this.y = options.y ?? 0;
        this.animatePieces = options.animatePieces ?? true;

        this.grid = new Grid({
            width: options.columns ?? 8,
            depth: options.rows ?? 8,
            spacing: this.cellSize,
            origin: new THREE.Vector3(0, this.y, 0),
            y: this.y,
        });

        this.root = new THREE.Group();
        this.root.name = 'board';
        (options.parent ?? game.scene).add(this.root);

        this.buildBase(options);
        this.highlightGroup = new THREE.Group();
        this.highlightGroup.name = 'board-highlights';
        this.root.add(this.highlightGroup);

        this.hoverMesh = this.createHighlightMesh('hover');
        this.hoverMesh.visible = false;
        this.highlightGroup.add(this.hoverMesh);
        if (options.coordinates ?? true) this.buildCoordinates();

        game.systems.add({
            name: 'board',
            order: SYSTEM_ORDER.GAMEPLAY,
            update: (delta) => this.update(delta),
            lateUpdate: () => this.updateHover(),
        });
        this.bindInput();
    }

    /** Centre of a cell in world space. */
    cellToWorld(cell: Cell, out = new THREE.Vector3()): THREE.Vector3 {
        return this.grid.cellToWorld(cell, this.y, out);
    }

    /** Cell under a world position, clamped into the grid. */
    worldToCell(position: THREE.Vector3 | Vec3): Cell {
        return this.grid.worldToCell(position);
    }

    /** True when the cell is inside the board. */
    contains(cell: Cell): boolean {
        return this.grid.contains(cell);
    }

    /** Piece on a cell, `undefined` when the cell is empty. */
    pieceAt(cell: Cell): BoardPiece<T> | undefined {
        return this.pieces.find((piece) => piece.cell.x === cell.x && piece.cell.z === cell.z);
    }

    /** Cell a piece occupies, `undefined` when it is not on the board. */
    cellOf(piece: BoardPiece<T> | THREE.Object3D): Cell | undefined {
        const found = typeof (piece as BoardPiece<T>).cell === 'object' ? (piece as BoardPiece<T>) : this.pieces.find((entry) => entry.object === piece);
        return found?.cell;
    }

    /** Place a piece on the board. `data` is yours to define. */
    addPiece(cell: Cell, object: THREE.Object3D, data?: T): BoardPiece<T> {
        const piece: BoardPiece<T> = { object, cell: { ...cell }, data: data as T };
        this.root.add(object);
        object.position.copy(this.cellToWorld(cell));
        tag(object, 'piece');
        this.pieces.push(piece);
        return piece;
    }

    /** Remove a piece from the board without capturing it. */
    removePiece(piece: BoardPiece<T>): void {
        const index = this.pieces.indexOf(piece);
        if (index >= 0) this.pieces.splice(index, 1);
        piece.object.removeFromParent();
    }

    /**
     * Move a piece to a cell, capturing whatever stands there.
     * @param capture When false, an occupied target blocks the move instead.
     */
    movePiece(piece: BoardPiece<T>, cell: Cell, options: { capture?: boolean; animate?: boolean } = {}): boolean {
        const occupant = this.pieceAt(cell);
        if (occupant && occupant !== piece) {
            if (options.capture === false) return false;
            this.pieces.splice(this.pieces.indexOf(occupant), 1);
            occupant.object.userData.captured = true;
            this.fadeOut(occupant.object);
            occupant.onCaptured?.(this.game, occupant);
        }
        piece.cell = { ...cell };
        if (options.animate ?? this.animatePieces) this.animateTo(piece);
        else piece.object.position.copy(this.cellToWorld(cell));
        return true;
    }

    /** Pick a cell, or clear the selection with `undefined`. */
    select(cell: Cell | undefined): void {
        this.selected = cell;
        this.refreshHighlights();
    }

    /** Cells the selected piece may move to. Rendered as move or attack highlights. */
    setLegalTargets(cells: Cell[]): void {
        this.legalTargets = cells;
        this.refreshHighlights();
    }

    /** Draw a one-off highlight, e.g. a check marker. */
    addHighlight(cell: Cell, kind: BoardHighlightKind = 'hover'): void {
        const key = `${kind}:${cell.x}:${cell.z}`;
        if (this.highlights.has(key)) return;
        const mesh = this.createHighlightMesh(kind);
        mesh.position.copy(this.cellToWorld(cell)).setY(this.y + 0.002);
        mesh.name = key;
        this.highlightGroup.add(mesh);
        this.highlights.set(key, mesh);
    }

    /** Remove every one-off highlight. Selection highlights are rebuilt instead. */
    clearHighlights(): void {
        for (const mesh of this.highlights.values()) {
            mesh.removeFromParent();
            (mesh.material as THREE.Material).dispose();
        }
        this.highlights.clear();
        this.refreshHighlights();
    }

    /** Called on a left click, with the piece under the cursor if there is one. */
    onCellClick(listener: (cell: Cell, piece: BoardPiece<T> | undefined) => void): () => void {
        this.clickListeners.add(listener);
        return () => this.clickListeners.delete(listener);
    }

    /** Called when the hovered cell changes. */
    onHoverChange(listener: (cell: Cell | undefined) => void): () => void {
        this.hoverListeners.add(listener);
        return () => this.hoverListeners.delete(listener);
    }

    /** Remove every piece and highlight. */
    clear(): void {
        for (const piece of [...this.pieces]) this.removePiece(piece);
        this.clearHighlights();
        this.select(undefined);
        this.setLegalTargets([]);
    }

    dispose(): void {
        this.clear();
        for (const mesh of this.planes) {
            mesh.geometry.dispose();
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) material.dispose();
        }
        this.root.removeFromParent();
    }

    //#region Internals

    private buildBase(options: BoardOptions): void {
        const thickness = options.thickness ?? 0.25;
        const [light, dark] = options.colors ?? [0xe8e2d4, 0x4a4a52];
        const squares = Math.max(this.grid.width, this.grid.depth);
        const texture = checkerTexture(512, squares, `#${new THREE.Color(light).getHexString()}`, `#${new THREE.Color(dark).getHexString()}`);

        // The plate covers the cells exactly, so its centre is the grid centre.
        // Getting this wrong shifts the whole board half a square away from the
        // pieces, which is the bug that made the first version look crooked.
        const centre = this.grid.center();
        const width = this.grid.width * this.cellSize;
        const depth = this.grid.depth * this.cellSize;

        const plate = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75, metalness: 0.05 }));
        plate.name = 'board-base';
        plate.receiveShadow = true;
        plate.position.set(centre.x, this.y - thickness / 2, centre.z);
        this.root.add(plate);
        this.planes.push(plate);

        // A static collider means a player can stand on the board and nothing
        // falls through it.
        this.game.physics.add({
            kind: 'fixed',
            shape: { type: 'box', size: { x: width, y: thickness, z: depth } },
            position: new THREE.Vector3(centre.x, this.y - thickness / 2, centre.z),
            object: plate,
            syncObject: false,
            tag: 'ground',
        });

        // Rim, so the board reads as an object rather than a plane.
        const rim = new THREE.Mesh(
            new THREE.BoxGeometry(width + 0.35, thickness * 0.8, depth + 0.35),
            new THREE.MeshStandardMaterial({ color: 0x2b2b31, roughness: 0.6, metalness: 0.2 }),
        );
        rim.name = 'board-rim';
        rim.position.set(centre.x, this.y - thickness * 0.55, centre.z);
        this.root.add(rim);
        this.planes.push(rim);
    }

    private buildCoordinates(): void {
        for (let x = 0; x < this.grid.width; x += 1) {
            const label = createLabel(String.fromCharCode('a'.charCodeAt(0) + x), { fontSize: 0.22, color: 0x8f8f98 });
            label.position.copy(this.grid.cellToWorld({ x, z: 0 }, this.y)).setZ(this.grid.cellToWorld({ x, z: 0 }, this.y).z - this.cellSize * 0.75);
            label.rotation.x = -Math.PI / 2;
            this.root.add(label);
        }
        for (let z = 0; z < this.grid.depth; z += 1) {
            const label = createLabel(String(z + 1), { fontSize: 0.22, color: 0x8f8f98 });
            label.position.copy(this.grid.cellToWorld({ x: 0, z }, this.y)).setX(this.grid.cellToWorld({ x: 0, z }, this.y).x - this.cellSize * 0.75);
            label.rotation.x = -Math.PI / 2;
            this.root.add(label);
        }
    }

    private createHighlightMesh(kind: BoardHighlightKind): THREE.Mesh {
        const geometry = new THREE.PlaneGeometry(this.cellSize * 0.92, this.cellSize * 0.92);
        geometry.rotateX(-Math.PI / 2);
        const colors: Record<BoardHighlightKind, [number, number]> = {
            select: [0x59d3ff, 0.55],
            move: [0x6ce09a, 0.42],
            attack: [0xff5a5a, 0.5],
            hover: [0xffffff, 0.22],
            check: [0xff2d2d, 0.6],
        };
        const [color, opacity] = colors[kind];
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
        return new THREE.Mesh(geometry, material);
    }

    /** Selection and move highlights are rebuilt from state, sticky ones are kept. */
    private refreshHighlights(): void {
        for (const [key, mesh] of [...this.highlights]) {
            const kind = key.split(':')[0] as BoardHighlightKind;
            if (!DYNAMIC_HIGHLIGHTS.has(kind)) continue;
            mesh.removeFromParent();
            (mesh.material as THREE.Material).dispose();
            this.highlights.delete(key);
        }
        if (this.selected) this.addHighlight(this.selected, 'select');
        for (const cell of this.legalTargets) this.addHighlight(cell, this.pieceAt(cell) ? 'attack' : 'move');
    }

    private animateTo(piece: BoardPiece<T>): void {
        const target = this.cellToWorld(piece.cell);
        piece.object.userData.animStart = piece.object.position.clone();
        piece.object.userData.animTarget = target;
        piece.object.userData.animProgress = 0;
    }

    private fadeOut(object: THREE.Object3D): void {
        object.userData.captured = true;
        object.userData.fadeAge = 0;
    }

    private update(delta: number): void {
        for (const piece of this.pieces) {
            const target = piece.object.userData.animTarget as THREE.Vector3 | undefined;
            if (target) {
                const start = piece.object.userData.animStart as THREE.Vector3;
                let progress = (piece.object.userData.animProgress as number) + delta * 5;
                if (progress >= 1) {
                    progress = 1;
                    piece.object.userData.animTarget = undefined;
                }
                piece.object.userData.animProgress = progress;
                piece.object.position.copy(start).lerp(target, progress);
                // Hop over the neighbour it passes, which reads as a jump.
                piece.object.position.y += Math.sin(progress * Math.PI) * this.cellSize * 0.35;
            } else if (!piece.object.userData.captured) {
                dampVector(piece.object.position, this.cellToWorld(piece.cell), 0.001, delta, piece.object.position);
            }
        }

        // Captured pieces sink and fade, then disappear.
        for (const piece of [...this.pieces]) {
            if (!piece.object.userData.captured) continue;
            piece.object.userData.fadeAge = (piece.object.userData.fadeAge as number) + delta;
            piece.object.position.y = this.y - (piece.object.userData.fadeAge as number) * 0.35;
            if ((piece.object.userData.fadeAge as number) > 0.7) this.removePiece(piece);
        }
    }

    private updateHover(): void {
        const cell = this.cellFromCursor();

        this.hoverMesh.visible = cell !== undefined;
        if (cell) this.hoverMesh.position.copy(this.cellToWorld(cell)).setY(this.y + 0.003);

        if ((cell?.x ?? -1) === (this.hovered?.x ?? -1) && (cell?.z ?? -1) === (this.hovered?.z ?? -1)) return;
        this.hovered = cell;
        for (const listener of this.hoverListeners) listener(cell);
    }

    /**
     * Grid cell under a screen position.
     *
     * Clicks use the event's own coordinates rather than `hovered`, which is
     * recomputed once per frame. A player who moves and clicks inside one frame
     * would otherwise act on the previous cell: the first click after the mouse
     * arrives would be dropped, and a fast second click would repeat the first.
     */
    cellFromScreen(clientX: number, clientY: number): Cell | undefined {
        const rect = this.game.canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
        this.game.raycaster.setFromCamera(ndc, this.game.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.y);
        const point = new THREE.Vector3();
        if (!this.game.raycaster.ray.intersectPlane(plane, point)) return undefined;
        return this.grid.worldToCellStrict(point);
    }

    /** Cell under the cursor right now, used by tools and tests. */
    cellFromCursor(): Cell | undefined {
        const mouse = this.game.input.mouse;
        const rect = this.game.canvas.getBoundingClientRect();
        return this.cellFromScreen(mouse.position.x + rect.left, mouse.position.y + rect.top);
    }

    private bindInput(): void {
        // pointerdown, not mousedown: a tap on a phone is the same gesture as a
        // left click, and only the pointer event fires for both.
        this.game.canvas.addEventListener('pointerdown', (event) => {
            if (event.button !== 0) return;
            // Guard against clicks on UI, whether it is DOM or on the canvas.
            if (event.target !== this.game.canvas) return;
            if (this.game.input.pointerOverUi) return;

            const cell = this.cellFromScreen(event.clientX, event.clientY);
            if (!cell) return;

            // Keep the highlight consistent with what was just clicked, without
            // waiting for the next frame.
            this.hovered = cell;
            const piece = this.pieceAt(cell);
            this.game.events.emit('custom:board:click', { cell, piece });
            for (const listener of this.clickListeners) listener(cell, piece);
        });
    }

    /** Chess notation for a cell, e.g. 'e4'. Handy for logs and saves. */
    static notation(cell: Cell): string {
        return formatChessCell(cell);
    }

    /** Tag helper so board pieces are findable through the scene graph. */
    static markPiece(object: THREE.Object3D, data: Record<string, unknown>): THREE.Object3D {
        setUserData(object, data as GameUserDataInput);
        return object;
    }

    //#endregion Internals
}
