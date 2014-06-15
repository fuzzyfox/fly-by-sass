'use strict';

var express = require( 'express' );
var morgan = require( 'morgan' );
var dotenv = require('dotenv');
dotenv.load();
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
var cached = [];

// get some debug ouptut
if( env.get( 'debug' ) || env.get( 'DEBUG' ) ) {
  app.use( morgan( 'dev' ) );
}

// healthcheck info public
app.get( [ '/', '/healthcheck' ], function( req, res ) {
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

function compile( req, res, next ) {
	var result = ''; // this will become the compiled css.
	var pendingIdx = pending.indexOf( req.param( 'hash' ) ); // index of a pending process hash (if there is one)
	var tmpSassFile = '';  // this will become the tmp sass file to compile

	// check that the request came from a trusted source ( not foolproof )
	if( env.get( 'SHARED_SECRET' ) !== req.param( 'secret' ) ) {
		return res.status( 400 ).jsonp({
			errors: [{
				message: 'Request requires authentication.',
				code: 400
			}]
		});
	}

	// deal w/ race conditions
	if( pendingIdx > -1 ) {
		// wait for temp file w/ css to exist
		return waitOnTemp( req.param( 'hash' ), function( result ) {
			res.send( result );
		});
	}

	if( cached.indexOf( req.param( 'hash' ) ) > -1 ) {
		return res.send( fs.readFileSync( './tmp/' + req.param( 'hash' ) + '.css', 'utf-8' ) );
	}

	// set hash as pending
	pendingIdx = pending.push( req.param( 'hash' ) ) - 1;

	// get defaults for the theme
	tmpSassFile = fs.readFileSync( './theme/' + req.param( 'theme' ) + '/_vars.scss', 'utf-8' );

	// generate overrides
	var tmp = JSON.parse( req.param( 'variables' ) );
	for( var key in tmp ) {
		tmpSassFile += '$' + key + ': ' + tmp[ key ] + ';\n';
	}

	// include main file to compile against
	tmpSassFile += '\n@import "./theme/' + req.param( 'theme' ) + '/base.scss";';

	// render the sass
	result = sass.renderSync({
		data: tmpSassFile,
		ouptutStyle: 'compressed'
	});

	// write tmp file
	fs.writeFileSync( './tmp/' + req.param( 'hash' ) + '.css', result );
	cached.push( req.param( 'hash' ) );

	// send back the css
	res.send( result );

	// clear hash from pending queue
	pending.splice( pendingIdx, 1 );

	// delete temp file after 1min
	setTimeout( function() {
		if( cached.indexOf( req.param( 'hash' ) ) > -1 ) {
			cached.splice( cached.indexOf( req.param( 'hash' ) ), 1 );
		}
		fs.unlink( './tmp/' + req.param( 'hash' ) + '.css' );
	}, 60000 );
}

// deal w/ the routing
app.route( '/compile' )
	.get( compile )
	.post( compile );

// spin up the server
var server = app.listen( env.get( 'PORT' ) || 5000, function() {
	console.log( 'Listening on port %d', server.address().port );
});
