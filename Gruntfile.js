module.exports = function( grunt ) {
  'use strict';

  grunt.initConfig({
    pkg: grunt.file.readJSON( 'package.json' ),
    jshint: {
      options: {
        'bitwise': true,
        'browser': true,
        'curly': true,
        'eqeqeq': true,
        'freeze': true,
        'immed': true,
        'indent': 2,
        'latedef': true,
        'node': true,
        'newcap': true,
        'noempty': true,
        'quotmark': 'single',
        'trailing': true,
        'undef': true,
        'unused': 'vars'
      },
      files: [
        'Gruntfile.js',
        '*.js'
      ]
    },

    express: {
      dev: {
        options: {
          script: './server.js',
          port: 4200
        }
      }
    },

    // running `grunt watch` will watch for changes
    watch: {
      files: [ '*.js' ],
      tasks: [ 'jshint', 'express:dev' ],
      express: {
        files: [ '*.js' ],
        tasks:  [ 'express:dev' ],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.loadNpmTasks( 'grunt-contrib-jshint' );
  grunt.loadNpmTasks( 'grunt-express-server' );
  grunt.loadNpmTasks( 'grunt-contrib-watch' );

  grunt.registerTask( 'default', [ 'jshint', 'express:dev', 'watch' ] );
  grunt.registerTask( 'test', [ 'jshint' ] );
};
