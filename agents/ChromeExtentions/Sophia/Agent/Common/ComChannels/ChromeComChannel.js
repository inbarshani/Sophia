/*function DummyComChannels() {

}

DummyComChannels.prototype = {
    //members
    id: -1,

    //methods
    init: function () { },
    sendMessage: function (msg) { },
    sendEvent: function (msg) { },
    addListener: function (listenerFunction) { },
    removeListener: function (listenerFunction) { },
    onMessage: function (msgStr) { }
}
*/

function ChromeComChannel() {
    if (typeof(ext) === "undefined") { // TODO: find a better condition or way to implement this
        this._logger = new LoggerUtil("ComChannels.ChromeComChannel.Content");
        this._runInContext = "content";
    }
    else {
        this._logger = new LoggerUtil("ComChannels.ChromeComChannel.Extension");
        this._runInContext = "extension";
    }

    this._logger.info("Created");
    this._listeners = {};

    this._asyncHelper = new AsyncCommunicationHelper();
    this._asyncHelper.addListener("MessageTimedOut", this);

    this.id = new Date().getTime(); // TODO: THIS IS NOT A GUID !!! FIX !!

    if(chrome.runtime && chrome.runtime.connect){
        this._logger.info("ctor: using the chrome.runtime object as chrome's messaging service");
        this._chromeMessagingService = chrome.runtime;
    }
    else{
        this._logger.info("ctor: using the chrome.extension object as chrome's messaging service");
        this._chromeMessagingService = chrome.extension;
    }
}

