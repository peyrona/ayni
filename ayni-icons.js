/* Ayni icons: the icons the Ayni controls use, one <symbol> per icon on a 24x24 grid, 2px stroke, colour from the
   text. Load before ayni.js; it puts the sprite at the start of <body>, also from file://. In a page write
   <span class="icon" data-icon="search"></span>; Ayni draws it from the icon set in use (Ayni.icons.use() plugs in
   another set) and falls back to these icons for any name the other set does not map. */
(() => {
  const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></symbol>
  <symbol id="i-chev-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
  <symbol id="i-chev-right" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></symbol>
  <symbol id="i-arrow-up" viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></symbol>
  <symbol id="i-arrow-down" viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></symbol>
  <symbol id="i-cut" viewBox="0 0 24 24"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16L19 4M16 16L5 4"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h4"/></symbol>
  <symbol id="i-paste" viewBox="0 0 24 24"><path d="M9 3h6v3H9zM8 5H6v16h12V5h-2"/></symbol>
  <symbol id="i-undo" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/></symbol>
  <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></symbol>
  <symbol id="i-warn" viewBox="0 0 24 24"><path d="M12 3l10 18H2zM12 10v5M12 18v.01"/></symbol>
  <symbol id="i-error" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></symbol>
  <symbol id="i-ok" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v4h4"/></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 6h6l2 2h10v11H3z"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></symbol>
  <symbol id="i-today" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="2.2" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/></symbol>
  <symbol id="i-filter" viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></symbol>
  <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
  <symbol id="i-eye-off" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></symbol>
  <symbol id="i-apps" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></symbol>
  <symbol id="i-more" viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3"/></symbol>
  <symbol id="i-minimise" viewBox="0 0 24 24"><path d="M6 18h12"/></symbol>
  <symbol id="i-maximise" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2"/></symbol>
  <symbol id="i-restore" viewBox="0 0 24 24"><rect x="4" y="8" width="12" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/></symbol>
</svg>`;
  const put = () => { if (!document.getElementById('i-check')) document.body.insertAdjacentHTML('afterbegin', sprite); };
  if (document.body) put(); else document.addEventListener('DOMContentLoaded', put, { once: true });
})();
