/*
 * grunt-debianize
 * https://github.com/ligreman/debianize
 * 
 * Copyright (c) 2015 FL
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
  // load all npm grunt tasks
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({   
    // Before generating any new files, remove any previously-created files.
    clean: {
        temp: ['tmp']
    },
    
    copy: {
        deb: {
            expand: true,
            src: 'tmp/*.deb',
            dest: './',
            flatten: true,
            filter: 'isFile',
        }
    },

    // Configuración por defecto
    debianize: {
      default: {
        options: {
            // ***** OBLIGATORIO ***** //
            //Datos del paquete
            package: 'package-name',
            version: '0.0.0',
            
            //Proceso de instalación.
            //Indica por cada fichero/carpeta del paquete debian a dónde hay que copiarlo en el servidor.
            //Por ejemplo: 
            // ['/sources/* /var/www/']
            //      copia lo que hay en la carpeta sources del paquete debian al servidor en /var/www
            // ['/sources/www/* /var/www/', '/sources/config.properties /usr/share/config/'] 
            //      En este caso copia lo que hay en la carpeta sources/www del paquete debian al servidor
            //      en /var/www y el fichero sources/config.properties a /usr/share/config/
            install: [],
            
            // ***** OPCIONAL ***** //
            //Datos del paquete
            build: '',            
            
            //Datos del autor del parche
            maintainer: {
                name: 'INCIBE',
                email: 'incibe@incibe.es'
            },
            
            //Datos del fichero de cambios
            changelog: {
                //¿Es estable? true o false
                stable: 'false',
                //Comentarios de los cambios. Una sola línea.
                comment: '',
                //Incidencia que corrige
                issue: '0000'
            },
            
            //Dependencias del paquete (ej: ['dbhelper (>=8.0.0)', 'python (2.7.5)'])
            dependencies: [],
            
            //Clasificacion del paquete. Ej: java, php, python...
            section: 'general',            
            priority: 'optional',
            homepage: 'https://www.incibe.es',
            
            //Descripciones corta y larga del proyecto. En la larga usar \n para saltos de línea
            shortDescription: '',
            longDescription: '',
            
            //Fichero de copyright
            copyright: {
                sourceUrl: 'https://www.incibe.es',
                //path al fichero que contiene el copyright, relativo al directorio con el Gruntfile                
                licenseFile: ''
            },
            
            //Path al fichero que contiene el README, relativo al directorio con el Gruntfile
            readmeFile: ''
        },
        
        //Ficheros fuente a incluir en el paquete deb
        files: [
            {
                expand: true,

                //Ruta base de los ficheros fuente
                cwd: 'targets/',

                //Ficheros a incluir. Admite comodines. Ejemplo:
                // ['**/*']
                //      copia todos los ficheros y carpetas y subcarpetas que hay en la ruta base de fuentes
                // ['js/**/*', '*.html']
                //      copia todos los ficheros y subcarpetas dentro de la carpeta js, y todos
                //      los html de la carpeta base de los fuentes
                src: [
                ],

                //Path base en el que copiar los fuentes dentro del paquete debian 
                //(no en el servidor OJO, eso se indica en el campo install de las opciones)
                dest: '/var/www/'
            }
        ]
      }
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  //grunt.registerTask('test', ['clean', 'debianize', 'nodeunit']);
    
  grunt.registerTask('test', ['clean:temp', 'debianize', 'copy:deb', 'clean:temp']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['test']);

};
