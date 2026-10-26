/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * Tabs: a tablist with its panels. Left/Right, Home and End move between tabs; a tab can keep its place in the page
 * address (#hash). Closable tabs have a small × and close with Delete; the tab next to the closed one takes its place.
 * A disabled tab says why in its tooltip.
 * @extends Component
 * @fires ayni:tabselect  detail: the selected tab.
 * @fires ayni:tabclose   detail: the closed tab.
 */
class Tabs extends Component {
  /**
   * @param {HTMLElement} element  The `role="tablist"` element.
   * @param {object}  [options]
   * @param {boolean} [options.hash=false]  Keeps the selected tab in location.hash (also data-hash).
   */
  constructor(element, options) {}

  /** @type {HTMLElement[]} The tabs, in order. Read-only. */
  get tabs() {}

  /** @type {HTMLElement|null} The selected tab. */
  get selected() {}
  set selected(tab) {}

  /** @type {number} Index of the selected tab, or -1. */
  get selectedIndex() {}
  set selectedIndex(i) {}

  /**
   * Selects a tab and shows its panel.
   * @param {HTMLElement|number|string} tab  The tab, its index, or the id of its panel.
   */
  select(tab) {}

  /**
   * Adds a tab with its panel.
   * @param {{label: string, icon?: string, closable?: boolean, panel: HTMLElement}} tab
   * @param {number} [index]  Position; at the end when left out.
   * @returns {HTMLElement} The new tab.
   */
  add(tab, index) {}

  /**
   * Closes a closable tab and removes its panel.
   * @param {HTMLElement|number} tab
   */
  close(tab) {}

  /**
   * Enables or disables a tab; a disabled tab says why in its tooltip.
   * @param {HTMLElement|number} tab
   * @param {boolean} on
   * @param {string} [reason]
   */
  setTabEnabled(tab, on, reason) {}
}
