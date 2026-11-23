/* Ayni library 0.4.0, a desktop of whole pages: windows that hold a page each, in a frame. Moving, sizing, Tile, Scale, sticky halves, a window
   that remembers its place, the switcher, the on-screen keyboard, the "⋮" with the window and bar options. Plain JavaScript, no build step,
   evergreen browsers 2024+. Optional: a plain script, without defer, with ayni-deskpage.css, ayni-tiling.js and ayni-icons-more.js, called from
   a script at the end of <body>. With no #desktop on the page it puts its own markup there (MARKUP, below).
     var D = Ayni.deskPage( hooks )
   hooks, each optional: appName; icon, the menu button's picture (a URL); APPS { app: { name, svg } }; NARROW, SHORT { app: px }; appsReady,
   a promise; appOf( url ), the app a page belongs to; openMenu(), closeMenu(), the app's launcher in #menu; placeUnread(), pokeUnread(),
   placeMail(), askMail(), placePlanner(), the app's marks on the chips. D holds what the page needs back, the slots for the app's own parts
   (addWidget( el, where ), addMenuSection( el, where ), addPopup( el ), relayout()) and this device's settings (set, saveSet(), store( key,
   value ), KEYS). A gadget with a timer, a fetch or a device of its own (a clock, the weather...) is the app's: it goes in the slots.
   A page in a window says what it holds with window.ayniDocPath, and may hold the close with window.ayniBeforeClose. Rules: chapter 17.4. */
