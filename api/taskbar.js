/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * The taskbar (`.taskbar`): the launcher button at the start, the window selector (one chip per window) in the
 * middle, the widgets (clock, weather, any app widget) at the end. The user glues it to any of the four screen edges
 * from its pop-up menu (right-click, long tap, Shift+F10); the choice is kept in localStorage ('ayni-taskbar-edge').
 * On a side edge the chips show only their icon, with the name in the tooltip.
 * @extends Component
 * @fires edge  { edge } when the user moves it to another edge.
 */
class Taskbar extends Component {
  /**
   * @param {HTMLElement} element  The `.taskbar`.
   */
  constructor(element) {}

  /** @type {'top'|'bottom'|'left'|'right'} The screen edge it is glued to. Setting it from code saves nothing. */
  get edge() {}
  set edge(edge) {}

  /** @type {Launcher|null} The launcher its first button opens. Read-only. */
  get launcher() {}

  /** @type {HTMLElement[]} The widgets, in order. Read-only. */
  get widgets() {}

  /**
   * Adds a widget (a `.widget`) to the widgets area.
   * @param {HTMLElement} widget
   * @param {number} [index]  Position; at the end when left out.
   */
  addWidget(widget, index) {}

  /**
   * Removes a widget.
   * @param {HTMLElement} widget
   */
  removeWidget(widget) {}
}
