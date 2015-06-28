// Initialize the Global Context of the Extension
var ext = null;

// Initialize the Extensions objects
(function () {
	var logger = new LoggerUtil("BackGroundExt");
	if (ext) {
		logger.warn("Initializing extension more than once");
		return;
	}
	ext = {};

    function getCurrentApi() {
        if (typeof window !== "undefined") {
            if (window.chrome && window.chrome.extension) // chrome.extension is available only when running as a Chrome Extension
                return ChromeAPI;

            if (window.safari && window.safari.extension) // safari.extension is available only when running as a Safari Extension
                return SafariAPI;
        }

        if(typeof (FirefoxAPI) !== 'undefined') // Firefox API is only defined when running as a Firefox Addon
            return FirefoxAPI;

        if (typeof (MobileCenterBrowserAPI) !== "undefined") // MobileCenter API is only defined when injected into a hybrid application by the mobile center
            return MobileCenterBrowserAPI;
    }

    var currentApi = getCurrentApi();
    var logSettingsObject = currentApi ? currentApi.prototype.getLogSettingsObject() : {};

    LoggerUtil.prototype.setSettings(logSettingsObject);
    ext.bgLogger = logger;
    ext.bgLogger.trace("BackGround Was Loaded");

    ext.app = (function () {
        try {
            if (currentApi) {
                ext.bgLogger.info("API found: " + currentApi.name);
                return new currentApi();
            }

            ext.bgLogger.error("initApi(): No Browser API!");
            return null;
        } catch(e) {
            ext.bgLogger.error("error when create app, e = " + e);
        }
    })();
    
    ext.dispatcher = new ExtDispatcher();
    ext.agent = new Agent();

    //The extension might be loaded after the first tabs are opened and we will
    //miss the onCreate event on them this is why we want to get all the open tabs 
    ext.agent.UpdateKnownBrowsers();
    
    ext.onUnload = function() {
        ext.dispatcher.onUnload();
    }
    
    if (typeof exports !== "undefined") {
        exports.ext = ext;
}
})();