( function ()
{
    var NAMES = window.AyniNames || {}, KEYS = NAMES.deskKey || 'ayni-';

    // THE MARKUP (2026-11-23; until then the app's page held it): what deskPage puts on a page with no #desktop
    // of its own. The ids are the ones the code below finds. {icon}: the menu button's picture (hooks.icon).
    var MARKUP = [
        '<div class="desktop" id="desktop" data-edge="bottom" data-mode="app">',
        // THE DESK - the windows; a right-click or a long press on an empty spot of it (.desk-empty) opens the "⋮".
        '    <main class="area desk" id="desk"><div class="desk-empty"></div><div class="snap-ghost" id="snapGhost" hidden></div></main>',
        // THE BAR - the menu button (it opens the app's launcher, #menu), one chip per window, then the gadgets:
        // the app's (addWidget), the "⋮" and the "?" of the help card (Ayni.help).
        '    <nav class="taskbar" id="bar" data-i18n-attr="aria-label:ayni.desk.taskbar">',
        '        <button class="btn" id="menuBtn" data-i18n-attr="data-tip:ayni.desktop.apps" data-tip="Apps">{icon}</button>',
        '        <div class="chips" id="tasks" role="group" data-i18n-attr="aria-label:ayni.desktop.switchWin"></div>',
        '        <div class="widgets">',
        '        <button id="moreBtn" class="btn" type="button" popovertarget="moreMenu" data-i18n-attr="data-tip:ayni.more, aria-label:ayni.more"><span class="icon" data-icon="more"></span></button>',
        '        <button id="helpBtn" class="btn" data-help-open type="button" data-i18n-attr="data-tip:ayni.help, aria-label:ayni.help"><span class="icon" data-icon="help"></span></button>',
        '        </div>',
        '    </nav>',
        // THE MENU - the app's launcher goes in here; the app opens and closes it (hooks.openMenu, closeMenu).
        '    <div class="menu" id="menu" hidden></div>',
        // MORE - the "⋮": Ayni's popup with controls. Every change applies at once and leaves it open. The app's
        // own sections go before, between or after these three (addMenuSection).
        '    <div class="panel popup controls tall" id="moreMenu" popover data-i18n-attr="aria-label:ayni.more">',
        // WINDOWS - how the windows behave on the desk.
        '        <h4 id="moreWindows" data-i18n="ayni.desktop.windowsLabel"></h4>',
        // TILE - one switch for the whole desk (see TILE / UNTILE): Free <-> Tile.
        '        <div class="switch-pair" role="radiogroup" id="tileSw" data-i18n-attr="aria-label:ayni.desktop.tileTip, data-tip:ayni.desktop.tileTip">',
        '            <label><input type="radio" name="tileSw" id="tileOff" checked><span data-i18n="ayni.desktop.tileFree"></span></label>',
        '            <span class="track" aria-hidden="true"></span>',
        '            <label><input type="radio" name="tileSw" id="tileOn"><span data-i18n="ayni.desktop.tileOn"></span></label>',
        '        </div>',
        // STICKY WINDOWS - on: a window dropped on an edge of the desk takes that half (see drag).
        '        <label class="switch end"><span class="icon" data-icon="window-half"></span><span data-i18n="ayni.desktop.sticky"></span><span class="info-tip" role="button" tabindex="0" data-i18n-attr="data-help:ayni.desktop.stickyInfo"></span><input role="switch" type="checkbox" id="stickyChk"></label>',
        // SCALE ON OPEN - new windows start with Scale on (set.scaleNew; see SCALE).
        '        <label class="switch end"><span class="icon" data-icon="window-scale"></span><span data-i18n="ayni.desktop.scaleNew"></span><span class="info-tip" role="button" tabindex="0" data-i18n-attr="data-help:ayni.desktop.scaleNewInfo"></span><input role="switch" type="checkbox" id="scaleNewChk"></label>',
        // THE BAR - its side of the screen and its height (its width when at a side).
        '        <h4 id="moreBar" data-i18n="ayni.desktop.barLabel"></h4>',
        '        <div class="set-row"><label for="setBar" data-i18n="ayni.desktop.barPos"></label>',
        '            <div class="picker" id="setBar"><input type="hidden" value="bottom"><div class="panel popup picker-pop" popover="manual"><ul role="listbox"><li role="option" data-value="top" data-i18n="ayni.desktop.barTop"></li><li role="option" data-value="bottom" data-i18n="ayni.desktop.barBottom"></li><li role="option" data-value="left" data-i18n="ayni.desktop.barLeft"></li><li role="option" data-value="right" data-i18n="ayni.desktop.barRight"></li></ul></div></div></div>',
        '        <div class="set-row"><label for="setBarH" data-i18n="ayni.desktop.barHeight"></label>',
        '            <span class="slider-row"><input type="range" id="setBarH" min="36" max="72" step="2"><output id="setBarHOut" for="setBarH"></output></span></div>',
        // OTHER - what fits no section above: the raised look (and the app's rows, before it).
        '        <h4 id="moreOther" data-i18n="ayni.desktop.othersLabel"></h4>',
        // BEVEL - set.bevel (default on): buttons, tabs, switches and splitters look raised, here and in every window.
        '        <label class="switch end" id="bevelRow"><span data-i18n="ayni.desktop.bevel"></span><span class="info-tip" role="button" tabindex="0" data-i18n-attr="data-help:ayni.desktop.bevelInfo"></span><input role="switch" type="checkbox" id="bevelChk"></label>',
        '    </div>',
        // WINDOW SWITCHER - Alt pressed and let go on its own (see SWITCHER).
        '    <div class="switcher" id="switcher" role="listbox" hidden data-i18n-attr="aria-label:ayni.desktop.switchWin"></div>',
        '</div>'
    ].join( '\n' );

    Ayni.deskPage = function ( h )
    {
    // Any hook left out does nothing: a page with no launcher, no unread counts...
    var noop = function () {};
    h = Object.assign( { appName: '', APPS: {}, NARROW: {}, SHORT: {}, appsReady: Promise.resolve(), appOf: function () { return ''; },
                         openMenu: noop, closeMenu: noop, placeUnread: noop, pokeUnread: noop, placeMail: noop, askMail: noop }, h );

    // The page's markup, unless it brings its own (see MARKUP).
    if( ! document.getElementById( 'desktop' ) )
    {
        var pic = h.icon ? '<img src="' + Ayni.esc( h.icon ) + '" alt="">' : Ayni.icon( 'grid' );
        document.body.insertAdjacentHTML( 'afterbegin', MARKUP.replace( '{icon}', function () { return pic; } ) );
    }

    // A new tooltip. This script runs as the page is read, before Ayni (a
    // deferred script) is in: until then the tooltip is only written down.
    function setTip( el, text )
    {
        if( window.Ayni && Ayni.setTip ) Ayni.setTip( el, text ); else el.dataset.tip = text;
    }

    var ROOT    = NAMES.home || '/';
    var desktop = document.getElementById( 'desktop' );
    var desk    = document.getElementById( 'desk' );
    var bar     = document.getElementById( 'bar' );
    var tasks   = document.getElementById( 'tasks' );
    var menu    = document.getElementById( 'menu' );
    var menuBtn = document.getElementById( 'menuBtn' );
    var ghost   = document.getElementById( 'snapGhost' );

    var ICON_WIN = Ayni.icon( 'window' );

    function t( key, fallback )
    {
        var s = window.Ayni ? Ayni.t( key ) : key;
        return ( ! s || s === key ) ? ( fallback || key ) : s;
    }

    function store( key, val )
    {
        try { if( val === undefined ) return JSON.parse( localStorage.getItem( key ) || 'null' ); localStorage.setItem( key, JSON.stringify( val ) ); }
        catch( e ) { return null; }
    }

    //------------------------------------------------------------------------//
    // SETTINGS - this device's desktop (a PC and a tablet can each want their
    // own), in localStorage "desktop"; set from the "⋮" menu (see MORE). The app's
    // gadgets keep their choices in the same object (D.set, D.saveSet).

    var SET_KEY = KEYS + 'desktop';
    var set = { bar: 'bottom', barH: 48, sticky: true };     // the app's gadgets add their own keys (until 2026-11-23 the clock's were here)
    Object.assign( set, store( SET_KEY ) || {} );
    // Until 2026-09-26 the desktop had its own colour schemes; they now follow the account's.
    // Until 2026-09-28 it had "Start with" and a bar font too (dropped with the settings dialog).
    delete set.scheme; delete set.active; delete set.schemes; delete set.start; delete set.font;
    if( [ 'top', 'bottom', 'left', 'right' ].indexOf( set.bar ) < 0 ) set.bar = 'bottom';
    function saveSet() { store( SET_KEY, set ); }

    // TOUCH - a touch screen (a tablet, with or without its mouse): body.touch
    // makes the resize edges, the window buttons and the bar finger-sized (the
    // bar at least 56px, whatever the menu's slider says), and a long press on
    // the desk opens the "⋮" menu (see the desk's contextmenu). A PC with no
    // touch screen sees no change.
    var coarse = window.matchMedia( '(any-pointer: coarse)' );
    var TOUCH_BAR_H = 56;

    // One body class for the bar's side (bar-top, bar-bottom, bar-left, bar-right),
    // plus bar-side for left and right; and body.touch.
    function applyLayout()
    {
        [ 'top', 'bottom', 'left', 'right' ].forEach( function ( p ) { document.body.classList.toggle( 'bar-' + p, set.bar === p ); } );
        document.body.classList.toggle( 'bar-side', set.bar === 'left' || set.bar === 'right' );
        desktop.dataset.edge = set.bar;     // Ayni's taskbar goes by it; the page's own rules by the body classes
        document.body.classList.toggle( 'touch', coarse.matches );
        var h = Math.max( 36, Math.min( 72, +set.barH || 48 ) );
        document.documentElement.style.setProperty( '--bar-h', ( coarse.matches ? Math.max( TOUCH_BAR_H, h ) : h ) + 'px' );
    }

    applyLayout();
    if( coarse.addEventListener ) coarse.addEventListener( 'change', applyLayout );

    //------------------------------------------------------------------------//
    // WINDOWS

    var wins  = [];     // in the order they were opened = the order of the bar buttons
    var zTop  = 10;
    var front = null;

    // The smallest a window gets (.win's min-width / min-height too). With Scale
    // on there is no smallest: it shrinks what it shows instead (see SCALE).
    var MIN_W = 320, MIN_H = 200;

    function deskRect() { return { w: desk.clientWidth, h: desk.clientHeight }; }

    // opts.fresh: a new window even if the app has one; opts.geom: {l,t,w,h} to
    // restore; opts.nav: an app already open goes to `url` (a notification, "big files").
    function openApp( url, opts )
    {
        opts = opts || {};
        var app = h.appOf( url );
        if( app && ! opts.fresh )
            for( var i = 0; i < wins.length; i++ )
                if( wins[ i ].app === app ) { reuse( wins[ i ], url, opts.nav ); return wins[ i ]; }

        var info = h.APPS[ app ] || { name: app ? app.charAt( 0 ).toUpperCase() + app.slice( 1 ) : h.appName, svg: ICON_WIN };
        var w = { app: app, name: info.name, svg: info.svg, url: '', pre: null,
                  scale: !! set.scaleNew, nat: null, s: 1, g: null };     // see SCALE; the menu's "Scale on open" sets the default

        var el = document.createElement( 'div' );
        el.className = 'win';
        el.innerHTML =
            '<div class="win-bar">' + info.svg + '<span class="win-title"></span></div>' +
            '<iframe class="win-frame" data-ayni-window></iframe>' +
            [ 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw' ].map( function ( d ) { return '<div class="grip ' + d + '" data-dir="' + d + '"></div>'; } ).join( '' );
        el.querySelector( '.win-title' ).textContent = info.name;

        var g = opts.geom, last = g ? null : ( store( LAST_KEY ) || {} )[ app ];
        if( g )
        {
            // a saved window: "123px" strings, plus its Scale (see SCALE)
            w.scale = !! g.scale; w.nat = g.nat || null;
            g = { l: parseFloat( g.l ) || 0, t: parseFloat( g.t ) || 0, w: parseFloat( g.w ) || 0, h: parseFloat( g.h ) || 0 };
        }
        else if( last )
        {
            // where this app's window was when last closed (LAST), kept inside the desk
            var d = deskRect();
            g = { w: Math.min( last.w, d.w ), h: Math.min( last.h, d.h ) };
            g.l = Math.max( 0, Math.min( last.l, d.w - g.w ) );
            g.t = Math.max( 0, Math.min( last.t, d.h - g.h ) );
            if( last.max ) el.classList.add( 'max' );
        }
        else
        {
            // 70% x 82% of the desk, each new one 32px down-right of the last;
            // a one-column app (a list) no wider than it needs (h.NARROW).
            var r = deskRect();
            var W = Math.min( h.NARROW[ app ] || 1100, Math.round( r.w * 0.7 ) ), H = Math.min( h.SHORT[ app ] || 780, Math.round( r.h * 0.82 ) );
            var n = wins.length % 6;
            g = { l: Math.max( 0, Math.round( ( r.w - W ) / 2 ) - 80 + n * 32 ), t: Math.max( 0, 24 + n * 32 ), w: W, h: H };
        }

        // Its chip on the bar (Ayni's markup; see ayni-desktop.css). The window's buttons
        // show on the chip of the window in front only.
        var chip = document.createElement( 'div' );
        chip.className = 'chip';
        chip.setAttribute( 'role', 'group' );
        chip.setAttribute( 'aria-label', info.name );
        chip.innerHTML = '<button class="chip-main" type="button">' + info.svg + '<span></span></button><span class="chip-ctl">' +
            CTL.map( function ( d ) { return '<button class="btn" type="button" data-win="' + d[ 0 ] + '">' + d[ 3 ] + '</button>'; } ).join( '' ) +
            '</span>';
        var main = chip.querySelector( '.chip-main' );
        main.querySelector( 'span:not(.icon)' ).textContent = info.name;
        setTip( main, info.name );
        CTL.forEach( function ( d )
        {
            if( ! d[ 1 ] ) return;              // Scale / Resize: see paintScale
            var b = chip.querySelector( '[data-win="' + d[ 0 ] + '"]' );
            setTip( b, t( d[ 1 ], d[ 2 ] ) );
            b.setAttribute( 'aria-label', b.dataset.tip );
        } );

        w.el = el; w.chip = chip; w.main = main; w.frame = el.querySelector( 'iframe' );
        wins.push( w );
        desk.appendChild( el );
        place( w, g );
        tasks.appendChild( chip );

        wire( w );
        if( url ) w.frame.src = url;
        focus( w );
        h.placeUnread();
        h.placeMail();
        if( h.placePlanner ) h.placePlanner();
        retile();
        upright();
        return w;
    }

    function reuse( w, url, nav )
    {
        focus( w );
        if( ! nav || ! url ) return;
        var u = new URL( url, location.href ), want = u.pathname + u.search + u.hash;
        // Chat is never reloaded (it may be in a call): it is told which chat to show.
        if( w.app === 'chat' )
        {
            try
            {
                var cw = w.frame.contentWindow;
                cw.navigator.serviceWorker.dispatchEvent( new cw.MessageEvent( 'message', { data: { open: u.href } } ) );
            }
            catch( e ) {}
            return;
        }
        if( w.url !== want ) w.frame.src = want;
    }

    function setTitle( w, text, tip, pill )
    {
        w.el.querySelector( '.win-title' ).textContent = text;
        w.main.querySelector( 'span:not(.icon)' ).textContent = pill || text;
        w.chip.setAttribute( 'aria-label', text );
        setTip( w.main, tip || text );
    }

    function focus( w )
    {
        if( deskHid ) { deskHid = null; paintDesk(); }     // a window coming forward ends "Show the desk"
        var back = w.el.hidden;     // brought back from the bar: it was minimised
        if( back ) w.el.hidden = false;
        w.el.style.zIndex = ++zTop;
        var was = front;
        front = w;
        paint();
        w.chip.scrollIntoView( { block: 'nearest', inline: 'nearest' } );     // many windows: the row or column of chips scrolls
        saveWins();
        if( back ) { queueMeasure( w ); retile(); }
        if( was && was !== w && was.app === 'chat' ) h.pokeUnread();
        if( was && was !== w && was.app === 'email' ) h.askMail();
        kbFit();
    }

    function minimise( w )
    {
        w.el.hidden = true;
        if( front === w ) front = topmost();
        paint();
        saveWins();
        retile();
    }

    // SHOW THE DESK (2026-11-12) - every window out of the way at once, and a
    // second press brings the same ones back, in the same order (the one in
    // front last). Optional #deskBtn is its toggle (aria-pressed while on);
    // showDesk( true / false / nothing = flip ) is the same from a page. A
    // window brought forward any other way ends it (see focus). Windows that
    // were minimised already stay minimised; a reload finds them all minimised.
    var deskHid = null;     // the windows it hid, bottom first; null = off
    var deskBtn = document.getElementById( 'deskBtn' );

    function paintDesk() { if( deskBtn ) deskBtn.setAttribute( 'aria-pressed', deskHid ? 'true' : 'false' ); }

    function showDesk( on )
    {
        if( on == null ) on = ! deskHid;
        if( on && ! deskHid )
        {
            var up = wins.filter( function ( w ) { return ! w.el.hidden; } )
                         .sort( function ( a, b ) { return +a.el.style.zIndex - +b.el.style.zIndex; } );
            if( ! up.length ) return;     // nothing in the way
            deskHid = up;
            up.forEach( function ( w ) { w.el.hidden = true; } );
            front = topmost();
            paint();
            saveWins();
            retile();
        }
        else if( ! on && deskHid )
        {
            var back = deskHid;
            deskHid = null;
            back.forEach( function ( w ) { if( wins.indexOf( w ) >= 0 && w.el.hidden ) focus( w ); } );
        }
        paintDesk();
    }
    if( deskBtn ) deskBtn.addEventListener( 'click', function () { showDesk(); } );

    // An app with work not yet saved (Image; Write, Calc and Text keep theirs
    // first, shared/office.js) asks first: its window.ayniBeforeClose answers
    // true to go, false to stay. While it asks, the window is in front.
    function close( w )
    {
        var ask = null;
        try { ask = w.frame.contentWindow.ayniBeforeClose; } catch( e ) {}
        if( typeof ask !== 'function' ) { shut( w ); return; }
        if( w.asking ) return;
        w.asking = true;
        focus( w );
        Promise.resolve().then( ask ).then( function ( ok ) { w.asking = false; if( ok ) shut( w ); },
                                            function () { w.asking = false; shut( w ); } );
    }

    function shut( w )
    {
        if( wins.indexOf( w ) < 0 ) return;     // gone already
        keepLast( w );
        if( kbWin === w ) kbWin = null;
        w.el.remove(); w.chip.remove();
        wins.splice( wins.indexOf( w ), 1 );
        if( front === w ) front = topmost();
        paint();
        h.placeUnread();
        h.placeMail();
        if( h.placePlanner ) h.placePlanner();
        if( w.app === 'email' ) h.askMail();
        if( tiled ) { tiled.snaps.delete( w ); if( ! wins.length ) { autoWant = !! tiled.auto; tiled = null; } }   // see UPRIGHT
        paintTile();
        saveWins();
        retile();
    }

    function topmost()
    {
        var best = null;
        wins.forEach( function ( w ) { if( ! w.el.hidden && ( ! best || +w.el.style.zIndex > +best.el.style.zIndex ) ) best = w; } );
        return best;
    }

    function paint()
    {
        wins.forEach( function ( w )
        {
            var isFront = ( w === front && ! w.el.hidden );
            w.el.classList.toggle( 'focused', isFront );
            // the app's own title row (chromeless) softens too - an attribute, not a
            // class: Scale's watcher re-measures on class changes
            try { w.frame.contentDocument.documentElement.toggleAttribute( 'data-win-behind', ! isFront ); } catch( e ) {}
            if( isFront ) w.chip.setAttribute( 'aria-current', 'true' ); else w.chip.removeAttribute( 'aria-current' );
            w.chip.classList.toggle( 'min', w.el.hidden );
            w.chip.classList.toggle( 'has-dialog', !! w.dialog && ! isFront );
            paintScale( w );
        } );
        paintTile();
    }

    function act( w, what )
    {
        if( what === 'min' )   minimise( w );
        if( what === 'max' )   setMax( w, ! isMax( w ) );
        if( what === 'close' ) close( w );
        if( what === 'scale' ) setScale( w, ! w.scale );
    }

    function wire( w )
    {
        var el = w.el;

        // The chip: bring forward - or, when already in front, minimise. Its
        // window's buttons (in front only) do their own job.
        w.chip.addEventListener( 'click', function ( e )
        {
            var b = e.target.closest( '[data-win]' );
            if( b ) { act( w, b.getAttribute( 'data-win' ) ); return; }
            if( w === front && ! el.hidden ) minimise( w ); else focus( w );
        } );

        el.querySelector( '.win-bar' ).addEventListener( 'dblclick', function ( e )
        {
            if( ! e.target.closest( 'button' ) ) act( w, 'max' );
        } );

        el.addEventListener( 'pointerdown', function () { if( front !== w ) focus( w ); }, true );

        // Drag by the title bar; resize by the grips.
        el.addEventListener( 'pointerdown', function ( e )
        {
            if( e.button !== 0 ) return;
            var grip = e.target.closest( '.grip' );
            var wbar = ! grip && e.target.closest( '.win-bar' );
            if( ! grip && ! wbar ) return;
            if( wbar && ( e.target.closest( 'button' ) || el.classList.contains( 'max' ) ) ) return;
            drag( w, e, grip ? grip.getAttribute( 'data-dir' ) : '' );
        } );

        // Inside the frame (same origin): a press brings the window forward, the
        // document's name names it, and a new-tab open becomes a new desktop window.
        w.frame.addEventListener( 'load', function ()
        {
            var cw;
            try { cw = w.frame.contentWindow; cw.document; } catch( e ) { return; }
            if( ! cw ) return;
            // A signed-out app lands on the login page: that belongs to the whole desktop.
            if( /\/login\.html$/.test( cw.location.pathname ) ) { location.href = cw.location.href; return; }
            // kept without the origin: a site moved to https still finds its windows
            if( cw.location.href !== 'about:blank' ) { w.url = cw.location.pathname + cw.location.search + cw.location.hash; saveWins(); }
            // an editor puts the document it opens in its address (shared/office.js, showAddress)
            cw.addEventListener( 'ayni-address', function () { w.url = cw.location.pathname + cw.location.search + cw.location.hash; saveWins(); } );
            w.el.classList.remove( 'chromeless' );
            cw.addEventListener( 'pointerdown', function () { h.closeMenu(); closeMore(); if( front !== w ) focus( w ); }, true );
            hookAlt( cw );
            hookInner( w, cw );
            watchDialog( w, cw );
            // Taking the keys out of a frame drops its caret: kept here for giveKeys.
            cw.document.addEventListener( 'focusin', function ( e ) { w.lastFocus = e.target; }, true );
            // A plain link to the launcher (Planner's name) opens the menu instead.
            cw.document.addEventListener( 'click', function ( e )
            {
                var a = e.target.closest && e.target.closest( 'a[href]' );
                if( ! a || ! new RegExp( '^' + ROOT + '(index\\.html)?$' ).test( new URL( a.href, cw.location.href ).pathname ) ) return;
                e.preventDefault();
                h.openMenu();
            }, true );
            hookOpen( cw );
            cw.close = function () { close( w ); };     // an app's own "close" (Image's ✗ / Escape) closes its window
            trackTitle( w, cw );
            adoptHead( w, cw );
            paint();
            // Scale: the new page is measured, and again each time it changes -
            // its data came in, a panel opened (see SCALE).
            new cw.MutationObserver( function () { if( w.scale && w.frame.contentWindow === cw ) queueMeasure( w ); } )
                .observe( cw.document.documentElement, { childList: true, subtree: true, characterData: true,
                                                         attributes: true, attributeFilter: [ 'class', 'style', 'hidden' ] } );
            if( w.scale ) queueMeasure( w );
        } );
    }

    // Frames inside the window's page (Planner's Calendar / Tasks / Habits): a
    // press there never reaches the page's own listener, so each inner page -
    // at any depth, also one that loads later - brings the window forward too.
    function hookInner( w, cw )
    {
        function hook( f )
        {
            if( f._deskHooked ) return;
            f._deskHooked = true;
            function on()
            {
                var icw;
                try { icw = f.contentWindow; icw.document; } catch( e ) { return; }
                if( ! icw || icw._deskHooked ) return;
                icw._deskHooked = true;
                icw.addEventListener( 'pointerdown', function () { h.closeMenu(); closeMore(); if( front !== w ) focus( w ); }, true );
                hookAlt( icw );
                hookInner( w, icw );
                watchDialog( w, icw );
            }
            f.addEventListener( 'load', on );
            on();
        }
        function scan( root ) { if( root.tagName === 'IFRAME' ) hook( root ); else if( root.querySelectorAll ) root.querySelectorAll( 'iframe' ).forEach( hook ); }
        scan( cw.document.documentElement );
        new cw.MutationObserver( function ( recs )
        {
            recs.forEach( function ( r ) { r.addedNodes.forEach( scan ); } );
        } ).observe( cw.document.documentElement, { childList: true, subtree: true } );
    }

    // DIALOG MARK - a dialog (Ayni's dialog.panel[open]) open in the
    // window's page, or in a frame inside it (Planner's Calendar...), marks its
    // bar button while the window is behind others or minimised, so a question
    // left waiting is not forgotten. Dialogs stay modal to their own window.
    function hasDialog( doc )
    {
        if( doc.querySelector( 'dialog.panel[open]' ) ) return true;
        var fs = doc.querySelectorAll( 'iframe' );
        for( var i = 0; i < fs.length; i++ )
        {
            var d = null;
            try { d = fs[ i ].contentDocument; } catch( e ) {}
            if( d && hasDialog( d ) ) return true;
        }
        return false;
    }
    function markDialog( w )
    {
        w.dialogQueued = false;
        var on = false;
        try { on = hasDialog( w.frame.contentDocument ); } catch( e ) {}
        if( on === !! w.dialog ) return;
        w.dialog = on;
        paint();
    }
    // Class changes are many (a Calc selection...): one look per frame is enough.
    function watchDialog( w, cw )
    {
        function queue() { if( ! w.dialogQueued ) { w.dialogQueued = true; requestAnimationFrame( function () { markDialog( w ); } ); } }
        new cw.MutationObserver( queue )
            .observe( cw.document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: [ 'class', 'open' ] } );
        queue();
    }

    // The bar button says which DOCUMENT the window shows: Write / Calc / Text
    // name it in their #fileLabel, the other apps in their page title.
    function trackTitle( w, cw )
    {
        var doc = cw.document, label = doc.getElementById( 'fileLabel' );
        function update()
        {
            if( w.frame.contentWindow !== cw ) return;
            var name = label ? label.textContent.trim() : '';
            // Chat's "(3) Chat": the count is already on the button's red disc.
            var tt   = doc.title && doc.title !== 'about:blank' ? doc.title.replace( /^\(\d+\+?\)\s*/, '' ) : '';
            var text = name || tt || w.name;
            // The bar button: the file name only - no folders, no extension, 15 characters at most.
            var pill = name ? Array.from( name.replace( /^.*[\\/]/, '' ).replace( /(.)\.[^.]+$/, '$1' ) ).slice( 0, 15 ).join( '' ) : '';
            setTitle( w, text, text === w.name ? w.name : w.name + ' - ' + text, pill );
        }
        update();
        var mo = new cw.MutationObserver( update ), opt = { childList: true, characterData: true, subtree: true };
        if( label ) mo.observe( label, opt );
        var te = doc.querySelector( 'title' );
        if( te ) mo.observe( te, opt );
    }

    // Move (dir "") or resize (dir "n", "se"...) a window with the pointer that
    // pressed. Screen coordinates, because the press may come from INSIDE the
    // frame (the app's own top row), whose client coordinates move with it.
    // A move let go at the desk's left / right edge fills that half of it, at
    // the top edge the whole of it; dragging a half-window again gives it back
    // its old size.
    // The grabbing hand, from the press on a title bar until it is let go. An
    // app's own row lives in its frame, so the rule goes into that page too.
    function grabCursor( doc, on )
    {
        if( on && ! doc.getElementById( 'winGrabCss' ) )
        {
            var st = doc.createElement( 'style' );
            st.id = 'winGrabCss';
            st.textContent = 'html.win-grab, html.win-grab * { cursor: grabbing !important; }';
            doc.head.appendChild( st );
        }
        doc.documentElement.classList.toggle( 'win-grab', on );
    }

    function drag( w, e, dir )
    {
        var el = w.el, inFrame = e.target.ownerDocument !== document;
        // Inside a frame the page holds the pointer, not the element pressed: an
        // app may redraw its row mid-drag (Trips does) and take that element away.
        var tgt = inFrame ? e.target.ownerDocument.documentElement : e.target;
        var x0 = e.screenX, y0 = e.screenY;
        var L = w.g.l, T = w.g.t, W = w.g.w, H = w.g.h;
        var r = deskRect(), zone = '';
        var minW = w.scale ? 1 : MIN_W, minH = w.scale ? 1 : MIN_H;     // Scale on: no smallest size

        // Where the pointer is on the desk (a move only needs this for the edges).
        var dr = desk.getBoundingClientRect(), px, py;
        // (a page shrunk by Scale counts in its own, bigger pixels: times w.s)
        if( inFrame ) { var fr = w.frame.getBoundingClientRect(); px = fr.left + e.clientX * w.s - dr.left; py = fr.top + e.clientY * w.s - dr.top; }
        else          { px = e.clientX - dr.left; py = e.clientY - dr.top; }
        if( ! dir && w.pre )
        {
            var fx = ( px - L ) / W;
            W = w.pre.w; H = w.pre.h; L = Math.round( px - fx * W );
            w.pre = null;
            place( w, { l: L, t: T, w: W, h: H } );
            W = w.g.w; H = w.g.h;
        }

        e.preventDefault();
        try { tgt.setPointerCapture( e.pointerId ); } catch( err ) {}
        // No frame may swallow the pointer on the way - except the one that holds it.
        el.classList.add( 'dragging' );
        desk.classList.add( inFrame ? 'busy-frame' : 'busy' ); document.body.classList.add( 'busy' );
        if( inFrame ) tgt.ownerDocument.documentElement.style.userSelect = 'none';
        if( ! dir ) { grabCursor( document, true ); if( inFrame ) grabCursor( tgt.ownerDocument, true ); }

        // Sticky windows: the half of the desk an edge offers.
        function zoneRect( z )
        {
            var hw = Math.round( r.w / 2 ), hh = Math.round( r.h / 2 );
            return z === 'left'   ? { l: 0,  t: 0,  w: hw,       h: r.h }
                 : z === 'right'  ? { l: hw, t: 0,  w: r.w - hw, h: r.h }
                 : z === 'top'    ? { l: 0,  t: 0,  w: r.w,      h: hh }
                 :                  { l: 0,  t: hh, w: r.w,      h: r.h - hh };
        }

        function showZone( z )
        {
            zone = z;
            ghost.hidden = ! z;
            if( ! z ) return;
            var g = zoneRect( z );
            ghost.style.left   = g.l + 'px';
            ghost.style.top    = g.t + 'px';
            ghost.style.width  = g.w + 'px';
            ghost.style.height = g.h + 'px';
        }

        function move( ev )
        {
            var dx = ev.screenX - x0, dy = ev.screenY - y0;
            if( ! dir )
            {
                // keep at least the top row reachable (all of a window smaller than that)
                var kx = Math.min( 80, W ), ky = Math.min( 38, H );
                moveTo( w, Math.min( r.w - kx, Math.max( kx - W, L + dx ) ), Math.min( r.h - ky, Math.max( 0, T + dy ) ) );
                var cx = px + dx, cy = py + dy;
                // Bottom: the window's own lower edge pushed 6px past the desk's
                // (the pointer, up on the title bar, is far from it) - for a window
                // that started above it; one already on it (tiled) needs the pointer.
                var low = ( T + H < r.h && w.g.t + H >= r.h + 6 ) || cy >= r.h - 6;
                if( set.sticky ) showZone( cx <= 6 ? 'left' : cx >= r.w - 6 ? 'right' : cy <= 6 ? 'top' : low ? 'bottom' : '' );
                return;
            }
            var nl = L, nt = T, nw = W, nh = H;
            if( dir.indexOf( 'e' ) >= 0 ) nw = Math.max( minW, W + dx );
            if( dir.indexOf( 's' ) >= 0 ) nh = Math.max( minH, H + dy );
            if( dir.indexOf( 'w' ) >= 0 ) { nw = Math.max( minW, W - dx ); nl = L + W - nw; }
            if( dir.indexOf( 'n' ) >= 0 ) { nh = Math.max( minH, H - dy ); nt = Math.max( 0, T + H - nh ); nh = T + H - nt; }
            place( w, { l: nl, t: nt, w: nw, h: nh } );
            // A shrunk window that cannot stretch further one way (AyniTiling.fit's
            // cap) keeps the edge that is not being pulled where it was.
            if( dir.indexOf( 'w' ) >= 0 && w.g.w !== nw ) moveTo( w, nl + nw - w.g.w, w.g.t );
            if( dir.indexOf( 'n' ) >= 0 && w.g.h !== nh ) moveTo( w, w.g.l, nt + nh - w.g.h );
        }
        function up()
        {
            el.classList.remove( 'dragging' );
            desk.classList.remove( 'busy', 'busy-frame' ); document.body.classList.remove( 'busy' );
            if( inFrame ) tgt.ownerDocument.documentElement.style.userSelect = '';
            if( ! dir ) { grabCursor( document, false ); if( inFrame ) grabCursor( tgt.ownerDocument, false ); }
            tgt.removeEventListener( 'pointermove', move );
            tgt.removeEventListener( 'pointerup', up );
            tgt.removeEventListener( 'pointercancel', up );
            if( zone ) { w.pre = { w: W, h: H }; place( w, zoneRect( zone ) ); }
            showZone( '' );
            saveWins();
        }
        tgt.addEventListener( 'pointermove', move );
        tgt.addEventListener( 'pointerup', up );
        tgt.addEventListener( 'pointercancel', up );
    }

    //------------------------------------------------------------------------//
    // THE WINDOW'S BUTTONS live on the bar, on the bar button of the window in
    // front (see .chip-ctl): Scale / Resize, minimise, maximise, close. Scale /
    // Resize is two-state: its icon and tooltip say which way the window is now.
    var SVG_OPEN     = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
    var ICON_SCALE   = SVG_OPEN + '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M14 15H9v-5"/><path d="M16 3h5v5"/><path d="M21 3 9 15"/></svg>';
    var ICON_RESIZE  = SVG_OPEN + '<polyline points="5 11 5 5 11 5"/><polyline points="19 13 19 19 13 19"/><line x1="5" y1="5" x2="19" y2="19"/></svg>';
    var ICON_TILE    = SVG_OPEN + '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="12" y1="12" x2="21" y2="12"/></svg>';
    var CTL = [
        [ 'scale', '',                 '',         ICON_RESIZE ],
        [ 'min',   'ayni.win.minimise', 'Minimise', SVG_OPEN + '<line x1="5" y1="12" x2="19" y2="12"/></svg>' ],
        [ 'max',   'ayni.win.maximise', 'Maximise', SVG_OPEN + '<rect x="5" y="5" width="14" height="14" rx="2"/></svg>' ],
        [ 'close', 'ayni.close',         'Close',    SVG_OPEN + '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>' ]
    ];

    function paintScale( w )
    {
        var b = w.chip.querySelector( '[data-win="scale"]' ), on = !! w.scale;
        if( ! b || b.getAttribute( 'aria-pressed' ) === String( on ) ) return;
        b.setAttribute( 'aria-pressed', String( on ) );
        b.innerHTML = on ? ICON_SCALE : ICON_RESIZE;
        setTip( b, on ? t( 'ayni.desktop.scaleOn',  'Scale: a smaller window shrinks everything in it' )
                     : t( 'ayni.desktop.scaleOff', 'Resize: a smaller window rearranges its content' ) );
        b.setAttribute( 'aria-label', b.dataset.tip );
    }

    //------------------------------------------------------------------------//
    // THE APP'S OWN TOP ROW AS TITLE BAR. Every app opens with a row holding
    // its icon, its name and its toolbar; in a window that row drags the window
    // from any empty spot and maximises it on a double click. The row is the
    // first one that holds the app's icon - also when it is only a column
    // (Chat's list) or sits in a card (Trips). A page with no such row (a
    // document opened blank) keeps the desktop's own bar.

    var HEAD_SEL    = '.topbar, .header, .trip-header';
    var INTERACTIVE = 'button, a, input, .picker, textarea, label, [contenteditable], [role="button"], [tabindex]';

    function findHead( doc )
    {
        var list = doc.querySelectorAll( HEAD_SEL );
        for( var i = 0; i < list.length; i++ )
        {
            var r = list[ i ].getBoundingClientRect();
            if( r.height > 0 && list[ i ].querySelector( '.app-icon' ) ) return list[ i ];
        }
        return null;
    }

    function adoptHead( w, cw )
    {
        var doc = cw.document, head = null;

        // Find the row - and find it again. Some apps draw their row only once
        // their data is in, and some redraw it, so this runs on every change of
        // the page. Once found, the same row stays the title bar while it is on
        // the page: Trips keeps its header box when a trip is open, even though
        // the app icon is gone from it then.
        function ensure()
        {
            if( w.frame.contentWindow !== cw ) { mo.disconnect(); return; }
            if( ! head || ! head.isConnected ) head = findHead( doc );
            if( ! head ) return;
            // mark it: in a window it gets a title bar's own colour (app.css)
            if( ! head.hasAttribute( 'data-win-head' ) ) head.setAttribute( 'data-win-head', '' );
            // a finger on it drags the window: the browser must not take it for a scroll
            if( head.style.touchAction !== 'none' ) head.style.touchAction = 'none';
            if( ! w.el.classList.contains( 'chromeless' ) ) { w.el.classList.add( 'chromeless' ); paint(); }
        }
        // style / hidden too: an app that starts with its whole page hidden
        // (#app display: none until signed in) and then only UN-hides parts -
        // eMail with no account yet - adds no node at all, and its row would
        // never be found. Only those two attributes, so the rest of the app's
        // restyling does not wake this up.
        var mo = new cw.MutationObserver( ensure );
        mo.observe( doc.documentElement, { childList: true, subtree: true,
                                           attributes: true, attributeFilter: [ 'style', 'hidden' ] } );
        ensure();

        // A press only becomes a drag once it moves 4px: Calc, Write and Text
        // fill most of the row with their file name, which a plain click edits,
        // and Trips with its name, which a plain click takes to the menu.
        // The empty strip ABOVE the row drags too, and so does any empty spot
        // of a layer that covers the row (data-win-drag: Chat's call screen,
        // and its open chat's bar when the window is as narrow as a phone),
        // except its own boxes (data-win-nodrag: the picture in the corner).
        doc.addEventListener( 'pointerdown', function ( e )
        {
            if( e.button !== 0 || e.target.closest( INTERACTIVE ) || w.el.classList.contains( 'max' ) ) return;
            var cover = e.target.closest( '[data-win-drag]' );
            if( cover ? e.target.closest( '[data-win-nodrag]' ) : ! head ) return;
            if( ! cover && ! head.contains( e.target ) && e.clientY >= head.getBoundingClientRect().top ) return;
            var x0 = e.screenX, y0 = e.screenY;
            grabCursor( doc, true );                              // the hand shows on the press, not the 4px
            function move( ev )
            {
                if( Math.abs( ev.screenX - x0 ) + Math.abs( ev.screenY - y0 ) < 4 ) return;
                stop();
                drag( w, e, '' );
                // ...and the click that ends the drag must not edit the name. The
                // browser fires it right after pointerup, if at all: the eater
                // leaves on the next tick either way.
                function eat( c ) { c.stopPropagation(); c.preventDefault(); }
                doc.addEventListener( 'click', eat, true );
                doc.addEventListener( 'pointerup', function () { setTimeout( function () { doc.removeEventListener( 'click', eat, true ); }, 0 ); }, { capture: true, once: true } );
            }
            function stop()
            {
                grabCursor( doc, false );                         // drag() puts it back if a drag starts
                doc.removeEventListener( 'pointermove', move, true );
                doc.removeEventListener( 'pointerup', stop, true );
            }
            doc.addEventListener( 'pointermove', move, true );
            doc.addEventListener( 'pointerup', stop, true );
        } );
        doc.addEventListener( 'dblclick', function ( e )
        {
            // the same spots a press drags from: the row, or a data-win-drag layer
            var cover = e.target.closest( '[data-win-drag]' );
            if( e.target.closest( INTERACTIVE ) || ( cover ? e.target.closest( '[data-win-nodrag]' ) : ! ( head && head.contains( e.target ) ) ) ) return;
            act( w, 'max' );
        } );
    }

    // window.open from inside an app: a the app page opens as a desktop window; the
    // opener gets that window's frame, so Drive's "open blank now, point it at the
    // file later" still works. Anything else (a map, an outside site) keeps its tab.
    function hookOpen( cw )
    {
        var real = cw.open;
        cw.open = function ( url, target, features )
        {
            url = url || '';
            // A URL of the app's own ("?file=b.docx", "view.html") is read against the app's frame, not the desktop
            var abs = 'about:blank';
            if( url ) try { abs = new URL( url, cw.location.href ).href; } catch( e ) { return real.call( cw, url, target, features ); }
            if( url && ! h.appOf( abs ) ) return real.call( cw, url, target, features );
            var w = sameImage( abs ) || sameDoc( abs );
            if( w ) focus( w ); else w = openApp( abs, { fresh: true } );
            return /noopener/.test( features || '' ) ? null : w.frame.contentWindow;
        };
    }

    // A picture already open in Image: its window, never a second editor on
    // the same file (two would each save over the other).
    function sameImage( abs )
    {
        if( h.appOf( abs ) !== 'image' ) return null;
        var u = new URL( abs ), want = u.pathname + u.search;
        for( var i = 0; i < wins.length; i++ )
            if( wins[ i ].app === 'image' && wins[ i ].url === want ) return wins[ i ];
        return null;
    }

    // The same for a document already open in Write, Calc or Text (Drive
    // opens one on every double-click): two editors on one file each saved
    // over the other with no question. The window is asked what it shows NOW
    // (shared/office.js, ayniDocPath) - another document may have been
    // opened in it since; its address only while its page cannot answer yet.
    // Any of the three counts: a .csv open in Calc and "Open with > Text"
    // would be two editors on one file just the same.
    var DOC_APPS = [ 'write', 'calc', 'text' ];

    function sameDoc( abs )
    {
        if( DOC_APPS.indexOf( h.appOf( abs ) ) < 0 ) return null;
        var want = new URL( abs ).searchParams.get( 'file' );
        if( ! want ) return null;
        for( var i = 0; i < wins.length; i++ )
        {
            var w = wins[ i ], has = null, ask = null;
            if( DOC_APPS.indexOf( w.app ) < 0 ) continue;
            try { ask = w.frame.contentWindow.ayniDocPath; } catch( e ) {}
            if( typeof ask === 'function' ) { try { has = ask(); } catch( e ) {} }
            else has = new URL( w.url || w.frame.src, location.href ).searchParams.get( 'file' );
            if( has === want ) return w;
        }
        return null;
    }

    //------------------------------------------------------------------------//
    // OPEN WINDOWS SURVIVE A RELOAD - their pages, places, sizes, order and
    // state, per device ("desktop-wins"). Written a moment after each change.

    var WINS_KEY = KEYS + 'desktop-wins', saveTimer = 0, restoring = false;

    function saveWins()
    {
        if( restoring ) return;
        clearTimeout( saveTimer );
        saveTimer = setTimeout( function ()
        {
            var list = wins.filter( function ( w ) { return w.url; } )
                .sort( function ( a, b ) { return +a.el.style.zIndex - +b.el.style.zIndex; } )
                .map( function ( w )
                {
                    var rec = { url: w.url, l: px( w.g.l ), t: px( w.g.t ), w: px( w.g.w ), h: px( w.g.h ),
                                max: isMax( w ), min: !! w.el.hidden, pre: w.pre };
                    if( w.scale ) { rec.scale = true; rec.nat = w.nat; }
                    if( tiled && tiled.snaps.has( w ) ) rec.snap = tiled.snaps.get( w );
                    return rec;
                } );
            store( WINS_KEY, list );
            store( TILE_KEY, tiled ? { dw: tiled.dw, dh: tiled.dh, auto: !! tiled.auto } : null );
        }, 300 );
    }

    // LAST - where each app's window was when it closed, per device
    // ("desktop-last"); its next window opens there. Of two windows of
    // one app, the last one closed counts. A tiled window keeps nothing; Scale
    // is not kept ("Scale on open" decides it).
    var LAST_KEY = KEYS + 'desktop-last';

    function keepLast( w )
    {
        if( ! w.app || ! w.g || ( tiled && tiled.snaps.has( w ) ) ) return;
        var last = store( LAST_KEY ) || {};
        last[ w.app ] = { l: w.g.l, t: w.g.t, w: w.g.w, h: w.g.h, max: isMax( w ) };
        store( LAST_KEY, last );
    }

    function restoreWins()
    {
        var list = store( WINS_KEY ) || [];
        var tl   = store( TILE_KEY );
        restoring = true;
        if( tl ) tiled = { snaps: new Map(), dw: tl.dw, dh: tl.dh, auto: !! tl.auto };
        var minimised = [];
        list.forEach( function ( s )
        {
            if( ! s || ! s.url || ! h.appOf( s.url ) ) return;
            var w = openApp( s.url, { fresh: true, geom: s } );
            w.url = s.url;
            w.pre = s.pre || null;
            if( s.max ) { w.el.classList.add( 'max' ); place( w, w.g ); }
            if( s.min ) minimised.push( w );
            if( tiled && s.snap ) tiled.snaps.set( w, s.snap );
        } );
        minimised.forEach( function ( w ) { w.el.hidden = true; } );
        front = topmost();
        paint();
        restoring = false;
        if( tiled && ! wins.length ) tiled = null;
        // tiled on a desk of another size (the browser window changed meanwhile)
        if( tiled && ( desk.clientWidth !== tiled.dw || desk.clientHeight !== tiled.dh ) ) retile( true );
    }

    //------------------------------------------------------------------------//
    // SCALE - per window (w.scale), off by default. Off (Resize), a window is
    // what it always was: never smaller than MIN_W x MIN_H, and a smaller window
    // rearranges its page. On (Scale), there is no smallest size, and a window
    // made smaller shrinks like a picture of itself, chrome and all, from the
    // size it had at 1:1 (his call, 2026-09-28: the apps rearrange themselves
    // down to phone size, so "shrink only where scrollbars would appear" never
    // showed). That size is its NATURAL size (w.nat): the window stays laid out
    // at it and is drawn smaller by a CSS transform from its top-left corner
    // (AyniTiling.fit). Clicks, typing and the apps' own menus keep working:
    // the browser maps them through the transform.
    //
    // w.nat is kept while the window is shrunk - moved, tiled, maximised and
    // restored - and let go when the window is pulled back out to it (1:1 again,
    // at whatever size it then gets) or Scale is switched. Maximised, it is
    // always 1:1 - the sure way back to a readable window; restored, it is
    // shrunk again as before. Laid out at a fixed size, a shrunk page never
    // re-wraps, so there is nothing to chase.
    //
    // One more reason to shrink: a page too WIDE for its window (a fixed-width
    // sheet) is measured (AyniTiling.need) a moment after the window or the
    // page changes, and the window shrinks to show all of its width - the
    // natural width only ever grows that way. Height never counts: pages scroll.
    // "A moment" is two frames: some apps size parts of their page from
    // JavaScript on a resize, and a reading taken at once would see their old size.

    function isMax( w ) { return w.el.classList.contains( 'max' ); }
    function px( n )    { return Math.round( n * 100 ) / 100 + 'px'; }

    // Where a window shows on the desk: g = { l, t, w, h }, desk pixels. Every
    // change of a window's size comes through here; moveTo only moves it.
    function place( w, g )
    {
        g = { l: Math.round( g.l ), t: Math.round( g.t ), w: Math.max( 1, g.w ), h: Math.max( 1, g.h ) };
        var f = { s: 1, lw: g.w, lh: g.h };
        if( isMax( w ) ) { /* the CSS makes it the whole desk, 1:1; g is where it goes back to */ }
        else if( ! w.scale )
        {
            g.w = f.lw = Math.max( MIN_W, g.w );
            g.h = f.lh = Math.max( MIN_H, g.h );
        }
        else
        {
            // made smaller than it is at 1:1: that 1:1 size becomes the natural one
            if( ! w.nat && w.g && w.s === 1 && ( g.w < w.g.w || g.h < w.g.h ) )
                w.nat = { w: Math.max( MIN_W, w.g.w ), h: Math.max( MIN_H, w.g.h ) };
            if( ! w.nat && ( g.w < MIN_W || g.h < MIN_H ) ) w.nat = { w: MIN_W, h: MIN_H };
            if( w.nat )
            {
                var r = deskRect();
                f = AyniTiling.fit( g.w, g.h, w.nat, { w: 2 * r.w, h: 2 * r.h } );
                if( f.s >= 1 ) w.nat = null;             // pulled back out to full size: 1:1 from here
                g.w = f.w; g.h = f.h;
            }
            queueMeasure( w );
        }
        w.g = g;
        w.s = f.s;
        var st = w.el.style;
        st.left  = px( g.l );  st.top    = px( g.t );
        st.width = px( f.lw ); st.height = px( f.lh );
        st.transform = f.s < 1 ? 'scale(' + f.s + ')' : '';
        if( f.s < 1 ) st.setProperty( '--win-s', f.s ); else st.removeProperty( '--win-s' );
        if( kbWin === w ) kbShrink( w );         // the keyboard is still up: keep clear of it
        paintMax( w );
    }

    // The chip's maximise button says what a press will do: Restore while maximised.
    function paintMax( w )
    {
        var b = w.chip.querySelector( '[data-win="max"]' ), on = isMax( w ), max = CTL[ 2 ];
        if( ! b || b.classList.contains( 'is-max' ) === on ) return;
        b.classList.toggle( 'is-max', on );
        b.innerHTML = on && window.Ayni ? Ayni.icon( 'restore' ) : max[ 3 ];
        setTip( b, on ? t( 'ayni.win.restore', 'Restore' ) : t( max[ 1 ], max[ 2 ] ) );
        b.setAttribute( 'aria-label', b.dataset.tip );
    }

    // An app of a fixed size asks its window to hug the page: cw's frame becomes
    // W x H, its corner stays, all on the desk. Calculator (hugWindow). Answers
    // false for a window that must keep its size (maximised, tiled, Scale on) or
    // when the desk is too small for it.
    window.ayniFitWindow = function ( cw, W, H )
    {
        var w = wins.filter( function ( x ) { return x.frame.contentWindow === cw; } )[ 0 ];
        if( ! w || isMax( w ) || w.scale || ( tiled && tiled.snaps.has( w ) ) ) return false;
        var d  = deskRect();
        var gw = Math.min( W + w.el.offsetWidth  - w.frame.offsetWidth,  d.w );
        var gh = H + w.el.offsetHeight - w.frame.offsetHeight;
        if( gh > d.h ) return false;
        place( w, { l: Math.max( 0, Math.min( w.g.l, d.w - gw ) ), t: Math.max( 0, Math.min( w.g.t, d.h - gh ) ), w: gw, h: gh } );
        saveWins();
        return true;
    };

    function moveTo( w, l, t )
    {
        w.g.l = Math.round( l ); w.g.t = Math.round( t );
        w.el.style.left = px( w.g.l ); w.el.style.top = px( w.g.t );
    }

    // Maximise / restore: maximised is always 1:1; restored, a shrunk window is shrunk again as before.
    function setMax( w, on )
    {
        w.el.classList.toggle( 'max', on );
        place( w, w.g );
        saveWins();
    }

    // Scale on / off. Switched on, the window's size now is its natural one:
    // made smaller from here, it shrinks (and a page too wide for it shrinks at
    // once). Switched off, the page is 1:1 again and the window at least
    // MIN_W x MIN_H.
    function setScale( w, on )
    {
        w.scale = !! on;
        w.nat = null;
        place( w, w.g );
        paint();
        saveWins();
    }

    function queueMeasure( w )
    {
        if( w.measuring ) return;
        w.measuring = true;
        requestAnimationFrame( function () { requestAnimationFrame( function () { w.measuring = false; measure( w ); } ); } );
    }

    function measure( w )
    {
        if( ! w.scale || isMax( w ) || w.el.hidden || wins.indexOf( w ) < 0 ) return;
        var de;
        try { de = w.frame.contentDocument && w.frame.contentDocument.documentElement; } catch( e ) { return; }
        if( ! de ) return;
        var r = deskRect();
        var n = AyniTiling.need( { outW:  w.el.offsetWidth, outH:  w.el.offsetHeight,     // laid-out size, not drawn
                                     viewW: de.clientWidth,   viewH: de.clientHeight,
                                     fullW: de.scrollWidth,   fullH: de.scrollHeight,
                                     deskW: r.w,              deskH: r.h } );
        // Only a page too wide for the window counts, and only to widen the natural size.
        var nat = w.nat || { w: MIN_W, h: Math.max( MIN_H, w.g.h ) };
        if( ! ( n.w > nat.w ) ) return;
        w.nat = { w: n.w, h: nat.h };
        place( w, w.g );
        saveWins();
    }

    //------------------------------------------------------------------------//
    // TILE / UNTILE - one switch for the whole desk. Tile deals the desk out
    // among the windows on it (minimised ones stay minimised), in the order of
    // their bar buttons (AyniTiling.tile). Each window just gets a box: one
    // with Scale on shrinks to fit it, one without shows scrollbars, as always.
    // Untile puts every window back EXACTLY as it was before: place, size,
    // maximised, minimised, Scale and its factor. Whatever was done to them
    // while tiled is dropped. The stacking order is not put back: the window
    // in front stays in front.
    //
    // The "before" (tiled.snaps) is kept here, by the desktop, not by the
    // window, and it survives a reload (in each window's saved record). It is
    // taken for every window when Tile is switched on, and for a window opened
    // while tiled the first time the layout places it - so Untile sends that
    // one to where a new window opens.
    //
    // While tiled, opening, closing, minimising or bringing back a window deals
    // the desk out again (RETILE; false = a new window floats until the next
    // Tile), and so does a new desk size (the browser window, the bar).

    var RETILE   = true;
    var TILE_GAP = 0;               // pixels between two tiled windows
    var TILE_KEY = KEYS + 'desktop-tile';
    var tiled    = null;            // while tiled: { snaps: Map( window -> its state before ), dw, dh: the desk tiled,
                                    //                auto: tiled by UPRIGHT, not by hand }
    var retiling = false;

    function stateOf( w )
    {
        return { g: { l: w.g.l, t: w.g.t, w: w.g.w, h: w.g.h }, max: isMax( w ), min: !! w.el.hidden,
                 pre: w.pre ? { w: w.pre.w, h: w.pre.h } : null,
                 scale: !! w.scale, nat: w.nat ? { w: w.nat.w, h: w.nat.h } : null, s: w.s };
    }

    function tile()
    {
        var list = wins.filter( function ( w ) { return ! w.el.hidden; } );
        if( ! tiled && ! list.length ) return false;      // nothing on the desk to deal out
        if( ! tiled )
        {
            tiled = { snaps: new Map() };
            wins.forEach( function ( w ) { tiled.snaps.set( w, stateOf( w ) ); } );
        }
        var r = deskRect();
        tiled.dw = r.w; tiled.dh = r.h;
        AyniTiling.tile( list.length, r.w, r.h, { gap: TILE_GAP, minW: MIN_W, minH: MIN_H } ).forEach( function ( g, i )
        {
            var w = list[ i ];
            if( ! tiled.snaps.has( w ) ) tiled.snaps.set( w, stateOf( w ) );
            // a maximised window shrinks (Scale) from the whole desk it showed
            if( isMax( w ) ) { w.el.classList.remove( 'max' ); w.g = { l: 0, t: 0, w: r.w, h: r.h }; w.nat = null; w.s = 1; }
            w.pre = null;
            place( w, g );
        } );
        paintTile();
        saveWins();
        return true;
    }

    function untile()
    {
        if( ! tiled ) return false;
        var snaps = tiled.snaps;
        tiled = null;
        snaps.forEach( function ( st, w )
        {
            if( wins.indexOf( w ) < 0 ) return;           // closed while tiled
            w.el.classList.toggle( 'max', !! st.max );
            // "Show the desk" stays on: what it hid stays hidden (its button would stay pressed over windows in view)
            w.el.hidden = !! st.min || !! ( deskHid && deskHid.indexOf( w ) >= 0 );
            w.pre   = st.pre || null;
            w.scale = !! st.scale;
            w.nat   = st.nat || null;
            w.g     = { l: st.g.l, t: st.g.t, w: st.g.w, h: st.g.h };   // exactly as before: no "made smaller" here
            place( w, st.g );
        } );
        if( ! front || front.el.hidden ) front = topmost();
        paint();
        saveWins();
        return true;
    }

    // Deal the desk out again, once, on the next frame. `always`: even with RETILE off.
    function retile( always )
    {
        if( ! tiled || restoring || retiling || ! ( RETILE || always ) ) return;
        retiling = true;
        requestAnimationFrame( function () { retiling = false; if( tiled ) tile(); } );
    }

    new ResizeObserver( function ()
    {
        upright();
        if( tiled && ( desk.clientWidth !== tiled.dw || desk.clientHeight !== tiled.dh ) ) retile( true );
    } ).observe( desk );

    // UPRIGHT (2026-10-01) - a touch screen narrower than 1024px (a tablet held
    // upright) tiles the desk by itself: windows side by side, never on top of
    // each other. Wide again, the desk goes back to Free - only if this did the
    // tiling (tiled.auto, saved with it, so a reload in between still knows);
    // a desk tiled by hand stays tiled. It acts when the width CROSSES 1024px,
    // so Free picked by hand while upright stays Free; with no window yet, the
    // first one opened is tiled. The "⋮" switch is the same one; nothing else
    // is saved. A PC (no touch screen) never does this.
    var narrow = null, autoWant = false;
    function upright()
    {
        if( restoring ) return;
        var n = coarse.matches && window.innerWidth < 1024;
        if( n !== narrow )
        {
            narrow = n;
            autoWant = n;
            if( ! n && tiled && tiled.auto ) untile();
        }
        if( autoWant && ! tiled && tile() ) tiled.auto = true;
        if( tiled ) autoWant = false;
    }
    if( coarse.addEventListener ) coarse.addEventListener( 'change', upright );

    // THE SWITCH in the "⋮": "Free ()== Tile". A word picks its side, the switch
    // flips. The word Tile while tiled deals the desk out again - after windows
    // were moved or maximised by hand, say.
    var tileSw = document.getElementById( 'tileSw' ), tileOn = document.getElementById( 'tileOn' ),
        tileOff = document.getElementById( 'tileOff' );

    function paintTile()
    {
        var idle = ! tiled && ! wins.some( function ( w ) { return ! w.el.hidden; } );
        tileOn.checked  = !! tiled;
        tileOff.checked = ! tiled;
        tileOn.disabled = tileOff.disabled = idle;
        tileSw.classList.toggle( 'idle', idle );
    }

    tileOn.addEventListener( 'change', function () { tile(); paintTile(); } );
    tileOff.addEventListener( 'change', function () { untile(); paintTile(); } );
    tileOn.addEventListener( 'click', function () { if( tiled ) { tile(); paintTile(); } } );     // already on: no change event
    paintTile();

    //------------------------------------------------------------------------//
    // MORE - the "⋮" after the gadgets (2026-09-28): Ayni's popup with controls
    // (opened by its button, or by a right-click / long press on the desk, below).
    // Holds the Free/Tile switch, Sticky windows, Scale on open, the bar and
    // Raised controls, and the app's own sections (SLOTS). Open popups close on
    // their own with a press elsewhere, Escape, a resize, or when a frame takes
    // the focus; a press in a frame that does not take it: closeMore.

    var moreBtn = document.getElementById( 'moreBtn' ), moreMenu = document.getElementById( 'moreMenu' );

    function placeMore() { if( moreMenu.matches( ':popover-open' ) ) Ayni.place( moreMenu, moreBtn ); }

    // The bar's popups (the "⋮" and the gadgets' own, added with addPopup), closed from code.
    var popups = [ moreMenu ];
    function closeMore()
    {
        popups.forEach( function ( p ) { if( p.matches( ':popover-open' ) ) p.hidePopover(); } );
    }

    // A press on the desk or the bar closes an open menu. A right-click on an empty
    // spot of the desk (not the bar) opens the "⋮" menu, where the desktop's
    // settings are - unless that very press was the one closing the launcher's menu.
    var menuWasOpen = false;
    [ desk, bar ].forEach( function ( el )
    {
        el.addEventListener( 'pointerdown', function ( e )
        {
            if( e.target.closest( '#menuBtn' ) ) return;
            menuWasOpen = ! menu.hidden;
            h.closeMenu();
        } );
    } );
    function openMoreHere()
    {
        if( ! menuWasOpen && ! moreMenu.matches( ':popover-open' ) ) Ayni.showPopup( moreMenu, moreBtn );
    }
    desk.addEventListener( 'contextmenu', function ( e )
    {
        if( ! e.target.closest( '.desk-empty' ) ) return;
        e.preventDefault();
        openMoreHere();
    } );
    // A finger's right-click: a long press on an empty spot of the desk. And the
    // wheel moves a row of chips along the bar (a column scrolls by itself).
    document.addEventListener( 'DOMContentLoaded', function () { if( window.Ayni ) Ayni.ready.then( function ()
    {
        Ayni.longTap( desk, '.desk-empty', openMoreHere );
    } ); } );
    tasks.addEventListener( 'wheel', function ( e )
    {
        if( set.bar === 'left' || set.bar === 'right' || tasks.scrollWidth <= tasks.clientWidth || ! e.deltaY ) return;
        e.preventDefault();
        tasks.scrollLeft += e.deltaY;
    }, { passive: false } );

    // SLOTS (2026-11-23) - where the app puts its own parts: gadgets on the bar, sections
    // of the "⋮", popups of the bar. `el`: an element, a fragment, or a <template> (its
    // content goes in); `where.before` / `where.after`: an element or a selector.
    var widgets = bar.querySelector( '.widgets' );
    function put( box, el, where, ref )
    {
        where = where || {};
        var at = function ( x ) { return typeof x === 'string' ? box.querySelector( x ) : x; };
        if( where.after ) ref = at( where.after ).nextSibling;
        else if( where.before ) ref = at( where.before );
        box.insertBefore( el.tagName === 'TEMPLATE' ? el.content : el, ref || null );
    }
    // A gadget on the bar: before the "⋮" unless told where.
    function addWidget( el, where ) { put( widgets, el, where, moreBtn ); }
    // Rows of the "⋮": at its end unless told where ({ before: '#moreWindows' } is first).
    function addMenuSection( el, where ) { put( moreMenu, el, where, null ); }
    // A gadget's popup: in the desktop, and closed with the "⋮" (closeMore).
    function addPopup( el ) { desktop.appendChild( el ); if( popups.indexOf( el ) < 0 ) popups.push( el ); }

    // STICKY WINDOWS - this device's choice (set.sticky); see drag.
    var stickyChk = document.getElementById( 'stickyChk' );
    stickyChk.checked = set.sticky !== false;
    stickyChk.addEventListener( 'change', function () { set.sticky = stickyChk.checked; saveSet(); } );

    // BEVEL - this device's choice (set.bevel, default on): <html> carries .bevel (raised controls) or .flat (none, the
    // splitter too); every window's page copies the class from here (Ayni's base, "A page inside a frame").
    var bevelChk = document.getElementById( 'bevelChk' );
    function applyBevel() { var on = set.bevel !== false; document.documentElement.classList.toggle( 'bevel', on ); document.documentElement.classList.toggle( 'flat', ! on ); }
    bevelChk.checked = set.bevel !== false;
    applyBevel();
    bevelChk.addEventListener( 'change', function () { set.bevel = bevelChk.checked; saveSet(); applyBevel(); } );

    // SCALE ON OPEN - this device's choice (set.scaleNew); see SCALE.
    var scaleNewChk = document.getElementById( 'scaleNewChk' );
    scaleNewChk.checked = !! set.scaleNew;
    scaleNewChk.addEventListener( 'change', function () { set.scaleNew = scaleNewChk.checked; saveSet(); } );

    // OPEN THE DESKTOP - this device's choice (set.mode): auto (a big screen
    // with a mouse or touchpad), always (a big screen, mouse or not), never
    // (the simple view). Set ONLY in My account (../index.html, #deskModeSel;
    // one action, one knob), which also opens in a window here: we follow its
    // change. The launcher reads it before it sends a big screen here; both
    // pages ask the same rule (ayniWantDesk, shared/desk-rule.js). A choice
    // that no longer wants the desktop leaves for the simple view at once.
    function toSimple() { location.replace( '../index.html' ); }
    if( set.mode !== 'always' && set.mode !== 'never' ) set.mode = 'auto';
    window.addEventListener( 'storage', function ( e )
    {
        if( e.key !== SET_KEY ) return;
        var m = ( store( SET_KEY ) || {} ).mode;
        if( m !== 'always' && m !== 'never' ) m = 'auto';
        if( m === set.mode ) return;
        set.mode = m;
        if( ! ayniWantDesk( set.mode ) ) toSimple();
    } );

    // MOUSE CHIP - on Auto, the mouse or touchpad taken away offers the simple
    // view (the launcher offers the desktop when one comes back): the shared
    // toast with a button. Never a move on its own: left alone, it goes.
    var finePtr = window.matchMedia( '(any-pointer: fine)' );
    function onFineChange()
    {
        if( finePtr.matches || set.mode !== 'auto' ) return;
        Ayni.toast( 'info', t( 'ayni.desktop.toSimpleAsk' ), { action: { label: t( 'ayni.desktop.toSimpleGo' ), icon: 'apps', run: toSimple } } );
    }
    if( finePtr.addEventListener ) finePtr.addEventListener( 'change', onFineChange );

    // THE BAR - every change applies at once; the menu stays open and follows
    // the bar when it moves or changes size.
    var F = { bar: document.getElementById( 'setBar' ), barH: document.getElementById( 'setBarH' ) };
    var barHOut = document.getElementById( 'setBarHOut' );
    F.barH.value = set.barH; barHOut.textContent = set.barH + ' px';
    // The bar's side is an Ayni list picker: set once Ayni has started
    document.addEventListener( 'DOMContentLoaded', function () { if( window.Ayni ) Ayni.ready.then( function ()
    {
        Ayni.picker( F.bar ).set( set.bar );
    } ); } );
    Object.keys( F ).forEach( function ( k )
    {
        F[ k ].addEventListener( k === 'barH' ? 'input' : 'ayni:change', function ()
        {
            set.bar = Ayni.picker( F.bar ).value; set.barH = +F.barH.value;
            barHOut.textContent = set.barH + ' px';
            saveSet();
            applyLayout();
            placeMore();
        } );
    } );

    // A window by its place on the bar (0, 1...), its app's folder ("drive"), or itself.
    function winOf( which )
    {
        if( typeof which === 'number' ) return wins[ which ] || null;
        if( typeof which === 'string' ) return wins.filter( function ( w ) { return w.app === which; } )[ 0 ] || null;
        return wins.indexOf( which ) >= 0 ? which : null;
    }

    //------------------------------------------------------------------------//
    // SWITCHER - Alt pressed and let go on its own (no other key, no press in
    // between) shows every window, the last used first, as Alt-Tab does on a
    // PC: Left / Right choose, Enter or a click switches, Escape (or Alt again,
    // or a press elsewhere) closes. Keys typed in a window never reach this
    // page, so each window's frame and the menu's are hooked too (hookAlt).
    // Only "Alt": AltGr (the right Alt of a Spanish keyboard: @ # [ ]) is typing.

    var switcher = document.getElementById( 'switcher' );
    var altAlone = false, swSel = 0, swBack = null;

    function hookAlt( cw )
    {
        cw.addEventListener( 'keydown', function ( e )
        {
            if( e.key !== 'Alt' ) altAlone = false;
            else if( ! e.repeat ) altAlone = ! ( e.ctrlKey || e.shiftKey || e.metaKey );   // Ctrl / Shift already held: not alone (Shift+Alt = layout switch)
        }, true );
        cw.addEventListener( 'keyup', function ( e )
        {
            if( e.key !== 'Alt' || ! altAlone ) return;
            altAlone = false;
            e.preventDefault();          // Firefox shows its menu bar on a lone Alt
            if( switcher.hidden ) openSwitcher(); else closeSwitcher( true );
        }, true );
        cw.addEventListener( 'pointerdown', function ( e )
        {
            altAlone = false;
            if( ! switcher.hidden && ! ( cw === window && switcher.contains( e.target ) ) ) closeSwitcher( false );
        }, true );
        cw.addEventListener( 'blur', function () { altAlone = false; } );   // the system's own Alt-Tab
    }

    // Shown windows by how recently they were in front (z-order), then the minimised ones.
    function swList()
    {
        return wins.slice().sort( function ( a, b )
        {
            return ( a.el.hidden - b.el.hidden ) || ( +b.el.style.zIndex - +a.el.style.zIndex );
        } );
    }

    function openSwitcher()
    {
        if( ! wins.length || menu.classList.contains( 'full' ) || document.querySelector( 'dialog.panel[open]' ) ) return;
        h.closeMenu();
        var list = swList();
        switcher.innerHTML = '';
        list.forEach( function ( w )
        {
            var b = document.createElement( 'button' );
            b.type = 'button';
            b.className = 'btn large bordered sw-item' + ( w.el.hidden ? ' min' : '' );
            b.setAttribute( 'role', 'option' );
            b.innerHTML = w.svg + '<span></span>';
            b.querySelector( 'span:not(.icon)' ).textContent = w.main.querySelector( 'span:not(.icon)' ).textContent;
            setTip( b, w.main.dataset.tip );
            b.swWin = w;
            switcher.appendChild( b );
        } );
        swBack = document.activeElement;     // a window's frame, most of the time
        switcher.hidden = false;
        // The window in front is first: Enter alone goes back to the one before it.
        swSelect( list.length > 1 && list[ 0 ] === front ? 1 : 0 );
    }

    function swSelect( i )
    {
        var items = switcher.children, n = items.length;
        swSel = ( i + n ) % n;
        [].forEach.call( items, function ( b, k )
        {
            b.classList.toggle( 'sel', k === swSel );
            b.setAttribute( 'aria-selected', k === swSel ? 'true' : 'false' );
        } );
        items[ swSel ].focus();       // the keys come here now, not to the window
    }

    // restore: give the keyboard back to where it was (Escape, Alt), not after a press elsewhere.
    function closeSwitcher( restore )
    {
        if( switcher.hidden ) return;
        switcher.hidden = true;
        switcher.innerHTML = '';
        if( restore && swBack && swBack !== document.body )
        {
            var w = wins.filter( function ( x ) { return x.frame === swBack; } )[ 0 ];
            if( w ) giveKeys( w );
            else try { swBack.focus(); } catch( e ) {}
        }
        swBack = null;
    }

    // The keyboard goes into the window, back to the field it was in: typing goes on there.
    function giveKeys( w )
    {
        try
        {
            w.frame.focus();
            w.frame.contentWindow.focus();
            var el = w.lastFocus;
            if( el && el.isConnected && el.ownerDocument === w.frame.contentDocument && el !== el.ownerDocument.body )
                el.focus( { preventScroll: true } );
        }
        catch( e ) {}
    }

    function swPick( w )
    {
        closeSwitcher( false );
        if( wins.indexOf( w ) < 0 ) return;
        focus( w );
        giveKeys( w );
    }

    switcher.addEventListener( 'keydown', function ( e )
    {
        var k = e.key;
        if( k === 'ArrowLeft' || k === 'ArrowRight' ) swSelect( swSel + ( k === 'ArrowLeft' ? -1 : 1 ) );
        else if( k === 'Tab' )                        swSelect( swSel + ( e.shiftKey ? -1 : 1 ) );
        else if( k === 'Enter' || k === ' ' )         swPick( switcher.children[ swSel ].swWin );
        else if( k === 'Escape' )                     closeSwitcher( true );
        else return;
        e.preventDefault();
        e.stopPropagation();
    } );
    switcher.addEventListener( 'click', function ( e )
    {
        var b = e.target.closest( '.sw-item' );
        if( b ) swPick( b.swWin );
    } );

    hookAlt( window );

    //------------------------------------------------------------------------//
    // KEYBOARD (2026-10-01) - while the on-screen keyboard is up, the window in
    // front gets shorter, down to the keyboard's top edge, so the field typed
    // into stays in sight; when it goes, the window gets its size back. Seen
    // through visualViewport: the keyboard is up while the visible height is
    // 120px or more below the tallest seen at this width. A browser that
    // shrinks the whole page for it instead (the Android app may) shrinks the
    // desk too: the edge is the lower of the two. Only the window's style
    // changes - w.g, what is saved and restored, keeps its real size.

    var vv = window.visualViewport, kbWin = null, kbBase = 0, kbW = 0, kbEdge = 0;
    var KB_MIN = 120, KB_KEEP = 240;    // a keyboard is at least this tall; the window keeps at least this much

    function kbFit()
    {
        if( ! vv ) return;
        if( window.innerWidth !== kbW ) { kbW = window.innerWidth; kbBase = 0; }   // turned: a new tallest
        kbBase = Math.max( kbBase, vv.height );
        var dr = desk.getBoundingClientRect();
        kbEdge = Math.min( dr.bottom, vv.offsetTop + vv.height ) - dr.top;         // in desk pixels
        var w = kbBase - vv.height >= KB_MIN && front && ! front.el.hidden && wins.indexOf( front ) >= 0 ? front : null;
        if( kbWin && kbWin !== w ) kbRelease();
        if( ! w ) return;
        kbWin = w;
        kbShrink( w );
        // the field typed into: back in sight inside the shorter window
        try
        {
            var el = w.frame.contentDocument.activeElement;
            if( el && el !== w.frame.contentDocument.body && el.scrollIntoView ) el.scrollIntoView( { block: 'nearest' } );
        }
        catch( e ) {}
    }

    // Style only (place() calls it again while the keyboard is up).
    function kbShrink( w )
    {
        var st = w.el.style;
        if( isMax( w ) )
        {
            w.el.classList.add( 'kb' );
            st.setProperty( '--kb-h', Math.max( 1, kbEdge ) + 'px' );
            return;
        }
        st.removeProperty( '--kb-h' );
        if( w.g.t + w.g.h <= kbEdge )                              // clear of it: its own size
        {
            if( w.el.classList.contains( 'kb' ) ) { w.el.classList.remove( 'kb' ); kbWin = null; place( w, w.g ); kbWin = w; }
            return;
        }
        var top = Math.max( 0, Math.min( w.g.t, kbEdge - KB_KEEP ) );
        w.el.classList.add( 'kb' );
        st.top    = px( top );
        st.height = px( Math.max( 1, kbEdge - top ) / w.s );     // laid-out pixels: a shrunk window is drawn w.s smaller
    }

    function kbRelease()
    {
        var w = kbWin;
        kbWin = null;
        if( ! w || wins.indexOf( w ) < 0 ) return;
        w.el.classList.remove( 'kb' );
        w.el.style.removeProperty( '--kb-h' );
        place( w, w.g );
    }

    if( vv )
    {
        vv.addEventListener( 'resize', kbFit );
        vv.addEventListener( 'scroll', kbFit );
    }

    // SCALE and TILE for the buttons to come (the desktop has none for them yet).
    Object.assign( window.AyniDesk = window.AyniDesk || {}, {
        windows: function ()
        {
            return wins.map( function ( w )
            {
                return { app: w.app, name: w.main.querySelector( 'span:not(.icon)' ).textContent, scale: !! w.scale, factor: w.s,
                         max: isMax( w ), min: !! w.el.hidden, box: { l: w.g.l, t: w.g.t, w: w.g.w, h: w.g.h },
                         nat: w.nat, tiled: !! tiled && tiled.snaps.has( w ) };
            } );
        },
        open:       function ( url ) { return !! openApp( url, { fresh: true } ); },
        scale:      function ( which, on ) { var w = winOf( which ); if( w ) setScale( w, on === undefined ? ! w.scale : on ); return !! w; },
        tile:       tile,
        untile:     untile,
        toggleTile: function () { return tiled ? untile() : tile(); },
        isTiled:    function () { return !! tiled; }
    } );

    // narrow = null: looked at afresh, so a desk tiled upright and reloaded wide goes back to Free
    h.appsReady.then( function () { restoreWins(); narrow = null; upright(); } );

        return { showDesk: showDesk, ICON_SCALE: ICON_SCALE, ICON_TILE: ICON_TILE, ICON_WIN: ICON_WIN, ROOT: ROOT, bar: bar, closeMore: closeMore, desk: desk, desktop: desktop, focus: focus, ghost: ghost, hookAlt: hookAlt, menu: menu, menuBtn: menuBtn, moreBtn: moreBtn, moreMenu: moreMenu, narrow: narrow, openApp: openApp, set: set, setTip: setTip, t: t, tasks: tasks, tile: tile, wins: wins,
                 // the slots and this device's settings, for the app's own parts
                 addWidget: addWidget, addMenuSection: addMenuSection, addPopup: addPopup, relayout: placeMore,
                 saveSet: saveSet, store: store, KEYS: KEYS };
    };
} )();
