/* notes.js - a small app on Ayni alone: a list, a dialog, a store that keeps working offline, an install offer. */
( function ()
{
    "use strict";

    var FILE = "data/notes.json", notes = [], list = null;
    var store = AyniStore.createStore( {} );
    store.onState( Ayni.plug.listener() );
    Ayni.pwa.config( { app: "Notes", logo: "icon.svg" } );

    function draw()
    {
        var box = document.getElementById( "notes" );
        box.innerHTML = "";
        notes.forEach( function ( n ) { box.appendChild( Ayni.h( "li", { class: "note", data: { id: n.id } }, n.text ) ); } );
        document.getElementById( "none" ).hidden = notes.length > 0;
        if( list ) list.refresh();
    }

    function save() { store.write( FILE, JSON.stringify( notes, null, 2 ) ); draw(); }

    async function add()
    {
        var text = await Ayni.ask( { title: "New note", label: "Text" } );
        if( ! text ) return;
        notes.unshift( { id: Date.now().toString( 36 ), text: text } );
        save();
    }

    function remove( ids )
    {
        var gone = notes.filter( function ( n ) { return ids.indexOf( n.id ) >= 0; } );
        notes = notes.filter( function ( n ) { return ids.indexOf( n.id ) < 0; } );
        save();
        Ayni.toast( "ok", "Deleted", { undo: function () { notes = gone.concat( notes ); save(); } } );
    }

    async function load()
    {
        var res = await store.read( FILE );
        notes = res && res.body ? JSON.parse( res.body ) : [];
        draw();
    }

    Ayni.ready.then( function ()
    {
        Ayni.plug.draw();
        Ayni.homeLinks( { go: function () { location.href = "."; } } )();
        list = Ayni.list( document.getElementById( "notes" ), {
            main: true, row: ".note", bar: document.getElementById( "selActions" ),
            actions: [ { id: "delete", label: "Delete", icon: "trash", key: "Del", danger: true, run: remove } ]
        } );
        document.getElementById( "newBtn" ).addEventListener( "click", add );
        document.getElementById( "installBtn" ).addEventListener( "click", function () { Ayni.pwa.offerInstall( { manual: true } ); } );
        AyniBoot.boot( store, load );
    } );
} )();
