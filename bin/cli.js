#!/usr/bin/env node

const scriptname = "nodejs-packaging-bundler"
const yargs = require("yargs");
const { mkdir } = require("temp");
const { spawnSync } = require("child_process");
const { boolean } = require("yargs");
const tar = require("tar");
const { renameSync } = require("fs");
const glob = require("glob");


const options = yargs
  .scriptName(scriptname)
  .command('$0 <npm_name> [version]', 'Download NPM dependencies for RPM packaging', (yargs) => {
    yargs.positional('npm_name', {
      describe: 'An NPM module name',
      type: 'string',
    }).positional('version', {
      describe: 'Optional NPM package version',
      type: 'string',
    }).epilog(`Given an NPM module name, and optionally a version, download the NPM, the prod and dev dependencies, each in their own tarball. Also finds licenses prod dependencies. All three tarballs and license list are copied to 'dest'`)
      .completion()
  })
  .option('dest', {
    describe: 'Destination directory',
    type: 'string',
    default: '$HOME/rpmbuild/SOURCES',
  })
  .strict()
  .help()
  .argv;

mkdir(`${scriptname}-`, function (err, dirPath) {
  process.chdir (dirPath);

  // Grab the NPM and create a tarball from it
  console.debug('> npm pack ' + options.npm_name)
  var child = spawnSync('npm', ['pack', options.npm_name], {
    stdio: 'pipe',
    cwd: dirPath,
  });
  if (child.error) {
    throw child.error
  }
  console.log('== stderr ==\n' + child.stderr.toString())
  console.log('== stdout ==\n' + child.stdout.toString())


  // Extract the tarball
  const tarball_name = child.stdout.toString().trim()
  console.debug('> Extracting ' + tarball_name)
  tar.extract({
    sync: true,
    file: tarball_name,
  })
  process.chdir('package');

  
  // Download the prod dependencies
  console.debug('> npm i --no-optional --only=prod')
  var child = spawnSync('npm', ['install', '--no-optional', '--only=prod'], {
    stdio: 'inherit',
  });
  if (child.error) {
    throw child.error
  }


  // Rename the node_modules directory to node_modules_prod
  renameSync('node_modules', 'node_modules_prod')


  // Extract the licenses for this package and its runtime dependencies
  const metadata_files = glob.sync('**/package.json');
  console.log(metadata_files);
  

    // Download the dev dependencies
  options.verbose ? console.debug('> npm i --no-optional --only=dev') : null
  var child = spawnSync('npm', ['install', '--no-optional', '--only=dev'], {
    stdio: 'inherit',
  });
  if (child.error) {
    throw child.error
  }

  // Rename the node_modules directory to node_modules_prod
  renameSync('node_modules', 'node_modules_dev')
})