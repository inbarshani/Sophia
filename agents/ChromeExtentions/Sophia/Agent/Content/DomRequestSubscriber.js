// Code which manages all the requests that should be executed in the DOM context.
var HTMLLogger = {
    _threshold: 40000, //WARN
    _appenderList: [],
    _initialized: false,
    trace: function (msg) {
        this._log(10000, "log", msg);
    },
    debug: function (msg) {
        this._log(20000, "log", msg);
    },
    info: function (msg) {
        this._log(30000, "log", msg);
    },
    warn: function (msg) {
        this._log(40000, "warn", msg);
    },
    error: function (msg) {
        this._log(50000, "error", msg);
    },
    fatal: function (msg) {
        this._log(60000, "error", msg);
    },
    _addAppender: function (appender) {
        if (!appender)
            return;

        this._appenderList.push(appender);
    },
    _init: function () {
        this._appenderList = [];
        this._addAppender(HTMLConsoleAppender);
        if (this.remoteLogging && this.remoteLogging.enabled) {
            HTMLWebSocketsAppender.port = this.remoteLogging.port;
            this._addAppender(HTMLWebSocketsAppender);
        }
        this._initialized = true;
    },
    _log: function (level, logFunction, logMsg) {
        if (level < this._threshold)
            return;

        if (!this._initialized)
            this._init();

        this._appenderList.forEach(function (appender) {
            appender.append(level, logFunction, logMsg);
        });
    }
};

var HTMLConsoleAppender = {
    append: function (level, logFunction, logMsg) {
        console[logFunction](logMsg);
    }
};

var HTMLWebSocketsAppender = {
    _threshold: 0,
    _logWebSocket: null,
    _enabled: true,
    _buffer: "",
    port: 0,
    _onOpen: function () {
        //console.log("HTMLLoggerUsingWebSockets: opened");
        this.enabled = true;
        this._logWebSocket.send(this._buffer);
        delete this._buffer;
    },
    _onClose: function () {
        //console.log("HTMLLoggerUsingWebSockets: closed");
        delete this._buffer;
        this.enabled = false;
    },
    _onError: function () {
        //console.error("HTMLLoggerUsingWebSockets: ERROR");
        delete this._buffer;
        this.enabled = false;
    },
    _connect: function () {
        this._logWebSocket = new WebSocket("ws://127.0.0.1:" + this.port);
        this._logWebSocket.onopen = this._onOpen.bind(this);
        this._logWebSocket.onclose = this._onClose.bind(this);
        this._logWebSocket.onerror = this._onError.bind(this);
    },
    _getFormattedMessage: function (logMsg, level) {
        var formattedMessage = (new Date()).getTime() + " # " + (new Date()) + " [" + level + "] - " + logMsg;
        return formattedMessage;
    },
    append: function (level, sLevel, logMsg) {
        if (!this._enabled)
            return;

        if (!this._logWebSocket)
            this._connect();

        switch (this._logWebSocket.readyState) {
            case this._logWebSocket.CONNECTING:
                // Buffer to be used when Websocket is connected
                this._buffer += this._getFormattedMessage(logMsg, sLevel) + "\n";
                break;
            case this._logWebSocket.OPEN:
                this._logWebSocket.send(this._getFormattedMessage(logMsg, sLevel));
                break;
            case this._logWebSocket.CLOSING:
            case this._logWebSocket.CLOSED:
                // Sometimes the onclose event is not fired
                // This is a workaround for those cases.
                delete this._buffer;
                this.enabled = false;
                break;
        }
    }
};

function DomRequestSubscriber() {
    this.handlers = "";
    this._htmlLogger = HTMLLogger;      //default
	
	//Put here all the handlers to be registered in the DOM.
	this.addDOMSideEventHandler("_QTP_Run_Script_With_Attr", this.excuteScriptUsingEventWithAttributes, {});

	//injects the pending handlers
	this.injectHandlers();
}

