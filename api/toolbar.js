/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A toolbar (`role="toolbar"`): a row of buttons with one Tab stop; arrow keys, Home and End move inside it. Separators
 * split it into groups.
 * @extends Component
 */
class Toolbar extends Component {
  /**
   * @param {HTMLElement} element  The toolbar.
   */
  constructor(element) {}

  /** @type {Button[]} The buttons, in order. Read-only. */
  get buttons() {}

  /**
   * Adds a button, or a separator.
   * @param {Button|HTMLButtonElement|'separator'} button
   * @param {number} [index]  Position; at the end when left out.
   */
  add(button, index) {}

  /**
   * Removes a button.
   * @param {Button|HTMLButtonElement} button
   */
  remove(button) {}
}
