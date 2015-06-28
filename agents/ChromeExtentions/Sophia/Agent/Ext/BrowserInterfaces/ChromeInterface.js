/*
 *  To track the changes to the Extensions in each Chrome version, visit:
 *  http://code.google.com/chrome/extensions/whats_new.html 
 */
 
function ChromeAPI() {
    this._logger = new LoggerUtil("ChromeAPI");
    this._logger.trace("ChromeAPI created.");
    this._listeners = {};
    this._knownTabs = {};    

    this._pendingNavigations = {};

    chrome.tabs.onCreated.addListener(this._onTabCreated.bind(this));
    chrome.tabs.onRemoved.addListener(this._onTabClosed.bind(this));
    chrome.tabs.onUpdated.addListener(this._onTabUpdated.bind(this));

    if (chrome.tabs.onReplaced) { // supported since chrome 26
        chrome.tabs.onReplaced.addListener(this._onTabReplacedByAnother.bind(this));
    }
    chrome.webNavigation.onBeforeNavigate.addListener(this._onBeforeNavigate.bind(this));
    chrome.webNavigation.onCommitted.addListener(this._onNavigationCommited.bind(this));

    this._historyTracker = new HistoryTracker();
    this._historyTracker.onBack(this._onBack.bind(this));
    this._historyTracker.onForward(this._onForward.bind(this));

    this._dialogHandler = new DialogHandler();
}

