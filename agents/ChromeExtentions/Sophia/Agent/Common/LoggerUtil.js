if (typeof log4javascript === "undefined" && typeof require === "function") {
    // Ensure log4javascript is available. This is necessary for Firefox add-on.
    var log4javascript = require("ThirdParty/log4javascript_uncompressed.js").log4javascript;
}

function LocalStroageAppender() { }

LocalStroageAppender.prototype = new log4javascript.Appender();
LocalStroageAppender.prototype.layout = new log4javascript.NullLayout();
LocalStroageAppender.prototype.threshold = log4javascript.Level.DEBUG;

LocalStroageAppender.prototype.append = function(loggingEvent) {
	var appender = this;

	var getFormattedMessage = function() {
		var layout = appender.getLayout();
		var formattedMessage = layout.format(loggingEvent);
		if (layout.ignoresThrowable() && loggingEvent.exception) {
			formattedMessage += loggingEvent.getThrowableStrRep();
		}
		return formattedMessage;
	};
	window.localStorage.setItem((new Date()).toTimeString(), getFormattedMessage());
};

LocalStroageAppender.prototype.toString = function() {
	return "LocalStroageAppender";
};

////////////////////////// WebSocket Appender
function WebSocketAppender() {
    this._buffer = [];
    this.enabled = true;
    this.logWebSocket = null;
}

WebSocketAppender.prototype = new log4javascript.Appender();
WebSocketAppender.prototype.layout = new log4javascript.NullLayout();
WebSocketAppender.prototype.threshold = log4javascript.Level.DEBUG;

WebSocketAppender.prototype.append = function (loggingEvent) {
    if (!this.enabled)
        return;

    var appender = this;

    var getFormattedMessage = function() {
        var layout = appender.getLayout();
        var formattedMessage = layout.format(loggingEvent);
        if (layout.ignoresThrowable() && loggingEvent.exception) {
            formattedMessage += loggingEvent.getThrowableStrRep();
        }
        return (new Date()).getTime() + " # " + formattedMessage;
    };


    if (!this.logWebSocket) {
        // Buffer to be used when Websocket is connected
        this._buffer.push(getFormattedMessage());
        return;
    }

    switch (this.logWebSocket.readyState)
    {
        case this.logWebSocket.CONNECTING:
            // Buffer to be used when Websocket is connected
            this._buffer.push(getFormattedMessage());
            break;
        case this.logWebSocket.OPEN:
            this.logWebSocket.send(getFormattedMessage());
            break;
        case this.logWebSocket.CLOSING:
        case this.logWebSocket.CLOSED:
            // Sometimes the onclose event is not fired
            // This is a workaround for those cases.
            this.shutDown();
            break;
    }   
};

WebSocketAppender.prototype.connect = function (port) {
    this.logWebSocket = new WebSocket("ws://127.0.0.1:" + port);
    this.logWebSocket.onopen = this.onOpen.bind(this);
    this.logWebSocket.onclose = this.onClose.bind(this);
    this.logWebSocket.onerror = this.onError.bind(this);
};

WebSocketAppender.prototype.onOpen = function () {
    this.enabled = true;
    this._buffer.forEach(function (logMsg) {
        this.logWebSocket.send(logMsg);
    }, this);
    delete this._buffer;
};

WebSocketAppender.prototype.onClose = function () {
    this.shutDown();
};

WebSocketAppender.prototype.onError = function () {
    console.error("WebSocketAppender.onError: There was an error in WebSocket Appender");
    this.shutDown();
};

WebSocketAppender.prototype.shutDown = function () {
    if (this.logWebSocket)
        this.logWebSocket.close();
    delete this._buffer;
    this.enabled = false;
};

WebSocketAppender.prototype.toString = function () {
    return "WebSocketAppender";
};

var WebSocketAppenderInstance = new WebSocketAppender();
WebSocketAppenderInstance.setThreshold(log4javascript.Level.ALL);
WebSocketAppenderInstance.setLayout(new log4javascript.PatternLayout("%d{HH:mm:ss} %c [%-5p] - %m"));


//////////////////////////////////////////////////////////////////////////////////

//creates a global appender for browser console to be shared among all loggers
var BrowserAppender = new log4javascript.BrowserConsoleAppender();
BrowserAppender.setThreshold(log4javascript.Level.ALL);
BrowserAppender.setLayout(new log4javascript.PatternLayout("%d{HH:mm:ss} %c [%-5p] - %m%n"));


