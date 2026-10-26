/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * The desktop (`.desktop`): the window area (`.area`) and the taskbar. Windows live in the area and never cover the
 * taskbar; a maximised window fills the area. Desktop mode exists only from 1024 px wide: below that the desktop is
 * hidden and the app shows its normal screens (`Ayni.isDesktop()`, `ayni:desktopmode`).
 * @extends Component
 * @fires window  { window, state } when a window opens, is selected, minimised, maximised, restored or closed.
 */
class Desktop extends Component {
  /**
   * @param {HTMLElement} element  The `.desktop`.
   */
  constructor(element) {}

  /** @type {Taskbar} The taskbar. Read-only. */
  get taskbar() {}

  /** @type {Window[]} The open windows, minimised ones included, in the order of their chips. Read-only. */
  get windows() {}

  /** @type {Window|null} The selected window: the one at the front, whose chip shows the window controls. */
  get active() {}
  set active(window) {}

  /**
   * Adds a window to the area, gives it a chip and selects it. New windows open in a cascade from the top left.
   * @param {Window|HTMLElement} window  A `section.panel.window`.
   * @returns {Window}
   */
  open(window) {}
}
