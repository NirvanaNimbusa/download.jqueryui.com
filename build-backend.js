/*jshint node: true */
"use strict";

var spawn = require( "child_process" ).spawn,
	fs = require( "fs" ),
	rimraf = require( "rimraf" ),
	async = require( "async" ),
	handlebars = require( "handlebars" ),
	glob = require( "glob-whatev" ).glob;

var indexTemplate = handlebars.compile( fs.readFileSync( "zip-index.html", "utf8" ) );

function Builder( fields ) {
	this.fields = fields;
}
Builder.prototype = {
	// TODO make everything ASYNC
	build: function( callback ) {
		var tmpdir = "tmp" + (+new Date()),
			target = "jquery-ui-custom",
			targetdir = tmpdir + "/" + target + "/";
		fs.mkdirSync( tmpdir );
		fs.mkdirSync( targetdir );
		fs.mkdirSync( targetdir + "minified" );
		fs.writeFileSync( targetdir + "version.txt", "custom" );
		var meta = {
			jquery: {
				version: "1.7.2"
			},
			ui: {
				version: "1.9.0"
			}
		};
		this.fields.forEach(function( field ) {
			var file = "minified/jquery.ui." + field + ".min.js";
			meta.ui[ field ] = true;
			fs.writeFileSync( targetdir + file, fs.readFileSync( "versions/jquery-ui-1.9.0pre/ui/" + file ) );
		});
		fs.writeFileSync( targetdir + "index.html", indexTemplate( meta ) );
		fs.mkdirSync( targetdir + "js" );
		fs.writeFileSync( targetdir + "js/jquery-" + meta.jquery.version + ".js", fs.readFileSync( "versions/jquery-ui-1.9.0pre/jquery-" + meta.jquery.version + ".js" ) );

		fs.writeFileSync( targetdir + "js/jquery-ui-" + meta.ui.version + ".custom.js", fs.readFileSync( "versions/jquery-ui-1.9.0pre/ui/jquery-ui.js" ) );
		fs.writeFileSync( targetdir + "js/jquery-ui-" + meta.ui.version + ".custom.min.js", fs.readFileSync( "versions/jquery-ui-1.9.0pre/ui/minified/jquery-ui.min.js" ) );

		fs.mkdirSync( targetdir + "css" );
		fs.mkdirSync( targetdir + "css/base" );
		fs.writeFileSync( targetdir + "css/base/jquery-ui-" + meta.ui.version + ".custom.css", fs.readFileSync( "versions/jquery-ui-1.9.0pre/themes/base/jquery-ui.css" ) );
		fs.writeFileSync( targetdir + "css/base/jquery-ui-" + meta.ui.version + ".custom.min.css", fs.readFileSync( "versions/jquery-ui-1.9.0pre/themes/base/minified/jquery-ui.min.css" ) );

		fs.mkdirSync( targetdir + "css/base/images" );
		glob( "versions/jquery-ui-1.9.0pre/themes/base/images/*" ).forEach(function( file ) {
			fs.writeFileSync( targetdir + file.replace("versions/jquery-ui-1.9.0pre/themes", "css"), fs.readFileSync( file ) );
		});

		callback( tmpdir, target );
	},
	writeTo: function( response, callback ) {
		var that = this;
		this.build(function( cwd, target ) {
			var child = spawn( "zip", [ "-r", "-", target ], { cwd: cwd } );
			child.stdout.on( "data", function( data) {
				response.write( data );
			});
			child.stderr.on( "data", function( data) {
				console.error( data.toString() );
			});
			child.on( "exit", function( code ) {
				rimraf.sync( cwd );
				if ( code !== 0 ) {
					callback( "zip failed :(" );
					return;
				}
				callback( null, "All good!" );
			});
		});
	}
};

module.exports = Builder;