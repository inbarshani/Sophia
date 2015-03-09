var baseUrl;

chrome.storage.local.get('baseUrl', function (result) {
    baseUrl = result.baseUrl;
    if (baseUrl == undefined) {
        console.log("Sophia extension Application Base URL not defined");
        return;
    }
    var trackUrl = baseUrl;
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



function TrackRequest(info)
{
    console.log(info);
    var type = info.type.toLowerCase();
    if (type == 'xmlhttprequest' || type == 'main_frame' || type == 'sub_frame') {
    	chrome.tabs.query({active:true}, function(tabs) {
    		if (tabs[0].url.indexOf(baseUrl) == 0) {
		    	chrome.tabs.captureVisibleTab(function(screenshotUrl) {
		       		var ts = new Date().getTime();
		    		console.log(screenshotUrl);
		//			var blob = screenshotUrl.replace('data:image/jpeg;base64,', '');
					var data = {
						timestamps: ts,
						type: "SCREEN"
					};
					var formData = new FormData();
		//			formData.append(data, JSON.stringify(data));
					formData.append("file", screenshotUrl);

					var request = new XMLHttpRequest();
					request.open("POST", "http://localhost:8080/file");
					request.send(formData);
				});
			}
		});
    }
}