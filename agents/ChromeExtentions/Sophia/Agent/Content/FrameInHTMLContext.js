var FrameInHTMLContext = {
    _id: {},
    _currentGlobalErrorHandler: null,
    _callbacks: {},
    _nextCallbackID: -1,

    onMessageFromContent: function (msgEventObj) {
        var requestMsg = msgEventObj.data;
        if (typeof (requestMsg) !== "object")
            return;

        //this message is from an unknown source then we need to ignore it without any logging
        if (requestMsg.source !== "Frame" && requestMsg.source !== "FrameInHTMLContext")
            return;

        switch (requestMsg.msgType) {
            case "request":
                this.handleRequest(msgEventObj.source, requestMsg);
                break;
            case "response":
                this.handleResponse(requestMsg);
                break;
        }
    },
    RunOnDocEventHandler: function (msgEvent) {
        var msg = msgEvent.detail;
        var result;
        try {
            result = eval(msg._data.script);
            //in case this is an object then lets ask the DotObjectMAnager to add it to the managed objects
            if (Util.isFunction(result) ||
                Util.isLegacyObject(result) ||
                (result && (Util.isObject(result) || Array.isArray(result)))) {
                _logger.debug("FrameInHTMLContext.RunOnDocEventHandler: The result is object lets notify the .Object manager");
                var request = SpecialObject.CreateReferenceRequest(result);
                this.sendRequestToDotObjectManager(request, function (dotObjToken) {
                    _logger.trace("FrameInHTMLContext.RunOnDocEventHandler: Going to send back the following result:" + Util.jsonStringify(dotObjToken, _logger));
                    msg._data.result = dotObjToken;
                    var  ev = new CustomEvent("_QTP_RUN_SCRIPT_RESULT", { "detail": msg });
                    //ev = document.createEvent("CustomEvent");
                    //ev.initCustomEvent("_QTP_RUN_SCRIPT_RESULT", false, false, msg);
                    window.dispatchEvent(ev);
                });
                return; //wait for async to return.
            }
            msg._data.result = result;
        }
        catch (e) {
            msg._data.ex = e;
        }
        _logger.trace("FrameInHTMLContext.RunOnDocEventHandler: Going to send back the following result:" + Util.jsonStringify(result, _logger));
        var ev = new CustomEvent("_QTP_RUN_SCRIPT_RESULT", { "detail": msg });
        //var ev = document.createEvent("CustomEvent");
        //ev.initCustomEvent("_QTP_RUN_SCRIPT_RESULT", false, false, msg);
        window.dispatchEvent(ev);
    },
    onMarkObjectResult: function (eventObj) {
        //this is not our response message.
        var dotObjMarkResult = eventObj.detail;
        _logger.trace("FrameInHTMLContext.onMarkObjectResult: started for response info: " + Util.jsonStringify(dotObjMarkResult, _logger));
        if (Util.isUndefined(dotObjMarkResult.dotUtilObjAsyncID))
            return;
        if (!this._callbacks[dotObjMarkResult.dotUtilObjAsyncID]) {
            _logger.error("FrameInHTMLContext.onMarkObjectResult:: There is a callback id (" + dotObjMarkResult.dotUtilObjAsyncID + ") that has no callback");
            return;
        }

        var handlerID = dotObjMarkResult.dotUtilObjAsyncID;
        delete dotObjMarkResult.dotUtilObjAsyncID;
        try {
            delete dotObjMarkResult.resultEventName;
            this._callbacks[handlerID].handler(dotObjMarkResult);
        }
        catch (e) {
            _logger.error("FrameInHTMLContext.onMarkObjectResult: Exception occurred when calling the callback." + e);
        }
        finally {
            delete this._callbacks[handlerID];
        }
    },
    handleRequest: function (source, requestMsg) {
        _logger.trace("FrameInHTMLContext.handleRequest: started for request message: " + Util.jsonStringify(requestMsg, _logger));
        var msg = requestMsg.data;

        if (!msg._msgType)
            return;

        //checks if we should handle this message.
        if (!this[msg._msgType])
            return;

        this._setGlobalErrorHandler(requestMsg, source);

        try {
            this[msg._msgType](msg, function (resMsg) {
                _logger.trace("FrameInHTMLContext.handleRequest: the result is:\n" + Util.jsonStringify(resMsg, _logger));
                requestMsg.msgType = "response";
                requestMsg.source = "FrameInHTMLContext";
                requestMsg.data = resMsg;
                _logger.trace("FrameInHTMLContext.handleRequest: Going to send the following result:\n" + Util.jsonStringify(requestMsg, _logger));
                source.postMessage(requestMsg, "*");
            });
        }
        catch (e) {
            _logger.error("FrameInHTMLContext.handleRequest: Error occurred:\n" + e);
            this._currentGlobalErrorHandler(e);
        }
        finally {
            this._resetGlobalErrorHandler();
        }
    },
    handleResponse: function (responsetMsg) {
        //this is not our response message.
        if (Util.isUndefined(responsetMsg.frameInHTHMLCallbackID))
            return;

        _logger.trace("FrameInHTMLContext.handleResponse: started for response message: " + Util.jsonPrettyStringify(responsetMsg));

        if (!this._callbacks[responsetMsg.frameInHTHMLCallbackID]) {
            _logger.error("FrameInHTMLContext.handleResponse: There is a callback id (" + responsetMsg.frameInHTHMLCallbackID + ") that has no callback");
            return;
        }

        // We need to set the global error handler here for a case when the handler will call to sendMessage so
        // we would like to use the original global handler again 
        this._currentGlobalErrorHandler = this._callbacks[responsetMsg.frameInHTHMLCallbackID].globalErrorHandler;

        try {
            this._callbacks[responsetMsg.frameInHTHMLCallbackID].handler(responsetMsg.data);
        }
        catch (e) {
            _logger.error("FrameInHTMLContext.handleResponse: Exception occurred when calling the callback. Call global error handler. Exception:" + e);
            if (this._currentGlobalErrorHandler)
                this._currentGlobalErrorHandler(e);
            else
                _logger.warn("FrameInHTMLContext.handleResponse: global error handler not set");
        }
        finally {
            this._resetGlobalErrorHandler();
            delete this._callbacks[responsetMsg.frameInHTHMLCallbackID];
        }
    },
    sendMessage: function (targetWin, msg, callback) {
        _logger.trace("FrameInHTMLContext.sendMessage: started");

        var request = {
            frameInHTHMLCallbackID: ++this._nextCallbackID,
            msgType: "request",
            source: "FrameInHTMLContext",
            data: msg
        };

        this._callbacks[request.frameInHTHMLCallbackID] = { handler: callback, globalErrorHandler: this._currentGlobalErrorHandler };

        targetWin.postMessage(request, "*");
    },

    sendRequestToDotObjectManager: function (dataToSend, resCallback) {
        _logger.trace("FrameInHTMLContext.sendRequestToDotObjectManager: Started");
        dataToSend.dotUtilObjAsyncID = ++this._nextCallbackID;
        dataToSend.resultEventName = "UFT_DOT_OBJ_MARK_FOR_RUNSCRIPT_RESULT";
        this._callbacks[dataToSend.dotUtilObjAsyncID] = { handler: resCallback, globalErrorHandler: null };
        var dotObjManagerMarkRequestEvent = new CustomEvent("UFT_DOT_OBJ_ADD_TO_MANAGED_OBJ", { detail: dataToSend });
        //var dotObjManagerMarkRequestEvent = document.createEvent("CustomEvent");
        //dotObjManagerMarkRequestEvent.initCustomEvent("UFT_DOT_OBJ_ADD_TO_MANAGED_OBJ", false, false, dataToSend);
        window.dispatchEvent(dotObjManagerMarkRequestEvent);
    },

    buildLayoutTree: function (msg, callback, win) {
        _logger.trace("FrameInHTMLContext.buildLayoutTree: started for frame with id:" + Util.jsonStringify(this._id, _logger));
        var comID = null;   //in case of recursion the window parameter was supplied and comID should be null.
        if (Util.isUndefined(win)) {// first recursion add my COM ID (otherwise we're recursing into uninjectable frames)
            win = window;
            comID = this._id;
        }

        var node = { id: comID, children: [] };
        var excludRtidsArr = msg._data.exclude ? msg._data.exclude : [];

        var frameElemList = win.document.querySelectorAll('IFRAME,FRAME');
        var framesToProcess = frameElemList.length;

        //stop condition of the recursive calls
        if (framesToProcess === 0) {
            _logger.trace("FrameInHTMLContext.buildLayoutTree: There are no frames to process returning the a single node");
            msg._data = node;
            callback(msg);
            return;
        }

        Array.prototype.forEach.call(frameElemList, function (frameElem, i) {
            function checkIfGotAllResponses() {
                --framesToProcess;
                if (framesToProcess > 0)
                    return;

                _logger.debug("FrameInHTMLContext.buildLayoutTree: Finished processing the frames calling our callback");
                msg._data = node;
                callback(msg);
            }

            function isFrameExcluded(excludedRtIdsArr, currentComId, previousComId) {
                return excludedRtIdsArr.some(function (rtid2Exclude) {
                    return RtIdUtils.IsRTIDEqual(currentComId, rtid2Exclude) || RtIdUtils.IsRTIDEqual(previousComId, rtid2Exclude);
                });
            }

            var request = {
                _msgType: msg._msgType,
                _data: msg._data
            };

            _logger.debug("FrameInHTMLContext.buildLayoutTree: Procesing frame " + (i + 1) + " out of " + frameElemList.length);

            if (frameElem.__QTP__OBJ && frameElem.__QTP__OBJ.comID) {
                if (isFrameExcluded(excludRtidsArr, frameElem.__QTP__OBJ.comID, frameElem.__QTP__OBJ.previousComID)) {
                    _logger.trace("FrameInHTMLContext.buildLayoutTree: adding current frame to tree but excluding subtree, frame id: " + Util.jsonStringify(frameElem.__QTP__OBJ.comID, _logger) + " - previous frame id: " + Util.jsonStringify(frameElem.__QTP__OBJ.previousComID, _logger));
                    node.children[i] = { id: frameElem.__QTP__OBJ.comID, previousId: frameElem.__QTP__OBJ.previousComID, children: [], isExcluded: true };
                    checkIfGotAllResponses();
                    return;
                }

                _logger.debug("FrameInHTMLContext.buildLayoutTree: Sending message to: " + Util.jsonStringify(frameElem.__QTP__OBJ.comID));
                this.sendMessage(frameElem.contentWindow, request, function (response) {
                    _logger.trace("FrameInHTMLContext.buildLayoutTree: ");
                    node.children[i] = response._data;
                    checkIfGotAllResponses();
                });
            }
            else { // Uninjectable frame, need to handle it ourself
                _logger.debug("FrameInHTMLContext.buildLayoutTree: Uninjectable frame, need to handle it ourself: " + frameElem.src);

                if (frameElem.__QTP__OBJ)
                    _logger.warn("buildLayoutTree: Got known frame with no COM ID");

                try {
                    //empty frames has no content window, so simple ignore them
                    if (!frameElem.contentWindow) {
                        _logger.debug("FrameInHTMLContext.buildLayoutTree: [DEBUG] - Got empty frame, ignoring this frame");
                        node.children[i] = { id: null, children: [] };
                        checkIfGotAllResponses();
                        return;
                    }

                    if (!frameElem.contentWindow.frameElement) {
                        _logger.error("FrameInHTMLContext.buildLayoutTree: [ERROR] - XSS");
                        node.children[i] = { id: null, children: [] };
                        checkIfGotAllResponses();
                        return;
                    }
                }
                catch (e) {
                    _logger.error("FrameInHTMLContext.buildLayoutTree: [ERROR] - XSS page that we're not injected to: " + frameElem.src);
                    node.children[i] = { id: null, children: [] };
                    checkIfGotAllResponses();
                    return;
                }

                this.buildLayoutTree(request, function (response) {
                    _logger.trace("FrameInHTMLContext.buildLayoutTree: Got resoponse " + Util.jsonStringify(response, _logger));
                    node.children[i] = response._data;
                    checkIfGotAllResponses();
                }, frameElem.contentWindow);
            }
        }, this);
    },
    FRAME_FROM_POINT: function (msg, callback) {
        var point = msg._data.point;
        _logger.trace("FRAME_FRON_POINT: Started with point {" + point.x + ", " + point.y + "}");
        var e = document.elementFromPoint(point.x, point.y);
        if (e === null) {
            _logger.error("element from point returned null for point {" + point.x + ", " + point.y + "}");
            msg.status = "ERROR";
            callback(msg);
            return;
        }

        _logger.debug("FRAME_FROM_POINT: Got the following element from point:" + e);
        switch (e.tagName) {
            case "FRAME":
            case "IFRAME":
                //gets the comID of the element that we need to perform recursion to
                var childInfo = this._getChildFrameInfo(e, msg._data.point);
                _logger.debug("FRAME_FROM_POINT: Child info for frame: comID->" + Util.jsonStringify(childInfo.comID, _logger) + ", point->" + Util.jsonStringify(childInfo.point, _logger) + ", elem->" + childInfo.elem);
                //checks that we got a proper result
                if (childInfo.comID === null) {
                    _logger.debug("FRAME_FROM_POINT: comID is NULL - return");
                    callback(msg);
                    return;
                }

                msg._to = Util.shallowObjectClone(childInfo.comID);
                //correct the point value to be inside the frame
                msg._data.point = childInfo.point;
                this.sendMessage(e.contentWindow, msg, callback);
                return;
            default:
                msg._data.WEB_PN_ID = this._id;
                callback(msg);
                return;
        }
    },
    _getChildFrameInfo: function (f, point) {
        var res = { comID: null, point: point };

        Util.assert(f, "FRAME_FROM_POINT: Abnormal termination of recursion", _logger);
        if (!f) {
            return res;
        }

        var frameClientRect = f.getBoundingClientRect();
        res.point.y -= frameClientRect.top;
        res.point.x -= frameClientRect.left;

        if (f.__QTP__OBJ) {
            res.comID = f.__QTP__OBJ.comID;
            return res;
        }

        //this is inner frame which is not injectable then go into the inner frame
        var innerFrameElem = f.contentWindow.document.elementFromPoint(res.point.x, res.point.y);
        if (!innerFrameElem || (innerFrameElem.tagName !== "IFRAME" && innerFrameElem.tagName !== "FRAME")) {
            _logger.error("FRAME_FROM_POINT: The lowest frame is not injectable");
            return res;
        }
        return this._getChildFrameInfo(innerFrameElem, res.point);
    },

    _resetGlobalErrorHandler: function () {
        this._currentGlobalErrorHandler = null;
    },

    _setGlobalErrorHandler: function (requestMsg, src) {
        this._currentGlobalErrorHandler = function (origMsg, error) {
            origMsg.status = "ERROR";
            origMsg.details = error ? error.message : null;
            requestMsg.data = origMsg;
            requestMsg.msgType = "response";
            requestMsg.source = "FrameInHTMLContext";
            src.postMessage(requestMsg, "*");
        }.bind(this, requestMsg.data);
    }
};