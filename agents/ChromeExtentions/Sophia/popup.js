var dataUrl;

$("#startTestBtn").click(function() {
	$("#startTestBtn").attr("disabled", true);
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
            guid: guid
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

$("#endTestBtn").click(function() {
	$("#endTestBtn").attr("disabled", true);
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
            guid: guid
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