/*
 *  To track the changes to the Extensions in each Chrome version, visit:
 *  http://code.google.com/chrome/extensions/whats_new.html 
 */

var BrowserServices = {
    createComChannel: function (logger) {
        if (logger)
            logger.trace("BrowserServices.createComChannel: started for FIREFOX");
        return new FirefoxContentComChannel();
    },

    ////getLoadTime: function (logger) {
    ////    if (logger)
    ////        logger.trace("BrowserServices.getLoadTime: started for CHROME");

    ////    var loadTimes = chrome.loadTimes();
    ////    return loadTimes.finishLoadTime - loadTimes.startLoadTime;
    ////},

    isSpecialUninjectablePage: function (logger) {
        return false;
    },

    createCrossOriginCustomEvent: function (eventType, eventDetail) {
        var clonedDetail = cloneInto(eventDetail, document.defaultView);
        var event = new CustomEvent(eventType, clonedDetail);
        return event;
    },

    isDialogHandlingSupported: true,

    isAboutBlankFrameInjectable: true,

    _executed: false,

    // Inject a piece of JS code into top page, which will monitor iFrame's load event, and
    // override iFrame's content by 'document.write', in order to have our agent code being
    // injected into about:blank iFrame. This is a trick of Firefox but it works.
    // This helps us to identify RichTextAreas in web 2.0 toolkits, like Dojo, AspAjax, GWT.
    // If we draft iFrame's content by just document.body.appendChild, the agent is not injected,
    // but once we use 'document.write', the agent is injected, trick it is.
    executeOnLoad: function () {
        if (this._executed)
            return;
        this._executed = true;

        function evalInDocument(scriptText) {
            var node = document.getElementsByTagName("head")[0] || document.documentElement;
            var script = document.createElement("script");
            script.type = "text/javascript";

            script.appendChild(document.createTextNode(scriptText));
            node.appendChild(script, node.firstChild);
            node.removeChild(script);
        };

        function overrideiFrameOnLoad() {
            document.addEventListener('load', function (e) {
                var src = e.srcElement || e.target;
                if (src && src.tagName.toUpperCase() == "IFRAME" && (src.src === "about:blank" || src.src === "")) {
                    var doc = src.contentDocument;
                    if (doc.head && doc.body && doc.head.childElementCount === 0 && doc.body.childElementCount === 0) {
                        doc.open();
                        doc.write('<html><body></body></html>');
                        doc.close();
                    }
                }
            }, true);
        };

        var script = Util.functionStringify(overrideiFrameOnLoad);
        evalInDocument(script);
    }
};
