/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A menu bar (`role="menubar"`): a row of entries, each opening a Menu. Left and Right move along the bar, Down opens
 * the menu, and while one menu is open, moving to another entry opens that one instead.
 * @extends Component
 */
class MenuBar extends Component {
  /**
   * @param {HTMLElement} element  The menu bar.
   */
  constructor(element) {}

  /** @type {Menu[]} The menus, in order. Read-only. */
  get menus() {}

  /** @type {Menu|null} The open menu, or null. Read-only. */
  get openMenu() {}

  /**
   * Opens one of the menus.
   * @param {Menu|number} menu  The menu, or its index.
   */
  open(menu) {}

  /** Closes the open menu. */
  close() {}
}
