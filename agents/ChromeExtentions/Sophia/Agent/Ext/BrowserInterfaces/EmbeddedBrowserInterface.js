var webViewId = {
    id: 2,
    windowId: 1
};

function EmbeddedBrowserAPI() {
    this._logger = new LoggerUtil("EmbeddedBrowserAPI");
    this._logger.trace("EmbeddedBrowserAPI started.");

}

EmbeddedBrowserAPI.prototype = {
    _logger: null,
    name: "EmbeddedBrowser",

    // Callback with param: Tabs Array
    getAllTabs: function (tabIdFilter, callbackFunction) {
        this._logger.trace("getAllTabs: called");
        var tab = this.createTab(webViewId);
        callbackFunction([tab]);
    },

    // Callback with no params
    deleteCookies: function (finishedCallback) {
        this._logger.error("deleteCookies: unsupported");
    },

    createComChannel: function () {
        return new MessageChannelComChannel("extension");
    },

    createExternalComChannel: function () {
        return new ExternalComChannel(RemoteComChannelStrategy.prototype);
    },

    gettingValue: function (key) {
        return {};
    },

    getLogSettingsObject: function () {
        return {};
    },

    createTab: function (browserTab) {
        this._logger.trace("createTab: started");
        return new EmbeddedBrowserTab(browserTab);
    },
    getSettingValue: function (key) {
        this._logger.warn("getSettingValue: unimplemented. called for key: " + key);
    }
};

///////////////////////////////

function EmbeddedBrowserTab(tab) {
    this._logger = new LoggerUtil("EmbeddedBrowserTab");
    this._logger.trace("EmbeddedBrowserTab created.");
    this.id = tab.id;
    this.windowId = tab.windowId;
}  

EmbeddedBrowserTab.prototype = {
    _logger: null,
    id: -1,
    windowId: -1,

    // successCallback with ReadyState2Status
    // failCallback with error string
    getState: function (successCallback, failCallback) {
        this._logger.trace("getState: started. Returning Hardcoded Complete.");
        successCallback(ReadyState2Status.complete); // Hardcoded state !
    },

    // successCallback with number of tabs (int)
    // failCallback with error string
    getNumberOfTabs: function (successCallback, failCallback) {
        this._logger.trace("getNumberOfTabs: started. Returning hardcoded 1");
        successCallback(1);
    },

    // successCallback with is Tab active in window (boolean)
    // failCallback with error string
    isActive: function (successCallback, failCallback) {
        this._logger.trace("isActive: started");
        successCallback(true);
    },

    // failCallback with error string
    navigate: function (url, successCallback, failCallback) {
        this._logger.debug("navigate: called. Return unsupported.");
        failCallback("unsupported");
    },

    // successCallback with no params
    // failCallback with error string	
    select: function (successCallback, failCallback) {
        this._logger.debug("select: called. Return unsupported.");
        failCallback("unsupported");
    },

    createNewTab: function () {
        this._logger.error("createNewTab: unsupported");
    },

    // failCallback with error string	
    close: function (successCallback, failCallback) {
        this._logger.error("close: unsupported");
        failCallback("unsupported");
    },

    getWindowRect: function (successCallback, failCallback) {
        // we return this error in order to go to the fallback and ask the page (and then the frame) for the window size
        this._logger.trace("getWindowRect: started");
        failCallback("unsupported");
    }
};