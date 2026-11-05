/* Ayni API, skeleton only (2026-10-26; updated 2026-11-04 for the layout family): every body is empty. See api/README.md.
   The working code will be Ayni.tabs(element, options) in ayni-layout.js, which returns this controller. */

/**
 * Tabs: a tablist with its panels, in the page or built from a list. Left/Right, Home and End move between tabs;
 * Ctrl+Page Down and Ctrl+Page Up do it from anywhere in the scope; a tab can keep its place in the page address
 * (#hash). A tab may have no panel of its own, when the page draws one view again for the selected tab. Closable tabs
 * have a small × and close with Delete; the tab next to the closed one takes its place. A disabled tab says why in its
 * tooltip. With `.bottom` the row hangs under the page. Tabs change the page: a filter or a choice is a choice row, and
 * another look at the same content is the view switch.
 * @extends Component
 * @fires ayni:tabselect  detail: the tab the user selected (never on `select`, `set` or `value`).
 * @fires ayni:tabclose   detail: the closed tab.
 */
class Tabs extends Component {
  /**
   * @param {HTMLElement} element  The `role="tablist"` element, empty or with its tabs written in the page.
   * @param {object}  [options]
   * @param {Array<{value: string, label: string, icon?: string, tip?: string, panel?: HTMLElement, closable?: boolean, disabled?: boolean, why?: string}>} [options.items]
   *   The tabs; replaces the tabs in the markup. An item without `panel` has no panel of its own.
   * @param {string}  [options.value]  The tab to show first; the first enabled one when left out.
   * @param {HTMLElement} [options.scope]  Where Ctrl+Page Down and Ctrl+Page Up work; the panel around the row by default.
   * @param {boolean} [options.hash=false]  Keeps the selected tab in location.hash (also data-hash).
   * @param {function(string, HTMLElement)} [options.onSelect]  `(value, tab)` on a user's pick, as `ayni:tabselect`.
   * @param {function(string, HTMLElement)} [options.onClose]  `(value, tab)` when a tab closes, as `ayni:tabclose`.
   */
  constructor(element, options) {}

  /** @type {HTMLElement[]} The tabs, in order. Read-only. */
  get tabs() {}

  /** @type {string} The selected tab's value (its `value`, or the id of its panel). Setting it is `select(value)`. */
  get value() {}
  set value(v) {}

  /**
   * Selects a tab and shows its panel. Fires nothing.
   * @param {string} value
   */
  select(value) {}

  /**
   * Replaces all the tabs, for a page that draws them again. Fires nothing.
   * @param {Array<object>} items  As `options.items`.
   * @param {string} [value]  The tab to select; the current one when it is still there.
   */
  set(items, value) {}

  /**
   * Adds a tab.
   * @param {object} item  As one of `options.items`.
   * @param {number} [index]  Position; at the end when left out.
   * @returns {HTMLElement} The new tab.
   */
  add(item, index) {}

  /**
   * Closes a closable tab: the tab and its panel are hidden, and the neighbour takes over. `set` brings it back.
   * @param {string} value
   */
  close(value) {}

  /**
   * Enables or disables a tab; a disabled tab says why in its tooltip.
   * @param {string} value
   * @param {boolean} on
   * @param {string} [why]
   */
  setTabEnabled(value, on, why) {}
}
