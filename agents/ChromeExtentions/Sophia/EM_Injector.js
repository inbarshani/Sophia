var testId;
var baseAppUrl;
var dataUrl;
var fileUploadUrl;

$(document).ready(function() {
console.log("1 data url=" + window.__eumRumService.getDataUrl());

    if (!window.__eumRumService.getDataUrl()) {
        if (document.getElementById("sophiadataurl")) {
            console.log("2");
            // automated test
            testId = document.getElementById("sophiatestid").innerText;
            baseAppUrl = document.getElementById("sophiabaseappurl").innerText;
            dataUrl = document.getElementById("sophiadataurl").innerText;
            fileUploadUrl = document.getElementById("sophiafileuploadurl").innerText;
//            window.__eumRumService.reportTestStartToSophia(testId);
            window.__eumRumService.setTestId(testId);
            window.__eumRumService.setDataUrl(dataUrl);
            window.__eumRumService.setFileUploadUrl(fileUploadUrl);
            window.__eumRumService.setBaseAppUrl(baseAppUrl);
            addListeners();
            chrome.storage.local.set({'baseAppUrl': baseAppUrl}, function() {
              console.log('App URL Settings saved');
            });
            chrome.storage.local.set({'dataUrl': dataUrl}, function() {
                console.log('Data URL Settings saved');
            });
            chrome.storage.local.set({'fileUrl': fileUploadUrl}, function() {
              console.log('File URL Settings saved');
            });
            chrome.storage.local.set({'testId': testId}, function() {
              console.log('Test ID saved');
            });

        } /* else {
            console.log("3");
            // manual test
            // check if the base URL is the one from extension local storage
            chrome.storage.local.get(['baseAppUrl', 'dataUrl', 'fileUrl', 'testId'], function (result) {
                testId = result.testId;
                baseAppUrl = result.baseAppUrl;
                dataUrl = result.dataUrl;
                fileUploadUrl = result.fileUrl;
                if (baseAppUrl == undefined) {
                    console.log("Sophia extension Application Base URL not defined");
                    return;
                }
                window.__eumRumService.setTestId(testId);
                window.__eumRumService.setDataUrl(dataUrl);
                window.__eumRumService.setFileUploadUrl(fileUploadUrl);

*/
/*            });
        }
        */
    }
    if (document.URL.indexOf(window.__eumRumService.getBaseAppUrl()) == 0) {
        console.log("4");
        addListeners();
    }
});

var listenerFunc = function (doc, e) {
////        console.log("listenerfunc");
    if (!doc.URL || doc.URL === "" || doc.URL === "about:blank") {
        return;
    } else {
        window.__eumRumService.reportEventToSophia('domChangeEvent', doc, e);
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

var addListeners = function() {
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

