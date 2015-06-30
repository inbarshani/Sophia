// TODO:
// - Add a unique identifier on each message to avoid other listeners from handling our message

function MessageChannelComChannel(context) {
    switch (context) {
        case "extension":
            this._logger = new LoggerUtil("ComChannels.MessageChannelComChannel.Extension");
            this._mode = "extension";
            this.id = -1;
            break;
        case "content":
            this._logger = new LoggerUtil("ComChannels.MessageChannelComChannel.Content");
            this._mode = "content";
            this.id = Math.random();
            break;
        default:
            throw new Error("MessageChannelComChannel initialized with an Unknown Context");
    }

    this._logger.info("Ctor: Created id:" + this.id);

    this._listeners = {};

    this._asyncHelper = new AsyncCommunicationHelper();
    this._asyncHelper.addListener("MessageTimedOut", this);
}

MessageChannelComChannel.prototype = {
    //members
    id: -1,
    _listeners: null,
    _knownTargets: [],
    _asyncHelper: null,
    _nextContentContextId: 0,
    _connectionReceivedIds: {},
    _mode: null,
    _logger: null,
    _pageProxies: [],
    _messageChannel: null,

    //methods
    init: function () {
        this._logger.trace("init called");

        switch (this._mode) {
            case "content":
                this._logger.trace("init started listening for Content messages");
                this._messageChannel = new MessageChannel();
                this._messageChannel.port1.onmessage = this.onMessageContent.bind(this);
                this._messageChannel.port1.start();
                break;
            case "extension":
                this._logger.trace("init started listening for Extension messages");
                window.addEventListener("message", this.onMessageExt.bind(this), false);
                break;
            default:
                this._logger.error("init: Unsupported context! init failed.");
        }
    },
    _sendMessageHelper: function (msg, destTargetId, type) {
        this._logger.trace("sendMessage: send to: " + JSON.stringify(destTargetId) + " - message:" + JSON.stringify(msg));

        var destTarget = null;
        var proxy = null;
        var targetIdVal = null;
        switch (this._mode) {
            case "content":
                targetIdVal = -1; // extension id is always -1
                proxy = this._messageChannel.port1;
                break;
            case "extension":
                targetIdVal = destTargetId;
                if (this._knownTargets[targetIdVal])
                    proxy = this._knownTargets[targetIdVal];
                break;
        }

        if (!proxy) {
            this._logger.error("sendMessage: No Proxy found. Returning - sending message failed !");
            return;
        }

        var msgToSend = {
            type: type,
            sourceId: this.id,
            targetId: targetIdVal,
            data: msg
        };

        if (type === "request")
            this._asyncHelper.updateMessageWithNeededInfo(msgToSend);

        this._logger.trace("sendMessage: Sending the following object:\n" + Util.jsonPrettyStringify(msgToSend));

        if (this.id === -1 || this.id >= 1) // Initialized & Ready for dispatching messaging
            this._doPostMessage(proxy, msgToSend);
        else
            this._logger.trace("sendMessage: ComChannel still not ready. Message sending is delayed");

        msgToSend.client = destTargetId;

        if (type === "request")
            this._asyncHelper.addAsyncMsgToQueue(msgToSend);
    },
    sendMessage: function (msg, destTargetId) {
        this._logger.trace("sendMessage: called");
        this._sendMessageHelper(msg, destTargetId, "request");
    },
    sendEvent: function (msg, destTargetId) {
        this._logger.trace("sendEvent: called");
        this._sendMessageHelper(msg, destTargetId, "event");
    },
    addListener: function (eventName, listenerFunction) {
        this._logger.trace("addListener: called");
        if (!this._listeners[eventName])
            this._listeners[eventName] = [];

        if (this._listeners[eventName].indexOf(listenerFunction) === -1)
            this._listeners[eventName].push(listenerFunction);
    },
    removeListener: function (eventName, listenerFunction) {
        this._logger.trace("removeListener: called");
        if (!this._listeners[eventName]) {
            this._logger.trace("removeListener: Trying to remove listener that is not registered");
            return;
        }
        this._listeners[eventName] = this._listeners[eventName].filter(function (listener) {
            return listener !== listenerFunction;
        });
    },
    dispatchEvent: function (eventName, client) {
        this._logger.trace("dispatchEvent: called for event " + eventName);
        // Get  the unnamed parameters to the function
        var args = Array.prototype.slice.call(arguments, 2);

        if (typeof (args[args.length - 1]) === "function")
            args.splice(args.length - 1, 0, client); // add client before last argument in case the last argument is a callback function
        else
            args.push(client);

        if (this._listeners[eventName]) {
            this._listeners[eventName].forEach(function (listener) {
                listener.apply(this, args);
            });
        }
    },
    onMessageExt: function (event) {
        //this._logger.trace("onMessageExt: called");
        this.onMessage(event);
    },
    onMessageExtFromPort: function (event) {
        //this._logger.trace("onMessageExtFromPort: called");
        this.onMessage(event);
    },
    onMessageContent: function (event) {
        //this._logger.trace("onMessageContent: called");
        this.onMessage(event);
    },
    onMessage: function (msgEv) {
        var msgData = msgEv.data;
        if ((!msgData.targetId) || (msgData.targetId !== this.id)) {
            //this._logger.trace("onMessage: Not mine - ignore.: " + this.id + " target is: " + msgData.targetId + " - the msg: " + JSON.stringify(msgData));
            return;
        }

        this._logger.trace("onMessage: Received a message from: " + msgData.sourceId + " - the msg: " + JSON.stringify(msgData));

        switch (msgData.type) {
            case "connect":
                this._onConnect(msgData, msgEv.ports[0]);
                break;
            case "connectResponse":
                this._onConnectResponse(msgData);
                break;
            case "disconnect":
                this._onDisconnect(msgData, msgEv.srcElement);
                break;
            case "response":
                this._asyncHelper.setAckMessage(msgData);
                /* falls through */
            case "event":
                this._logger.trace("onMessage: This is response message: sourceId=" + msgData.sourceId + " , targetId=" + msgData.targetId);
                this.dispatchEvent(msgData.type, this._getClient(msgEv.srcElement, msgData.sourceId), msgData.data);
                break;
            case "request":
                this._logger.trace("onMessage: This is request message");
                this._handleRequest(this._getClient(msgEv.srcElement, msgData.sourceId), msgEv);
                break;
            default:
                this._logger.trace("onMessage: unhandled message format: " + msgData.type);
        }
    },
    connect: function () {
        this._logger.trace("connect: called");
        switch (this._mode) {
            case "extension":
                break;
            case "content":
                var connectMsg = { type: "connect", sourceId: this.id, targetId: -1, _debugInfo: { url: location.href } };
                this._logger.trace("connect: dispatching connect message: " + JSON.stringify(connectMsg));
                window.top.postMessage(connectMsg, '*', [this._messageChannel.port2]);
                break;
        }
    },
    disconnect: function () {
        this._logger.trace("disconnect: called ");
        switch (this._mode) {
            case "extension":
                this._logger.error("disconnect: houston we have a problem");
                break;
            case "content":
                var disconnectMsg = { type: "disconnect", sourceId: this.id, targetId: -1, _debugInfo: { url: location.href } };
                this._logger.trace("disconnect: dispatching Disconnect message: " + JSON.stringify(disconnectMsg));
                this._doPostMessage(this._messageChannel.port1, disconnectMsg);
                break;
        }
    },

    // Internal functions
    _onConnect: function (message, port) {
        this._logger.trace("_onConnect: called with request: " + JSON.stringify(message));

        var returnMsg = { type: "connectResponse", targetId: message.sourceId, sourceId: this.id };

        if (this._connectionReceivedIds[message.sourceId]) {
            this._logger.info("_onConnect: Received two connection requests from the same content: " + message.sourceId + " which was already given the value: " + this._connectionReceivedIds[message.sourceId]);
            returnMsg.allocatedId = this._connectionReceivedIds[message.sourceId];
        }
        else if (message.sourceId >= 1) {
            this._logger.info("_onConnect: Received a connection request from an already intialized frame: " + message.sourceId);
            returnMsg.allocatedId = message.sourceId;
        }
        else {
            var newClientId = this._setTargetId(port);
            this._logger.trace("_onConnect: Newly Connected Target Id: " + newClientId);
            port.onmessage = this.onMessageExtFromPort.bind(this);

            this._knownTargets[newClientId] = port;

            var client = this._getClient(port, newClientId);
            this._logger.debug("_onConnect: dispatching 'clientConnected' to " + JSON.stringify(client));
            this.dispatchEvent('clientConnected', client);

            this._connectionReceivedIds[message.sourceId] = newClientId;
            returnMsg.allocatedId = newClientId;
        }

        this._logger.trace("_onConnect: dispatching connection response: " + JSON.stringify(returnMsg));
        this._doPostMessage(port, returnMsg);
    },

    _onConnectResponse: function (message) {
        this._logger.trace("_onConnectResponse: Connection Response: " + JSON.stringify(message));
        Util.assert((this.id < 1) || (this.id === message.allocatedId), "onMessage: connectResponse: received id: " + message.allocatedId + " while my id is: " + this.id, this._logger);

        this.id = message.allocatedId;

        this.dispatchEvent("connected", this.id);
    },

    _onDisconnect: function (message, target) {
        this._logger.trace("_onDisconnect: Received Disconnection From: " + JSON.stringify(message));

        var clientId = message.sourceId;
        Util.assert(clientId >= 0, "_onDisconnect: Error while trying to disconnect - received an invalid sourceId: " + clientId, this._logger); // Source ID can't be an ID of the Extension and Content Id is always >= 0

        if (clientId < 1) {
            // If frame sent a disconnection before it finished registration, it will send the temp id as the source id (reproduced in Gmail.com of August, 2013)
            // In this case we'll do the mapping manually
            this._logger.info("_onDisconnect: Received a disconnection request from a Frame that didn't initialize yet: " + clientId + " - overriding the id with: " + this._connectionReceivedIds[clientId]);
            clientId = this._connectionReceivedIds[clientId];
            if (!clientId) 
                return;
        }

        //cleanup the known clients.
        delete this._knownTargets[clientId];
        delete this._connectionReceivedIds[clientId];

        var client = { tabID: target._uftInternalId, windowId: target.browserWindow._uftInternalId, id: clientId };
        this._logger.debug("clientDisconnected: dispatching 'clientConnected' to " + JSON.stringify(client));
        this.dispatchEvent("clientDisconnected", client);
    },

    _handleRequest: function (client, msgEv) {
        this._logger.trace("_handleRequest: dispatching a REQUEST message");
        if (!this._listeners.message) {
            return;
        }

        var msgData = msgEv.data.data;
        try {
            this.dispatchEvent('message', client, msgData, sendResponse.bind(this));
        }
        catch (e) {
            this._logger.error("_handleRequest: Got Exception:" + e + " Details: " + (e.Details || "No details found in exception") + "\nStack:" + e.stack);
            if (e.message)
                msgData.status = e.message;
            else
                msgData.status = "ERROR";
            sendResponse.call(this, msgData);
        }

        return;

        /** Helper function **/
        function sendResponse(resMsg) {
            var msg = msgEv.data;
            this._logger.trace("sendResponse: Dispatching response to: " + msg.sourceId);

            if (!resMsg.status)
                resMsg.status = "OK";

            msg.data = resMsg;
            msg.targetId = msg.sourceId;
            msg.sourceId = this.id;
            msg.type = "response";

            var port = null;
            if (this._mode === "content") {
                port = this._messageChannel.port1;
            }
            else {
                port = this._knownTargets[msg.targetId];
            }

            if (!port) {
                this._logger.error("onMessage: NO Proxy found");
                return;
            }

            this._logger.trace("sendResponse: Dispatching Response: " + Util.jsonPrettyStringify(msg));
            this._doPostMessage(port, msg);
        }
    },

    onMessageTimedOut: function (timedOutMsg) {
        this._logger.warn("onMessageTimedOut: the following message has timed out !!!:" + JSON.stringify(timedOutMsg.data));
        this.dispatchEvent("MessageTimedOut", timedOutMsg.client, timedOutMsg.data);
    },

    _getClient: function (target, contentId) {
        var client = {};
        switch (this._mode) {
            case "content":
                break;
            case "extension":
                if (target) {
                    client = { tabID: webViewId.id, windowId: webViewId.windowId, id: contentId }; // webView is defined in EmbeddedBrowserInterface
                }
        }

        return client;
    },
    _setTargetId: function (target) {
        // Now allocate a new ID for the Frame and store a map from the FrameId to the PageId
        var allocatedContextId = ++MessageChannelComChannel.prototype._nextContentContextId;
        return allocatedContextId;
    },

    _onContentUnloaded: function () {
        this._logger.trace("_onContentUnloaded: Called");
        Util.assert(this._mode === "content", "_onContentUnloaded: Called not from Content!", this._logger); // Should be called only from Content!
        this.disconnect();
    },

    _doPostMessage: function (port, msg) {
        port.postMessage(msg);
    }
};