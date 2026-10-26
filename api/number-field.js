/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A number field with − and + buttons. Holding a button repeats, slowly and then faster; Up/Down and Page Up/Down step
 * by 1 and 10 steps. − is disabled at the minimum and + at the maximum. A typed value that is not a number or is out of
 * range shows the red "!".
 * @extends Field
 * @fires change  Native, when the value changes.
 */
class NumberField extends Field {
  /**
   * @param {HTMLElement} element  The .spin group (input plus its two buttons).
   * @param {object} [options]  Same as Field, plus:
   * @param {number} [options.min]
   * @param {number} [options.max]
   * @param {number} [options.step=1]  Also sets how many decimals show.
   */
  constructor(element, options) {}

  /** @type {number|null} Current value, or null when empty or not a number. Setting it rounds to step and clamps. */
  get value() {}
  set value(n) {}

  /** @type {number|null} Smallest value, or null for none. */
  get min() {}
  set min(n) {}

  /** @type {number|null} Largest value, or null for none. */
  get max() {}
  set max(n) {}

  /** @type {number} Size of one step. */
  get step() {}
  set step(n) {}

  /**
   * Adds a number of steps (negative to subtract), clamped to min and max.
   * @param {number} [count=1]
   */
  stepBy(count) {}
}
