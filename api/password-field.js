/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A password field with the show/hide button (an eye) at the end of the field.
 * @extends TextField
 */
class PasswordField extends TextField {
  /**
   * @param {HTMLElement} element  The .input-group holding the password input and its `data-reveal` button.
   * @param {object} [options]     Same as TextField.
   */
  constructor(element, options) {}

  /** @type {boolean} True while the password shows as plain text. */
  get revealed() {}
  set revealed(on) {}

  /** Shows the password if it is hidden, hides it if it is shown. */
  toggleReveal() {}
}
