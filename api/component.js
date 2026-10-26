/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * Base class of every Ayni control. Holds the wrapped element, the enabled state and the event helpers.
 */
class Component {
  /**
   * Wraps an element that is already in the page. A second instance for the same element returns the first one.
   * @param {HTMLElement} element  The control's root element.
   * @param {object} [options]     Options of the subclass.
   */
  constructor(element, options) {}

  /** @type {HTMLElement} The wrapped element. Read-only. */
  get element() {}

  /** @type {boolean} False shows the control faded and ignores input; it can't be focused. */
  get enabled() {}
  set enabled(on) {}

  /** Moves the keyboard focus to the control. */
  focus() {}

  /**
   * Listens to one of the control's ayni:* events.
   * @param {string} type                  Event name without the prefix, e.g. 'press' for ayni:press.
   * @param {(e: CustomEvent) => void} fn  Handler; e.detail holds the data.
   * @returns {() => void} A function that removes the listener.
   */
  on(type, fn) {}

  /**
   * Removes a listener added with on().
   * @param {string} type
   * @param {(e: CustomEvent) => void} fn
   */
  off(type, fn) {}

  /** Unwires the control: removes its listeners and forgets the instance. The markup stays. */
  destroy() {}
}
