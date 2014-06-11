'use strict';

var express = require( 'express' );
var morgan = require( 'morgan' );
var env = require( 'nconf' ).argv()
                            .env()
                            .file( { file: 'config.json' } );
// setup server
var app = express();

// health check
var healthcheck = {
  version: require('./package').version,
  http: 'okay'
};

// get some debug ouptut
if( env.get( 'debug' ) || env.get( 'DEBUG' ) ) {
  app.use( morgan( 'dev' ) );
}

// healthcheck info public
app.get( [ '/', 'healthcheck' ], function( req, res ) {
	res.jsonp( healthcheck );
});

// get sass variables from url
app.post( '/compile', function( req, res ) {
	var result = ''; // this will become the compiled css.

	// magical shite here

	res.send( result );
});

// spin up the server
var server = app.listen( env.get( 'PORT' ) || 5000, function() {
	console.log( 'Listening on port %d', server.address().port );
});