ChromeAPI.prototype = {
    _logger: null,
    _listeners: null,
    _knownTabs: null,
    _pendingNavigations: null, // Information about navigations we may want to record (tabId => {url, committed})
    _historyTracker: null,
    _dialogHandler: null,
    _duringRun: false,

    onTabCreated: function (callbackFunction) {
        this._listeners["tab created"] = callbackFunction;
    },

    onUserOpenedNewTab: function (callbackFunction) {
        this._listeners["user opened new tab"] = callbackFunction;
    },

    onTabClosed: function (callbackFunction) {
        this._listeners["tab closed"] = callbackFunction;
    },

    onUserClosedTab: function (callbackFunction) {
        this._listeners["user closed tab"] = callbackFunction;
    },

    getAllTabs: function (tabIdFilter, callbackFunction) {
        //gets all the known chrome windows and for each one of them
        //gets its known tabs and create Browser AO from it.
        chrome.windows.getAll({ populate: true }, (function (windowsArr) {
            var tabsArr = [];
            for (var i = 0; i < windowsArr.length; ++i) {
                for (var j = 0; j < windowsArr[i].tabs.length; ++j) {
                    // Ignore the developer tools window
                    if (windowsArr[i].type === "normal" || this._isNormalPopupDialog(windowsArr[i])) {
                        // Adds the tab in one of 2 cases:
                        // 1- No filter function passed
                        // 2- Tab passed the filter
                        if (!tabIdFilter || tabIdFilter(windowsArr[i].tabs[j].id)) {
                            tabsArr.push(this.createTab(windowsArr[i].tabs[j]));
                        }
                    }
                }
            }
            callbackFunction(tabsArr);
        }).bind(this));
    },
    deleteCookies: function (domain, finishedCallback) {

        if (!domain)
            domain = "";

        chrome.cookies.getAll({}, function (cookies) {
            cookies.forEach(function (cookie) {
                if (cookie.domain.indexOf(domain) === -1)
                    return;

                // Extrapolate the URL from the cookie
                var url = cookie.secure ? "https://" : "http://";
                if (cookie.domain.charAt(0) === ".")
                    url += "www";

                url += cookie.domain + cookie.path;

                chrome.cookies.remove({ url: url, name: cookie.name });
            });

            if (finishedCallback)
                finishedCallback();
        });
    },

    clearCache: function (finishedCallback) {
        var timePeriod = { "since": 0 };
        var dataToRemove = { "cache": true, "appcache": true };
        if (chrome.browsingData) {
            // since Chrome 19
            chrome.browsingData.remove(timePeriod,dataToRemove, finishedCallback);
        } else if (chrome.experimental && chrome.experimental.clear && chrome.experimental.clear.browsingData) {
            // old API
            chrome.experimental.clear.browsingData(timePeriod, dataToRemove, finishedCallback);
        } else {
            this._logger.error("Clear cache is not supportted since the Chrome version is too old.");
            ErrorReporter.ThrowGeneralError();
        }
    },

    createTab: function (browserTab) {
        this._logger.trace("createTab: started for Chrome tab id: " + browserTab.id);
        var tab;
        InitChromeBackwardCompatibility(browserTab);
        tab = new ChromeTab();

        tab.id = browserTab.id;
        tab.windowId = browserTab.windowId;
        this._knownTabs[tab.id] = tab;
        if (this._duringRun)
            this._dialogHandler.addTabs([tab.id]);

        return tab;
    },

    createComChannel: function () {
        return new ChromeComChannel();
    },

    createExternalComChannel: function () {
        if (!Util.isNullOrUndefined(Util.getAgentNPObj())) {
            this._logger.info("Create native NPAPI communication channel for legacy extension!");
            return new NPComChannel();
        }

        return new ExternalComChannel(ChromeNativeMessagingStrategy.prototype);
    },

    runStarted: function () {
        this._duringRun = true;
        this._dialogHandler.addTabs(Object.keys(this._knownTabs));
    },

    runEnded: function () {
        this._dialogHandler.detachAllTabs();
        this._duringRun = false;
    },

    getSettingValue: function (key) {
        return window.localStorage[key];
    },

    getLogSettingsObject: function () {
        return window.localStorage;
    },

    _onWindowCreated: function (callbackFunction) {
        chrome.windows.onCreated.addListener(function (chromeWindow) {
            callbackFunction(chromeWindow.id);
        }.bind(this));
    },
    _onTabCreated: function (chromeTab) {
        this._dispatchTabCreate(chromeTab);
    },

    _onTabUpdated: function(tabId, changeInfo, chromeTab) {
        if (this._duringRun && changeInfo.url) {
            // Since we cannot attach to chrome:// URLs, we try to attach for every navigation
            this._dialogHandler.addTabs([tabId]);
        }
    },

    _dispatchTabCreate: function (chromeTab) {
        chrome.windows.get(chromeTab.windowId, { populate: true }, (function (win) {
            if (chrome.extension.lastError) {
                this._logger.error("_dispatchTabCreate: error while getting window id [" + chromeTab.windowId + "]: " + chrome.extension.lastError);
                return;
            }

            if (!win) {
                this._logger.info("_dispatchTabCreate: received window id " + chromeTab.windowId);
                return;
            }

            if (win.type === "normal" || this._isNormalPopupDialog(win)) {
                this._dispatchUserOpenedNewTab(chromeTab);
                var browserTab = this.createTab(chromeTab);
                if (this._listeners["tab created"])
                    this._listeners["tab created"](browserTab);

                this._recordPendingNavigation(browserTab.id, 'tabCreated');
            }
        }.bind(this)));
    },
    _dispatchUserOpenedNewTab: function (chromeTab) {
        this._logger.trace("_dispatchUserOpenedNewTab: called with Tab info: " + JSON.stringify(chromeTab, null, 2));
        if ((chromeTab.url.indexOf("chrome://") !== 0) ||  // This tab wasn't opened by the user
            Util.isNullOrUndefined(chromeTab.openerTabId)) // Tab wasn't opened from another tab, we have nothing to record on
            return; // Do nothing. 


        if (this._listeners["user opened new tab"])
            this._listeners["user opened new tab"](chromeTab.openerTabId);
    },
    _dispatchTabClosedByUser: function (tabId, removeInfo) {
        if (this._listeners["user closed tab"])
            this._listeners["user closed tab"](tabId, removeInfo);
    },
    _dispatchTabClosed: function (tabId, removeInfo) {
        this._listeners["tab closed"](tabId);
        delete this._knownTabs[tabId];
        delete this._pendingNavigations[tabId];
    },
    _onTabClosed: function (tabId, removeInfo) {
        this._dispatchTabClosedByUser(tabId, removeInfo);
        this._dispatchTabClosed(tabId, removeInfo);
    },
    onTabReplaced: function (callbackFunction) {
        if (this._listeners["tab replaced"])
            this._logger.warn("onTabReplaced: overriding an existing listener");
        this._listeners["tab replaced"] = callbackFunction;
    },
    _onTabReplacedByAnother: function (newTabID, oldTabID) {
        this._logger.info("_onTabReplacedByAnother: tab with id " + oldTabID + " is replaced with tab id " + newTabID);

        if (this._listeners["tab replaced"])
            this._listeners["tab replaced"](newTabID, oldTabID);

        //calls the remove function of the listeners
        if (this._listeners["tab closed"])
            this._listeners["tab closed"](oldTabID, {});

        //this event usually means that a prediction tab has replaced an original tab so we need to update the windowId of the tab since it was updated.
        chrome.tabs.get(newTabID, (function (tab) {
            if (this._knownTabs[tab.id]) {
                this._logger.info("_onTabReplacedByAnother: Going to update tab with id=" + tab.id + " with old window id:" + this._knownTabs[tab.id].windowId + " to id=" + tab.windowId);
                this._knownTabs[newTabID].windowId = tab.windowId;

                this._recordPendingNavigation(tab.id, 'TabReplaced');
            }
            else {
                this._logger.info("_onTabReplacedByAnother: This is a new tab going to notify about tab creation");
                this._dispatchTabCreate(tab);
            }
        }).bind(this));

    },
    _onBeforeNavigate: function (args) {
        if (args.frameId !== 0)
            return; // sub-frame

        this._logger.trace('webNavigation.BeforeNavigate - tab ' + args.tabId + ' navigating to: ' + args.url);
        this._pendingNavigations[args.tabId] = { url: args.url, committed: false };
    },
    _onNavigationCommited: function (args) {
        if (args.frameId !== 0)
            return; // sub-frame

        var tabId = args.tabId;

        if (args.transitionQualifiers.indexOf('from_address_bar') !== -1 &&
            // Forward/Back reuses the original qualifiers so we may get a false positive here
            args.transitionQualifiers.indexOf('forward_back') === -1) {
            return this._onNavigationCommitedFromAddressBar(tabId);
        }
        else if ((args.transitionQualifiers.length === 0) && (args.transitionType === "reload")) {
            return this._dispatchReloadEvent(tabId);
        }
    },

    _onNavigationCommitedFromAddressBar: function (tabId) {
        this._logger.trace('_onNavigationCommitedFromAddressBar: called with tabId: ' + tabId);

        if (!this._pendingNavigations[tabId]) {
            this._logger.warn('Got Committed on unknown tab: ' + tabId);
            return;
        }

        if (this._knownTabs[tabId])
            this._dispatchAddressBarNavigationCommittedEvent(tabId, 'Committed');
        else {
            this._logger.trace('webNavigation.Committed on unknown tab: ' + tabId);
            this._pendingNavigations[tabId].committed = true;
        }
    },

    // Record a navigation if there is a pending navigation to record
    _recordPendingNavigation: function (tabId, txt) {
        if (this._pendingNavigations[tabId] && this._pendingNavigations[tabId].committed)
            this._dispatchAddressBarNavigationCommittedEvent(tabId, txt);
    },

    _isNormalPopupDialog: function (win) {
        if (win.type === "popup" && !Util.isNullOrUndefined(win.tabs)) {
            //check the first tab of the window url contians "chrome-devtool", only devtool contians this prefix.
            if (win.tabs[0].url.indexOf("chrome-devtools://") === -1)
                return true;
        }
        return false;
    },

    _dispatchAddressBarNavigationCommittedEvent: function (tabId, txt) {
        Util.assert(this._pendingNavigations[tabId] && this._pendingNavigations[tabId].url, "_dispatchAddressBarNavigationCommittedEvent: No pending navigation for tab Id: " + tabId + "(" + txt + ")", this._logger);
        this._logger.trace("_dispatchAddressBarNavigationCommittedEvent: started '" + txt + "' Recording: " + tabId + " (" + this._knownTabs[tabId].windowId + ") Navigate: " + this._pendingNavigations[tabId].url);

        try {
            var url = this._pendingNavigations[tabId].url;
            delete this._pendingNavigations[tabId];

            if (this._listeners["addressbar navigation"])
                this._listeners["addressbar navigation"](tabId, url);
        }
        catch (e) {
            this._logger.error("_dispatchAddressBarNavigationCommittedEvent: Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
        }
    },

    onAddressBarNavigation: function (callbackFunction) {
        if (this._listeners["addressbar navigation"])
            this._logger.warn("onAddressBarNavigation: overriding an existing listener");
        this._listeners["addressbar navigation"] = callbackFunction;
    },

    onReload: function (callbackFunction) {
        if (this._listeners.reload)
            this._logger.warn("onReload: overriding an existing listener");

        this._listeners.reload = callbackFunction;
    },

    onBack: function (callbackFunction) {
        this._listeners.back = callbackFunction;
    },

    onForward: function (callbackFunction) {
        this._listeners.forward = callbackFunction;
    },

    handleDialog: function (tabId, accept, text, success, failure) {
        this._logger.trace("handleDialog called");
        this._dialogHandler.handle(tabId, accept, text, success, failure);
    },

    dialogExists: function (tabId, succeeded, failed) {
        this._logger.trace("dialogExists called");
        this._dialogHandler.exists(tabId, succeeded, failed);        
    },

    getDialogText: function (tabId, succeeded, failed) {
        this._logger.trace("getDialogText called");
        this._dialogHandler.text(tabId, succeeded, failed);
    },

    _dispatchEventWithTabId: function (eventName, tabId, isFrameEvent) {
        this._logger.trace("_dispatchEventWithTabId: called for: " + eventName);
        try {
            if (this._listeners[eventName])
                this._listeners[eventName](tabId, isFrameEvent);
        }
        catch (e) {
            this._logger.error("_dispatchEventWithTabId: (" + eventName + ") Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
        }
    },

    _dispatchReloadEvent: function (tabId) {
        this._dispatchEventWithTabId('reload', tabId);
    },

    _onBack: function (tabId, isFrameEvent) {
        this._dispatchEventWithTabId('back', tabId, isFrameEvent);
    },

    _onForward: function (tabId, isFrameEvent) {
        this._dispatchEventWithTabId('forward', tabId, isFrameEvent);
    }
};

///////////////////////////////

function ChromeTab() {
    this._logger = new LoggerUtil("ChromeTab");
    this._logger.trace("ChromeTab created.");
    this._fullScreenNextWindowState = "fullscreen";
}

ChromeTab.prototype = {
    id: -1,
    windowId: -1,
    window: null,
    _logger: null,
    _fullScreenNextWindowState: null,

    getState: function (successCallback, failCallback) {
        var logger = this._logger;
        logger.trace("ChromeTab.getState started for tab id " + this.id);
        chrome.tabs.get(this.id, (function (callback, errCallback, tab) {
            try{
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    logger.warn("getState: trying to get state of unknown tab: " + this.id);
                    var errorMsg = "tab doesnt exist";
                    errCallback(errorMsg);
                    return;
                }

                logger.trace("Tab.getState finished with status=" + tab.status);
                if (tab.status === "complete") {
                    callback(ReadyState2Status.complete);
                }
                else {
                    callback(ReadyState2Status.loading);
                }
            }
            catch (e) {
                logger.error("Tab.getState: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    getNumberOfTabs: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.getNumberOfTabs started");
        chrome.windows.getAll({ "populate": true }, (function (callback, errCallback, windows) {
            try {
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.getNumberOfTabs: chrome.windows.getAll failed.");
                    errCallback(chrome.extension.lastError);
                    return;
                }
                this._logger.trace("getNumberOfTabs: received chrome.windows.getAll response");
                var currentWindowId = this.windowId;
                Array.prototype.forEach.call(windows, function (win) {
                    if (win.id === currentWindowId) {
                        callback(win.tabs.length);
                    }
                });
            }
            catch (e) {
                this._logger.error("getNumberOfTabs: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    isActive: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.isActive started for window:" + this.windowId + " and tab:" + this.id);
        chrome.tabs.query({ 'active': true, 'windowId': this.windowId }, (function (callback, errCallback, tabArr) {
            this._logger.trace("ChromeTab.isActive response for window:" + this.windowId + " and tab:" + this.id);
            try {
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.isActive : chrome.tabs.query failed. with error: " + chrome.extension.lastError);
                    errCallback(chrome.extension.lastError);
                    return;
                }
                if (tabArr.length !== 1) {
                    this._logger.error("ChromeTab.isActive : chrome.tabs.query failed, tabArr length is " + tabArr.length);
                    errCallback("received active tabs number which is not 1");
                    return;
                }

                var activeTab = tabArr[0]; // there is ONLY ONE selected tab per window            
                successCallback(activeTab.id === this.id);
            }
            catch (e) {
                this._logger.error("ChromeTab.isActive: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    navigate: function (url, successCallback, failCallback) {

        chrome.tabs.update(this.id, { url: url, selected: true }, (function (callback, errCallback, tab) {
            try{
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.navigate : chrome.tabs.update failed.");
                    if (errCallback)
                        errCallback("tab doesnt exist");
                    return;
                }
                else {
                    callback();
                }
            }
            catch (e) {
                this._logger.error("ChromeTab.navigate: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    select: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.select started");

        chrome.tabs.update(this.id, { selected: true }, (function (callback, errCallback) {
            try {
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.select : chrome.tabs.update failed.");
                    errCallback("tab doesnt exist");
                }
                else {
                    callback();
                }
            }
            catch (e) {
                this._logger.error("ChromeTab.select: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                errCallback("ERROR");
            }
        }).bind(this, successCallback, failCallback));
    },

    fullScreen: function (successCallback, failCallback) {
        var nextWindowState = this._fullScreenNextWindowState;
        this._getWindow(this.windowId, { populate: true }, function (win) {
            if (chrome.extension.lastError) {
                this._logger.error("fullScreen: error while retrieving window id: " + this.windowId + " : " + chrome.extension.lastError);
                failCallback(chrome.extension.lastError);
                return;
            }

            var previousWindowState = win.state;

            chrome.windows.update(this.windowId, { state: nextWindowState }, function () {
                if (chrome.extension.lastError) {
                    this._logger.error("fullScreen: error while settings browser to fullscreen: " + chrome.extension.lastError);
                    failCallback(chrome.extension.lastError);
                    return;
                }

                this._fullScreenNextWindowState = previousWindowState;

                successCallback();
            }.bind(this));
        }.bind(this));
    },

    createNewTab: function () {
        this._logger.trace("ChromeTab.select started");
        chrome.tabs.create({ selected: true });
    },

    close: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.close started for tab " + this.id);

        chrome.tabs.get(this.id, function (tabData) {
            try{
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.close failed for tab " + this.id);
                    failCallback("tab doesnt exist");
                    return;
                }
            
                var tabId = this.id;
                window.setTimeout(function () {
                    chrome.tabs.remove(tabId, Util.identity);
                }, 0);

                // Workaround. The successCallback should be called from the remove's callback
                // but the callback is not being called when there is only one tab (and browser closes)
                // So as a workaround we will call the callback immediately after calling the remove method
                this._logger.trace("ChromeTab.close succeeded for tab: " + this.id);
                successCallback();
            }
            catch (e) {
                this._logger.error("ChromeTab.close: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                failCallback("ERROR");
            }
        }.bind(this));  
    },

    getWindowRect: function (successCallback, failCallback) {
        this._logger.trace("ChromeTab.getWindowRect called for tab: " + this.id);
        this._getWindow(this.windowId, null, function (wnd) {
            try {
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.getWindowRect : chrome.windows.get on window=" + this.windowId + " and tab id" + this.id + " failed. with error: " + JSON.stringify(chrome.extension.lastError));
                    failCallback(chrome.extension.lastError);
                    return;
                }

                var rect = { top: wnd.top, left: wnd.left, right: (wnd.left + wnd.width), bottom: (wnd.top + wnd.height) };
                this._logger.trace("ChromeTab.getWindowRect succeeded - returning result: " + JSON.stringify(rect));
                successCallback(rect);
            }
            catch (e) {
                this._logger.error("ChromeTab.getWindowRect: error occured - invoke error callback. Error: " + e + "\nStack:" + e.stack);
                failCallback("ERROR");
            }
        }.bind(this));
    },

    captureTabVisibleArea: function (successCallback, failCallback) {
        chrome.tabs.captureVisibleTab(this.windowId, { format: "png" }, (function (dataURI) {
            try{
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.close failed for tab " + this.id);
                    failCallback("tab doesnt exist");
                    return;
                }

                successCallback(dataURI);
            }
            catch (e)
            {
                this._logger.error("captureTabVisibleArea: Got exception " + e);
                failCallback("ERROR");
            }
        }).bind(this));
    },

    reload: function(successCallback, failCallback) {
        chrome.tabs.reload(this.id, null, function (res) {
            try {
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("ChromeTab.reload failed for tab " + this.id);
                    failCallback("refresh tab failed");
                    return;
                }

                successCallback();
            }
            catch (e) {
                this._logger.error("reload: Got exception " + e);
                failCallback("ERROR");
            }
        }.bind(this));
    },

    isInjectable: function (successCallback, failCallback) {
        chrome.tabs.get(this.id, function (tabData) {
            try {
                if (!Util.isUndefined(chrome.extension.lastError)) {
                    this._logger.error("isInjectable: failed for tab " + this.id);
                    this._logger.error("isInjectable: lasterror: " + JSON.stringify(chrome.extension.lastError));
                    failCallback("tab doesnt exist");
                    return;
                }

                var url = tabData.url;
                
                if (!Util.isInjectableUrl(url)) {
                    this._logger.debug("isInjectable: Non injectable url:  " + url);
                    successCallback(false);
                    return;
                }

                successCallback(true);
            }
            catch (e) {
                this._logger.error("isInjectable: Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
                failCallback(e.toString());
            }
        }.bind(this));
    },
	
	resize: function(width, height, successCallback, failCallback){
		this._logger.trace("resize: Started on window " + this.windowId + " To Width=" + width + " Height= " + height);
		chrome.windows.update(this.windowId,{width: width,height: height},function(){
			if (!Util.isUndefined(chrome.extension.lastError)) {
				failCallback(chrome.extension.lastError);
				return;
	                }
			successCallback();
		});
	},

    _getWindow: function (windowID, filterObj, callback) {
        chrome.windows.get(windowID, filterObj, callback);
    }
};

//////////////////////////////////////////////////////////////////////////

function ChromeTabBackwardCompatibility() { }

ChromeTabBackwardCompatibility.prototype = {
    isActiveBeforeChrome16: function (successCallback, failCallback) {
        this._logger.trace("Chrome15Tab.isActive started");
        chrome.tabs.getSelected(this.windowId, (function (callback, errCallback, activeTab) {
            if (!Util.isUndefined(chrome.extension.lastError)) {
                this._logger.error("Chrome15Tab.isActive : chrome.tabs.getSelected failed.");
                errCallback(chrome.extension.lastError);
                return;
            }
            successCallback(activeTab.id === this.id);
        }).bind(this, successCallback, failCallback));
    },
    getWindowBeforeChrome16: function (windowID, filterObj, callback) {
        chrome.windows.get(windowID, callback);
    }
};


function InitChromeBackwardCompatibility(chromeTab) {
    if (!chrome.tabs.query) {
        // chrome.tabs.query was added in Chrome 16 instead of chrome.tabs.getSelected
        console.info("Chrome Init: chrome.tabs.query missing, using isActiveBeforeChrome16 instead of isActive");
        ChromeTab.prototype.isActive = ChromeTabBackwardCompatibility.prototype.isActiveBeforeChrome16;
    }

    //the number of arguments when calling get on window has changed from 2 to 3 in chrome 16 so 
    //we need to understand which function to use
    try{
        chrome.windows.get(chromeTab.windowId, null, function () { });
    }
    catch(err){
        console.info("Chrome Init: chrome.windows.get is expecting 2 arguments (instead of 3), using getWindowBeforeChrome16 instead of getWindow");
        ChromeTab.prototype._getWindow = ChromeTabBackwardCompatibility.prototype.getWindowBeforeChrome16;
    }
}
