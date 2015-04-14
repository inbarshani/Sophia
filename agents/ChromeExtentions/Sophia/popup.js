var dataUrl;

$( document ).ready(function() {
	chrome.storage.local.get('testGuid', function (result) {
    	if (result.testGuid == null) {
    		// test not running
			$("#reportStep").attr("disabled", true);
			$("#endTestBtn").attr("disabled", true);
			$("#startTestBtn").removeAttr("disabled");
			$("#instructions").text('Press "Start Test" to begin execution');
    	} else {
			$("#startTestBtn").attr("disabled", true);
			$("#reportStep").removeAttr("disabled");
			$("#endTestBtn").removeAttr("disabled");
			$("#instructions").text('Test with GUID ' + result.testGuid + ' running...');
    	}

    });
});

$("#startTestBtn").click(function() {
	$("#startTestBtn").attr("disabled", true);
	$("#reportStep").removeAttr("disabled");
	$("#endTestBtn").removeAttr("disabled");
	chrome.storage.local.get('dataUrl', function (result) {
    	dataUrl = result.dataUrl;
    	if (dataUrl == undefined) {
        	console.log("Sophia extension Data URL not defined");
        	return;
    	}
   		var guid = UUID();
        chrome.storage.local.set({'testGuid': guid}, function() {
          	console.log('Test GUID saved');
        });

        var ts = new Date().getTime();
        var args = {
            type: "Test",
            timestamp: ts,
            action: "start",
            guid: guid,
            description: "Manual test"
        }

		var data =  JSON.stringify(args);
	    $.ajax({
	        url: dataUrl,
	        type: 'POST',
	        data: data,
	        dataType: 'json',
	        success: function (doc) {
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
	chrome.storage.local.get('testGuid', function (result) {
		var guid;
    	guid = result.testGuid;
    	if (guid == undefined) {
        	console.log("Sophia extension GUID not defined");
        	return;
    	}
        var ts = new Date().getTime();
        var args = {
            type: "Test",
            timestamp: ts,
            action: "stop",
            guid: guid,
            description: "Manual test"
        }
		var data =  JSON.stringify(args);
	    $.ajax({
	        url: dataUrl,
	        type: 'POST',
	        data: data,
	        dataType: 'json',
	        success: function (doc) {
				$("#instructions").text('Press "Start Test" to begin execution');
	        }
	    });
    	chrome.storage.local.set({'testGuid': null}, function (result) {
        	console.log("Sophia extension Test GUID removed");
    	});
	});
});

$("#reportStep").click(function() {
	var step_counter = 	parseInt($("#reportStep").attr("counter")) + 1;
	$("#reportStep").attr("counter", step_counter);
	chrome.storage.local.get('testGuid', function (result) {
		var guid;
    	guid = result.testGuid;
    	if (guid == undefined) {
        	console.log("Sophia extension GUID not defined");
        	return;
    	}
        var ts = new Date().getTime();
        var args = {
            type: "TestStep",
            timestamp: ts,
            action: "start",
            testID: guid,
            stepNumber: step_counter,
            description: "Manual test step"
        }
		var data =  JSON.stringify(args);
	    $.ajax({
	        url: dataUrl,
	        type: 'POST',
	        data: data,
	        dataType: 'json',
	        success: function (doc) {
				
	        }
	    });
	});	
});

function UUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    	var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    	return v.toString(16);
	});
}