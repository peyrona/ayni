/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A multi-line text field. Optional, per field: a character count on the field's bottom border ("used / max", needs
 * maxLength) and auto-grow, which makes the field grow with its text up to --autogrow-max and then scroll.
 * @extends TextField
 */
class TextArea extends TextField {
  /**
   * @param {HTMLTextAreaElement|HTMLElement} element  The textarea, or the .ta-wrap holding it and its count.
   * @param {object}  [options]  Same as TextField, plus:
   * @param {boolean} [options.count=false]     Shows the character count (needs maxLength).
   * @param {boolean} [options.autoGrow=false]  Grows with the text instead of scrolling (no resize grip).
   * @param {number}  [options.rows]            Visible rows; the starting height when auto-grow is on.
   */
  constructor(element, options) {}

  /** @type {boolean} Whether the character count shows. */
  get count() {}
  set count(on) {}

  /** @type {boolean} Whether the field grows with its text. */
  get autoGrow() {}
  set autoGrow(on) {}

  /** @type {number} Visible rows. */
  get rows() {}
  set rows(n) {}

  /** Recomputes the height and the count after the text was changed from code. */
  refresh() {}
}
