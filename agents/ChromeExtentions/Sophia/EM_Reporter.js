/**
 * Created by shershev on 09/03/14.
 */

EMLog = function (level, domain, msg) {
    if (!window.__eumIsDebug) return;

    var time = new Date();
    time = time.getHours() + ':' + time.getMinutes() + ':' + (time.getSeconds() < 10 ? ('0' + time.getSeconds()) : time.getSeconds() + ':' + time.getMilliseconds());
    var consoleMsg = "#EM." + level + "." + domain + "[" + time + "](" + window.hpwebview + ") " + msg;
    if (window.__eumIsIOS) {
        window.__eumRumService.iOSLog(consoleMsg);
    }
    console.log (consoleMsg);
};

(function () {
   
    if (window.__eumRumService) return;
    var delim = "#:#";
    var flushLogLastTime = (new Date()).getTime();
    var maxLogLineLen = 1800;
    var reportUserAction = function (msgId, contextName, controlName, controlType, controlId, gestureName, startTime, endTime, isLongDuration, gestureProp, contextId, nativeId) {

        var timeInterval = endTime - startTime;
        EMLog('i', 'g', 'action stats: (' + (nativeId || 'NoNativeId') + '), ' + timeInterval + 'ms, ' + contextName + ', ' + controlName + ', ' + controlType + ', ' + gestureName + ', ' + gestureProp + ', ' + controlId + ', ' + contextId + ', ' + msgId);

        var nativeIdParam = "";
        if (nativeId) {
            nativeIdParam = nativeId;
        }
        var args = {
            message: {
                msgId: msgId, 
                contextName: contextName, 
                controlName: controlName, 
                controlType: controlType, 
                controlId: controlId, 
                gestureName: gestureName, 
                startTime: startTime, 
                endTime: endTime, 
                isLongDuration: isLongDuration, 
                gestureProp: gestureProp, 
                contextId: contextId, 
                nativeIdParam: nativeIdParam
            },
            timestamp: startTime,
            type: "UI"
        };
        return jsBridge("updateUserAction", args);
    };

    var reportNetworkAction = function (uaId, msgId, requestSize, clientMethod, documentLocationHref,
                                        responseSize, responseCode, requestTime, responseStart,
                                        responseEnd, postData, reqHeaders, responseHeaders) {

        EMLog('i', 'g', 'network stats: useractionId '+ uaId + ', networkMessageId ' + msgId + ', ' + documentLocationHref + ', ' + requestSize + ', ' + clientMethod + ', ' + requestTime + ', ' + responseCode + ', ' + responseSize + ', ' + responseStart + ', ' + responseEnd + ', ' + postData +
            ', ' + reqHeaders + ', ' + responseHeaders);

        var args = {
            message: {
                uaId: uaId,
                msgId: msgId, 
                documentLocationHref: documentLocationHref,
                requestSize: requestSize,
                clientMethod: clientMethod,
                requestTime: requestTime,
                responseCode: responseCode,
                responseSize: responseSize,
                responseStart: responseStart,
                responseEnd: responseEnd,
                postData: postData,
                reqHeaders: reqHeaders,
                responseHeaders: responseHeaders
            },
            timestamp: requestTime,
            type: "UI"
        };

        return jsBridge("updateNetworkMessage",args);
    };

    function openIframeAndSendUrl(url, msg) {
        var iframe,
            success = false;
        if (window.__eumWrappedFunctions) {
            iframe = window.__eumWrappedFunctions.createElement.call(document, "IFRAME");
        } else {
            iframe = document.createElement("IFRAME");
        }

        iframe.setAttribute("src", url);
        if (document && document.documentElement) {
            if (window.__eumWrappedFunctions) {
                window.__eumWrappedFunctions.appendChild.call(document.documentElement, iframe);
            } else {
                document.documentElement.appendChild(iframe);
            }
            iframe.parentNode.removeChild(iframe);
            success = true;
        } else {
            console.log ('d', 'g', "Error opening frame to url: " + url);
        }
        iframe = null;
        
        return success;
    }

    var jsBridge = function (action, args) {


                chrome.tabs.captureVisibleTab(function(screenshotUrl) {
                    console.log("1");
/*            var viewTabUrl = chrome.extension.getURL('screenshot.html?id=' + screenshotId++)
            var targetId = null;

            chrome.tabs.onUpdated.addListener(function listener(tabId, changedProps) {
              // We are waiting for the tab we opened to finish loading.
              // Check that the tab's id matches the tab we opened,
              // and that the tab is done loading.
              if (tabId != targetId || changedProps.status != "complete")
                return;

              // Passing the above test means this is the event we were waiting for.
              // There is nothing we need to do for future onUpdated events, so we
              // use removeListner to stop getting called when onUpdated events fire.
              chrome.tabs.onUpdated.removeListener(listener);

              // Look through all views to find the window which will display
              // the screenshot.  The url of the tab which will display the
              // screenshot includes a query parameter with a unique id, which
              // ensures that exactly one view will have the matching URL.
              var views = chrome.extension.getViews();
              for (var i = 0; i < views.length; i++) {
                var view = views[i];
                if (view.location.href == viewTabUrl) {
                  view.setScreenshotUrl(screenshotUrl);
                  break;
                }
              }
            });

            chrome.tabs.create({url: viewTabUrl}, function(tab) {
              targetId = tab.id;
            });
  */
          });

        var url = "http://16.60.229.73:8080/data/";
        console.log("report to Sophia: " + url + ": " + args);
        var data =  JSON.stringify(args);


        $.ajax({
            url: "http://16.60.229.73:8080/data/",
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function (doc) {
                $("#container").html(doc);
            }
          });


//        return openIframeAndSendUrl(url, args);
    };
    var logBuffer = "",
        logDelim = delim;

    var printLogBuffer = function(str) {
//        str = str.replace(/#.#/g, '\n');
        console.log(str);
    };
    var flushLogChunk = function() {

        if (logBuffer.length < maxLogLineLen) {
            logBuffer += logDelim + "#EM.*** - full log";
            jsBridge("logMessage", logBuffer);
//           printAll(logBuffer);
            logBuffer ="";
        } else {
            var msgStr = logBuffer.substr(0,maxLogLineLen);
            var lastLineInd = msgStr.lastIndexOf(logDelim);
            if (logBuffer.length <= maxLogLineLen || lastLineInd < 0) {
                lastLineInd=maxLogLineLen;
            } else {
                lastLineInd += logDelim.length;
            }
            msgStr = logBuffer.substr(0, lastLineInd);
            msgStr += logDelim + "#EM.*** - partial log";
            jsBridge("logMessage", msgStr);
//           printLogBuffer(msgStr);
            logBuffer = logBuffer.substr(lastLineInd);
        }
    };
    var flushLog = function (flushNow) {
        if (logBuffer === "") return;
        var currTime = (new Date()).getTime();
        if (!flushNow) {
            if (currTime-flushLogLastTime<1000) {
                return;
            }
        }
        while (logBuffer.length > 0) {
            flushLogChunk();
        }
        flushLogLastTime = currTime;
    };

    var iOSLog = function (msg) {
        logBuffer += logDelim + msg;
        flushLog();
    };

    window.__eumRumService = {
        reportUserAction: reportUserAction,
        reportNetworkAction: reportNetworkAction,
        jsBridge: jsBridge,
        iOSLog: iOSLog,
        flushLog: flushLog
    };
    
    if (window.__EMReporter) {
        EMLog('d', 'g','Reporter not Loaded, already exists ');
        return;
    }
    window.__EMReporter = true;
    EMLog('d', 'g', "### EM_Reporter loaded");

})();
