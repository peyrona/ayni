/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A date field (YYYY-MM-DD): typed, or picked in the calendar popup that its button opens. A typed text that is not a
 * date shows the red "!". Read-only hides the calendar button.
 * @extends TextField
 * @fires ayni:change  detail `{ date }` on every valid change.
 */
class DateField extends TextField {
  /**
   * @param {HTMLElement} element  The .input-group with the input and the calendar button.
   * @param {object} [options]  Same as TextField, plus:
   * @param {HTMLElement} [options.popup]  The popup holding the .cal; found through the button when left out.
   * @param {Date} [options.min]
   * @param {Date} [options.max]
   */
  constructor(element, options) {}

  /** @type {Date|null} Current date, or null when empty or not valid. */
  get date() {}
  set date(date) {}

  /** @type {Date|null} */
  get min() {}
  set min(date) {}

  /** @type {Date|null} */
  get max() {}
  set max(date) {}

  /** @type {Calendar} The calendar in the popup. Read-only. */
  get calendar() {}

  /** @type {boolean} True while the popup is open. */
  get isOpen() {}

  /** Opens the calendar popup on the current date. */
  open() {}

  /** Closes the calendar popup. */
  close() {}
}
