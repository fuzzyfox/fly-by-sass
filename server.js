'use strict';

var express = require( 'express' );
var morgan = require( 'morgan' );
var env = require( 'nconf' ).argv()
                            .env()
                            .file( { file: 'config.json' } );
var sass = require( 'node-sass' );
var fs = require( 'fs' );

// setup server
var app = express();

// health check
var healthcheck = {
  version: require('./package').version,
  http: 'okay'
};

// pending processes
var pending = [];

// get some debug ouptut
if( env.get( 'debug' ) || env.get( 'DEBUG' ) ) {
  app.use( morgan( 'dev' ) );
}

// healthcheck info public
app.get( [ '/', 'healthcheck' ], function( req, res ) {
	res.jsonp( healthcheck );
});

// function to help deal w/ race conditions
function waitOnTemp( hash, done ) {
	if( pending.indexOf( hash ) > -1 ) {
		setTimeout( function(){
			waitOnTemp( hash, done );
		}, 100 );
		return;
	}

	// file written, read it and send it
	var result = fs.readFileSync( './tmp/' + hash + '.css', 'utf-8' );
	done( result );
}

// get sass variables from url
app.post( '/compile', function( req, res ) {
	var result = ''; // this will become the compiled css.

	// check that the request came from a trusted source ( not foolproof )
	if( env.get( 'SHARED_SECRET' ) !== req.param( 'secret' ) ) {
		res.status( 400 ).jsonp({
			errors: [{
				message: 'Request requires authentication.',
				code: 400
			}]
		});
	}

	// deal w/ race conditions
	if( pending.indexOf( req.param( 'hash' ) ) > -1 ) {
		// wait for temp file w/ css to exist
		return waitOnTemp( req.param( 'hash' ), function( result ) {
			res.send( result );
		});
	}

	// set hash as pending
	pending.push( req.param( 'hash' ) );

	// magical shite here

	/*
		- get default variables for the theme
		- generate overrides for this hash
		- generate import for rest of theme
		- write a temp-file to compile ( {hash}.css )
		- return the compiled output to user ( hint: use result )
	 */

	// send back the css
	res.send( result );

	// clear hash from pending queue
	var pendingIdx = pending.indexOf( req.param( 'hash' ) );
	pending.splice( pendingIdx, 1 );

	// delete temp file after 1min
	setTimeout( function() {
		fs.unlink( './tmp/' + req.param( 'hash' ) + '.css' );
	}, 60000 );
});

// spin up the server
var server = app.listen( env.get( 'PORT' ) || 5000, function() {
	console.log( 'Listening on port %d', server.address().port );
});
