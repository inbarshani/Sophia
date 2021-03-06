var http = require('http');
var uuid = require('./uuid');
var init = require('../../core/runner/initialize-runner-script.js');
init();

var sophia_machine = 'myd-vm00366.hpswlabs.adapps.hp.com';
//var sophia_machine = 'localhost';

global.appBaseUrl = "http://myd-vm06983.hpswlabs.adapps.hp.com:8082/";
global.fileUploadUrl = "http://"+sophia_machine+":8083/file";
global.dataUrl = "http://"+sophia_machine+":8082/data";
global.sophiaTestID = '';
global.sophiaTestIDUpdateScript = function(){
    var script =        
        'try ' +
        '{ ' +
        ' if (chrome && chrome.runtime){'+
        '   console.log("chrome.runtime: "+chrome.runtime);'+
        '   chrome.runtime.sendMessage('+
        '        "iojhohbfacfjepmplgkdjleclmafeddm", '+
        '       {sophiaTestId: \"'+global.sophiaTestID+'\", '+
        '           baseAppUrl: \"'+global.appBaseUrl+'\",'+ 
        '           dataUrl: \"'+global.dataUrl+'\",'+ 
        '           fileUrl: \"'+global.fileUploadUrl+'\"'+ 
        '       },{},'+ 
        '        function(response)'+ 
        '        {'+
        '            console.log("recevied response: "+response);'+
        '        });'+
        ' }'+
        ' else console.log("Sophia failed to communicate with extension");'+
        '}'+
        'catch(ex)' +
        '{' +
        '    console.log("exception in sendmessage: "+ex);'+
        '}';
    console.log('updating browser with new test ID using script: '+script);
    return script;    
};

function reportToSophia(args) {
    var post_data = JSON.stringify(args);
    // An object of options to indicate where to post to
    // http://16.60.229.2:8082/data
    var post_options = {
        host: sophia_machine,
        port: '8082',
        path: '/data',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': post_data.length
        }
    };

    // Set up the request
    var post_req = http.request(post_options); //, function(res) {});
    post_req.on('error', function(e) {
        console.log('problem with reporting to Sophia: ' + e.message);
    });
    // post the data
    post_req.write(post_data);
    post_req.end();
}

function sendSophiaParamsToBrowser(testID)
{
    console.log('\n********** sendSophiaParamsToBrowser ********\n');
    try
    {
        var script =        
            'try ' +
            '{ ' +
            ' if (chrome && chrome.runtime){'+
            '   console.log("chrome.runtime: "+chrome.runtime);'+
            '   chrome.runtime.sendMessage('+
            '        "iojhohbfacfjepmplgkdjleclmafeddm", {sophiaTestId: \"'+testID+'\"},{},'+ 
            '        function(response)'+ 
            '        {'+
            '            console.log("recevied response: "+response);'+
            '        });'+
            ' }'+
            ' else console.log("Sophia failed to communicate with extension");'+
            '}'+
            'catch(ex)' +
            '{' +
            '    console.log("exception in sendmessage: "+ex);'+
            '}';
        console.log('updating browser with new test ID: '+testID);
        browser.executeScript(script);    
    }
    catch(ex)
    {
        console.log('exception in executeScript: '+ex);    
    }
    console.log('\n********** sendSophiaParamsToBrowser ********\n');
    
}
/*
function wrapGlobalFN(globalFN, name) {
    if (globalFN == undefined || globalFN == null) {
        console.log('Instrumenting global jasmine function: ' + name + ' function does not exist');
        return globalFN;
    } else {
        console.log('Instrumenting global jasmine function: ' + name);
        return function() {
            //console.log('In instrumented wrapped global jasmine function: '+name);
            var desc = arguments[0];
            var fn = arguments[1];

            globalFN(desc, function() {
                console.log('Now running instrumented function');

                var ts = new Date().getTime();
                var args = {
                    timestamp: ts,
                    type: '',
                    description: '',
                    guid: ''
                };
                if (name == "it") {
                    args.type = "TestStep";
                    args.description = desc;
                    args.guid = test_guid;
                } else if (name == "expect") {
                    args.type = "TestVerification";
                    args.description = desc;
                    args.guid = test_guid;
                }
                reportToSophia(args);
                // and now for the actual test
                return fn.call();
            });
        };
    }
}
*/
var SpecReporter = function () {
  this.started = false;
  this.finished = false;
  this.currentSuite = 
    {description: '', id: -1, guid: -1, done_timestamp: 0};
};

