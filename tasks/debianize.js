/*
 * grunt-debianize
 * 
 *
 * Copyright (c) 2015 FL
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {

    String.prototype.replaceAll = function (find, replace) {
        var str = this;
        return str.replace(new RegExp(find, 'g'), replace);
    };

    var copyFileOrDirectory = function (source, destination) {
            grunt.file.mkdir(destination);
            grunt.file.expand(source).forEach(function (file) {
                if (grunt.file.isDir(file)) {
                    grunt.file.recurse(file, function callback(abspath, rootdir, subdir, filename) {
                        grunt.verbose.writeln('Copying: \'' + abspath + '\' to \'' + destination + '/' + (subdir ? subdir + '/' : '') + filename + '\'');
                        grunt.file.copy(abspath, destination + '/' + (subdir ? subdir + '/' : '') + filename);
                    });
                } else {
                    grunt.file.copy(file, destination);
                }
            });
        },
        findAndReplace = function (files, find, replace) {
            grunt.verbose.writeln('Replacing: \'' + replace.replaceAll('\\n', '\\n').replaceAll('\\t', '\\t') + '\' for \'' + find.replaceAll('\\\\', '') + '\' in ' + files.join(' and '));
            require('replace')({
                regex: find,
                replacement: replace,
                paths: files,
                recursive: true,
                silent: true
            });
        },
        deleteFileOrDirectory = function (path) {            
            if (grunt.file.expand(path).length > 0) {
                grunt.file.delete(grunt.file.expand(path), {force: true});
            }
        },
        //Añade indentación de un espacio en blanco a todas las líneas
        formatText = function (text) {
            text = text.replace(/(\n){1}/g, '\n ');
            text = text.replace(/[ ]{2}/g, ' ');
            return text;
        },
        cleanUp = function(path) {
            deleteFileOrDirectory(path);
        };

  grunt.registerMultiTask('debianize', 'Empaquetador Debian.', function () {
    var done = this.async();
      
    // Cojo los options definidos en Gruntfile y defino dos nuevos
    var options = this.options({            
            base_directory: __dirname + '/..'
        }),
        spawn = require('child_process').spawn,
        dateFormat = require('dateformat'),
        now = dateFormat(new Date(), 'ddd, d mmm yyyy h:MM:ss +0000'),
        templatesDirectory = options.base_directory + '/templates/base/',
        tempDirectory = 'tmp',
        workingDirectory = tempDirectory + '/' + options.package + '-' + options.version,
        controlDirectory = workingDirectory + '/debian',        
        changelog = controlDirectory + '/changelog',
        control = controlDirectory + '/control',
        readme = controlDirectory + '/README.Debian',
        copyright = controlDirectory + '/copyright', 
        install = controlDirectory + '/' + options.package + '.install',
        dependencies = '';
    
    //Limpio todo
    grunt.log.writeln('Limpiando el directorio temporal antes de empezar.');
    cleanUp(tempDirectory);
      
    //Copio la plantilla a carpeta temporal    
    grunt.log.writeln('Cargando la plantilla de paquete debian.');
    copyFileOrDirectory(templatesDirectory, controlDirectory);
            
    //Copio los fuentes a empaquetar    
    grunt.log.writeln('Cargando el código fuente.');
    this.files.forEach(function (file) {
        if (grunt.file.exists(file.src[0])) {
            if (!grunt.file.isDir(file.src[0])) {
                //grunt.verbose.writeln('Copio: \'' + file.src[0] + '\' a \'' + workingDirectory+file.dest + '\'');
                grunt.file.copy(file.src[0], workingDirectory + file.dest);
            }
        } else {
            grunt.log.error('No he encontrado el fichero: ' + file.src[0] + '.');
        }        
    });
      
    //Reemplazo cadenas
    grunt.log.writeln('Reemplazando cadenas en los ficheros debian.');
    findAndReplace([changelog, control, copyright, readme], '\\$\\{package\\}', options.package);
    findAndReplace([changelog], '\\$\\{version\\}', options.version);
    findAndReplace([changelog], '\\$\\{build\\}', (options.build == '' ? '' : '-' + options.build));
    findAndReplace([changelog], '\\$\\{changelog.stable\\}', (options.changelog.stable == 'true' ? 'stable' : 'unstable'));
    findAndReplace([changelog], '\\$\\{changelog.comment\\}', options.changelog.comment);
    findAndReplace([changelog], '\\$\\{changelog.issue\\}', options.changelog.issue);
    findAndReplace([changelog, control, readme], '\\$\\{maintainer.name\\}', options.maintainer.name);
    findAndReplace([changelog, control, readme], '\\$\\{maintainer.email\\}', options.maintainer.email);
    findAndReplace([changelog, readme], '\\$\\{date\\}', now);
    findAndReplace([control], '\\$\\{section\\}', options.section);
    findAndReplace([control], '\\$\\{priority\\}', options.priority);
    findAndReplace([control], '\\$\\{homepage\\}', options.homepage);    
    findAndReplace([control], '\\$\\{shortDescription\\}', options.shortDescription);
    findAndReplace([control], '\\$\\{longDescription\\}', formatText(options.longDescription));
    findAndReplace([copyright], '\\$\\{copyright.sourceUrl\\}', options.copyright.sourceUrl);
    
    var dependencias = '';
    if (options.dependencies !== '' && options.dependencies.length > 0) {
        dependencias = options.dependencies.join(', ');
        dependencias = ', ' + dependencias;
    }
    findAndReplace([control], '\\$\\{dependencies\\}', dependencias);
      
    //Genero el install    
    grunt.log.writeln('Generando fichero install.');
    grunt.file.write(install, options.install.join('\n'));
      
    //Fichero README
    var leeme = '';
    if (grunt.file.isFile('./' + options.readmeFile)) {
        leeme = grunt.file.read('./' + options.readmeFile);
        findAndReplace([readme], '\\$\\{readmeFile\\}', leeme);
    } else {
        //Borro el fichero de README
        grunt.file.delete(readme);
    }
      
    //Fichero copyright. Cojo el contenido del fichero licenseFile y lo vuelco al copyright.
    var licencia = '';      
    if (grunt.file.isFile('./' + options.copyright.licenseFile)) {
        licencia = grunt.file.read('./' + options.copyright.licenseFile);
    }
    findAndReplace([copyright], '\\$\\{copyright.licenseFile\\}', licencia);
          
    //Ejecuto el empaquetador
    grunt.log.writeln('Empaquetando y creando fichero .deb.');
    var packager = spawn('dpkg-buildpackage', ['-b'], {
      cwd: workingDirectory,
      stdio: ['ignore', (grunt.option('verbose') ? process.stdout : 'ignore'), process.stderr]
    });
    packager.on('exit', function (code) {
      if (code !== 0) {
          grunt.log.writeln('Error al empaquetar: ' + error);
          done(false);
      } else {
          grunt.log.writeln('Paquete .deb creado.');
          done(true);
      }
    });
      
    
  });

};
