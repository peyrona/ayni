/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A list box (`.lb`, `role="listbox"`), single or multiple selection. Arrows, Home/End and Page Up/Down move; typing
 * jumps to the first match (accents and case don't matter). Multiple selection shows a small square at the left of each
 * item, with Shift ranges and Ctrl+A. A right click or a long tap on an item opens its pop-up menu, when it has one.
 * @extends Field
 * @fires ayni:change  detail `{ selected }`, the texts of the selected items, whenever the selection changes.
 */
class ListBox extends Field {
  /**
   * @param {HTMLElement} element  The list box.
   * @param {object}  [options]  Same as Field, plus:
   * @param {boolean} [options.multiple=false]  Multiple selection.
   * @param {Menu}    [options.menu]            Pop-up menu for the items.
   */
  constructor(element, options) {}

  /** @type {string[]} Values (data-value, or the text) of the selected items. */
  get value() {}
  set value(values) {}

  /** @type {boolean} Multiple selection. */
  get multiple() {}
  set multiple(on) {}

  /** @type {HTMLElement[]} Every item, in order. Read-only. */
  get items() {}

  /** @type {HTMLElement[]} The selected items, in order. Read-only: use select() and unselect(). */
  get selected() {}

  /** @type {HTMLElement|null} The item with the keyboard focus. */
  get current() {}
  set current(item) {}

  /**
   * Adds an item.
   * @param {string|{text: string, value?: string, icon?: string, disabled?: boolean}} item
   * @param {number} [index]  Position; at the end when left out.
   * @returns {HTMLElement} The new item.
   */
  add(item, index) {}

  /**
   * Removes an item.
   * @param {HTMLElement|number} item  The item or its index.
   */
  remove(item) {}

  /** Removes every item. */
  clear() {}

  /**
   * Selects items. In single selection only the last one stays selected.
   * @param {...(HTMLElement|number)} items
   */
  select(...items) {}

  /**
   * Unselects items.
   * @param {...(HTMLElement|number)} items
   */
  unselect(...items) {}

  /** Selects every item (multiple selection only). */
  selectAll() {}

  /** Unselects every item. */
  selectNone() {}

  /**
   * Scrolls an item into view.
   * @param {HTMLElement|number} item
   */
  reveal(item) {}
}
