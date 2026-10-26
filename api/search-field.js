/* Ayni API, skeleton only (2026-10-26): every body is empty. See api/README.md. */

/**
 * The standard search field (`.search-field`): the magnifier at the right edge, an optional filter button just before
 * it, and a clear button that shows only while there is text. The first Esc clears the field; a second Esc, with the
 * field already empty, closes the popup or dialog around it.
 * @extends TextField
 * @fires ayni:search  detail `{ text }`, on Enter or the magnifier (and after typing stops, with liveDelay).
 * @fires ayni:filter  When the filter button is pressed; the page opens its own filter popup.
 */
class SearchField extends TextField {
  /**
   * @param {HTMLElement} element  The .search-field group.
   * @param {object}  [options]    Same as TextField, plus:
   * @param {boolean} [options.filter=false]  Shows the filter button.
   * @param {number}  [options.liveDelay]     If set, also searches this many ms after typing stops.
   */
  constructor(element, options) {}

  /** @type {boolean} Whether the filter button shows. */
  get filter() {}
  set filter(on) {}

  /** @type {boolean} True while a filter is in use; the filter icon shows it. */
  get filterActive() {}
  set filterActive(on) {}

  /** Searches for the current text, as Enter does. */
  search() {}
}
