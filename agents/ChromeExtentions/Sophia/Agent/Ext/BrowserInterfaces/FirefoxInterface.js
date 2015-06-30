if (typeof require === "function") {
    var FFBrowserUtil = require("./BrowserUtil.js").FFBrowserUtil;
    var FirefoxBrowserEventListeners = require("./FirefoxBrowserEventListeners.js").FirefoxBrowserEventListeners;
    var getLogSettingsObject = require("./common/FFLoggerUtil").getLogSettingsObject;
}

// to get DOM window, for Firefox addon code. 
if (typeof window === "undefined" && typeof require === "function" && typeof (require("sdk/window/utils")) === "object") {
    // Ensure that window object is available. This is necessary for log4javascript, xml2json
    // to be available in Firefox add-on.
    var WindowUtils = require("sdk/window/utils");
    var NSIDomWindow = WindowUtils.getMostRecentBrowserWindow();
    var xulWindow = WindowUtils.getXULWindow(NSIDomWindow);
    window = WindowUtils.getDOMWindow(xulWindow);
}

function FirefoxAPI() {
    this._logger = new LoggerUtil("FirefoxAPI");
    this._logger.trace("FirefoxAPI created");
    this._listeners = {};

    this._registerBrowserEventHandler("tab created", this._onTabCreated.bind(this));
    this._registerBrowserEventHandler("tab closed", this._onTabClosed.bind(this));
    this._registerBrowserEventHandler("tab back", this._onTabBack.bind(this));
    this._registerBrowserEventHandler("tab forward", this._onTabForward.bind(this));
    this._registerBrowserEventHandler("tab refresh", this._onTabRefresh.bind(this));
    this._registerBrowserEventHandler("tab navigation", this._onTabNavigation.bind(this));

     this._browserEventListener = new FirefoxBrowserEventListeners(this);
}

