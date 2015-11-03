var testScripts = {};
var currentTest = -1;
var currentStep = -1;

$(document).ready(function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', chrome.extension.getURL('tests.json'), true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
            testScripts = JSON.parse(xhr.responseText);
            console.log('loaded tests from extension json file.');
            //chrome.storage.local.set({'sophiaTests', testScripts}, function() {
            //   console.log('Sophia extension Test tests saved');
            //});
            // load list of tests
            var tests = Object.keys(testScripts);
            for (var i = 0; i < tests.length; i++) {
                $("#testsSelect").append('<option value="' + i + '">' + tests[i] + '</option>');
            }
        }
    };
    xhr.send();

    chrome.storage.local.get(['sophiaTestId', 'sophiaCurrentTest', 'sophiaCurrentStep'],
        function(result) {
            if (result.sophiaTestId == null) {
                // test not running
                setEnableByID(true, ["#startTestBtn", "#testsSelect"]);
                setEnableByID(false, ["#reportStepFail", "#reportStepPass", "#endTestBtn"]);
                $("#instructions").text('Press "Start Test" to begin execution');
                $("#currentStep").text('');
                $("#currentManualStep").css('visibility', 'hidden');
            } else {
                setEnableByID(false, ["#startTestBtn", "#testsSelect"]);
                setEnableByID(true, ["#reportStepFail", "#reportStepPass", "#endTestBtn"]);
                currentTest = parseInt(result.sophiaCurrentTest);
                currentStep = parseInt(result.sophiaCurrentStep);
                var test_desc = 'Manual test';
                var step_desc = 'Manual step ' + currentStep;
                if (currentTest >= 0) {
                    test_desc = Object.keys(testScripts)[currentTest];
                    step_desc = testScripts[test_desc][currentStep];
                }
                $("#instructions").text('Test ' + test_desc + ' with GUID ' + result.sophiaTestId + ' running...');
                if (!step_desc) {
                    step_desc = '<<test done>>';
                    setEnableByID(false, ["#reportStepFail", "#reportStepPass"]);
                }
                if (currentTest >= 0) // built-in test
                {
                    $("#currentStep").text(step_desc);
                } else // manual ad-hoc test, enable description
                {
                    $("#currentManualStep").css('visibility', '');
                }
            }
        });
});

$("#startTestBtn").click(function() {
    setEnableByID(false, ["#startTestBtn", "#testsSelect"]);
    setEnableByID(true, ["#reportStepFail", "#reportStepPass", "#endTestBtn"]);
    var selectedTest = $("#testsSelect").val();
    if (selectedTest != 'new') {
        currentTest = parseInt(selectedTest);
    }
    else
    {
        $('#stepDesc').val('Manual step '+currentStep);
        $('#currentManualStep').css('visibility', '');
    }
    currentStep = 1;
    var ts = new Date().getTime();
    chrome.storage.local.get('dataUrl', function(result) {
        var dataUrl = result.dataUrl;
        if (dataUrl == undefined) {
            console.log("Sophia extension Data URL not defined");
            return;
        }
        var guid = UUID();
        chrome.storage.local.set({
            'sophiaTestId': guid,
            'sophiaCurrentTest': currentTest,
            'sophiaCurrentStep': currentStep
        }, function() {
            console.log('Sophia extension Test params saved');
        });
        var description = "Manual test";
        if (currentTest >= 0)
            description = Object.keys(testScripts)[currentTest];
        var args = {
            type: "Test",
            timestamp: ts,
            action: "start",
            testID: guid,
            description: description
        }

        var data = JSON.stringify(args);
        $.ajax({
            url: dataUrl,
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function(doc) {
                // setup first step, and report it as well
                $("#instructions").text('Test ' + description + ' with GUID ' + guid + ' running...');
                var step_desc = '';
                if (currentTest >= 0) {
                    var test = Object.keys(testScripts)[currentTest];
                    step_desc = testScripts[test][currentStep];
                    $("#currentStep").text(step_desc);
                } else
                {
                    step_desc = $('#stepDesc').val();
                }

                args = {
                    type: "TestStep",
                    timestamp: ts,
                    action: "start",
                    testID: guid,
                    stepNumber: currentStep,
                    description: step_desc
                }
                console.log('Sophia report teststep: '+JSON.stringify(args));
                var data = JSON.stringify(args);
                $.ajax({
                    url: dataUrl,
                    type: 'POST',
                    data: data,
                    dataType: 'json',
                    success: function(doc) {
                        console.log("TestStep start reported");
                    }
                });
            }
        });
    });
});

