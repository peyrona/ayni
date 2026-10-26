/* Gallery demo icons: the icons the gallery's examples use that no Ayni control needs (save, print, bold...). An app
   brings its own icons the same way: symbols with id "i-<name>" are drawn by <span class="icon" data-icon="name">
   whenever the icon set in use does not map that name. These are examples, in the same style as ayni-icons.js. */
(() => {
  const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-new" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v4h4M12 11v6M9 14h6"/></symbol>
  <symbol id="i-open" viewBox="0 0 24 24"><path d="M3 6h6l2 2h10v11H3z"/></symbol>
  <symbol id="i-save" viewBox="0 0 24 24"><path d="M5 3h11l3 3v15H5zM8 3v5h8V3M8 21v-7h8v7"/></symbol>
  <symbol id="i-redo" viewBox="0 0 24 24"><path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/></symbol>
  <symbol id="i-settings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></symbol>
  <symbol id="i-user" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></symbol>
  <symbol id="i-home" viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 9v12h14V9"/></symbol>
  <symbol id="i-bold" viewBox="0 0 24 24"><path d="M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z"/></symbol>
  <symbol id="i-italic" viewBox="0 0 24 24"><path d="M10 4h8M6 20h8M14 4l-4 16"/></symbol>
  <symbol id="i-underline" viewBox="0 0 24 24"><path d="M7 4v7a5 5 0 0 0 10 0V4M5 21h14"/></symbol>
  <symbol id="i-align-l" viewBox="0 0 24 24"><path d="M4 6h16M4 10h10M4 14h16M4 18h10"/></symbol>
  <symbol id="i-align-c" viewBox="0 0 24 24"><path d="M4 6h16M7 10h10M4 14h16M7 18h10"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
  <symbol id="i-window" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></symbol>
  <symbol id="i-list" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></symbol>
  <symbol id="i-text" viewBox="0 0 24 24"><path d="M5 6V4h14v2M12 4v16M9 20h6"/></symbol>
  <symbol id="i-button" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="10" rx="3"/><path d="M9 12h6"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></symbol>
  <symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/></symbol>
  <symbol id="i-table" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></symbol>
  <symbol id="i-tree" viewBox="0 0 24 24"><path d="M4 3h6v4H4zM14 9h6v4h-6zM14 17h6v4h-6zM7 7v12h7M7 11h7"/></symbol>
  <symbol id="i-layout" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M10 4v16M10 12h11"/></symbol>
  <symbol id="i-sliders" viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></symbol>
  <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 15V4M7 9l5-5 5 5M4 15v5h16v-5"/></symbol>
  <symbol id="i-share" viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/></symbol>
  <symbol id="i-print" viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 17H4v-8h16v8h-3M7 14h10v7H7z"/></symbol>
  <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></symbol>
</svg>`;
  const put = () => { if (!document.getElementById('i-save')) document.body.insertAdjacentHTML('afterbegin', sprite); };
  if (document.body) put(); else document.addEventListener('DOMContentLoaded', put, { once: true });
})();
