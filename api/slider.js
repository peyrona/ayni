/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A slider with its value shown next to it (`.slider-row`: a range input plus an output).
 * @extends Field
 * @fires input   Native, while it moves.
 * @fires change  Native, when it is released.
 */
class Slider extends Field {
  /**
   * @param {HTMLElement} element  The .slider-row.
   * @param {object} [options]  Same as Field, plus:
   * @param {number} [options.min=0]
   * @param {number} [options.max=100]
   * @param {number} [options.step=1]
   * @param {(value: number) => string} [options.format]  Text shown next to it, e.g. `(v) => v + '%'`.
   */
  constructor(element, options) {}

  /** @type {number} Current value, clamped to min and max. */
  get value() {}
  set value(n) {}

  /** @type {number} */
  get min() {}
  set min(n) {}

  /** @type {number} */
  get max() {}
  set max(n) {}

  /** @type {number} */
  get step() {}
  set step(n) {}

  /** @type {(value: number) => string} Formats the value shown next to the slider. */
  get format() {}
  set format(fn) {}
}
