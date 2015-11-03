var baseUrl, fileUrl;
var testGuid = null;


function regsiterHandler() {
    console.log('Registering Sophia requests agent for baseUrl: ' + baseUrl);
    var trackUrl = baseUrl;
    if (trackUrl.lastIndexOf("/") != trackUrl.length - 1) {
        trackUrl += "/";
    }
    trackUrl += "*";
    chrome.webRequest.onCompleted.addListener(
        TrackRequest, {
            urls: [trackUrl]
        }, ["responseHeaders"]
    );
}


chrome.runtime.onMessageExternal.addListener(
    function(message, sender, sendResponse) {
        console.log('background got external message with test Id: ' + message);
        chrome.storage.local.set({
            'sophiaTestId': message.sophiaTestId,
            'baseAppUrl': message.baseAppUrl,
            'dataUrl': message.dataUrl,
            'fileUrl': message.fileUrl
        }, function() {
            console.log('New test GUID saved');
        });
    });

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        console.log('background got message: ' + JSON.stringify(message));
        if (message.sophiaTestId)
        {
            chrome.storage.local.set({
                'sophiaTestId': message.sophiaTestId
            }, function() {
                console.log('New test GUID saved');
            });
        }
        else if (message.sophiaScreenshot)
        {
            reportScreenshotToSophia();
        }
    });

// init the configuraiton of the file server

chrome.storage.local.get('baseAppUrl', function(result) {
    baseUrl = result.baseAppUrl;
    if (baseUrl == undefined) {
        console.log("Sophia extension Application Base URL not defined");
    } else
        regsiterHandler();
});

chrome.storage.local.get('fileUrl', function(result) {
    fileUrl = result.fileUrl;
    if (fileUrl == undefined) {
        console.log("Sophia extension File URL not defined");
        return;
    }
});

chrome.storage.local.get('sophiaTestId', function(result) {
    testGuid = result.sophiaTestId;
    if (testGuid == undefined) {
        console.log("testGuid not defined");
        return;
    }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    console.log("Change to store with namespace: " + namespace);
    for (key in changes) {
        var storageChange = changes[key];
        console.log("Key changed: " + key + " to " + storageChange.newValue);
        if (namespace == "local") {
            if (key == "sophiaTestId") {
                if (storageChange.newValue == testGuid) {
                    return;
                } else {
                    testGuid = storageChange.newValue;
                }
            } else if (key == "fileUrl") {
                if (storageChange.newValue == fileUrl) {
                    return;
                } else {
                    fileUrl = storageChange.newValue;
                }
            } else if (key == "baseAppUrl") {
                if (storageChange.newValue == baseUrl) {
                    return;
                } else {
                    baseUrl = storageChange.newValue;
                    regsiterHandler();
                }
            }
        }
    }
});

function TrackRequest(info) {
    if (testGuid == null) {
        console.log('Test GUID not defined. Exiting...');
        return;
    }
    var type = info.type.toLowerCase();
    if (type == 'xmlhttprequest' || type == 'main_frame' || type == 'sub_frame') {
        // TODO: report to Sophia on request completion
    }
}

function reportScreenshotToSophia(){
    if (testGuid == null) {
        console.log('Test GUID not defined. Exiting...');
        return;
    }

    chrome.tabs.query({
        active: true
    }, function(tabs) {
        if (tabs[0].url.indexOf(baseUrl) == 0) {
            var ts = new Date().getTime(); // get time before taking the screenshot
            chrome.tabs.captureVisibleTab(function(screenshotUrl) {
                //console.log(screenshotUrl);
                //          var blob = screenshotUrl.replace('data:image/jpeg;base64,', '');
                //console.log('before send screenshot time: '+ts+' and after: '+new Date().getTime());
                var data = {
                    timestamp: ts,
                    type: "SCREEN",
                    testID: testGuid
                };
                var formData = new FormData();
                formData.append("data", JSON.stringify(data));
                formData.append("file", screenshotUrl);

                var request = new XMLHttpRequest();
                request.open("POST", fileUrl);
                request.send(formData);
                console.log('Sophia report on screenshot sent with timestamp: '+ts);
            });
        }
    });
};
