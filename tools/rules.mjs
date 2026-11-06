/* The rules of Ayni's buttons, as a check any page can run: await page.evaluate(RULES) returns what breaks them, [] when nothing does. */
export const RULES = `( () => { const o = [];
    const q = ( s ) => [ ...document.querySelectorAll( s ) ];
    const id = ( e ) => '#' + e.id + ' .' + String( e.className ).replace( / +/g, '.' );
    q( 'button[disabled].btn' ).forEach( e => o.push( 'disabled attribute on a .btn ' + id( e ) ) );
    q( 'button[aria-disabled="true"]:not(.btn)' ).forEach( e => o.push( 'aria-disabled on a non-.btn ' + id( e ) ) );
    q( 'button[title], .btn[title]' ).forEach( e => o.push( 'native title ' + id( e ) ) );
    q( '.btn:not(.text)' ).forEach( e => { if( ! e.getAttribute( 'aria-label' ) && ! e.textContent.trim() && ! e.getAttribute( 'aria-labelledby' ) ) o.push( 'no name ' + id( e ) ); } );
    q( '.btn .icon[data-icon]' ).forEach( e => { if( ! e.firstElementChild ) o.push( 'icon not drawn: ' + e.dataset.icon ); } );
    q( '.switch .track, .switch input:not([role=switch])' ).forEach( e => o.push( 'old switch ' + id( e ) ) );
    q( '.btn.is-active' ).forEach( e => o.push( 'is-active on a .btn ' + id( e ) ) );
    q( '.btn:is([aria-haspopup], [popovertarget]) > svg' ).forEach( e => { if( e.querySelectorAll( 'circle' ).length === 3 ) o.push( 'a ⋮ drawn inline (Ayni cannot tell it from other popups) ' + id( e.parentNode ) ); } );
    q( '[data-act="close"], [data-act="primary"], [data-act="danger"]' ).forEach( e => o.push( 'old data-act ' + id( e ) ) );
    return [ ...new Set( o ) ]; } )()`;
