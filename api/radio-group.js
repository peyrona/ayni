/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * One choice of several: a group of radio buttons, or a two-sided switch (`.switch-pair`), which works like two
 * radios with a track between them and a label on each side.
 * @extends Field
 * @fires change  Native, on the radio that was picked.
 */
class RadioGroup extends Field {
  /**
   * @param {HTMLElement} element  The `role="radiogroup"` element.
   * @param {object} [options]  Same as Field.
   */
  constructor(element, options) {}

  /** @type {string|null} Value (or label text) of the chosen option, or null when none is chosen. */
  get value() {}
  set value(value) {}

  /** @type {number} Index of the chosen option, or -1 when none is chosen. */
  get selectedIndex() {}
  set selectedIndex(i) {}

  /** @type {Array<{value: string, label: string, enabled: boolean}>} The options, in order. Read-only. */
  get options() {}

  /** @type {boolean} True for a two-sided switch. Read-only (it comes from the markup). */
  get isSwitch() {}

  /**
   * Enables or disables one option.
   * @param {string|number} option  The option's value or index.
   * @param {boolean} on
   */
  setOptionEnabled(option, on) {}
}
