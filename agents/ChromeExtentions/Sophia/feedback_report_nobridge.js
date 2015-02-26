logDebug("**************** feedback loaded!! _fback="+_fback);
//window.RUMService.notifyLoaded();

function rs_execute(msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor, headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart, responseEnd, postData, reqHeaders, responseHeaders) {

    headerHpTvColor = window.encodeURIComponent(headerHpTvColor);
    headerHpCamColor = window.encodeURIComponent(headerHpCamColor);
    pageTitle = window.encodeURIComponent(pageTitle);
    documentLocationHref = window.encodeURIComponent(documentLocationHref);
    referrer = window.encodeURIComponent(referrer);
    postData = window.encodeURIComponent(postData);
    reqHeaders = window.encodeURIComponent(reqHeaders);
    responseHeaders = window.encodeURIComponent(responseHeaders);

    var url = "http://16.60.229.73:8080/data/";

    var data = {
            "msgId": msgId, 
            "pageTitle": pageTitle,
            "requestSize": requestSize,
            "clientMethod": clientMethod,
            "clientPort": clientPort,
            "headerHpTvColor": headerHpTvColor,
            "headerHpCamColor": headerHpCamColor,
            "documentLocationHref": documentLocationHref,
            "responseSize": responseSize,
            "userName": userName,
            "responseCode": responseCode,
            "referrer": referrer,
            "requestTime": requestTime,
            "responseStart": responseStart,
            "responseEnd": responseEnd,
            "postData": postData,
            "reqHeaders": reqHeaders,
            "responseHeaders": responseHeaders
    };

    logDebug("rs_execute: "+url);
     //alert(url);
     ///alert("in execute2: "+responseEnd);

    $.ajax({
        url: "http://16.60.229.73:8080/data/",
        type: 'POST',
        data: {"type": "UI", "message": "fu"},
        dataType: 'json',
        success: function (doc) {
            $("#container").html(doc);
        }
      });

/*
     var iframe = document.createElement("IFRAME");
     iframe.setAttribute("src", url);
     document.documentElement.appendChild(iframe);
     iframe.parentNode.removeChild(iframe);
     iframe = null;
*/
}

function rs_execute_native(msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor, headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart, responseEnd, postData, reqHeaders, responseHeaders) {
    if (!skip_RUMService) {
        logDebug('updateNetworkMessage(' +
            Array.prototype.slice.call([msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor,
                headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart,
                responseEnd, postData, reqHeaders, responseHeaders]) + ")");

        RUMService.updateNetworkMessage(msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor,
            headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart,
            responseEnd, postData, reqHeaders, responseHeaders);
    } else {
        logDebug('skip_RUMService = true! skipping: updateNetworkMessage(' +
            Array.prototype.slice.call([msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor,
                headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart,
                responseEnd, postData, reqHeaders, responseHeaders]) + ")");

    }

}
