/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A check box with its label. Multi-select lists use their own small squares, not this class.
 * @extends Field
 * @fires change  Native.
 */
class CheckBox extends Field {
  /**
   * @param {HTMLInputElement|HTMLLabelElement} element  The checkbox input, or the label that holds it.
   * @param {object} [options]  Same as Field.
   */
  constructor(element, options) {}

  /** @type {boolean} Whether it is checked. Same as checked. */
  get value() {}
  set value(on) {}

  /** @type {boolean} */
  get checked() {}
  set checked(on) {}

  /** @type {string} Label text. */
  get label() {}
  set label(text) {}

  /** Flips the value, as a click would (does nothing while read-only or disabled). */
  toggle() {}
}
