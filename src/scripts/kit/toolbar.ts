import { BuildBar, type BuildBarEntry } from '../ui/build-bar';
import type { ScreenName } from '../ui/screens';

//#region Toolbar

export type AddToolbarOptions = {
    /** Heading above the bar. */
    label?: string;
    entries: BuildBarEntry[];
    /** Starting selection. */
    selected?: string;
    /** Exactly one of these is required. */
    onSelect?: (id: string | undefined) => void;
    /** Also open the toolbar when this input action is pressed. */
    key?: string;
    /** Show it immediately. Defaults to true. */
    visible?: boolean;
    /** Screen to mount into. Defaults to `'hud'`. */
    screen?: ScreenName;
};

export type ToolbarHandle = {
    readonly bar: BuildBar;
    setEntries: (entries: BuildBarEntry[]) => void;
    select: (id: string | undefined) => void;
    readonly selected: string | undefined;
    setMoney: (amount: number) => void;
    show: () => void;
    hide: () => void;
    dispose: () => void;
};

/** A row of selectable cards: towers to build, tools to hold, units to train. */
export function addToolbar(game: Game, options: AddToolbarOptions): ToolbarHandle {
    const bar = new BuildBar(game.screens.layer(options.screen ?? 'hud'), { ...(options.label !== undefined ? { label: options.label } : {}) });
    bar.setEntries(options.entries);
    bar.onSelect((id) => options.onSelect?.(id));
    if (options.selected) bar.setSelected(options.selected);
    if (options.visible ?? true) bar.show();
    else bar.hide();

    return {
        bar,
        setEntries: (entries) => bar.setEntries(entries),
        select: (id) => bar.setSelected(id),
        get selected() {
            return bar.selected;
        },
        setMoney: (amount) => bar.setMoney(amount),
        show: () => bar.show(),
        hide: () => bar.hide(),
        dispose: () => bar.dispose(),
    };
}

//#endregion Toolbar