FirefoxAPI.prototype = {
    _logger: null,

    _listeners: null,

    _browserEventListener: null,

    _executeAddonCommand: function(command, params, successCallback, failCallback) {
        var msg = {};
	    // TODO@EASTON:: NO NEED THE MSG HIERARCHY, check the two callbacks.
        if (FFBrowserUtil[command]) {
            try {
                msg.data = FFBrowserUtil[command](params);
            } catch(ex) {
                this._logger.error("FireFoxBrowserUtil." + command + ": exception: " + ex.message);
                msg.error = ex.message;
            }
        } else {
            this._logger.error("FF_BROWSER_CMD get wrong command: " + command + " is not a function in class FirefoxBrowserUtil");
            msg.error = command + "Not Implement in FirefoxAddon";
        }


        if (msg.error && failCallback) {
            failCallback(msg);
        } else if (successCallback) {
            successCallback(msg);
        }
    },

    _browserEventHandlers: {},

    _registerBrowserEventHandler:function(eventName,eventHandler){
        this._browserEventHandlers[eventName] = eventHandler;
    },
    
    onBrowserEvent:function(browserEvent) {
        this._logger.trace("onBrowserEvent comes msg=" + JSON.stringify(browserEvent));
        var browserEventType = browserEvent.browserEventType;
        if (this._browserEventHandlers[browserEventType]) {
            this._browserEventHandlers[browserEventType](browserEvent.browserEventData);
        }
    },

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

    onAddressBarNavigation: function (callbackFunction) {
        if (this._listeners["addressbar navigation"])
            this._logger.warn("onAddressBarNavigation: overriding an existing listener");
        this._listeners["addressbar navigation"] = callbackFunction;
    },

    createComChannel: function () {
        return new FirefoxAddonComChannel();
    },

    createExternalComChannel: function () {
        return new ExternalComChannel(FirefoxJSCtypesStrategy.prototype);
    },

    getSettingValue: function (key) {
        this._logger.error("FirefoxAPI.getSettingValue Not implemented ,will implement later ");
    },

    getLogSettingsObject: function () {
        return getLogSettingsObject();
    },

    _defaultErrorHandler: function (functionName) {
        this._logger.error("FirefoxAPI." + functionName + " failed");
        ErrorReport.ThrowGeneralError();
    },

    getAllTabs: function (tabIdFilter, callbackFunction) {
        this._logger.trace("FirefoxAPI.getAllTabs start");
        var failCallBack = function () {
            this._logger.error("FirefoxAPI.getAllTabs failed");
            callbackFunction([]);
        }.bind(this);

        var successCallback = function (msg) {
            this._logger.trace("getAllTabs return msg=" + JSON.stringify(msg));
            if (!Util.isNullOrUndefined(msg.data) && Array.isArray(msg.data)) {
                var browserTabs = msg.data;
                var tabsArr = [];
                browserTabs.forEach(function (browserTab) {
                    if (!tabIdFilter || tabIdFilter(browserTab.id)) {
                        tabsArr.push(this.createTab(browserTab));
                    }
                }.bind(this));
                callbackFunction(tabsArr);
            }
            else {
                failCallBack();
            }
        }.bind(this);


        this._executeAddonCommand("getAllTabs", null, successCallback, failCallBack);
    },

    closeAllTabs: function (msg, resultCallback) {
        //if closeAllTabs first, the resultCallback will never send back to uft. As agent is not alive.
        //so first to make sure the tab and window in the firefox extension side have no error
        //then call resultCallback
        //close all tabs at last.
        this._logger.trace("FirefoxAPI.closeAllTabs called");
        this._logger.trace("first to call getNumberOfTabs to check whether error happens when retrieve tabs and window in firefox");

        function successCallback() {
            this._logger.trace("resultCallback first then call closeAllTabs");
            resultCallback(msg);
            this._executeAddonCommand("closeAllTabs", msg._to.browser, null,null);
        }

        function errorCallback() {
            this._logger.error("FirefoxAPI.closeAllTabs failed");
            ErrorReporter.ThrowGeneralError();
        }

        this._executeAddonCommand("getNumberOfTabs", msg._to.browser, successCallback.bind(this), errorCallback.bind(this));
    },

    createTab: function (browserTab) {
        this._logger.trace("createTab: started for id " + browserTab.id);
        var tab = new FirefoxTab();
        tab.id = browserTab.id;
        tab.windowId = browserTab.windowId;
        tab.hwnd = browserTab.hwnd || 0;
        return tab;
    },

    _onTabCreated: function (firefoxTab) {
        this._logger.trace("_onTabCreated called");

        var recordedNewTab = firefoxTab.openerTabId !== -1 && firefoxTab.url==="about:newtab";
        if (recordedNewTab && this._listeners["user opened new tab"])
            this._listeners["user opened new tab"](firefoxTab.openerTabId);
        if (this._listeners["tab created"]) {
            var browserTab = this.createTab(firefoxTab);
            this._listeners["tab created"](browserTab);
        }
    
    },

    _onTabClosed: function (tabCloseEvent) {
        this._logger.trace("_onTabClosed called");
        if (this._listeners["user closed tab"] && typeof tabCloseEvent.removeInfo!=="undefined")
            this._listeners["user closed tab"](tabCloseEvent.tabId, tabCloseEvent.removeInfo);

        if (this._listeners["tab closed"])
            this._listeners["tab closed"](tabCloseEvent.tabId);
    },

    _onTabBack:function(tabBackEvent){
        this._logger.trace("_onTabBack called");
        if (this._listeners["back"])
            this._listeners["back"](tabBackEvent.tabId, tabBackEvent.isURLChanged);
    },

    _onTabForward:function(tabForwardEvent){
        this._logger.trace("_onTabForward called");
        if (this._listeners["forward"])
            this._listeners["forward"](tabForwardEvent.tabId,tabForwardEvent.isURLChanged);
    },

    _onTabRefresh:function(tabRefreshEvent){
        this._logger.trace("_onTabRefresh called");
        if (this._listeners["reload"])
            this._listeners["reload"](tabRefreshEvent.tabId);
    },

    _onTabNavigation:function(tabNavigationEvent){
        this._logger.trace("_onTabNavigation called");
        if (this._listeners["addressbar navigation"])
            this._listeners["addressbar navigation"](tabNavigationEvent.tabId, tabNavigationEvent.url);
    },
    deleteCookies: function (domain, finishedCallback) {
        this._logger.trace("FirefoxAPI.deleteCookies start");
        this._executeAddonCommand("deleteCookies", domain, finishedCallback, this._defaultErrorHandler.bind(this, "deleteCookies"));
    },

    clearCache: function (resultCallback) {
        this._logger.trace("FirefoxAPI.clearCache called");
        this._executeAddonCommand("clearCache", null, resultCallback, this._defaultErrorHandler.bind(this, "clearCache"));
    },

    handleDialog: function (tabId, accept, text, successCallBack, failCallback) {
        this._logger.trace("FirefoxAPI.handleDialog called");
        this._executeAddonCommand("handleDialog", [tabId, accept, text], successCallBack, failCallback.bind(this,"Fail to handle dialog for tab " + tabId));
    },

    dialogExists: function (tabId, successCallBack, failCallback) {
        this._logger.trace("FirefoxAPI.dialogExists called");
        var successFunctionCall = function (msg) {
            if (!Util.isNullOrUndefined(msg.data))
                successCallBack(msg.data);
            else
                failCallback.apply(this, ["Fail to check dialog exists status for tab " + tabId]);
        };

        this._executeAddonCommand("dialogExists", tabId,successFunctionCall, failCallback.bind(this, "Fail to check dialog exists status for tab " + tabId));
    },

    getDialogText: function (tabId, successCallBack, failCallback) {
        this._logger.trace("FirefoxAPI.getDialogText called");
        var successFunctionCall = function (msg) {
            if (!Util.isNullOrUndefined(msg.data))
                successCallBack(msg.data);
            else
                failCallback.apply(this, ["Fail to get text in dialog in tab " + tabId]);
        };
        this._executeAddonCommand("getDialogText", tabId, successFunctionCall, failCallback.bind(this, "Fail to get text in dialog in tab " + tabId));
    },
    isNewMsgDelayEnabled:true
};

