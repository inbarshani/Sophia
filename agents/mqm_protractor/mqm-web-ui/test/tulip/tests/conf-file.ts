/**
 * Created with IntelliJ IDEA.
 * User: Asher Saban [asher.saban@hp.com]
 * Date: 12/26/13
 * Time: 1:28 PM
 *
 * this is an example configuration file required for protractor / mintjs tests.
 * the config object is based on protractor's config and contains some mintjs additions and other configurations.
 * it is highly advised to be familiar with protractor's config file - referenceConf.js.
 */
var stackFilterFunction = require('./config-file-plugins/stack-filter-function');

exports.config= {

    // ---------------- user defined test settings ------------------ //
    // this section contains settings that will be used along the test.
    // basically, it's a map and use can add any settings you want.
    // in order to access the settings from anywhere is the test / framework use:
    // var settings = TagDB.getTestSettings(); --> this returns the entire config object
    // var inputLang = settings.inputLanguage; --> return the defined inputLanguage

    /**
     * a possible way to pass the test login info.
     * (currently not in use)
     */
    loginInfo: {
        username: 'sa_auto',
        password: ''
//        commented this because current code will fail the test if BR existing
//        ,sharedSpace: 'shared_space'
    },
    database: {
        dbType: 'ORACLE',
        dbName: 'mydtbld0064.isr.hp.com',
        defaultTableSpace: 'QC_DATA'
    },


    multiCapabilities: [{
        'browserName': 'chrome'
    } ],

    specs: ['./pre-flight/*.js'],

    //in case suite is specified(i.e. --suite="sanity"), use one of the following suites
    //if no suite is mentioned the protractor will run the "specs" parameter
    suites: {
        //add only folders with *.js to All suite
        All: ['./pre-flight/*.js', './daniel/*.js', './ehud/*.js', './yuval/*.js', './jack/*.js'],
        //CssScreenshot: './css-screenshot-test.js', // currently we don't have any working css test
        CSS: './applitools-tests/*css*.js',
        Daniel:'./daniel/*sanity.js',
        Ehud:'./ehud/*sanity*.js',
        Yuval:'./yuval/*sanity*.js',
        Jack:'./jack/*sanity*.js',
        PreFlight:'./pre-flight/*tab*.js',
        PCoE:['./ehud/*1082*e2e*', './yuval/*1739*e2e.js', './daniel/*3090*3092*dashboard-crud.js', './yuval/*3811*e2e.js',
            './ehud/*3843*e2e*', './daniel/*1125*smart-single-lookup-list-sanity.js', './daniel/*1125*smart-multi-reference-field-sanity.js',
            './ehud/*1698*memo-field-images*e2e*', 'daniel/*3821*e2e*', './daniel/*3849*context-dashboard-aggregated-quality-per-bli.js'],
        EverGreen: './evergreen/*.js'
    },

    /**
     * Directory for reports (browser logs)
     * if printCustomizatonLAbelsToFile parameters is set to true, files with customization data (e.g. fields, types, lists)
     * will be saved under logs folder. The data is project-specific. The files are stored once per test run after the first login
     * and are rewritten after the second and further runs
     */
    reportDirectory: './test/tulip/reports/logs',
    printCustomizationLabelsToFile: true,

    /**
     * the language that will be used by the DataProvider to generate random strings (random input).
     * for example, if inputLanguage is chinese, all the input of the test will be in chinese.
     */
    stringInputLanguage: '',
    browserLang: undefined,

    failureScreenshot: {
        dir: './test/tulip/reports/screenshots'
    },

    /**
     * if enabled , screenshots will be taken on every call from the test
     */
    cssScreenshots: {
        enabled: false,
        dir: './test/tulip/reports/screenshots/css'
    },

    /**
     * if set to true, UI performance will be tested and a suitable report will be generated
     */
    performance: false,

    backlogDirectory: '//rubicon.isr.hp.com/products/LT/TPS/tulip-test-reports/MqM',

    baseUrl: 'http://myd-vm06983.hpswlabs.adapps.hp.com:8082/',
//usually grant insert these lines automatically, once we move to grunt we can remove them
    'seleniumServerJar': '../../../selenium/server/selenium-server-standalone-2.42.2.jar',
    'seleniumArgs': [
        '-Dwebdriver.ie.driver=./selenium/drivers/selenium-server-ie32-driver-2.42.0.exe'
    ],
    'chromeDriver': '../../../selenium/drivers/selenium-chrome-driver-2.10.0.exe',

    'jasmineNodeOpts': {
        isVerbose: true,
        showColors: true,
        includeStackTrace: true,
        defaultTimeoutInterval: 1000000,
        realtimeFailure: true,
        showTiming: false,
        stackFilter: stackFilterFunction
    },

    log4js:{
        appenders: [
            {type: 'logLevelFilter', level: 'DEBUG', appender: {type: 'console', layout: {type: 'pattern', pattern: '%m'}}},
            {type: 'logLevelFilter', level: 'INFO', appender: {type: 'file', filename: './test/tulip/reports/logs/summary.log',
                layout: {type: 'pattern', pattern: '[%r] [%5.5p] - %m%n'}}}
        ]
    },
    /**
     * operations that will be performed after jasmine and protractor are available and before tests start to run.
     * - includes the runner (to prevent from requiring it within the tests)
     * - maximizes the screen.
     * - getting the language of the client. currently the DataProvider's language is the language of the client.
     */
    onPrepare: './config-file-plugins/jasmine-instrument.js',
//    onPrepare: '../core/runner/initialize-runner-script.js',
    beforeLaunch: '../core/runner/site-admin-preparations.js',

    debug: false,
    allScriptsTimeout: 600000,
    getPageTimeout: 600000


};