ChromeComChannel.prototype = {
    //members
    id: -1,
    _logger: null,
    _parentPort: null,
    _listeners: null,
    _knownPorts: [],
    _asyncHelper: null,
    _nextPortId: 0,
    _runInContext: null,
    _chromeMessagingService: null,
    _active: true,

    //methods
    init: function () {
        this._logger.trace("init called");
        if (!this._active) {
            this._logger.trace("sendMessage: communication channel is NOT active - returning.");
            return;
        }

        switch (this._runInContext) {
            case "content":
                Object.defineProperty(this, "_isConnected", { value: false });
                break;
            case "extension":
                this._chromeMessagingService.onConnect.addListener(this._onContentConnected.bind(this));
                break;
            default:
                this._logger.error("init: Unsupported context! init failed.");
        }
    },

    _sendMessageHelper: function (msgToSend, destinationId) {
        this._logger.trace("_sendMessageHelper: send to: " + destinationId);
        if (!this._active) {
            this._logger.trace("sendMessage: communication channel is NOT active - returning.");
            return;
        }

        var destPort;
        switch (this._runInContext) {
            case "content":
                destPort = this._parentPort;
                break;
            case "extension":
                destPort = this._knownPorts[destinationId];
                break;
            default:
                this._logger.error("sendMessage: Unsupported context!!!!");
                return;
        }

        this._logger.debug("sendMessage: Going to send to:" + destPort.name);
        this._logger.trace("sendMessage: Sending the following object:\n" + Util.jsonPrettyStringify(msgToSend));

        destPort.postMessage(msgToSend);
        msgToSend.portName = destPort.name;
    },
    sendMessage: function (msg, destinationId) {
        this._logger.trace("sendMessage: called");

        var msgToSend = {
            type: "request",
            data: msg
        };

        this._asyncHelper.updateMessageWithNeededInfo(msgToSend);
        this._sendMessageHelper(msgToSend, destinationId);
        this._asyncHelper.addAsyncMsgToQueue(msgToSend);
    },
    sendEvent: function (msg, destinationId) {
        this._logger.trace("sendEvent: called");

        var msgToSend = {
            type: "event",
            data: msg
        };

        this._sendMessageHelper(msgToSend, destinationId);
    },
    addListener: function (eventName, listenerFunction) {
        this._logger.info("addListener: called");
        if (!this._listeners[eventName])
            this._listeners[eventName] = [];

        this._listeners[eventName].push(listenerFunction);
    },
    removeListener: function (eventName, listenerFunction) {
        this._logger.info("addListener: called");
        if (!this._listeners[eventName]) {
            this._logger.error("removeListener: Trying to remove listener that is not registered");
            return;
        }
        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return listener !== listenerFunction;
        });
    },
    dispatchEvent: function (eventName, portName) {
        this._logger.trace("dispatchEvent: called for event " + eventName + " - port.name = " + portName);
        var clientPort = this._getClientFromPort(this._knownPorts[portName]);
        //fix the argument array by removing the event name and chrome port and adding the client port
        var args = Array.prototype.map.call(arguments, Util.identity);
        args.splice(0, 2);

        if (typeof (args[args.length - 1]) === "function") {
            var lastElement = args.pop();
            args.push(clientPort);
            args.push(lastElement);
        }
        else {
            args.push(clientPort);
        }


        //The result is meaningful only for "message" event thus the forEach contains only 1 element.
        //Note: There are other event types such as "connect" which listened by multiple handlers.
        if (!this._listeners[eventName]) {
            this._logger.trace("dispatchEvent: no listeners found for event: " + eventName);
            return null;
        }

        var res = null;
        this._listeners[eventName].forEach(function (listener) {
            res = listener.apply(this, args);
        });

        return res;
    },
    onMessage: function (msg, port) {
        this._logger.trace("onMessage: From:" + port.name + " - Started with " + JSON.stringify(msg));

        if (this._active === false) {
            this._logger.trace("onMessage: communication channel is NOT active - returning.");
            return;
        }

        switch (msg.type) {
            case "response":
                this._logger.trace("onMessage: This is response message");
                this._asyncHelper.setAckMessage(msg);
                this.dispatchEvent('response', port.name, msg.data);
                break;
            case "request":
                this._handleRequestMsg(port, msg);
                break;
            case "event":
                this._logger.trace("onMessage: This is an event");
                this.dispatchEvent('event', port.name, msg.data);
                break;
            case "connectResponse":
                this._handleConnectResponse(port, msg);
                break;
        }
    },
    connect: function () {
        this._logger.trace("connect: called ");

        if (!this._active) {
            this._logger.trace("connect: communication channel is NOT active - returning.");
            return;
        }

        switch (this._runInContext) {
            case "content":
                if (this._parentPort) {
                    this._logger.trace("connect: Parent port exists - clean listeners and delete it -> 1. a timeout has passed OR 2. connection failed");
                    this._parentPort.disconnect();
                }
                this._parentPort = this._chromeMessagingService.connect();
                this._parentPort.onMessage.addListener(this.onMessage.bind(this));
                this._parentPort.onDisconnect.addListener(this._onContentPortDisconnected.bind(this));
                break;
            case "extension":
                break;
            default:
                this._logger.error("connect: Unsupported context! connect() failed.");
        }
    },
    _handleConnectResponse: function (port, msg) {
        this._logger.trace("_handleConnectResponse: called with: " + JSON.stringify(msg));

        if (msg.data.status !== "OK") {
            this._logger.info("_handleConnectResponse: unsupported content - disconnecting");
            this.disconnect();
            return;
        }

        this._isConnected = true;
        this.dispatchEvent('connected', port.name);
    },
    disconnect: function () {
        if (this._parentPort) {
            this._logger.trace("disconnect: disconnecting from port");
            this._active = false;
            this._parentPort.disconnect();
        }
    },

    _isSupportedClient: function (port) {
        return port.sender.tab;
    },

    // Internal functions
    _onContentConnected: function (port) {
        this._logger.info("_onContentConnected: called ");
        if (!this._isSupportedClient(port)) {
            this._logger.info("_onContentConnected: received connection from unsupported client - ignoring & disconnecting port");
            port.postMessage({ type: "connectResponse", data: { status: "connection refused" } });
            return;
        }

        // First send ack to content
        port.postMessage({ type: "connectResponse", data: { status: "OK" } });

        // Handle the new port (give it ID and register to events)
        port.name = ++ChromeComChannel.prototype._nextPortId;
        this._logger.info("_onContentConnected: port.name is " + port.name);
        port.onMessage.addListener(this.onMessage.bind(this));
        port.onDisconnect.addListener(this._onDisconnect.bind(this, port));
        this._knownPorts[port.name] = port;

        // Inform the listeners that there's a new client connected
        this.dispatchEvent('clientConnected', port.name);
    },
    onMessageTimedOut: function (timedOutMsg) {
        this.dispatchEvent("MessageTimedOut", timedOutMsg.portName, timedOutMsg.data);
    },
    _onDisconnect: function (port) {
        if (this._listeners.clientDisconnected) {
            this.dispatchEvent('clientDisconnected', port.name);
        }
    },
    _onContentPortDisconnected: function () {
        // This function is called in Content scripts when the Extension disconnects the port
        this._logger.info("_onContentPortDisconnected: Port Disconnected in " + window.location.href);
        if (!this._isConnected && this._active) {
            this._logger.warn("_onContentPortDisconnected: Never connected -> Error in connection.");
            this.dispatchEvent('connectError', this._parentPort.name, "timeout");
        }
    },
    _getClientFromPort: function (port) {
        var client = {};
        if (port) {
            client = { tabID: port.sender.tab.id, windowId: port.sender.tab.windowId, id: port.name };
        }
        return client;
    },
    _handleRequestMsg: function (port, msg) {
        this._logger.trace("_handleRequestMsg: dispatching a REQUEST message");
        if (!this._listeners.message) {
            return;
        }

        var sendResponse = function (resMsgData) {
            if (!resMsgData.status) {
                resMsgData.status = "OK";
            }
            //sends back the result message.
            msg.type = "response";
            msg.data = resMsgData;
            port.postMessage(msg);
        };

        var resData = msg.data;
        try {
            resData = this.dispatchEvent('message', port.name, msg.data, sendResponse.bind(this));
        }
        catch (e) {
            resData.status = e.message || "ERROR";
            this._logger.warn("_handleRequestMsg: Got Exception:" + e + " Details: " + (e.Details || "") + " - CallStack: " + e.stack);
            sendResponse(resData);
        }
    }
};