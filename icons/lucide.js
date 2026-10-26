/* Ayni icon map for Lucide (https://lucide.dev, ISC licence), checked against lucide-static 1.50.0. Lucide is not
   included: Ayni.icons.use() fetches its sprite from the CDN below. Load this file after ayni.js, then
     Ayni.icons.use(Ayni.icons.lucide);
   For a copy of Lucide's sprite.svg on your own server, or to map your app's own icon names too:
     Ayni.icons.use({ ...Ayni.icons.lucide, sprite: 'lib/lucide-sprite.svg', map: { ...Ayni.icons.lucide.map, save: 'save' } }); */
Ayni.icons.lucide = {
  sprite: 'https://cdn.jsdelivr.net/npm/lucide-static@1.50.0/sprite.svg',
  stroke: true,
  map: {
    'arrow-down': 'arrow-down',
    'arrow-up': 'arrow-up',
    calendar: 'calendar',
    check: 'check',
    'chev-down': 'chevron-down',
    'chev-right': 'chevron-right',
    close: 'x',
    copy: 'copy',
    cut: 'scissors',
    edit: 'pencil',
    error: 'circle-x',
    eye: 'eye',
    'eye-off': 'eye-off',
    file: 'file',
    filter: 'funnel',
    folder: 'folder',
    help: 'circle-question-mark',
    info: 'info',
    minus: 'minus',
    ok: 'circle-check',
    paste: 'clipboard-paste',
    plus: 'plus',
    search: 'search',
    today: 'calendar-check',
    trash: 'trash',
    undo: 'undo-2',
    warn: 'triangle-alert',
  },
};
