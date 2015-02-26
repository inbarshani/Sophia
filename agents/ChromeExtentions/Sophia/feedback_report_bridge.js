
function rs_execute(msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor, headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart, responseEnd, postData, reqHeaders, responseHeaders) {
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

