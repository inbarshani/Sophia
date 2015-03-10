$(document).ready(function() {
////        console.log("ready: " + window.location.href);
    // check if the base URL is the one from extension local storage
    var baseUrl;
    chrome.storage.local.get('baseUrl', function (result) {
        baseUrl = result.baseUrl;
        if (baseUrl == undefined) {
            console.log("Sophia extension Application Base URL not defined");
            return;
        }
        if (document.URL.indexOf(baseUrl) > -1) {
//            window.__eumRumService.reportToSophia('load', document, event);
            setTimeout(function() {
                document.addEventListener("DOMSubtreeModified", listenerFunc, false);

                function sophiaErrHandler() {
                    window.onerror = function(errorMsg, url, lineNumber, column, errorObj) {
                        console.log("ERRRRRR: " + errorObj);
                        var errData = {
                            type: "ClientError",
                            timestamp: new Date().getTime(),
                            errorMessage: errorMsg,
                            url: url,
                            lineNumber: lineNumber,
                            column: column
                        }
                        if (errorObj) {
                            errData.stacktrace = errorObj.stack;
                        }
                        document.dispatchEvent(new CustomEvent('ErrorToSophia', {detail: errData}));
                    }
                }

                var script = document.createElement('script');
                script.textContent = '(' + sophiaErrHandler + '())';
                document.head.appendChild(script);
                script.parentNode.removeChild(script);
            }, 2000);

            document.addEventListener('ErrorToSophia', function(event) {
                window.__eumRumService.reportErrorToSophia(event.detail);
            });


            window.addEventListener("unload", function(event) {
    ////            console.log("unload");
                window.removeEventListener("domChangeEvent", listenerFunc);
            }, false);
            window.addEventListener("click", function(event) {
                var elem = event.target;
                if (hasClickHandler(elem)) {
                    console.log("click on " + elem.tagName + ". Reported - has handlers");
                    window.__eumRumService.reportEventToSophia('click', document, event);
                } else {
                    console.log("click on " + elem.tagName + ". Ignored - no handlers");
                }
            }, false);
            window.addEventListener("focusout", function(event) {
                var elem = event.target;
                if (hasBlurHandler(elem)) {
                    console.log("blur on " + elem.tagName + ". Reported - has handlers");
                    window.__eumRumService.reportEventToSophia('blur', document, event);
                } else {
                    console.log("blur on " + elem.tagName + ". Ignored - no handlers");
                }
            }, false);
        }
    });

});

var listenerFunc = function (doc, e) {
////        console.log("listenerfunc");
    if (!document.URL || document.URL === "" || document.URL === "about:blank") {
        return;
    } else {
        window.__eumRumService.reportEventToSophia('domChangeEvent', document, event);
    }
}

var shouldReportClickTag = function(tagName) {
    var alwaysReportTags = ['a', 'button', 'input', 'select'];
    tagName = tagName.toLowerCase();
    for (tag in alwaysReportTags) {
        if (alwaysReportTags[tag] == tagName) {
            return true;
        }
    }
    return false;
}

var shouldReportBlurTag = function(tagName) {
    var alwaysReportTags = ['textarea', 'input', 'select'];
    tagName = tagName.toLowerCase();
    for (tag in alwaysReportTags) {
        if (alwaysReportTags[tag] == tagName) {
            return true;
        }
    }
    return false;
}

var hasClickHandler = function(elem) {
    if (elem == null) {
        return true;
    }
    if (elem.tagName.toLowerCase() == 'body') {
        return false;
    } else if (shouldReportClickTag(elem.tagName)) {
        return true;
    } else if (elem.onclick != null || elem.onmousedown != null || elem.onmouseup != null) {
        return true;
    } else {
        return hasClickHandler(elem.parentElement);
    }
}

var hasBlurHandler = function(elem) {
    if (shouldReportBlurTag(elem.tagName)) {
        return true;
    } else if (elem.onblur != null || elem.onfocusout != null || elem.isContentEditable == true) {
        return true;
    }
    return false;
}
