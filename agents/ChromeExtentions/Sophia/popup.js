var testScripts = {};

var xhr = new XMLHttpRequest();
xhr.open('GET', chrome.extension.getURL('tests.json'), true);
xhr.onreadystatechange = function()
{
    if(xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200)
    {
        testScripts = JSON.parse(xhr.responseText);
        console.log('loaded tests from extension json file.');
        // load list of tests
        var tests = Object.keys(testScripts);
        for(var i=0;i<tests.length;i++)
        {
           $("#testsSelect").append('<option value="'+i+'">'+tests[i]+'</option>'); 
        }
    }
};
xhr.send();

var currentTest = -1;
var currentStep = -1;

$(document).ready(function() {
    chrome.storage.local.get(['sophiaTestId','sophiaCurrentTest', 'sophiaCurrentStep', 'sophiaTests'], 
        function(result) {
            if (result.sophiaTestId == null) {
                // test not running
                $("#reportStep").attr("disabled", true);
                $("#endTestBtn").attr("disabled", true);
                $("#startTestBtn").removeAttr("disabled");
                $("#testsSelect").removeAttr("disabled");
                $("#instructions").text('Press "Start Test" to begin execution');
                $("#currentStep").text('');
            } else {
                $("#testsSelect").attr("disabled", true);
                $("#startTestBtn").attr("disabled", true);
                $("#reportStep").removeAttr("disabled");
                $("#endTestBtn").removeAttr("disabled");
                testScripts = result.sophiaTests;
                currentTest = parseInt(result.sophiaCurrentTest);
                currentStep = parseInt(result.sophiaCurrentStep);
                var test_desc = 'Manual test';
                var step_desc = 'Manual step '+currentStep;
                if (currentTest >= 0)
                {
                    test_desc = Object.keys(testScripts)[currentTest];
                    step_desc = testScripts[test_desc][currentStep];
                }
                $("#instructions").text('Test '+test_desc+' with GUID ' + result.sophiaTestId + ' running...');
                if (!step_desc)
                {
                    step_desc = '<<test done>>';
                    $("#reportStep").attr("disabled", true);
                }                        
                $("#currentStep").text(step_desc);
            }
    });
});

$("#startTestBtn").click(function() {
    $("#startTestBtn").attr("disabled", true);
    $("#testsSelect").attr("disabled", true);
    var selectedTest = $("#testsSelect").val();
    if (selectedTest != 'new')
    {
        currentTest = parseInt(selectedTest);
    }
    currentStep = 1;
    $("#reportStep").removeAttr("disabled");
    $("#endTestBtn").removeAttr("disabled");
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
                $("#instructions").text('Test '+description+' with GUID ' + guid + ' running...');
                if (currentTest >= 0){
                    var test = Object.keys(testScripts)[currentTest];
                    $("#currentStep").text(testScripts[test][currentStep]);
                }
                else
                    $("#currentStep").text('Manual step '+currentStep);
            }
        });
    });
});

$("#endTestBtn").click(function() {
    $("#endTestBtn").attr("disabled", true);
    $("#reportStep").attr("disabled", true);
    $("#startTestBtn").removeAttr("disabled");
    $("#testsSelect").removeAttr("disabled");
    $("#currentStep").text('');
    var description = "Manual test";
    if (currentTest >= 0)
        description = Object.keys(testScripts)[currentTest];
    currentTest = -1; 
    currentStep = -1;
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

$("#reportStep").click(function() {
    console.log("TestStep event");
    var ts = new Date().getTime();
    var step_desc = '';
    if (currentTest >= 0)
    {
        var test = Object.keys(testScripts)[currentTest];
        step_desc = testScripts[test][currentStep];
    }
    else
    {
        step_desc = 'Manual step '+currentStep;
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
                action: "start",
                testID: guid,
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
                    console.log("TestStep reported");
                    currentStep++;
                    if (currentTest >= 0)
                    {
                        var test = Object.keys(testScripts)[currentTest];
                        step_desc = testScripts[test][currentStep];
                        if (!step_desc)
                        {
                            step_desc = '<<test done>>';
                            $("#reportStep").attr("disabled", true);
                        }                        
                    }
                    else
                        step_desc = 'Manual step '+currentStep;
                    $("#currentStep").text(step_desc);
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
});

function UUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}