'use strict';

var path = require('path'),
    fs = require('fs'),
    exec = require('child_process').exec,
    argv = require('minimist')(process.argv.slice(2)),
    tildify = require('tildify'),
    gulp = require('gulp'),
    rimraf = require('rimraf'),
    gutil = require('gulp-util'),
    rename = require('gulp-rename');

// installer plugins to handle the npm and bower packages installation
function installer ( rootPath, command, description, nextStepFn, callback ) {
  rootPath = rootPath || process.cwd();
  gutil.log(gutil.colors.gray('[-log:]'), description);
  process.chdir(rootPath);
  return exec(command, function(error, stdout, stderr) {
    //process.chdir(rootPath);
    if (error !== null) {
      var log = stderr.toString();
      gutil.log( gutil.colors.red('[-Error:] ' + log) );
      if (command === 'npm install') {
        gutil.log( gutil.colors.red('[-Error:] npm install failed dramatically.') );
        gutil.log(
          gutil.colors.red('[-Error:] Need to manually do \'npm install\' and \'bower install\' ')
        );
        gutil.log(
          gutil.colors.red('[-Error:] Before the project is fully ready for development')
        );
      } else if (command === 'bower install') {
        gutil.log( gutil.colors.red('[-Error:] bower install failed dramatically.') );
        gutil.log( gutil.colors.red('[-Error:] Need to manually do \'bower install\'') );
        gutil.log(
          gutil.colors.red('[-Error:] Before the project is fully ready for development')
        );
      } else {
        gutil.log(
          gutil.colors.red('[-Error:] initialize git repository failed dramatically.')
        );
        gutil.log( gutil.colors.red('[-Error:] Need to manually do') );
        gutil.log( gutil.colors.red('[-Error:] \'git init && git add . && git commit -m\'') );
      }
      return callback(log);
    }
    nextStepFn(rootPath, callback);
  });
}

function gitInit(rootPath, callback) {
  gutil.log(
    gutil.colors.gray('[-log:]'),
    gutil.colors.cyan('em-cli'),
    'is doing REALLY hard to initialize your repo ...'
  );

  rootPath = rootPath || process.cwd();
  process.chdir(rootPath);

  var month = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ],
    today = new Date(),
    todayDate = today.getDate(),
    todayMonth = month[today.getMonth()],
    todayYear = today.getFullYear(),
    command = 'git init && git add . && git commit -m \'Initial Commit @ ' +
              todayMonth + ' ' + todayDate + ', ' + todayYear + '\'';

  return exec(command, function(error, stdout, stderr) {
      if (error !== null) {
        var log = stderr.toString();
        gutil.log( gutil.colors.red('[-Error:] ' + log) );
        return callback(log);
      }
      gutil.log(
         gutil.colors.green('[-done:] Initialized a new git repo and did a first commit')
      );
      gutil.log(
        gutil.colors.bold('[-copy:] =>'),
        gutil.colors.cyan('cd ' + argv._[1]),
        gutil.colors.gray('# navigate to the newly created application')
      );
      gutil.log(
        gutil.colors.bold('[-copy:] =>'),
        gutil.colors.cyan('em serve'),
        gutil.colors.gray(' # kick start the server, open project in favorite browser,'),
        gutil.colors.gray('auto watch file changes and rebuild the project')
      );
      callback();
    });
}

function installBower (rootPath, callback) {
  installer (
    rootPath,
    'bower install',
    'Bower is installing javascript packages...',
    gitInit,
    callback
  );
}

function installNpm (rootPath, callback) {
  installer (
    rootPath,
    'npm install',
    'NPM is installing node packages...',
    installBower,
    callback
  );
}

function simpleLogger() {
    gutil.log(
      gutil.colors.green('[-done:] A new'),
      gutil.colors.cyan('Ember.js'),
      gutil.colors.green('mvc application have been successfully created!')
    );
}

function runningCallback(isRunningTest, dest, callback) {

    // switch to the newly generated folder
    process.chdir( dest );

    // rename `gitignore` to `.gitignore`
    // then remove the originial `gitignore`
    gulp.src( './gitignore' )
      .pipe( rename( '.gitignore' ) )
      .on('end', function() {
        rimraf( './gitignore', function() { });
      })
      .pipe(gulp.dest(dest));

    if( !isRunningTest ) {
      installNpm( dest, callback );
    } else {
      callback();
    }
}

