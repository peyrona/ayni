/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A calendar (`.cal`), inline or inside the popup of a date field. Its title switches from days to months to years;
 * picking a month or a year goes back to the days. Days outside min and max can't be picked.
 * @extends Field
 * @fires ayni:change  detail `{ date }` when a day is picked.
 */
class Calendar extends Field {
  /**
   * @param {HTMLElement} element  The .cal element.
   * @param {object} [options]  Same as Field, plus:
   * @param {Date}   [options.value]  Selected day; today when left out.
   * @param {Date}   [options.min]    Earliest day (also data-min, YYYY-MM-DD).
   * @param {Date}   [options.max]    Latest day (also data-max, YYYY-MM-DD).
   */
  constructor(element, options) {}

  /** @type {Date|null} Selected day. */
  get value() {}
  set value(date) {}

  /** @type {Date|null} Earliest day, or null for none. */
  get min() {}
  set min(date) {}

  /** @type {Date|null} Latest day, or null for none. */
  get max() {}
  set max(date) {}

  /** @type {'days'|'months'|'years'} What the calendar shows. */
  get view() {}
  set view(view) {}

  /**
   * Shows the month that holds a day, without selecting it.
   * @param {Date} date
   */
  show(date) {}
}
