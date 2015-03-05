    $(document).ready(function() {
        console.log("ready: " + window.location.href);
        if (!document.URL || document.URL === "" || document.URL === "about:blank") {
            return;
        } else {
            window.__eumRumService.reportToSophia('load', document, event);
        }
        setTimeout(function() {
            document.addEventListener("DOMSubtreeModified", listenerFunc, false);
        }, 2000);

        window.addEventListener("unload", function(event) {
            console.log("unload");
            window.removeEventListener("domChangeEvent", listenerFunc);
        }, false);
        window.addEventListener("click", function(event) {
            var elem = event.target;
            if (hasClickHandler(elem)) {
                console.log("click on " + elem.tagName + ". Reported - has handlers");
                window.__eumRumService.reportToSophia('click', document, event);
            } else {
                console.log("click on " + elem.tagName + ". Ignored - no handlers");
            }
        }, false);
        window.addEventListener("focusout", function(event) {
            var elem = event.target;
            if (hasBlurHandler(elem)) {
                console.log("blur on " + elem.tagName + ". Reported - has handlers");
                window.__eumRumService.reportToSophia('blur', document, event);
            } else {
                console.log("blur on " + elem.tagName + ". Ignored - no handlers");
            }
        }, false);
    });

    var listenerFunc = function (doc, e) {
        console.log("listenerfunc");
        if (!document.URL || document.URL === "" || document.URL === "about:blank") {
            return;
        } else {
            window.__eumRumService.reportToSophia('domChangeEvent', document, event);
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
        } else if (elem.onblur != null || elem.onfocusout != null) {
            return true;
        }
        return false;
    }
