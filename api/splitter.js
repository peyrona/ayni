/* Ayni API, skeleton only (2026-10-26; updated 2026-11-04 for the layout family): every body is empty. See api/README.md.
   The working code will be Ayni.splitter(bar, options) in ayni-layout.js, which returns this controller. */

/**
 * A splitter between two panes, side by side or one above the other. Either a `.split` that holds both panes and the
 * bar, wired when the page loads, or a `.splitter` in the page's own layout, wired with `Ayni.splitter`. The small
 * glyphs centred on the bar collapse the pane at that end (◂ ▸, or ▴ ▾) and reset the sizes (●); the rest of the bar
 * drags. Arrow keys, Home and End move the bar; Enter collapses and restores the first pane; a double-click resets.
 * The size and the collapsed pane can be kept on this device. While the bar is dragged, frames ignore the pointer.
 * @extends Component
 * @fires ayni:split  detail `{ action: 'reset'|'collapse'|'restore', pane, message }` after a user action.
 */
class Splitter extends Component {
  /**
   * @param {HTMLElement} element  The `.split` element, or the `.splitter` bar.
   * @param {object} [options]
   * @param {HTMLElement} [options.pane]  The pane to size (with a bare bar).
   * @param {HTMLElement} [options.other]  The pane across the bar.
   * @param {'first'|'last'} [options.side='first']  Which side of the bar `pane` is on.
   * @param {boolean} [options.rows=false]  A top and bottom bar (also `.split.rows`).
   * @param {'px'|'%'} [options.unit='px']  `.split` works in percent.
   * @param {number} [options.min]  Smallest size of `pane`.
   * @param {number} [options.max]  Largest size of `pane`.
   * @param {number} [options.def]  The size a reset goes back to (also data-default). Left out: a reset gives `null`.
   * @param {number} [options.size]  The size to start from when nothing is saved.
   * @param {'first'|'last'} [options.collapsed]  The pane to start collapsed when nothing is saved.
   * @param {function(?number, ?string)} [options.set]  Applies the size the page's way: `(size, collapsed)`, where
   *   `collapsed` is 'first', 'last' or null. Left out: Ayni sets the pane's width or height. Either way Ayni hides a
   *   collapsed pane and lets the other fill the room.
   * @param {string|function(): string} [options.key]  The localStorage key of the size; the collapsed pane goes under
   *   the key plus `.fold`.
   * @param {function(?number, ?string)} [options.save]  In place of `key`, when the page keeps them itself.
   * @param {function(): boolean} [options.off]  True while there is nothing to drag (a phone layout).
   * @param {boolean} [options.glyphs=true]  False for a view with its own button that shows or hides the pane.
   * @param {function(?number, ?string)} [options.onChange]  `(size, collapsed)` after a user action.
   */
  constructor(element, options) {}

  /** @type {'columns'|'rows'} Side by side, or one above the other. Read-only. */
  get orientation() {}

  /** @type {?number} Size of the pane, in its unit. */
  get size() {}
  set size(value) {}

  /** @type {?number} Size reset() goes back to. */
  get defaultSize() {}
  set defaultSize(value) {}

  /** @type {'first'|'last'|null} The collapsed pane, or null when neither is. Read-only. */
  get collapsed() {}

  /**
   * Collapses one pane.
   * @param {'first'|'last'} pane
   */
  collapse(pane) {}

  /** Brings back the size the panes had before collapsing. */
  restore() {}

  /** Goes back to the default size. */
  reset() {}

  /** Reads the saved size again: `key` is a function and now gives another key (the device turned). */
  reload() {}
}