$("#endTestBtn").click(function() {
    setEnableByID(true, ["#startTestBtn", "#testsSelect"]);
    setEnableByID(false, ["#reportStepFail", "#reportStepPass", "#endTestBtn"]);
    $("#currentStep").text('');
    var description = "Manual test";
    if (currentTest >= 0)
        description = Object.keys(testScripts)[currentTest];
    var step_desc = '';
    if (currentTest >= 0) {
        step_desc = testScripts[description][currentStep];
    } else
    {
        step_desc = $('#stepDesc').val();
        $('#currentManualStep').css('visibility', 'hidden');
    }
    var ts = new Date().getTime();
    chrome.storage.local.get('dataUrl', function(result) {
        var dataUrl = result.dataUrl;
        if (dataUrl == undefined) {
            console.log("Sophia extension Data URL not defined");
            return;
        }
        chrome.storage.local.get('sophiaTestId', function(result) {
            var guid;
            guid = result.sophiaTestId;
            if (guid == undefined) {
                console.log("Sophia extension GUID not defined");
                return;
            }
            if (step_desc) {
                // there is an active test step, so fail it before reporting end test
                var step_args = {
                    type: "TestStep",
                    timestamp: ts,
                    action: "done",
                    status: 'failed',
                    testID: guid,
                    stepNumber: currentStep,
                    description: step_desc
                }
                var step_data = JSON.stringify(step_args);
                $.ajax({
                    url: dataUrl,
                    type: 'POST',
                    data: step_data,
                    dataType: 'json',
                    success: function(doc) {
                        console.log("TestStep stop reported");
                    }
                });
            }
            var args = {
                type: "Test",
                timestamp: ts,
                action: "stop",
                testID: guid,
                description: description
            }
            var data = JSON.stringify(args);
            $.ajax({
                url: dataUrl,
                type: 'POST',
                data: data,
                dataType: 'json',
                success: function(doc) {
                    $("#instructions").text('Press "Start Test" to begin execution');
                }
            });
            // clear variables
            currentTest = -1;
            currentStep = -1;
            chrome.storage.local.set({
                'sophiaTestId': null,
                'sophiaCurrentTest': currentTest,
                'sophiaCurrentStep': currentStep
            }, function() {
                console.log('Sophia extension Test params cleared');
            });
        });
    });
});

function setEnableByID(isEnabled, ids) {
    ids.forEach(function(id) {
        if (isEnabled)
            $(id).removeAttr("disabled");
        else
            $(id).attr("disabled", true);
    });
}

$("#reportStepPass").click(function() {
    reportStep('passed');
});

$("#reportStepFail").click(function() {
    reportStep('failed');
});

function reportStep(status) {
    setEnableByID(false, ["#reportStepFail", "#reportStepPass"]);
    console.log("TestStep event");
    var ts = new Date().getTime();
    var step_desc = '';
    if (currentTest >= 0) {
        var test = Object.keys(testScripts)[currentTest];
        step_desc = testScripts[test][currentStep];
    } else {
        step_desc = $('#stepDesc').val();
    }
    chrome.storage.local.get('dataUrl', function(result) {
        var dataUrl = result.dataUrl;
        if (dataUrl == undefined) {
            console.log("Sophia extension Data URL not defined");
            return;
        }
        console.log("TestStep before get guid");
        chrome.storage.local.get('sophiaTestId', function(result) {
            var guid;
            guid = result.sophiaTestId;
            console.log("TestStep has guid: " + guid);
            if (guid == undefined) {
                console.log("Sophia extension GUID not defined");
                return;
            }
            var args = {
                type: "TestStep",
                timestamp: ts,
                action: "done",
                testID: guid,
                status: status,
                stepNumber: currentStep,
                description: step_desc
            }
            var data = JSON.stringify(args);
            console.log("TestStep before ajax: " + data);
            $.ajax({
                url: dataUrl,
                type: 'POST',
                data: data,
                dataType: 'json',
                success: function(doc) {
                    setEnableByID(true, ["#reportStepFail", "#reportStepPass"]);
                    console.log("TestStep reported");
                    currentStep++;
                    if (currentTest >= 0) {
                        var test = Object.keys(testScripts)[currentTest];
                        step_desc = testScripts[test][currentStep];
                        if (!step_desc) {
                            step_desc = '<<test done>>';
                            setEnableByID(false, ["#reportStepFail", "#reportStepPass"]);
                        }
                        $("#currentStep").text(step_desc);
                    } else {
                        step_desc = 'Manual step '+currentStep;
                        $('#stepDesc').val(step_desc);
                    }

                    var step_args = {
                        type: "TestStep",
                        timestamp: ts,
                        action: "start",
                        testID: guid,
                        stepNumber: currentStep,
                        description: step_desc
                    }
                    var step_data = JSON.stringify(step_args);
                    $.ajax({
                        url: dataUrl,
                        type: 'POST',
                        data: step_data,
                        dataType: 'json',
                        success: function(doc) {
                            console.log("TestStep start reported");
                        }
                    });

                    chrome.storage.local.set({
                        'sophiaCurrentStep': currentStep
                    }, function() {
                        console.log('Sophia extension Test currentStep param updated');
                    });
                },
                error: function(obj, textStatus, errorThrown) {
                    console.log("TestStep error: " + textStatus + " Error: " + errorThrown);
                }
            });
        });
    });
}

function UUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
