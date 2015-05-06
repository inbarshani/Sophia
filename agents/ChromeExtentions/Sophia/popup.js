$(document).ready(function() {
    chrome.storage.local.get('sophiaTestId', function(result) {
        if (result.sophiaTestId == null) {
            // test not running
            $("#reportStep").attr("disabled", true);
            $("#endTestBtn").attr("disabled", true);
            $("#startTestBtn").removeAttr("disabled");
            $("#instructions").text('Press "Start Test" to begin execution');
        } else {
            $("#startTestBtn").attr("disabled", true);
            $("#reportStep").removeAttr("disabled");
            $("#endTestBtn").removeAttr("disabled");
            $("#instructions").text('Test with GUID ' + result.sophiaTestId + ' running...');
        }

    });
});

$("#startTestBtn").click(function() {
    $("#startTestBtn").attr("disabled", true);
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
            'sophiaTestId': guid
        }, function() {
            console.log('Test GUID saved');
        });

        var args = {
            type: "Test",
            timestamp: ts,
            action: "start",
            testID: guid,
            description: "Manual test"
        }

        var data = JSON.stringify(args);
        $.ajax({
            url: dataUrl,
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function(doc) {
                $("#instructions").text('Test with GUID ' + guid + ' running...');
            }
        });
    });
});

$("#endTestBtn").click(function() {
    $("#endTestBtn").attr("disabled", true);
    $("#reportStep").attr("disabled", true);
    $("#reportStep").attr("counter", 0);
    $("#startTestBtn").removeAttr("disabled");
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
                description: "Manual test"
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
                'sophiaTestId': null
            }, function(result) {
                console.log("Sophia extension Test GUID removed");
            });
        });
    });
});

$("#reportStep").click(function() {
    console.log("TestStep event");
    var ts = new Date().getTime();
    var step_counter = parseInt($("#reportStep").attr("counter")) + 1;
    $("#reportStep").attr("counter", step_counter);
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
                stepNumber: step_counter,
                description: "Manual test step"
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