SpecReporter.prototype = {
  reportRunnerStarting: function (runner) {
    this.started = true;
    console.log('*** Sophia instrument Runner started ');
    if (this.currentSuite && this.currentSuite.guid && this.currentSuite.guid > 0)
        sendSophiaParamsToBrowser(this.currentSuite.guid);
  },

  reportRunnerResults: function (runner) {
    console.log('*** Sophia instrument Runner done, this.currentSuite: '+
        require('util').inspect(this.currentSuite));
    this.finished = true;
    if (this.currentSuite)
    {
        this.reportTest(this.currentSuite.done_timestamp, 
            this.currentSuite.description, 'stop');
        this.currentSuite = {description: '', id: -1, guid: -1, done_timestamp: 0};    
    }
  },

  reportSuiteResults: function (suite) {
    console.log('*** Sophia instrument Suite results: '+require('util').inspect(suite));
    var ts = new Date().getTime();
    if (suite.parentSuite)
    {
        // an internal suite is actually a test step
        this.reportTestStep(ts, suite.description, 'stop', 'unverified');
    }
    else
    {
        // top suite, test end
        if (suite.id == this.currentSuite.id)
        {
            this.reportTest(this.currentSuite.done_timestamp, 
                this.currentSuite.description, 'stop');
            this.currentSuite = {description: '', id: -1, guid: -1, done_timestamp: 0};
        }
    }
  },

  reportSuiteStarting: function (suite) {
    console.log('*** Sophia instrument Suite starting: '+require('util').inspect(suite));
    var ts = new Date().getTime();
    if (suite.parentSuite)
    {
        // an internal suite is actually a test step
        this.reportTestStep(ts, suite.description, 'start', '');
    }
    else
    {
        // top suite, test start
        if (this.currentSuite == null ||
            this.currentSuite.id != suite.id ||
            this.currentSuite.description != suite.description)
        {
            // a new suite starting = a new test 
            // report to Sophia of the previous test end, and new test start
            if (this.currentSuite && this.currentSuite.id != -1)
            {
                // report the end of the previous test
                this.reportTest(this.currentSuite.done_timestamp, 
                    this.currentSuite.description, 'stop');
            }
            this.currentSuite.description = suite.description;
            this.currentSuite.id = suite.id;
            this.currentSuite.guid = uuid();
            global.sophiaTestID = this.currentSuite.guid;
            sendSophiaParamsToBrowser(this.currentSuite.guid);
            this.currentSuite.done_timestamp = ts;

            this.reportTest(ts, this.currentSuite.description, 'start');
        }
    }
  },

  reportSpecStarting: function (spec) {
    console.log('*** Sophia instrument Spec start: '+spec.description);    
    var ts = new Date().getTime();
    if (this.currentSuite ||
        this.currentSuite.id != spec.suite.id ||
        this.currentSuite.description != spec.suite.description)
    {
        // a new suite starting = a new test 
        // report to Sophia of the previous test end, and new test start
        if (this.currentSuite && this.currentSuite.id != -1)
        {
            // report the end of the previous test
            this.reportTest(this.currentSuite.done_timestamp, 
                this.currentSuite.description, 'stop');
        }
        this.currentSuite.description = spec.suite.description;
        this.currentSuite.id = spec.suite.id;
        this.currentSuite.guid = uuid();
        global.sophiaTestID = this.currentSuite.guid;
        sendSophiaParamsToBrowser(this.currentSuite.guid);
        this.currentSuite.done_timestamp = ts;

        this.reportTest(ts, this.currentSuite.description, 'start');
    }

    // get a new timestamp - likely no different than the previous, 
    //  but can make a difference when reporting the step
    ts = new Date().getTime();
    this.reportTestStep(ts, spec.description, 'start', '');
  },

  reportSpecResults: function (spec) {
    console.log('*** Sophia instrument Spec done: '+spec.description);

    var ts = new Date().getTime();

    // set the status for the step
    var status = "unverified";
    if (spec.results_.failedCount == 0 && spec.results_.passedCount > 0)
        status = "passed";
    else if (spec.results_.failedCount > 0)
        status = "failed";

    this.reportTestStep(ts, spec.description, 'done', status);

    // don't know if this is the last step, but save it as such, 
    //  so that when the suite ends we have a reference
    this.currentSuite.done_timestamp = ts;
  },

  reportTestStep: function(timestamp, description, action, status){
    // report step
    var args = {
        timestamp: timestamp,
        type: 'TestStep',
        action: action,
        description: description,
        testID: this.currentSuite.guid,
        status: status
    };

    reportToSophia(args);
  },

  reportTest: function(timestamp, description, action){
    var ts = new Date().getTime();
    // report step
    var args = {
        timestamp: ts,
        type: 'Test',
        action: action,
        description: description,
        testID: this.currentSuite.guid
    };

    reportToSophia(args);

  }
};

//global.describe = wrapGlobalFN(global.describe, 'global.describe');
//global.it = wrapGlobalFN(global.it, 'it');
//global.expect = wrapGlobalFN(global.expect, 'expect');
if (global.jasmine != undefined)
{
    console.log('Sophia jasmine defined');
    // add reporter
    var reporter = new SpecReporter();
    global.jasmine.getEnv().addReporter(reporter);
    // need to override jasmine suite execute, so i'll have event for suite start
    global.orgJasmineExecute = global.jasmine.Suite.prototype.execute;
    global.jasmine.Suite.prototype.execute = (function(onComplete) {
       reporter.reportSuiteStarting(this);
       global.orgJasmineExecute.call(this, onComplete);
    });
}
else
{
    console.log('Sophia jasmine not defined');
    //console.log('globals:\n'+require('util').inspect(global, {depth: 4}));
}
