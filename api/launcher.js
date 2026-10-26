/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * The applications launcher (`.panel.popup.launcher`), opened by the round default button at the start of the
 * taskbar: a search field and the apps as a list (icon and name), most used first. Typing filters the list, Up and
 * Down move through it, Enter in the field opens the first match. Esc or a click outside closes it. The launch
 * counts are kept in localStorage ('ayni-launch').
 * @extends Component
 * @fires launch  { app, item } when an app is picked; the popup is already closed.
 */
class Launcher extends Component {
  /**
   * @param {HTMLElement} element  The `.panel.popup.launcher`.
   */
  constructor(element) {}

  /** @type {boolean} True while open. */
  get isOpen() {}

  /** @type {Array<{id: string, name: string, icon: string}>} The apps, in the order they show. Read-only. */
  get apps() {}

  /**
   * Adds an app to the list.
   * @param {{id: string, name: string, icon: string}} app
   */
  add(app) {}

  /**
   * Removes an app from the list.
   * @param {string} id
   */
  remove(id) {}

  /** Opens the popup next to its button, with an empty search field focused. */
  open() {}

  /** Closes the popup. */
  close() {}
}
