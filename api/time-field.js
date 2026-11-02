/* Ayni API, skeleton only (2026-11-01): every body is empty. See api/README.md. */

/**
 * A time field (HH:MM, 24 hours): typed, or set in a popup with an hour spinner and a minute spinner (minutes step
 * by 5). Changes apply live; there is no Accept button. A typed text that is not a time shows the red "!". Read-only
 * hides the clock button. Ayni makes the button, the popup, the error message and the placeholder when the page
 * leaves them out.
 * @extends TextField
 * @fires ayni:change  detail `{ value }` ('HH:MM') on every change.
 */
class TimeField extends TextField {
  /**
   * @param {HTMLElement} element  The .input-group with the input (and, optionally, its clock button).
   * @param {object} [options]  Same as TextField, plus:
   * @param {HTMLElement} [options.popup]  The popup holding the .time-row; made when left out.
   * @param {number} [options.minuteStep=5]  Step of the minute buttons.
   */
  constructor(element, options) {}

  /** @type {string} 'HH:MM', or '' when empty or not valid. */
  get value() {}
  set value(text) {}

  /** Opens the popup. */
  open() {}

  /** Closes the popup; the focus goes back to the field's button. */
  close() {}
}