DomRequestSubscriber.prototype = {
    _namespaceScript: "",
    _htmlLogger: null,

    /**
    * Evaluate expression in document
    * @param {string|function} exp - if string, evaluates it in document. if function - stringifies it and evaluates.
    * @returns {undefined}
    */
    evalInDocument: function (exp) {
        var scriptText = typeof (exp) === 'function' ? Util.functionStringify(exp) : exp;
        
        var node = document.getElementsByTagName("head")[0] || document.documentElement;
        var script = document.createElement("script");
        script.type = "text/javascript";

        script.appendChild(document.createTextNode(scriptText));
        node.appendChild(script, node.firstChild);
        node.removeChild(script);
    },

    addDOMSideEventHandler: function (eventName, func, contextObj, contextObjName) {
        contextObjName = contextObjName || "contextObj";
        this.handlers += "window.addEventListener('" + eventName + "', (function(" + contextObjName + ") { return " + func.toString() + ";})(" + JSON.stringify(contextObj) + "));";
    },

    addMessageHandler: function (func, contextObj, contextObjName) {
        this.addDOMSideEventHandler("message", func, contextObj, contextObjName);
    },

    injectHandlers: function () {
        this.evalInDocument(this.handlers);
        this.handlers = "";
    },

    dispatchMessageToDOM: function (targetWindow, msg) {
        targetWindow.postMessage(JSON.stringify(msg), "*");
    },
    dispatchQTPEventToDoc: function (eventName) {
        var ev = document.createEvent('Events');
        ev.initEvent(eventName, true, false);
        ev.args = Array.prototype.slice.call(arguments, 1);
        window.document.documentElement._QTP_Result = { res: null, ex: null };
        window.dispatchEvent(ev);
        var res = window.document.documentElement._QTP_Result;
        //removing the result from the window object.
        delete window.document.documentElement._QTP_Result;
        return res;
    },
    excuteScriptUsingEvent: function (eventObj) {
        // console.log(JSON.stringify(window.document.documentElement._QTP_Result));
        try {
            window.document.documentElement._QTP_Result.res = eval(eventObj.scriptToRun);
        }
        catch (e) {
            window.document.documentElement._QTP_Result.ex = e;
        }
    },
    excuteScriptUsingEventWithAttributes: function (/*eventObj*/) {
        try {
            var resAttr = JSON.parse(window.document.documentElement.getAttribute("_QTP_Result"));
            resAttr.res = eval(window.document.documentElement.getAttribute("_QTP_Script"));
            window.document.documentElement.setAttribute("_QTP_Result", JSON.stringify(resAttr));
            window.document.documentElement.removeAttribute("_QTP_Script");
        }
        catch (e) {
            window.document.documentElement._QTP_Result.ex = e;
        }
    },
    startNamespace: function () {
        this._namespaceScript = "( function(){";
        this.addUtilityObject("Util", Util);
        this.addUtilityObject("SpecialObject", SpecialObject);
        this.addUtilityObject("HTMLConsoleAppender", HTMLConsoleAppender);
        this.addUtilityObject("HTMLWebSocketsAppender", HTMLWebSocketsAppender);
        this.addUtilityObject("_logger", this._htmlLogger);
        this.addUtilityObject("RtIdUtils", RtIdUtils);
        this.addUtilityObject("ContentUtils", ContentUtils);
        this.addUtilityObject("BrowserServices", BrowserServices);
    },
    addUtilityObject: function (name, obj, eventHandlers) {
        var objData = JSON.stringify(obj);
        this._namespaceScript += "var " + name + "=" + objData;
        this._namespaceScript = this._namespaceScript.substring(0, this._namespaceScript.length - 1);
        if (objData !== "{}")
            this._namespaceScript += ",";
        this._addFunctionsFromObj(obj);
        this._namespaceScript = this._namespaceScript.substring(0, this._namespaceScript.length - 1);
        this._namespaceScript += "};";
        var eventHandlersToInject = eventHandlers || {};
        if (obj.onMessageFromContent) {
            eventHandlersToInject.message = "onMessageFromContent";
        }
        this.addObjectEventHandlers(name, eventHandlersToInject);
    },
    addObjectEventHandlers: function (objName, eventHandlers) {
        var eventsToListen = Object.keys(eventHandlers);
        eventsToListen.forEach((function (eventName) {
            this._namespaceScript += "window.addEventListener('" + eventName + "'," + objName + "." + eventHandlers[eventName] + ".bind(" + objName + "),false);";
        }).bind(this));
    },
    addFunction: function (func) {
        this._namespaceScript += func.toString() + ";";
    },
    addScript: function (script) {
        this._namespaceScript += script;
    },
    endNamespace: function () {
        this._namespaceScript += "})();";
        this.evalInDocument(this._namespaceScript);
    },
    initHTMLLogger: function (logSettings) {
        this._htmlLogger = HTMLLogger;
        var defaultLoggingLevel = logSettings["log:defaultLevel"] || LoggerUtil.prototype.DEFAULT_LOG_LEVEL;
        this._htmlLogger._threshold = log4javascript.Level[defaultLoggingLevel].level;
        this._htmlLogger.remoteLogging = logSettings.remoteLogging;
    },
    _addFunctionsFromObj: function (obj) {
        for (var key in obj) {
            if (typeof (obj[key]) === "function")
                this._namespaceScript += key + ":" + obj[key].toString() + ",";
        }
    },
};
