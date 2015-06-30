/*
 *  To track the changes to the Extensions in each Chrome version, visit:
 *  http://code.google.com/chrome/extensions/whats_new.html 
 */

var BrowserServices = {
    createComChannel: function (logger) {
        if (logger)
            logger.trace("BrowserServices.createComChannel: started for CHROME");

        return new ChromeComChannel();
    },

    getLoadTime: function (logger) {
        if (logger)
            logger.trace("BrowserServices.getLoadTime: started for CHROME");

        var loadTimes = chrome.loadTimes();
        return loadTimes.finishLoadTime - loadTimes.startLoadTime;
    },

    isSpecialUninjectablePage: function (logger) {
        if (chrome && chrome.embeddedSearch && chrome.embeddedSearch.newTabPage) {
            if (logger)
                logger.info("BrowserServices.isSpecialUninjectablePage: chrome's empty new tab page detected - define as uninjectable");
            return true;
        }

        return false;
    },

    isDialogHandlingSupported: true,

    createCrossOriginCustomEvent: function (eventType, eventDetail) {
        var event = new CustomEvent(eventType, eventDetail);
        return event;
    },

    /**
    * overrideDispatchEvent() this function runs in the context of the HTML page and is responsible in wrapping the dispatchEvent so that when the user
    *                       dispatches a synthesized (manually created) event we can ignore it during recording.
    * @return {undefined}
    */
    overrideDispatchEvent: function () {
        if (!window._QTP)
            window._QTP = {};

        window._QTP.synthesizedEventsCount = window._QTP.synthesizedEventsCount || 0;

        window._QTP.dispatchEvent = HTMLElement.prototype.dispatchEvent;
        var origDispatchEvent = window._QTP.dispatchEvent;

        HTMLElement.prototype.dispatchEvent = dispatchEventWrapper;
        document.dispatchEvent = dispatchEventWrapper;
        window.dispatchEvent = dispatchEventWrapper;
        dispatchEventWrapper.toString = function () { origDispatchEvent.toString(); }
        return;

        // Internal functions
        function dispatchEventWrapper(ev) {
            var args = Array.prototype.slice.call(arguments);
            window._QTP.synthesizedEventsCount++;

            try {
                origDispatchEvent.apply(this, args);
            }
            finally {
                window._QTP.synthesizedEventsCount--;
            }
        };
    },

    /**
    * restoreDispatchEvent() this function runs in the context of the HTML page and is responsible in wrapping the dispatchEvent so that when the user
    *                       dispatches a synthesized (manually created) event we can ignore it during recording.
    * @return {undefined}
    */
    restoreDispatchEvent: function () {
        if (!window._QTP)
            return;

        // Restore original function
        if (window._QTP.dispatchEvent) {
            HTMLElement.prototype.dispatchEvent = window._QTP.dispatchEvent;
            document.dispatchEvent = window._QTP.dispatchEvent;
            window.dispatchEvent = window._QTP.dispatchEvent;
        }

        // Clear temporary objects
        delete window._QTP.dispatchEvent;
        window._QTP.synthesizedEventsCount = 0;
    },

    /**
    * isSynthesizedEvent() checks if we're in a synthesized event handling
    * @return {boolean} - true if event was synthesized, false otherwise
    */
    isSynthesizedEvent: function () {
        return window._QTP && window._QTP.synthesizedEventsCount;
    },
	
    isAboutBlankFrameInjectable: true
};
