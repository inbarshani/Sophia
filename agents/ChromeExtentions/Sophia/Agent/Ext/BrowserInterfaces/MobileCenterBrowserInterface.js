function MobileCenterBrowserAPI() {
    this._logger = new LoggerUtil("MobileCenterAPI");
    this._logger.trace("MobileCenterAPI started.");
}

Util.inherit(MobileCenterBrowserAPI, EmbeddedBrowserAPI, {

    createExternalComChannel: function () {
        return new MobileCenterComChannel();
    },

    createTab: function (browserTab) {
        this._logger.trace("createTab: started");
        return new MobileCenterBrowserTab(browserTab);
    }
});

///////////////////////////////

function MobileCenterBrowserTab(tab) {
    this._logger = new LoggerUtil("MobileCenterBrowserTab");
    this._logger.trace("MobileCenterBrowserTab created.");
    this.id = tab.id;
    this.windowId = tab.windowId;
}  

Util.inherit(MobileCenterBrowserTab, EmbeddedBrowserTab);