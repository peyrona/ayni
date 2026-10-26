/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A popup menu (`<div popover class="panel menu">`). It opens from a button (which shows the small triangle) or as the
 * pop-up menu of an area: right click, long tap, Shift+F10 or the Menu key. Items can be plain, check or radio items,
 * with separators between groups; a disabled item stays visible. Menus have no submenus. A menu that doesn't fit
 * scrolls, and it closes when the page scrolls or the window resizes.
 * @extends Component
 * @fires ayni:action  detail `{ item, menu, act }` when an item is chosen (`menu` is the menu's name, or the name of
 *                     the thing its pop-up menu was opened on).
 * @fires ayni:choose  detail: the radio item that was picked.
 */
class Menu extends Component {
  /**
   * @param {HTMLElement} element  The menu element.
   */
  constructor(element) {}

  /** @type {boolean} True while open. */
  get isOpen() {}

  /** @type {HTMLElement[]} The items, in order (separators left out). Read-only. */
  get items() {}

  /**
   * Opens the menu below an element (above it when there is no room), or at a point; it is kept on screen.
   * @param {HTMLElement|{x: number, y: number}} at
   */
  open(at) {}

  /** Closes the menu and gives the focus back to what opened it. */
  close() {}

  /**
   * Makes this menu the pop-up menu of an area.
   * @param {HTMLElement} area
   * @param {object} options
   * @param {(e: Event) => HTMLElement|null} options.target  The thing under the pointer (a list item...), or null for none.
   * @param {(target: HTMLElement) => string} [options.name] Name sent as `menu` in ayni:action.
   */
  attachTo(area, options) {}

  /**
   * Adds an item, or a separator.
   * @param {{label: string, icon?: string, act?: string, kind?: 'item'|'check'|'radio', checked?: boolean,
   *          disabled?: boolean}|'separator'} item
   * @param {number} [index]  Position; at the end when left out.
   * @returns {HTMLElement} The new item.
   */
  add(item, index) {}

  /**
   * Removes an item.
   * @param {HTMLElement|string} item  The item, or its act.
   */
  remove(item) {}

  /**
   * Enables or disables an item.
   * @param {HTMLElement|string} item  The item, or its act.
   * @param {boolean} on
   */
  setItemEnabled(item, on) {}

  /**
   * Checks or unchecks a check or radio item (checking a radio unchecks the others of its group).
   * @param {HTMLElement|string} item  The item, or its act.
   * @param {boolean} on
   */
  setItemChecked(item, on) {}
}