function FirefoxTab() {
    this._logger = new LoggerUtil("FirefoxTab");
    this._logger.trace("FirefoxTab created");
}

FirefoxTab.prototype = {
    _logger: null,

    id: -1,
    windowId: -1,

    hwnd: 0,

    getTopLevelHwnd: function () { 
        return this.hwnd || 0;
    },

    getState: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.getState started for tab with id:" + this.id);
        var successFunctionCall = function (msg) {
            if (!Util.isNullOrUndefined(msg.data)) {
                var state = ReadyState2Status[msg.data];
                this._logger.trace("FirefoxTab.getState result:" + state);
                successCallback(state);
            }
            else {
                failCallback.apply(this, ["Fail to get tab state"]);
            }
        };

        FirefoxAPI.prototype._executeAddonCommand("getState", this.id, successFunctionCall.bind(this), failCallback.bind(this, "Fail to get tab state"));
    },

    getNumberOfTabs: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.getNumberOfTabs started ");
        FirefoxAPI.prototype._executeAddonCommand("getNumberOfTabs", this.id,
        function (msg) {
            successCallback(msg.data);
        }, function () {
            this._logger.error("FirefoxTab.getNumberOfTabs failed ");
            failCallback("Fail to get tab number");
        }.bind(this)
       );
    },

    isActive: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.isActive started for tab with id:" + this.id);
        FirefoxAPI.prototype._executeAddonCommand("isActive", this.id,
        function (msg) {
            successCallback(msg.data);
        }, function () {
            this._logger.error("FirefoxTab.isActive failed for tab " + this.id);
            failCallback("Fail to get tab active state");
        }.bind(this)
        );
    },
	
	resize: function(width, height, successCallback, failCallback){
		this._logger.trace("FirefoxTab.resize: Started on window " + this.windowId + " To Width=" + width + " Height= " + height);
		try {
			FFBrowserUtil.resize({
				id: this.id,
				width: width,
				height: height
			});	
		}
		catch(e) {
			this._logger.error("FirefoxTab.resize: got exception for tab id " + this.id + " - Error: " + e + "\n Stack: " + e.stack );	
			failCallback(e);
			return;
		}
		
		successCallback();
	},

    navigate: function (url, successCallback, failCallback) {
        this._logger.trace("FirefoxTab.navigate started for tab with id:" + this.id);
        FirefoxAPI.prototype._executeAddonCommand("navigate", [this.id, url],
            successCallback, function () {
                this._logger.error("FirefoxTab.navigate failed for tab " + this.id);
                failCallback("Fail to navigate tab");
            }.bind(this)
        );
    },

    select: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.select started for tab with id:" + this.id);
        FirefoxAPI.prototype._executeAddonCommand("select", this.id, successCallback, function () {
            this._logger.error("FirefoxTab.select failed for tab " + this.id);
            failCallback("Fail to activate tab");
        }.bind(this));
    },

    fullScreen: function (successCallback, failCallback) {
        this._logger.trace("FirefoxAPI.fullScreen called");
        FirefoxAPI.prototype._executeAddonCommand("fullScreen", this.id, successCallback, function () {
            this._logger.error("FirefoxTab.fullScreen failed for tab " + this.id);
            failCallback("fullScreen failed");
        }.bind(this));
    },

    goHome: function (successCallback, failCallback) {
        this._logger.trace("Firefox.goHome called");
        FirefoxAPI.prototype._executeAddonCommand("goHome", this.id, successCallback, function () {
            this._logger.error("FirefoxTab.goHome failed for tab " + this.id);
            failCallback("goHome failed");
        }.bind(this));
    },

    createNewTab: function () {
        this._logger.trace("FirefoxTab.createNewTab started");
        FirefoxAPI.prototype._executeAddonCommand("createNewTab", this.id,
        function () {
            this._logger.trace("FirefoxTab.createNewTab success");
        }.bind(this),
            function () {
                this._logger.error("FirefoxTab.createNewTab failed");
            }.bind(this)
        );
    },

    close: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.close started for tab with id:" + this.id);
        this._logger.trace("first to call getNumberOfTabs to check whether error happens when retrieve tabs and window in firefox");

        function closeCallback() {
            this._logger.error("resultCallback first then call closeAllTabs");
            successCallback();
            FirefoxAPI.prototype._executeAddonCommand("close", this.id, null, null);
        }

        function errorCallback() {
            this._logger.error("FirefoxAPI.close failed");
            failCallback();
        }
        FirefoxAPI.prototype._executeAddonCommand("getNumberOfTabs", this.id, closeCallback.bind(this), errorCallback.bind(this));
    },

    getWindowRect: function (successCallback, failCallback) {
        this._logger.error("FirefoxTab.getWindowRect unsupported");
    },

    captureTabVisibleArea: function (successCallback, failCallback) {
        this._logger.error("FirefoxTab.captureTabVisibleArea unsupported, will implement it later");
    },

    reload: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.reload started for tab with id:" + this.id);
        FirefoxAPI.prototype._executeAddonCommand("reload", this.id,
        successCallback, function () {
            this._logger.error("FirefoxTab.reload failed for tab " + this.id);
            failCallback("Fail to reload tab");
        }.bind(this)
        );
    },

    isInjectable: function (successCallback, failCallback) {
        this._logger.trace("FirefoxTab.isInjectable started for tab with id:" + this.id);
        FirefoxAPI.prototype._executeAddonCommand("getTabUrl", this.id,
        function (msg) {
            var URL = msg.data;
            if (!Util.isInjectableUrl(URL)) {
                this._logger.debug("isInjectable: Non injectable url:" + URL);
                successCallback(false);
            } else
                successCallback(true);
        }.bind(this),
        function () {
            this._logger.error("FirefoxTab.isInjectable failed for tab " + this.id);
            failCallback("Fail to get tab " + this.id + " URL");
        }.bind(this)
        );
    }
};