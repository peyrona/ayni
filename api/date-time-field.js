/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A date and time field (YYYY-MM-DD HH:MM): typed, or edited in a popup with a calendar plus hour and minute fields.
 * Changes apply live; there is no Accept button.
 * @extends DateField
 * @fires ayni:change  detail `{ date }` on every change.
 */
class DateTimeField extends DateField {
  /**
   * @param {HTMLElement} element
   * @param {object} [options]  Same as DateField, plus:
   * @param {Date}   [options.value]         Starting value; now when left out.
   * @param {number} [options.minuteStep=1]  Step of the minute buttons.
   */
  constructor(element, options) {}

  /** @type {number} Hours, 0 to 23. */
  get hours() {}
  set hours(h) {}

  /** @type {number} Minutes, 0 to 59. */
  get minutes() {}
  set minutes(m) {}

  /** @type {number} Step of the minute buttons. */
  get minuteStep() {}
  set minuteStep(n) {}
}
