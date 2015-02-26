chrome.webRequest.onCompleted.addListener
(
    TrackRequest,
    {urls: ["<all_urls>"]},
    ["responseHeaders"]
);


function TrackRequest(info)
{
    console.log(info);
    if (info.type == 'XMLHttpRequest' || info.type == 'main_frame' || info.type == 'sub_frame') {
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
}