/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A window (`section.panel.window`) on the desktop. It is a Panel: a title row with the app's icon and name at the
 * left followed by the app's toolbar, and the content below, which scrolls only when it does not fit. A window has
 * no minimise, maximise or close buttons of its own: they are in its taskbar chip, shown while it is selected.
 * The title row moves it, any edge or corner resizes it (no snapping), double-click on the title row maximises or
 * restores it, and its title row always stays inside the window area.
 * Exposed as `Ayni.Window`, so it never clashes with the browser's `window`.
 * @extends Component
 * @fires window  { window, state } with state open, select, minimise, maximise, restore or close.
 * @fires close   Cancelable, before it closes: preventDefault() keeps it open (e.g. to ask about unsaved changes).
 */
class Window extends Component {
  /**
   * @param {HTMLElement} element  The `section.panel.window`.
   * @param {object} [options]
   * @param {string} [options.title]  The app's name, in the title row and the chip.
   * @param {string} [options.icon]   The app's icon name.
   */
  constructor(element, options) {}

  /** @type {string} The app's name, in the title row and the chip. */
  get title() {}
  set title(text) {}

  /** @type {string} The app's icon, in the title row and the chip. */
  get icon() {}
  set icon(name) {}

  /** @type {Toolbar|null} The toolbar in the title row. Read-only. */
  get toolbar() {}

  /** @type {'normal'|'minimised'|'maximised'} Read-only; use the methods to change it. */
  get state() {}

  /** @type {boolean} True while it is the selected window. Read-only. */
  get active() {}

  /** Brings it to the front and selects its chip; a minimised window shows again. */
  select() {}

  /** Hides it; its chip stays in the taskbar, and the window behind it is selected. */
  minimise() {}

  /** Fills the window area. */
  maximise() {}

  /** Back to its size and place from before it was maximised. */
  restore() {}

  /**
   * Closes it and removes its chip, unless an ayni:close listener cancels.
   * @returns {boolean} False when it was kept open.
   */
  close() {}
}
