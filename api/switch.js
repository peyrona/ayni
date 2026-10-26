/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A one-sided switch: on or off, label at the left, takes effect at once. It does the same job as one check box.
 * A two-sided switch (two labels, one choice of two) is a RadioGroup.
 * @extends CheckBox
 * @fires change  Native.
 */
class Switch extends CheckBox {
  /**
   * @param {HTMLInputElement|HTMLLabelElement} element  The `role="switch"` input, or its `label.switch`.
   * @param {object} [options]  Same as Field.
   */
  constructor(element, options) {}

  /** @type {boolean} Whether the switch is on. Same as checked. */
  get on() {}
  set on(value) {}
}