function setupTask (coreSrcPath, appSrcPath, dest, isRunningTest) {
  gutil.log(
    gutil.colors.gray('[-log:]'),
    'Starting to generate an application at',
    gutil.colors.magenta( tildify(dest) )
  );

  var coreSrc = [ coreSrcPath + '/**/*'],
      appSrc = ( appSrcPath.indexOf('http') !== -1 ) ? appSrcPath : [ appSrcPath + '/**/*' ];

  return gulp.task('generator', function (callback) {

      gulp.src(coreSrc, {dot: true})
        .on('end', function() {
          gutil.log(
            gutil.colors.green('[-done:] A new'),
            gutil.colors.cyan('Node.js'),
            gutil.colors.green('web server have been successfully created!')
          );
          gutil.log(
            gutil.colors.gray('[-log:]'),
            gutil.colors.magenta('It may take up to 1 minute and half!')
          );
          gutil.log(
            gutil.colors.gray('[-log:]'),
            gutil.colors.magenta('Be patient, fetching packages from internet ...')
          );
        })
        .pipe(gulp.dest(dest));

      // if option.path exist and it is a git url, it will be fetched
      // Otherwise, it will use the default scaffold folder app
      if (typeof appSrc === 'string') {

        var command = 'git clone ' + appSrc + ' app',
          rootPath = dest || process.cwd(),
          clientPath = rootPath + '/client';

        // if client/ folder is not existed, simply create one
        if (!fs.existsSync(clientPath)) {
          fs.mkdirSync(clientPath);
        }

        gutil.log(
          gutil.colors.gray('[-log:]'),
          'Going to fetch the app template from ',
          gutil.colors.cyan(appSrc)
        );

        // change to the client folder to install app template
        process.chdir( path.resolve(clientPath) );

        // fetch the git url now
        exec( command, function(error, stdout, stderr) {
          if (error !== null) {
            var log = stderr.toString();
            gutil.log( gutil.colors.red('[-Error:] ' + log) );
            gutil.log( gutil.colors.red('[-Error:] --path ' + appSrc + ' cannot be fetched!') );
            process.exit(0);
          }

          gutil.log(
            gutil.colors.green('[-done:] Successfully fetched and installed the app template ')
          );

          simpleLogger();

          // After fetching a git repo, then remove the .git folder
          return rimraf(path.join(dest, 'client', 'app', '.git'), function(error) {
            if (error !== null) {
              var log = stderr.toString();
              gutil.log( gutil.colors.red('[-Error:] ' + log) );
              process.exit(0);
            }
            // running npm install callback
            runningCallback(isRunningTest, dest, callback);
          });
        });
     } else {
        gulp.src(appSrc, {dot: true})
          .on('end', function() {
            simpleLogger();
            runningCallback(isRunningTest, dest, callback);
          })
          .pipe(gulp.dest(dest+'/client/app'));
     }
    });
}

function pathResolver (relativePath) {
  return path.resolve(__dirname, '..', relativePath);
}

function getSkeletonsCorePath () {
  var skeletonsCorePath = pathResolver('skeletons/core');
  return skeletonsCorePath;
}

function getSkeletonsAppPath () {
  var skeletonsAppPath = pathResolver('skeletons/app');
  return skeletonsAppPath;
}

var create = function(generatorPath, options) {
  if (argv._.length < 2) {
    gutil.log(gutil.colors.red('[-Error:] Missing directory name.'), 'ex: em new my-app');
    gutil.log(gutil.colors.red('[-Error:]'), 'See \'em new --help\'');
    process.exit(0);
  }

  // check for the mode, is running test or not
  var isRunningTest = options.test || false;

  //Pass in a valid git url for installing ember-application-template
  var re = /^http(?:s)?:\/\//,
    userInputPath = options.path,

    //check for remote URL path
    remoteUrl = ( userInputPath ) ?
          ( re.test(userInputPath) ) ?
          userInputPath : ('http://' + userInputPath) : undefined;

  // get the full path to the core of application. ( Server && Client )
  var skeletonsCorePath = getSkeletonsCorePath(),
      // get the full path to the ember application or take the generator from github or an URL
      // skeletonsAppPath = ( userInputPath ) ? remoteUrl : getSkeletonsAppPath();
      skeletonsAppPath = getSkeletonsAppPath();

  if (fs.existsSync(generatorPath)) {
    gutil.log(
      gutil.colors.red('[-Error:]'), 'The folder name',
      gutil.colors.red(generatorPath), 'has existed in this directory tree!'
    );
    process.exit(0);
  } else {
    // Create a new directory name what user passed in
    fs.mkdirSync(generatorPath);
  }

  if ( remoteUrl !== undefined ) {
      skeletonsAppPath = remoteUrl;
  }

  var currentAppPath = path.resolve(generatorPath);
  // Setup gulp task, copy the source files into the newly create folder
  setupTask (skeletonsCorePath, skeletonsAppPath, currentAppPath, isRunningTest);
  // Trigger the generator task
  gulp.start('generator');
};

module.exports = create;
