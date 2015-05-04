var http = require('http');
var uuid = require('./uuid');

global.appBaseUrl = "http://myd-vm06983:8081/";
global.fileUploadUrl = "http://localhost:8080/file";
global.dataUrl = "http://localhost:8080/data";

function reportToSophia(args) {
    var post_data = JSON.stringify(args);
    // An object of options to indicate where to post to
    // http://16.60.229.2:8082/data
    var post_options = {
        host: 'localhost',
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
    //console.log('*** Runner started '+require('util').inspect(runner));
  },

  reportRunnerResults: function (runner) {
    //console.log('*** Runner done');
    this.finished = true;
  },

  reportSuiteResults: function (suite) {
    //console.log('*** Suite results: '+require('util').inspect(suite));
  },

  reportSpecStarting: function (spec) {
    //console.log('*** Spec start: '+require('util').inspect(spec));
    var ts = new Date().getTime();
    if (this.currentSuite.id != spec.suite.id ||
        this.currentSuite.description != spec.suite.description)
    {
        // a new suite starting = a new test 
        // report to Sophia of the previous test end, and new test start
        if (this.currentSuite.id != -1)
        {
            // report the end of the previous test
            var old_test_args = {
                timestamp: this.currentSuite.done_timestamp,
                type: 'Test',
                action: 'stop',
                description: this.currentSuite.description,
                testID: this.currentSuite.guid            
            }

            reportToSophia(old_test_args);
        }
        this.currentSuite.description = spec.suite.description;
        this.currentSuite.id = spec.suite.id;
        this.currentSuite.guid = uuid();
        this.currentSuite.done_timestamp = ts;

        var new_test_args = {
            timestamp: ts,
            type: 'Test',
            action: 'start',
            description: this.currentSuite.description,
            testID: this.currentSuite.guid            
        }

        reportToSophia(new_test_args);
    }

    // get a new timestamp - likely no different than the previous, 
    //  but can make a difference when reporting the step
    ts = new Date().getTime();
    var args = {
        timestamp: ts,
        type: 'TestStep',
        action: 'start',
        description: spec.description,
        testID: this.currentSuite.guid
    };

    reportToSophia(args);
  },

  reportSpecResults: function (spec) {
    //console.log('*** Spec done: '+require('util').inspect(spec));
    var ts = new Date().getTime();
    // don't know if this is the last step, but save it as such, 
    //  so that when the suite ends we have a reference
    this.currentSuite.done_timestamp = ts;

    // set the status for the step
    var status = "unverified";
    if (spec.results_.failedCount == 0 && spec.results_.passedCount > 0)
        status = "passed";
    else if (spec.results_.failedCount > 0)
        status = "failed";

    // report step
    var args = {
        timestamp: ts,
        type: 'TestStep',
        action: 'done',
        description: spec.description,
        testID: this.currentSuite.guid,
        status: status
    };

    reportToSophia(args);
  }
};

//global.describe = wrapGlobalFN(global.describe, 'global.describe');
//global.it = wrapGlobalFN(global.it, 'it');
//global.expect = wrapGlobalFN(global.expect, 'expect');
if (global.jasmine != undefined)
{
    console.log('jasmine defined');
    // add reporter
    global.jasmine.getEnv().addReporter(new SpecReporter());
}
else
    console.log('jasmine not defined');
