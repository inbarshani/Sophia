var baseUrl, fileUrl;
var testGuid = null;


chrome.storage.local.get('baseAppUrl', function (result) {
    baseAppUrl = result.baseAppUrl;
    if (baseAppUrl == undefined) {
        console.log("Sophia extension Application Base URL not defined");
        return;
    }
    var trackUrl = baseAppUrl;
    if (trackUrl.lastIndexOf("/") != trackUrl.length - 1) {
    	trackUrl += "/";
    }
    trackUrl += "*";
    chrome.webRequest.onCompleted.addListener(
    	TrackRequest,
    	{
    		urls: [trackUrl]
    	},
    	["responseHeaders"]
	);

});


chrome.runtime.onMessageExternal.addListener(
  function(message, sender, sendResponse) {
      console.log('background got external message with test Id: '+message);
        chrome.storage.local.set({
            'sophiaTestId': message.sophiaTestId
        }, function() {
            console.log('New test GUID saved');
        });
  });  

chrome.runtime.onMessage.addListener(
  function(message, sender, sendResponse) {
      console.log('background got message with test Id: '+message);
        chrome.storage.local.set({
            'sophiaTestId': message.sophiaTestId
        }, function() {
            console.log('New test GUID saved');
        });
  });  

      
chrome.storage.local.get('fileUrl', function (result) {
    fileUrl = result.fileUrl;
    if (fileUrl == undefined) {
        console.log("Sophia extension File URL not defined");
        return;
    }
});

chrome.storage.local.get('sophiaTestId', function (result) {
    testGuid = result.sophiaTestId;
    if (testGuid == undefined) {
        console.log("testGuid not defined");
        return;
    }
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (key in changes) {
        if (namespace == "local") {
            var storageChange = changes[key];
            if (key == "sophiaTestId") {
                if (storageChange.newValue == testGuid) {
                    return;
                } else {
                    testGuid = storageChange.newValue;
                }
            } 
        }
        else if (namespace == "local") {
            var storageChange = changes[key];
            if (key == "fileUrl") {
                if (storageChange.newValue == fileUrl) {
                    return;
                } else {
                    fileUrl = storageChange.newValue;
                }
            } 
        }
    }
});




function TrackRequest(info)
{
    if (testGuid == null) {
        console.log ('Test GUID not defined. Exiting...');
        return;
    }
    console.log(info);
    var type = info.type.toLowerCase();
    if (type == 'xmlhttprequest' || type == 'main_frame' || type == 'sub_frame') {
    	chrome.tabs.query({active:true}, function(tabs) {
    		if (tabs[0].url.indexOf(baseAppUrl) == 0) {
		    	chrome.tabs.captureVisibleTab(function(screenshotUrl) {
		       		var ts = new Date().getTime();
		    		console.log(screenshotUrl);
		//			var blob = screenshotUrl.replace('data:image/jpeg;base64,', '');
					var data = {
						timestamps: ts,
						type: "SCREEN",
                        testID: testGuid
					};
					var formData = new FormData();
		//			formData.append(data, JSON.stringify(data));
					formData.append("file", screenshotUrl);

					var request = new XMLHttpRequest();
					request.open("POST", fileUrl);
					request.send(formData);
				});
			}
		});
    }
}