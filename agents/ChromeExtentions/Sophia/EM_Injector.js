$(document).ready(function() {
    console.log("Sophia injector, document ready, baseAppUrl=" + window.__eumRumService.baseAppUrl);

    if (!window.__eumRumService.baseAppUrl) {
        chrome.storage.local.get(['dataUrl', 'sophiaTestId', 'baseAppUrl', 'fileUrl'], function (result) {
            console.log("Sophia injector, document ready, read from local storage:" + 
                JSON.stringify(result));
            window.__eumRumService.dataUrl = result.dataUrl;
            window.__eumRumService.testId = result.sophiaTestId;
            window.__eumRumService.baseAppUrl = result.baseAppUrl;
            window.__eumRumService.fileUrl = result.fileUrl;
            console.log("Sophia injector, document ready, updated from local storage:" + 
                JSON.stringify(window.__eumRumService));
            addListeners();
        });        
    }
    else if (document.URL.indexOf(window.__eumRumService.baseAppUrl) == 0) {
        //console.log("4");
        addListeners();
    }
});

var listenerFunc = function (e) {
////        console.log("listenerfunc");
    if (!document.URL || document.URL === "" || document.URL === "about:blank") {
        return;
    } else {
        window.__eumRumService.reportEventToSophia('domChangeEvent', document, e);
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
            //console.log("click on " + elem.tagName + ". Reported - has handlers");
            window.__eumRumService.reportEventToSophia('click', document, event);
        } else {
            //console.log("click on " + elem.tagName + ". Ignored - no handlers");
        }
    }, false);
    window.addEventListener("focusout", function(event) {
        var elem = event.target;
        if (hasBlurHandler(elem)) {
            //console.log("blur on " + elem.tagName + ". Reported - has handlers");
            window.__eumRumService.reportEventToSophia('blur', document, event);
        } else {
            //console.log("blur on " + elem.tagName + ". Ignored - no handlers");
        }
    }, false);
    
    // capture log messages as well
    var scriptToWrapConsoleLog = 
        'window.original_log = console.log;'+
        'window.original_log_error = console.error;'+
        'console.log = function () {'+
        'var sophiaLogEvent = new CustomEvent(\'sophiaLogEvent\',{\'detail\':arguments});'+
        'window.dispatchEvent(sophiaLogEvent);'+
        'window.original_log.apply(this, Array.prototype.slice.call(arguments));'+
        '};'+
        'console.error = function () {'+
        'var sophiaLogErrorEvent = new CustomEvent(\'sophiaLogErrorEvent\',{\'detail\':arguments});'+
        'window.dispatchEvent(sophiaLogErrorEvent);'+
        'window.original_log_error.apply(this, Array.prototype.slice.call(arguments));'+
        '};'+
        'window.onerror = function(errorMsg, url, lineNumber, column, errorObj) {'+
        '        var errData = {'+
        '            errorMessage: errorMsg,'+
        '            url: url,'+
        '            lineNumber: lineNumber,'+
        '            column: column'+
        '        };'+
        '        if (errorObj) {'+
        '            errData.stacktrace = errorObj.stack;'+
        '        }'+
        '        window.dispatchEvent(new CustomEvent(\'sophiaLogErrorEvent\', {\'detail\': errData}));'+
        '    }';
    var script = document.createElement('script');
    var code = document.createTextNode('(function() {' + scriptToWrapConsoleLog + '})();');
    script.appendChild(code);
    (document.body || document.head).appendChild(script);
    window.addEventListener("sophiaLogEvent", function(event) {
        console.log('sophia got a console event from page: '+JSON.stringify(event.detail));
        window.__eumRumService.reportEventToSophia('log', document, event);
    }, false);
    window.addEventListener("sophiaLogErrorEvent", function(event) {
        console.log('sophia got a console error event from page: '+JSON.stringify(event.detail));
        window.__eumRumService.reportEventToSophia('log', document, event);
    }, false);
}

