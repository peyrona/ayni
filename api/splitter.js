/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A splitter between two panes (`.split`, side by side or, with `.rows`, one above the other). The small glyphs
 * centred on the bar collapse the pane at that end (◂ ▸, or ▴ ▾) and reset the sizes (●); the rest of the bar drags.
 * Arrow keys, Home and End move the bar; Enter collapses and restores the first pane; a double-click resets.
 * @extends Component
 * @fires ayni:split  detail `{ action: 'reset'|'collapse'|'restore', pane, message }` after a user action.
 */
class Splitter extends Component {
  /**
   * @param {HTMLElement} element  The .split element holding both panes and the .splitter bar.
   * @param {object} [options]
   * @param {number} [options.size]  Starting size of the first pane, in % (also data-default; 35 when left out).
   */
  constructor(element, options) {}

  /** @type {'columns'|'rows'} Side by side, or one above the other. Read-only (it comes from the markup). */
  get orientation() {}

  /** @type {number} Size of the first pane, in %. */
  get size() {}
  set size(percent) {}

  /** @type {number} Size reset() goes back to, in %. */
  get defaultSize() {}
  set defaultSize(percent) {}

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
}
