/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * The taskbar (`.taskbar`), kept clean: only the launcher button at the left, the clock at the right, and one chip
 * per window filling the space between them. An app can add gadgets on either side of the clock. The user puts it at
 * the top or the bottom of the screen from its pop-up menu (right-click, long tap, Shift+F10); the choice is kept in
 * localStorage ('ayni-taskbar-edge').
 * Window chips show only the app icon, except the selected window's chip, which adds the name and the window buttons.
 * @extends Component
 * @fires edge  { edge } when the user moves it to another edge.
 */
class Taskbar extends Component {
  /**
   * @param {HTMLElement} element  The `.taskbar`.
   */
  constructor(element) {}

  /** @type {'top'|'bottom'} Where it sits. Setting it from code saves nothing. */
  get edge() {}
  set edge(edge) {}

  /** @type {Launcher|null} The launcher its first button opens. Read-only. */
  get launcher() {}

  /** @type {HTMLElement[]} The gadgets (`.widget`), the clock included, in order. Read-only. */
  get widgets() {}

  /**
   * Adds a gadget (a `.widget`) next to the clock.
   * @param {HTMLElement} widget
   * @param {'before'|'after'} [side='before']  Left or right of the clock.
   */
  addWidget(widget, side) {}

  /**
   * Removes a widget.
   * @param {HTMLElement} widget
   */
  removeWidget(widget) {}
}
