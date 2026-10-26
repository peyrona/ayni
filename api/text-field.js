/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * A one-line text field. Wraps an `<input class="input">`, alone or inside an `.input-group` with buttons inside the
 * field, at the start and/or the end. The hint goes in the placeholder, never in a message below the field.
 * @extends Field
 * @fires input   Native, on every keystroke.
 * @fires change  Native, when the value is committed.
 */
class TextField extends Field {
  /**
   * @param {HTMLInputElement|HTMLElement} element  The input, or the .input-group around it.
   * @param {object} [options]  Same as Field, plus:
   * @param {string} [options.placeholder]  Hint shown while the field is empty.
   * @param {number} [options.maxLength]    Maximum number of characters.
   */
  constructor(element, options) {}

  /** @type {string} Current text. */
  get value() {}
  set value(text) {}

  /** @type {string} Hint shown while the field is empty. */
  get placeholder() {}
  set placeholder(text) {}

  /** @type {number|null} Maximum number of characters, or null for no limit. */
  get maxLength() {}
  set maxLength(n) {}

  /** @type {HTMLInputElement|HTMLTextAreaElement} The input itself, also when the field is a group. Read-only. */
  get input() {}

  /** @type {Button[]} The buttons inside the field, from start to end. Read-only. */
  get buttons() {}

  /**
   * Adds a button inside the field.
   * @param {Button|HTMLButtonElement} button
   * @param {'start'|'end'} [at='end']
   */
  addButton(button, at) {}

  /**
   * Removes a button from inside the field.
   * @param {Button|HTMLButtonElement} button
   */
  removeButton(button) {}

  /** Selects all the text. */
  select() {}

  /** Empties the field. */
  clear() {}
}
