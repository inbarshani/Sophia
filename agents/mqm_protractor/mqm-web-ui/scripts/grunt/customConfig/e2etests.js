module.exports = function(grunt, config) {
    var fs = require('fs');
    // chrome extension file
    var chromeExtensionCrx = './test/tulip/tests/ChromeExtentions/Sophia.crx';
  'use strict';
  var WORKSPACE_ROOT = process.cwd();
  var SELENIUM_SERVER_JAR = WORKSPACE_ROOT + '/selenium/server/selenium-server-standalone-2.45.0.jar';
  var SELENIUM_CHROME_DRIVER_PATH = WORKSPACE_ROOT + '/selenium/drivers/selenium-chrome-driver-2.14.0.exe';
  var SELENIUM_IE_32_DRIVER_PATH = WORKSPACE_ROOT + '/selenium/drivers/selenium-server-ie32-driver-2.45.0.exe';
  var SELENIUM_IE_64_DRIVER_PATH = WORKSPACE_ROOT + '/selenium/drivers/selenium-server-ie64-driver-2.45.0.exe';

  var MQM_NIGHTLY_SERVER = 'mqm-nightly';
  var MQM_EXT_CD_SERVER = 'mqm-ext-cd';

  //    var SELENIUM_HUB_ADDRESS = 'http://myd-vm03184.hpswlabs.adapps.hp.com:4444/wd/hub';
  var MAX_INSTANCES_GRID = 20;
  var MAX_INSTANCES_DEV = 1;

  var serverUrl = grunt.option('server-url') || 'http://localhost:8080/';
  var css = grunt.option('cssScreenshots');
  var browsersParam = grunt.option('browsers') || 'chrome';
  var browserLang = grunt.option('browser-lang');
  var stringInputLanguage = grunt.option('string-input-language');
  var proxyUrl = grunt.option('proxy-url');
  var suite = grunt.option('suite');
  var specs = grunt.option('specs');
  var localSelenium = grunt.option('localSelenium');
  var seleniumHub = grunt.option('hub');
  var dbDetails = grunt.option('db');
  var performanceFlag = grunt.option('performance');
  performanceFlag = !!performanceFlag; // to convert it to boolean

  (function configureProtractor() {
    //var saUser = grunt.option('sa-user') || 'sa';
    //var saPassword = grunt.option('sa-password') || '';

    function isKnownCIServer(url) {
      return url.indexOf(MQM_NIGHTLY_SERVER) !== -1 || url.indexOf(MQM_EXT_CD_SERVER) !== -1;
    }

    function configUrl(url, config) {
      if (isKnownCIServer(url)) {
        return {
          dbType: 'Oracle',
          dbName: 'MYDPHDB0179.hpswlabs.adapps.hp.com',
          defaultTableSpace: 'MQM_DATA'
        };
      } else {
        if (dbDetails) {
          var db = dbDetails.split(',');
          return {
            dbType: db[0],
            dbName: db[1],
            defaultTableSpace: db[2]
          };
        } else {
          return config.database;
        }
      }
    }

    function modifyConfigFile(data) {

      var path = require('path');
      var config = require(path.resolve(process.cwd(), data.protractorConfigFile)).config;
      config.performance = data.performance || config.performance;

      config.baseUrl = data.baseUrl;
      config.stringInputLanguage = stringInputLanguage || config.stringInputLanguage;

      config.seleniumServerJar = data.seleniumServerJar || SELENIUM_SERVER_JAR;

      config.chromeDriver = data.chromeDriver || SELENIUM_CHROME_DRIVER_PATH;

      //load browsers
      config.seleniumArgs = config.multiCapabilities = [];

      config.seleniumAddress = data.runSeleniumServer ? '' : 'http://localhost:4444/wd/hub';

      config.seleniumAddress = seleniumHub ? seleniumHub : config.seleniumAddress;

      browserLang = browserLang || config.browserLang;
      if (browsersParam !== undefined) {
        console.log('browsers parameter: ' + browsersParam);
        var browsersArray;
        if (browsersParam.charAt(0) !== '[') {    //regular browsers parameter --browsers=chrome,firefox
          browsersArray = browsersParam.split(',');
          browsersArray.forEach(function(browser) {
            var browserConfig = {browserName: browser, 'ignoreZoomSetting':'true'};
            if (browser === 'chrome' && browserLang) {
              browserConfig.chromeOptions = {args: ['--lang=' + browserLang.replace(/_/, '-')]};
            }
            if (browser === 'chrome' && data.extensionData) {
                if (!browserConfig.chromeOptions)
                  browserConfig.chromeOptions = {};
                browserConfig.chromeOptions.extensions = [data.extensionData];
            }

            /*
             * Used grunt option: --proxy-url
             * If a proxy-url option value is available from grunt cli,
             * then define a proxy project and add it to chrome capabilities.
             * Otherwise, no proxy will be set.
             */
            if (proxyUrl) {
              var link = proxyUrl.replace(/^http[s]?\:\/\//ig, '');
              var proxy = {
                proxyType: 'manual',
                httpProxy: link,
                sslProxy: link
              };
              browserConfig.proxy = proxy;
            }
            config.multiCapabilities.push(browserConfig);
          });
        } else {       //hub parameter  --browsers=[['ie','11','WINDOWS'],['chrome','40.0','WINDOWS'],['firefox','27.0','LINUX']
          var parse = browsersParam.slice(1).slice(0, -1);
          browsersArray = parse.split('\'');
          for (var i = 1; i < browsersArray.length; i += 6) {
            var browserConfig = {browserName: browsersArray[i], version: browsersArray[i + 2], platform: browsersArray[i + 4], 'ignoreZoomSetting':'true', shardTestFiles: 'true', maxInstances: ((seleniumHub) ? MAX_INSTANCES_GRID : MAX_INSTANCES_DEV)};
            if (browsersArray[i] === 'chrome' && browserLang) {
              browserConfig.chromeOptions = {args: ['--lang=' + browserLang.replace(/_/, '-')]};
            }
            if (browsersArray[i] === 'ie') {
              browserConfig.browserName = 'internet explorer';
            }
            config.multiCapabilities.push(browserConfig);
          }
        }

      } else {
        console.log('Please provide browser name');
        return 1;
      }

      config.database = configUrl(config.baseUrl, config);

      if (specs) {
        specs = specs.split(',');
      }
      config.specs = specs || config.specs;

      config.suite = suite;

      //if user define suite parameter then ignore specs
      if (config.suite) {
        config.specs = '';
      }

      //for reporting mechanism
      if (config.specs) {
        config.specsCount = config.specs.length;
      } else {
        config.specsCount = 0;
      }
      return modifyConfigFileCont(config, data);
    }

    function modifyConfigFileCont(config, data) {
      var outputFile = data.outputFile || WORKSPACE_ROOT + '/test/qa-automation/platform/mintjs/tests-e2e-junit.xml';
      var junitXmlReporterConfig = {
        browser: data.browser,
        baseUrl: data.baseUrl,
        includeStackTrace: true,
        outputFile: outputFile
      };

      var fs = require('fs');

      var start = new Date();
      config.startTimeStr = start.getUTCDate() + '' + (start.getMonth() + 1) + '_' + start.getHours() + start.getMinutes() + '_' + start.getSeconds() + start.getMilliseconds();

      if (config.loginInfo.sharedSpace === undefined || config.loginInfo.sharedSpace === '') {
        config.loginInfo.sharedSpace = 'shared_space_' + config.startTimeStr;
        console.log('Shared space name is not supplied in configuration. generated shared space name: ' + config.loginInfo.sharedSpace);
      }

      config.loginInfo = {
        username: config.loginInfo['username'],
        password: config.loginInfo['password'],
        sharedSpace: config.loginInfo['sharedSpace']
      };

      config.appUser = {
        appUser: 'sa' + new Date().getUTCDate() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getHours() + '-' + new Date().getMinutes() + '-' + new Date().getSeconds() + '-' + new Date().getMilliseconds(),
        appPass: ''
      };

      config.seleniumArgs = [];
      config.multiCapabilities.forEach(function(capability) {
        config.seleniumArgs.push(capability);
      });
      config.seleniumArgs.push('-Dwebdriver.ie.driver=' + SELENIUM_IE_32_DRIVER_PATH);
      config.cssScreenshots['enabled'] = data.cssScreenshots;

      var outputFilename = data.configModifiedFile || 'test/qa-automation/platform/mintjs/protractor-config-modified.js';
      config.onPrepare = config.onPrepare || data.runner || 'test/tulip/generated/core/runner/tulip-init.js';

      // We add self-executed function to Protractor configuration file to setup configuration for
      // junit xml reporter. This function will be executed when Protractor loads configuration file
      // using require() call.
      // Reporter configuration is put into global scope because we cannot pass it directly to reporter.

      config.jasmineNodeOpts.stackFilter = 'stackFilterFunction';
      var configJson = JSON.stringify(config, null, 4);
      configJson = configJson.replace('\"stackFilterFunction\"', 'stackFilterFunction');
      var stackFilterFunction = 'var stackFilterFunction = require(\'./config-file-plugins/stack-filter-function\');\n\n';

      fs.writeFileSync(outputFilename, stackFilterFunction + 'exports.config=' + configJson +
      '; (function () {' +
      'global.protractorJUnitXmlReporterGlobalSettings = ' + JSON.stringify(junitXmlReporterConfig, null, 4) +
      ';' +
      '})();');

      return outputFilename;
    }

    function runProtractorTest(that, configFile, oldFramework) {
      console.log('Running Protractor with config file ' + configFile);
      var done = that.async();
      var spawn = require('child_process').spawn;
      var ptor;
      var oldRunner = WORKSPACE_ROOT + '/test/qa-automation/platform/mintjs/runner/mintjs.js';
      var newRunner = WORKSPACE_ROOT + '/test/tulip/generated/core/runner/tulip-init.js';
      var runner = oldFramework ? oldRunner : newRunner;

      var args = [runner, configFile];
      process.execArgv.forEach(function(arg) {
        if (arg.indexOf('--debug-brk') >= 0) {
          var currentDebugPort = parseInt(arg.substr(arg.indexOf('=') + 1), 10);
          args.unshift('--debug-brk=' + (currentDebugPort + 1));
        }
      });

      ptor = spawn('node', args);

      console.log('TypeScript PID=' + ptor.pid);

      ptor.stdout.pipe(process.stdout);
      ptor.stderr.pipe(process.stderr);

      ptor.on('exit', function(code, signal) {
        console.log('[Grunt] Protractor exited with code=' + code + ', signal=' + signal);
        if (code !== 0) {
          grunt.fail.warn('Error running the tests.', code);
          done(false);
        } else {
          //We may reach here when no test ran at all and protractor failed before running tests
          grunt.log.ok('the tests completed.');
          done();
        }
      });
    }

    function startSeleniumServer(that, ieDriverPath) {
      var done = that.async();
      var spawn = require('child_process').spawn;

      var java = spawn('java', ['-jar', SELENIUM_SERVER_JAR, '-Dwebdriver.ie.driver=' + ieDriverPath, '-Dwebdriver.chrome.driver=' + SELENIUM_CHROME_DRIVER_PATH]);

      java.stdout.pipe(process.stdout);
      java.stderr.pipe(process.stderr);
      java.on('exit', function(code) {
        if (code !== 0) {
          grunt.fail.warn('Error starting selenium server.');
          done(false);
        } else {
          grunt.log.ok('Selenium server shutdown.');
          done();
        }
      });
    }

    //selenium server running ie 32 bit and chrome
    grunt.registerTask('selenium-server', function() {
      startSeleniumServer(this, SELENIUM_IE_32_DRIVER_PATH);
    });

    //selenium server running ie 64 bit and chrome
    grunt.registerTask('selenium-server-ie64', function() {
      startSeleniumServer(this, SELENIUM_IE_64_DRIVER_PATH);
    });

    /**
     * when running this task, use: --server-url=http://...../qcbin/
     * otherwise server will default to the above declaration.
     */
    grunt.registerTask('run-E2E-tests-old', ['update-protractor-binaries', 'E2E-test-old']);
    grunt.registerTask('run-E2E-tests', ['compileTs', 'update-protractor-binaries', 'E2E-tests']);
    grunt.registerTask('run-E2E-tests-home', ['compileTs', 'E2E-tests']);

    /**
     * server url is a parameter. for example:
     * grunt web-ui-drop-sanity --server-url=http://my_server_address:8080/qcbin/
     *
     * choose browsers: --browsers=firefox,chrome,ie
     * (seperated by comma, no spaces). default value for browsers is chrome,firefox,ie
     */
    grunt.registerTask('E2E-tests', function() {
      console.log('server url =  ' + serverUrl);
      css = !!css; //make css to be boolean
            var base64ExtensionData;
            if (chromeExtensionCrx) {
                var data = fs.readFileSync(chromeExtensionCrx);
                base64ExtensionData = data.toString('base64');
            }
      var modifiedConfigFile = modifyConfigFile({
        protractorConfigFile: WORKSPACE_ROOT + '/test/tulip/generated/tests/conf-file.js',
        baseUrl: serverUrl,
        cssScreenshots: css,
        runSeleniumServer: !localSelenium,
        runner: WORKSPACE_ROOT + '/test/tulip/generated/core/runner/initialize-runner-script.js',
        configModifiedFile: WORKSPACE_ROOT + '/test/tulip/generated/tests/protractor-config-modified.js',
        'seleniumServerJar': SELENIUM_SERVER_JAR,
        'chromeDriver': SELENIUM_CHROME_DRIVER_PATH,
        performance: performanceFlag,
        extensionData: base64ExtensionData
      });
      runProtractorTest(this, modifiedConfigFile);
    });

    grunt.registerTask('E2E-test-old', function() {
      console.log('server url =  ' + serverUrl);
      css = !!css; //make css to be boolean
      var modifiedConfigFile = modifyConfigFile({
        protractorConfigFile: WORKSPACE_ROOT + '/test/qa-automation/platform/mintjs/conf_file.js',
        baseUrl: serverUrl,
        cssScreenshots: css,
        runSeleniumServer: true
      });
      runProtractorTest(this, modifiedConfigFile, true);
    });
  })();

};