//////////////////////////////////////////////////////////////////////////
/// Constructor for the Logger Utility                                 ///
///                                                                    ///
/// Parameters:                                                        ///
///             catName - The name of the logger category to be used   ///
///                       in the logger utility.                       ///
//////////////////////////////////////////////////////////////////////////
function LoggerUtil(catName) {
    try {
        this._log = log4javascript.getLogger(catName);

        //gets the log level for the category

        var catLogLevel = this.getCategoryLogLevel(catName);
        if (catLogLevel) {
            this._log.setLevel(log4javascript.Level[catLogLevel]);
        }
        //sets the layout to be %date% %catName% [%severity%] - %message%

        //adds the browser console for errors only.
        this._log.addAppender(BrowserAppender);
        if (WebSocketAppenderInstance.enabled)
            this._log.addAppender(WebSocketAppenderInstance);
    }
    catch (e) {
        console.error("QTP Agent: Got Exception " + e + "\nStack:" + e.stack);
    }
}

LoggerUtil.prototype = {
    _log: undefined,
    _settings: null,
    DEFAULT_LOG_LEVEL: "WARN",

    trace: function (msg) { this._log.trace(msg); },
    debug: function (msg) { this._log.debug(msg); },
    info: function (msg) { this._log.info(msg); },
    warn: function (msg) { this._log.warn(msg); },
    error: function (msg) { this._log.error(msg); },
    fatal: function (msg) { this._log.fatal(msg); },
    init: function () {
        LoggerUtil.prototype._settings = {};
        var rootLogger = log4javascript.getRootLogger();
        rootLogger.setLevel(log4javascript.Level[LoggerUtil.prototype.DEFAULT_LOG_LEVEL]);
    },
    setSettings: function (newSettings) {
        LoggerUtil.prototype._settings = newSettings;
        var defaultLogLevel = LoggerUtil.prototype._settings["log:defaultLevel"] || LoggerUtil.prototype.DEFAULT_LOG_LEVEL;
        var rootLogger = log4javascript.getRootLogger();
        rootLogger.setLevel(log4javascript.Level[defaultLogLevel]);

        //gets all the categories in the settings and set each category level
        var categoriesSettings = Object.keys(newSettings).filter(function (k) {
            return k.match(/^log:cat/);
        });
        categoriesSettings.forEach(function (catSetting) {
            //gets the category name
            var logLevel = newSettings[catSetting];
            var tokens = catSetting.split(":");
            var catName = tokens.pop();
            var log = log4javascript.getLogger(catName);
            log.setLevel(log4javascript.Level[logLevel]);
        });

        if (newSettings.remoteLogging && newSettings.remoteLogging.enabled) {
            WebSocketAppenderInstance.connect(newSettings.remoteLogging.port);
        }
        else {
            WebSocketAppenderInstance.shutDown();
        }
    },
    getCategoryLogLevel: function (catName) {
        //Checks if the global settings object was set.
        if (!LoggerUtil.prototype._settings)
            return null;

        //gets the log level for the category
        var catLogLevel = LoggerUtil.prototype._settings["log:cat:" + catName];
        if (!catLogLevel) {
            return null;
        }

        return catLogLevel;
    },
    _getLogSettings: function () {
        var logSettings = {};
        //gets all the categories in the settings and set each category level
        var logSettingsNames = Object.keys(LoggerUtil.prototype._settings).filter(function (k) {
            return k.match(/^log:/);
        });

        logSettingsNames.forEach(function (logSetting) {
            logSettings[logSetting] = LoggerUtil.prototype._settings[logSetting];
        });

        logSettings.remoteLogging = LoggerUtil.prototype._settings.remoteLogging;

        return logSettings;
    },
    getAvailableLevels: function () {
        return Object.keys(log4javascript.Level);
    },

    getEmptyLogger: function () {
		function nop() { }
        return {
            trace: nop,
            debug: nop,
            warn: nop,
            info: nop,
            error: nop
        };
    }
};

if (typeof exports != "undefined") {
    // Ensure LoggerUtil is exported when exports exist. This is necessary for LoggerUtil to be 
    // available in Firefox add-on.
    exports.LoggerUtil = LoggerUtil;
}
