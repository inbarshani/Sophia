function Page(associatedTab, browserRtId) {
	this._logger = new LoggerUtil("Ext.Page");
	this._logger.info("Page created");
	this._tab = associatedTab;
	this._frames = new FrameTree(this);
	this._browserId = browserRtId;
	this._extToolkits = [];

	Object.defineProperty(this, "id", {
	    value: this.getID(),
	    writable: false
	});

    //registers for events
	ext.dispatcher.addListener("Message", this);
	ext.dispatcher.addListener("clientRegistered", this);
	ext.dispatcher.addListener("clientUnRegistered", this);
}

Page.prototype = {
    //members
    _logger: null,
    _tab: null,
    _contentID: -1,
    _frameCreationCount: -1, //uses in object runtime id so we keep track which frame is it
    _frames: null,
    _scriptsToEmbed: [],
    _browserId: null,
    _objIdentificationProps: null,
    _extToolkits: null,

    //methods
    onMessage: function (msg, resultCallback) {
        this._logger.trace("onMessage: called");

        if (!this[msg._msgType]) {
            this._logger.trace("onMessage Unhandled msg\n" + JSON.stringify(msg));
            ErrorReporter.ThrowNotImplemented("Page." + msg._msgType);
        }

        this[msg._msgType](msg, resultCallback);
    },
    INTERNAL_BATCH_QUERYATTR: function (msg, resultCallback) {
        this._logger.trace("INTERNAL_BATCH_QUERYATTR: started with " + JSON.stringify(msg));

        if (msg._data.msgs.length === 0) {
            this._logger.error("INTERNAL_BATCH_QUERYATTR: no messages found");
            resultCallback(msg);
            return;
        }

        var logger = this._logger;
        var responses = new MultipleResponses(msg._data.msgs.length);
        msg._data.msgs.forEach(
	        function (currMsg, i, arr) {
	            logger.debug("INTERNAL_BATCH_QUERYATTR: process message #" + i + ": " + JSON.stringify(currMsg));
	            if (RtIdUtils.IsRTIDFrame(currMsg._to) || RtIdUtils.IsRTIDAO(currMsg._to)) {
	                logger.error("INTERNAL_BATCH_QUERYATTR: this is a content message! we don't expect it here");
	            }
	            this.onMessage(currMsg, responses.callback(function (isLast, resMsg) {
	                logger.debug("INTERNAL_BATCH_QUERYATTR: got result for message #" + i);
	                arr[i] = resMsg;

	                if (!isLast)
	                    return;

	                logger.debug("INTERNAL_BATCH_QUERYATTR: got result for all the messages. Invoke callback passing " + JSON.stringify(msg));
	                resultCallback(msg);
	            }));
	        },
	        this);
    },
    QUERY_ATTR: function (msg, resultCallBack) {
        if (!resultCallBack) {
            this._logger.error("QUERY_ATTR: Called without callback! Message: " + JSON.stringify(msg));
            return;
        }

        var addToRequestToContentMessage = function (contentMessage, valName, valNameMapping, origValue) {
            if (!contentQueryMsg) {
                contentQueryMsg = new Msg(MSG_TYPES.QUERY, msg._to);
                contentQueryMsg._data = {};
            }
            var reqKey = valName;
            for (var k in valNameMapping) {
                if (valNameMapping[k] === valName) {
                    reqKey = k;
                    break;
                }
            }
            contentQueryMsg._data[reqKey] = origValue;
            return contentQueryMsg;
        };

        var numOfAttrs = Object.keys(msg._data).length;
        if (numOfAttrs === 0) {
            this._logger.error("QUERY_ATTR: called on 0 attributes");
            resultCallBack(msg);
            return;
        }

        this._logger.trace("QUERY_ATTR: Started for " + JSON.stringify(msg));
        var contentQueryMsg = null;
        var valNameMapping = {};

        //prepare the management of multiple requests 
        var multiResponses = new MultipleResponses(numOfAttrs);
        for (var valName in msg._data) {
            this.GetAttr(valName, msg, valNameMapping, multiResponses.callback((function (done, val) {
                //check if we need to send query to content if so 
                this._logger.debug("QUERY_ATTR:" + valName + "=" + JSON.stringify(val));
                if (val && val.askContent) {
                    this._logger.trace("QUERY_ATTR: Adding " + valName + " to content message");
                    contentQueryMsg = addToRequestToContentMessage(contentQueryMsg, valName, valNameMapping, msg._data[valName]);
                }
                else {
                    msg._data[valName] = val;
                }
                if (!done)
                    return;

                if (!contentQueryMsg) {
                    resultCallBack(msg);
                    return;
                }

                this._logger.debug("QUERY_ATTR: Need to query the content sending mesage to content: " + JSON.stringify(contentQueryMsg));
                var logger = this._logger;
                this._DispatchToOurContent(contentQueryMsg, function (resMsg) {
                    logger.trace("QUERY_ATTR: Got the following response " + JSON.stringify(resMsg));
                    mergeMessages(msg, resMsg, valNameMapping);
                    resultCallBack(msg);
                });
            }).bind(this)));
        }
    },
    GetAttr: function (property, msg, valNameMapping, resultCallback) {
        this._logger.trace("GetAttr: Started for property=" + property);
        switch (property.toLowerCase()) {
            case "micclass":
                resultCallback("Page");
                break;
            case "frame from point":
                this.getFrameIDFromPoint(msg, resultCallback);
                break;
            case "parent":
                valNameMapping.WEB_PN_ID = 'parent';
                resultCallback(this._browserId);
                break;
            case "state":
                this.pageState(msg, resultCallback);
                break;
            case "screen_rect":
            case "rect":
                this.getScreenRect(resultCallback);
                break;
            case "view_x":
                resultCallback(0);
                break;
            case "view_y":
                resultCallback(0);
                break;
            case 'all_qtp_slv_cookies':
                this._getAllSlvCookies(resultCallback);
                break;
            case 'frame from hwnd':
                this._getAllSlvCookies(function (windows) {
                    var wnd = msg._data['frame from hwnd'][0][0];
                    this._logger.trace("GetAttr('frame from hwnd') got window list: " + windows + " looking for " + wnd);
                    if (windows.indexOf(wnd) !== -1)
                        resultCallback(this.getID());
                    else
                        resultCallback();
                }.bind(this));
                break;


            default:
                if (this._contentID < 0) {
                    this._logger.warn("GetAttr: property= " + property + " is calculated using content, but there's no registered content.");
                    resultCallback(null);
                } else {
                    resultCallback({ askContent: true });
                }
                
                break;
        }
    },
    pageState: function (msg, resultCallback) {
        this._logger.trace("pageState: Started");
        if (this._contentID < 0) {
            this._logger.debug("pageState: Page with no content Id. State is Loading.");
            resultCallback(ReadyState2Status.loading);
            return;
        }

        // Check that all frames got ACK message from their ancestors
        if (!ext.dispatcher.isIdle(msg._to.browser)) {
            this._logger.info("pageState: isIdle returned false - so returning Status: Loading (1)");
            resultCallback(ReadyState2Status.loading);
            return;
        }

        this._frames.traverse(
			function (node, path, traverseCallback) {
			    try {
			        //in case this is uninjectable document then currently we mark it as ready
			        if (node.id === null) {
			            traverseCallback(ReadyState2Status.complete);
			            return;
			        }
			        var request = new Msg("QUERY_ATTR", Util.shallowObjectClone(node.id), { state: null });
			        this._sendToContent(request, null, function (resMsg) {
			            traverseCallback(resMsg._data.state || -1);
			        });
			    }
			    catch (ex) {
			        this._logger.warn("pageState: got exception from content: " + ex + " \n(wait for rebuild layout)");
			        traverseCallback(ReadyState2Status.loading);
			    }
			}.bind(this),
			function (state) {
				return state !== ReadyState2Status.complete;     //stop on the first state that is not complete
			},
            this,
            resultCallback);
    },
    getFrameIDFromPoint: function (msg, resultCallback) {
        this._logger.trace("getFrameIDFromPoint: started " + JSON.stringify(msg));
        if (!this._frames.hasFrames()) {
            this._logger.debug("getFrameIDFromPoint: dont have frames return our id");
            resultCallback(this.getID());
            return;
        }
        //transform the point to client , the value is returned as x,y
        var screentPoint = msg._data["frame from point"];

        this.GetAttr("screen_rect", msg, null, function (pageRect) {
            this._logger.trace("getFrameIDFromPoint: GetAttr screen_rect received response now calculate point and dispatch to content");
            var pt = {
                x: screentPoint.x - pageRect.left,
                y: screentPoint.y - pageRect.top
            };

            var contentMsg = new Msg(MSG_TYPES.FRAME_FROM_POINT, this.getID(), { point: pt });

            this._DispatchToOurContent(contentMsg, function (resMsg) {
                resultCallback(resMsg._data.WEB_PN_ID);
            });

        }.bind(this));
    },
    QUERY_OBJ_POINT_TO_ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_OBJ_POINT_TO_ID:");
		return this._DispatchToOurContent(msg, resultCallback);
	},
	QUERY_DESC_TO_ID: function (msg, resultCallback) {
	    this._logger.trace("QUERY_DESC_TO_ID: Started");
	    var storedMsg = Util.shallowObjectClone(msg);
	    storedMsg.WEB_PN_ID = [];

	    this._DispatchToOurContent(msg, function (resMsg) {
	        if (resMsg.status !== "ObjectNotFound") {
	            resultCallback(msg);
	        }
	        else {
	            this._frames.traverse(queryEveryFrames.bind(this), Util.alwaysFalse, this, frameTraverseCallback.bind(this));
	        }
	    }.bind(this));

	    return;

	    // Helper functions
	    function queryEveryFrames(node, path, traverseCallback) {
	        //in case this is uninjectable frame return the msg without changing it.
	        if (node.id === null) {
	            this._logger.trace("frame is uninjectable return");
	            traverseCallback(msg);
	            return;
	        }
	        var frameMsg = new Msg(storedMsg._msgType, Util.shallowObjectClone(node.id), Util.shallowObjectClone(storedMsg._data));
	        this._sendToContent(frameMsg, null, mergeFrameMsg);

	        function mergeFrameMsg(frameMsg) {
	            frameMsg._data.WEB_PN_ID = Array.isArray(frameMsg._data.WEB_PN_ID) ? frameMsg._data.WEB_PN_ID : [frameMsg._data.WEB_PN_ID];
	            if (frameMsg._data.WEB_PN_ID.length === 1) {
	                storedMsg._data.WEB_PN_ID = storedMsg._data.WEB_PN_ID.concat(frameMsg._data.WEB_PN_ID);
	            }
	            traverseCallback(storedMsg);
	        }
	    }

	    function frameTraverseCallback() {
	        if (storedMsg._data.WEB_PN_ID.length === 0) {
	            storedMsg.status = "ObjectNotFound";
	            this._logger.info("QUERY_DESC_TO_ID found no object");
	        }
	        if (storedMsg._data.WEB_PN_ID.length === 1) {
	            storedMsg.status = "OK";
	        }
	        if (storedMsg._data.WEB_PN_ID.length > 1) {
	            storedMsg.status = "ObjectNotUnique";
	            this._logger.info("QUERY_DESC_TO_ID find multiple objects");
	        }
	        resultCallback(storedMsg);
	    }
	},

	QUERY_DIRECT_CHILD_DESC_TO_ID: function (msg, resultCallback) {
		this._logger.trace("QUERY_DIRECT_CHILD_DESC_TO_ID got:\n" + JSON.stringify(msg));
        var filterMsg = new Msg(MSG_TYPES.MATCH_DESC_TO_ID, this.getID(), msg._data);
        filterMsg._data.WEB_PN_ID = [];

        this.sendMessageToFrames(filterMsg, false, function (resMsg) {
            this._logger.trace("QUERY_DIRECT_CHILD_DESC_TO_ID Returned:\n" + JSON.stringify(resMsg));

            mergeMessages(msg, resMsg);
            resultCallback(msg);
        }.bind(this));
    },
    QUERY_REPOSITORY_DESC2ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_REPOSITORY_DESC2ID: Started");
        var desc = Util.shallowObjectClone(msg._data);
        //iterate on each frame and adds the runtime id of the frame with all its children.
        msg._data.WEB_PN_ID = [];
        this._frames.traverse(
				function (node, path, traverseCallback) {
				    //in case this is uninjectable frame return the msg without changing it.
				    if (node.id === null) {
				        traverseCallback(msg);
				        return;
				    }

				    //in case this is the page do not add its runtime id.
				    if (node.id.frame !== this._contentID)
				        msg._data.WEB_PN_ID.push(Util.shallowObjectClone(node.id));

				    var frameMsg = new Msg(msg._msgType, Util.shallowObjectClone(node.id), Util.shallowObjectClone(desc));
				    this._sendToContent(frameMsg, null, function (frameMsg) {
				        frameMsg._data.WEB_PN_ID = Array.isArray(frameMsg._data.WEB_PN_ID) ? frameMsg._data.WEB_PN_ID : [frameMsg._data.WEB_PN_ID];
				        msg._data.WEB_PN_ID = msg._data.WEB_PN_ID.concat(frameMsg._data.WEB_PN_ID);
				        traverseCallback(msg);
				    });
				},
				Util.alwaysFalse,
                this,
                resultCallback);
    },
    MATCH_DESC_TO_ID: function (msg, resultCallback) {
        this._logger.trace("MATCH_DESC_TO_ID: Started");

        Description.filterAOList([this], msg._data, (function (children) {
            resultCallback(Description.buildReturnMsg(msg._msgType, msg._to, children, this._logger));
        }).bind(this));
    },
    invokeMethods: {
        DOC_EXECUTE_SCRIPT: function (msg, resultCallback) {
            this._logger.trace("DOC_EXECUTE_SCRIPT: started");
            this._DispatchToOurContent(msg, resultCallback);
        },
        SAVE_FRAME_SOURCE_NOT_RECURSIVE: function (msg, resultCallback) {
            this._logger.trace("SAVE_FRAME_SOURCE_NOT_RECURSIVE: started");
            this._DispatchToOurContent(msg, resultCallback);
        },
        GET_ID_FROM_SOURCE_INDEX: function (msg, resultCallback) {
            this._logger.warn("Page.GET_ID_FROM_SOURCE_INDEX is not implemented");
            resultCallback(msg);
        }
    },
    SRVC_INVOKE_METHOD: function (msg, resultCallback) {
        var name = msg._data.AN_METHOD_NAME;
        var func = this.invokeMethods[name];
        if (!func)
            ErrorReporter.ThrowNotImplemented("invokeMethod: " + name);

        func.call(this, msg, resultCallback);
    },

    SRVC_HIGHLIGHT_OBJECT: function (msg, resultCallback) {
        this._logger.trace("SRVC_HIGHLIGHT_OBJECT: Called");
        this._DispatchToOurContent(msg, resultCallback);
    },

    SRVC_GET_TEXT: function (msg, resultCallback) {
        this._logger.trace("SRVC_GET_TEXT:");
        return this._DispatchToOurContent(msg, resultCallback);
    },

    CMD_BROWSER_BACK: function (msg, resultCallBack) {
        this._logger.trace("CMD_BROWSER_BACK: Called");
        this._DispatchToOurContent(msg, resultCallBack);
    },
    CMD_BROWSER_FORWARD: function (msg, resultCallBack) {
        this._logger.trace("CMD_BROWSER_FORWARD: Called");
        this._DispatchToOurContent(msg, resultCallBack);
    },
    CMD_BROWSER_REFRESH: function (msg, resultCallBack) {
        this._logger.trace("CMD_BROWSER_REFRESH: Called");
        this._DispatchToOurContent(msg, resultCallBack);
    },
    CMD_BROWSER_NAVIGATE: function (msg, resultCallback) {
        return this._DispatchToOurContent(msg, resultCallback);
    },
    CMD_BROWSER_EMBED_SCRIPT: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_EMBED_SCRIPT: Started");
        //adding the script to scripts that are going to be run when frame will register to us
        var jsScript = msg._data.text;
        this._scriptsToEmbed.push(jsScript);
        this.sendMessageToFrames(msg, false, resultCallback);
    },
    CMD_SPY_START: function (msg, resultCallback) {
        this._logger.trace("CMD_SPY_START: Started");

        this.sendMessageToFrames(msg, false, resultCallback);
    },
    CMD_SPY_END: function (msg, resultCallback) {
        this._logger.trace("CMD_SPY_END: Started");

        this.sendMessageToFrames(msg, false, resultCallback);
    },
    SRVC_LOAD_KIT: function (msg, resultCallback) {
        this._logger.trace("SRVC_LOAD_KIT: started on " + msg._data.progid);

        if (msg._data.progid === "Mercury.WebExtKit") {
            if (this._extToolkits.length > 0) {
                this._logger.trace("SRVC_LOAD_KIT: send toolkits to frame for WebExtKit");
                msg._data.toolkits = this._extToolkits.slice(0);
                return this.sendMessageToFrames(msg, false, resultCallback);
            }
            else {
                this._logger.trace("Page.SRVC_LOAD_KIT: no toolkit for web extensibility");
            }
        }
        resultCallback(msg);
    },

    SRVC_LOAD_EXT_TOOLKIT: function (msg, resultCallback) {
        this._logger.trace("SRVC_LOAD_EXT_TOOLKIT: Started");
        var bExist = this._extToolkits.some(function (item) {
            return msg._data.name === item.name;
        });

        if (!bExist) {
            var XMLJsonObject = Util.convertXmlStrToJson(msg._data.TOOLKIT);
            if (XMLJsonObject !== null) {
                this._logger.trace("SRVC_LOAD_EXT_TOOLKIT: add toolkit " + msg._data.name + " to the list");
                this._extToolkits.push({
                    "name": msg._data.name,
                    "description": XMLJsonObject,
                    "jsFunctions": msg._data.JSFUNCTION || [],
                    "jsScripts": msg._data.text || []
                });
            }
        }
        resultCallback(msg);
    },
    onclientRegistered: function (client, registrationData, registrationResData) {
        this._logger.info("onclientRegistered: on page for tab " + this._tab.id + " and client is: " + JSON.stringify(client) + " with the following info:" + JSON.stringify(registrationData));

        if (this._tab.id !== client.tabID)    //this client is not part of our tab, ignore it.
            return;

        if (registrationData.isPage) {
            this._logger.info("onclientRegistered: Got registration from page content");
            this._contentID = client.id;
        }

        registrationResData.frameCount = ++this._frameCreationCount;
        registrationResData.scriptsToEmbed = this._scriptsToEmbed;
        registrationResData.extToolkits = this._extToolkits;

        registrationResData._parentPageId = Util.shallowObjectClone(this.id);
        registrationResData._frameId = Util.shallowObjectClone(this.id);
        registrationResData._frameId.frame = client.id;
    },
    getID: function () {
        var resRTID = Util.shallowObjectClone(this._browserId);
        resRTID.page = this.getPageIdentifier();
        return resRTID;
    },
    getPageIdentifier: function () {
        //we return always 0 since there is only one page per tab if not so we need to return a different 
        //identifier.
        return 0;
    },
    _DispatchToOurContent: function (msg, resultCallback) {
        this._logger.trace("_DispatchToOurContent: Started with " + JSON.stringify(msg));
        if (this._contentID < 0) {
            this._logger.warn("_DispatchToOurContent: Page has no content, do nothing");
            resultCallback(msg);
            return;
        }
        this._sendToContent(msg, this._contentID, resultCallback);
    },
    _sendToContent: function (msg, target, resultCallBack) {
        this._logger.trace("_sendToContent: Asking the content for:" + JSON.stringify(msg) + ", and Target:" + JSON.stringify(target));
        var origFrame = msg._to.frame;
        if (typeof (target) === "number") // if we have an explicit target overwrite the one in msg
            msg._to.frame = target;

        this._logger.debug("_sendToContent: Going to send to the following frame id: " + msg._to.frame);
        var reqestMsg = msg;
        ext.dispatcher.sendMessage(msg, null, "chrome", (function (resMsg) {
            this._logger.debug("_sendToContent: Got the following response:" + JSON.stringify(resMsg));
            //complete the returned runtime id with extension AOs such as page id.
            resMsg = this._updateRTIDIfNeeded(resMsg);
            reqestMsg = mergeMessages(reqestMsg, resMsg, null, this._logger);
            reqestMsg._to.frame = origFrame;
            resultCallBack(reqestMsg);
        }).bind(this));
    },
    _updateRTIDIfNeeded: function (msg) {
        this._logger.trace("_updateRTIDIfNeeded: Started");

        var data = msg._data;
        if (data && data.WEB_PN_ID) {
            this._logger.debug("_updateRTIDIfNeeded: The message contains RTIDs that needs to be updated");
            var pageID = this.getPageIdentifier();
            if (Array.isArray(data.WEB_PN_ID)) {
                data.WEB_PN_ID.forEach(function (id) {
                    this.mergeWebRuntimeID(id, pageID);
                }, this);
            }
            else
                this.mergeWebRuntimeID(data.WEB_PN_ID, pageID);

            this._logger.debug("_updateRTIDIfNeeded: After updating the RTIDs  " + JSON.stringify(data.WEB_PN_ID));
        }
        return msg;
    },
    areAllPropertiesFilled: function (msg) {
        var data = msg._data;
        for (var p in data)
            if (data[p] === null)
                return false;

        return true;
    },
    sendMessageToFrames: function (message, stopOnReply, resultCallback) {
        this._logger.trace("sendMessageToFrames: Started");
        this._frames.traverse(
			function (node, path, traverseCallback) {
			    if (node.id === null) {
			        traverseCallback(message);
			        return;
			    }

			    this._sendToContent(message, node.id.frame, traverseCallback);
			},
			stopOnReply ? this.areAllPropertiesFilled : Util.alwaysFalse,
			this,
            resultCallback
		);
    },
    onclientUnRegistered: function (client) {
        this._logger.trace("onclientUnRegistered: Page for tab=" + this._tab.id + " ,client=" + JSON.stringify(client));

        if (client.tabID !== this._tab.id)    //checks if this was meant for us
            return;

        if (client.id === this._contentID) {
            this._logger.info("removeFrame: Page has disconnected");
            this._contentID = -1;
        }
    },

    mergeWebRuntimeID: function (runtimeID/*, pageID*/) {
        if (runtimeID.frame === this._contentID)
            runtimeID.frame = -1;
    },

    SRVC_SET_GLOBAL_VARIABLES_INTERNAL: function (msg, resultCallback) {
        if (msg._data.objectidentificationproperties)
            this._objIdentificationProps = JSON.parse(msg._data.objectidentificationproperties);

        this.sendMessageToFrames(msg, false, resultCallback);
    },

    SRVC_SET_EVENT_CONFIGURATION_INTERNAL: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_EVENT_CONFIGURATION_INTERNAL: Started");

        this.sendMessageToFrames(msg, false, resultCallback);
    },

    SRVC_SAVE_HTML_SOURCE: function (msg, resultCallback) {
        var baseFileName = msg._data.WEB_N_SSV_FRAME_BASE_NAME;
        msg._data = {};

        msg._data.WEB_N_SSV_FRAME_SRC_MMF_HANDLES = [[]];
        msg._data.WEB_N_SSV_FRAME_SRC_MMF_SIZES = [[]];
        msg._data.WEB_N_SSV_FRAME_BASE_URLS = [[]];
        msg._data.WEB_N_SSV_FRAME_INTERNAL_NAMES = [[]];
        msg._data.WEB_N_SSV_FRAME_URLS = [[]];
        msg._data.WEB_N_SSV_FRAME_NAMES = [[]];
        msg._data.WEB_N_SSV_FRAME_INDEX = [[]];

        var frameCount = 0;
        this._frames.traverse(
			function (node, path, traverseCallback) {
			    if (this._contentID !== node.id.frame) {
			        msg._data.WEB_N_SSV_FRAME_INDEX[0].push("0" + "." + path.join("."));
			        msg._data.WEB_N_SSV_FRAME_INTERNAL_NAMES[0].push(baseFileName + "f" + path.join("f"));
			    } else {
			        msg._data.WEB_N_SSV_FRAME_INDEX[0].push("0");
			        msg._data.WEB_N_SSV_FRAME_INTERNAL_NAMES[0].push(baseFileName);
			    }

			    var data = {
			        "url without form data": null,
			        "User-input in Post data": null,
			        "Non user-input in Post data": null,
			        "User input in Get data": null,
			        "Non user-input in Get data": null,
			        "All data in Get method": null,
			        "html_info": null,
			        "name": null,
			        "url": null
			    };
			    var tmpMsg = new Msg(MSG_TYPES.QUERY, Util.shallowObjectClone(node.id), data);
			    ++frameCount;
			    this._sendToContent(tmpMsg, null, function (frameResSourceMsg) {
			        data = frameResSourceMsg._data;

			        msg._data.WEB_N_SSV_FRAME_SRC_MMF_HANDLES[0].push(data.html_info.MMF_HANDLE);
			        msg._data.WEB_N_SSV_FRAME_SRC_MMF_SIZES[0].push(data.html_info.MMF_HANDLE.html.length);
			        msg._data.WEB_N_SSV_FRAME_BASE_URLS[0].push(data.html_info.FRAME_BASE_URL);
			        delete data.html_info;

			        msg._data.WEB_N_SSV_FRAME_URLS[0].push(data.url);
			        msg._data.WEB_N_SSV_FRAME_NAMES[0].push(data.name);
			        delete data.url;
			        delete data.name;
			        for (var key in data) {
			            msg._data[key] = msg._data[key] || [[]];
			            msg._data[key][0].push(data[key]);
			        }
			        traverseCallback();
			    });
			},
			Util.alwaysFalse,
            this,
            function (/*result*/) {
                // WriteProcessId
                msg._data.AN_PROCESS_ID = SpecialObject.CreateProcessId();

                // WriteInfTotalAndMethodData
                msg._data.WEB_N_SSV_TOTAL = frameCount;
                msg._data.WEB_N_SSV_STATIC_SAVE = false;
                resultCallback(msg);
            }
		);
    },

    SRVC_MAKE_OBJ_VISIBLE: function (msg, callbackResult) {
        this._logger.trace("SRVC_MAKE_OBJ_VISIBLE: started");
        // the make visible logic isn't done here, we just need the return value

        var browserMsg = new Msg("SRVC_MAKE_OBJ_VISIBLE", Util.shallowObjectClone(this._browserId));

        ext.dispatcher.sendMessage(browserMsg, null, null, (function (/*resultMsg*/) {
            this._logger.trace("SRVC_MAKE_OBJ_VISIBLE: received response");
            msg._data.hwnd = 0;
            this.GetAttr("screen_rect", msg, null, function (rect) {
                msg._data.rect = rect;
                callbackResult(msg);
            });
            return;
        }).bind(this));
    },

    SRVC_GET_SCREEN_RECT: function (msg, resultCallback) {
        this._logger.trace("SRVC_GET_SCREEN_RECT: started");
        this._DispatchToOurContent(msg, resultCallback);
    },

    getScreenRect: function (resultCallback) {
        this._logger.trace("getScreenRect: started");
        var logger = this._logger;

        if (this._tab.getPageRect) {
            this._logger.trace("getScreenRect: asking tab for Page rect");
            // Right now this API serves only Chrome Frame since there's a bug in GCF
            // in which the ScreenX & ScreenY attributes don't work
            this._tab.getPageRect(resultCallback, function (errorMsg) {
                logger.error("getScreenRect: " + errorMsg);
                resultCallback({ left: 0, top: 0, right: 0, bottom: 0 });
            });
            return;
        }

        var heightWidthMsg = new Msg("QUERY_ATTR", this.getID(), { innerHeight: null, outerHeight: null, innerWidth: null, outerWidth: null, window_rect: null });
        this._DispatchToOurContent(heightWidthMsg, function (resMsg) {

            var rect = Util.calculateTabRect(resMsg._data, this._logger);

            resultCallback(rect);
        });
    },

    getTabId: function () {
        return this._tab.id;
    },

    getParentId: function () {
        return Util.shallowObjectClone(this._browserId);
    },

    // TODO THIS IS TEMPORARY
    INTERNAL_QUERY_PAGE_CONTENT_ID: function (msg) {
        var contentId = this.getID();
        contentId.frame = this._contentID;

        msg._data.contentId = contentId;
        return msg;
    },

    EVENT_BROWSER_DESTROY: function (msg) {
        this._logger.info("destroy: Called");
        ext.dispatcher.removeListener("clientRegistered", this);
        ext.dispatcher.removeListener("clientUnRegistered", this);
        ext.dispatcher.removeListener("Message", this);

        return msg;
    },

    _getAllFramesWithMatchingProperties: function (excludedFrameRtid, properties, callback) {
        this._logger.trace("_getAllFramesWithProperties: Called");

        var frameRtid = excludedFrameRtid;

        var queryFrameByDescMsg = new Msg(MSG_TYPES.MATCH_DESC_TO_ID, this.getID(), Util.shallowObjectClone(properties));
        queryFrameByDescMsg._data.WEB_PN_ID = [];

        // Helper function to traverse on frames.
        var nodeFunc = function (node, path, traverseCallback) {
            if (RtIdUtils.IsRTIDEqual(frameRtid, node.id) || RtIdUtils.IsRTIDEqual(frameRtid, node.previousId)) {
                this._logger.trace("_getAllFramesWithProperties: traverse node func: Found frame with id " + JSON.stringify(frameRtid));
                queryFrameByDescMsg._data.WEB_PN_ID.push(frameRtid);
                traverseCallback(queryFrameByDescMsg);
                return;
            }

            this._sendToContent(queryFrameByDescMsg, node.id.frame, function (/*result*/) {
                traverseCallback(queryFrameByDescMsg);
            }.bind(this));
        }.bind(this);

        // Actual function code for traversing on the frames tree excluding the subtree of frameRtid
        this._frames.traverseExcluding(nodeFunc, Util.alwaysFalse, this, frameRtid, function (resMsg) {
            callback(resMsg._data.WEB_PN_ID);
        }.bind(this));
    },

    _calculateFrameIndexSelector: function (description, callback) {
        this._logger.trace("_calculateFrameIndexSelector: Called");
        Util.assert(description.properties.micclass === "Frame", "_calculateFrameIndexSelector: Calculating partial selector for a non-Frame agent-object is not supported", this._logger);

        var properties = description.properties;

        // Get The selector and the frame id
        var selectorPartialVal = AttrPartialValueUtil.GetAttachedData(description.selector.value);
        var frameRtid = selectorPartialVal.frameRtid;
        var forceAddingSelector = selectorPartialVal.forceSelector;

        this._logger.trace("_calculateFrameIndexSelector: Finding selector for frame id: " + JSON.stringify(frameRtid));
        this._getAllFramesWithMatchingProperties(frameRtid, properties, function (rtidArr) {
            if (forceAddingSelector || (rtidArr.length > 1)) {
                // We need to add a selector
                var indexVal = Util.arrayFindIndex(rtidArr, function (rtid) {
                    return RtIdUtils.IsRTIDEqual(frameRtid, rtid);
                }, this);

                if (indexVal >= 0) {
                    this._logger.trace("_calculateFrameIndexSelector: Adding selector for frame " + JSON.stringify(frameRtid) + " - index selector val: " + indexVal);
                    description.selector.value = indexVal;
                }
                else {
                    this._logger.error("_calculateFrameIndexSelector: failed to calculate index selector for frame: " + JSON.stringify(frameRtid));
                    delete description.selector;
                }
            }
            else {
                this._logger.trace("_calculateFrameIndexSelector: There is no need to add selector, force adding is: " + forceAddingSelector + " - Candidate Frame # is " + rtidArr.length);
                delete description.selector;
            }

            callback(description);
        }.bind(this));
    },

    _calculateFrameSelector: function (description, callback) {
        this._logger.trace("_calculateFrameSelector: Called");

        Util.assert(description.selector && AttrPartialValueUtil.IsPartialValue(description.selector.value), "_calculateFrameSelector: frame does not have required selector information", this._logger);

        switch (description.selector.name) {
            case "index":
                this._calculateFrameIndexSelector(description, callback);
                break;
            default:
                this._logger.error("_calculateFrameSelector: selector '" + description.selector.name + "' not handled for Frame.");
                delete description.selector;
                callback(description);
        }
    },

    _calculateFrameAssistiveProperties: function (properties, assistivePropsArr, allPropertiesVals, frameRtid, callback) {
        this._logger.trace("_calculateFrameAssistiveProperties: Called");

        function assistivePropertiesAlgorithm(assistivePropertyIndex, candidateRtIdsArr) {
            switch (candidateRtIdsArr.length) {
                case 0:
                    Util.assert(false, "_calculateFrameAssistiveProperties: assistivePropertiesAlgorithm received a result with no frames !", this._logger);
                    callback(properties); // we received 0 results. something went wrong - let's stop.
                    break;
                case 1:
                    this._logger.trace("_calculateFrameAssistiveProperties: assistivePropertiesAlgorithm: got to 1 result. finishing.");
                    callback(properties); // we're done here
                    break;
                default:
                    var nextAssistivePropName = assistivePropsArr[assistivePropertyIndex];
                    properties[nextAssistivePropName] = allPropertiesVals[nextAssistivePropName];
                    if (assistivePropertyIndex < assistivePropsArr.length)
                        this._getAllFramesWithMatchingProperties(frameRtid, properties, assistivePropertiesAlgorithm.bind(this, assistivePropertyIndex + 1));
                    else {
                        this._logger.trace("_calculateFrameAssistiveProperties: assistivePropertiesAlgorithm: finished adding assistive properties, no uniqueness is found. Candidate #" + candidateRtIdsArr.length);
                        callback(properties);
                    }
            }
        }

        this._getAllFramesWithMatchingProperties(frameRtid, properties, assistivePropertiesAlgorithm.bind(this, 0));
    },

    _calculateFrameDescription: function (msg, callback) {
        this._logger.trace("_calculateFrameDescription: Called");

        // Get Frame Description
        var recordedDescriptionArr = msg._data["recorded description"][0];
        var frameIndex = Util.arrayFindIndex(recordedDescriptionArr, function (descSpecialObj) {
            return descSpecialObj.description.properties.micclass === "Frame";
        }, this);

        if (frameIndex === -1) {
            this._logger.trace("_calculateFrameDescription: No Frame in description");
            callback(msg);
            return;
        }

        var frameDescriptionSpecialObj = recordedDescriptionArr[frameIndex];
        var allPropertiesValues = frameDescriptionSpecialObj.description.properties; // Frame description contains both mandatory and assistive descriptions

        var frameRtid = msg._data.WEB_PN_ID[0][frameIndex];
        Util.assert(RtIdUtils.IsRTIDFrame(frameRtid), "_calculateFrameDescription: runtime id in index " + frameIndex + " doesn't contain a frame rtid. rtid= " + JSON.stringify(frameRtid), this._logger);


        // Get Frame identification properties configuration
        var identificationProps = this._objIdentificationProps.frame;
        var mandatoryPropsArr = identificationProps.mandatory || [];
        var assistivePropsArr = identificationProps.assistive || [];

        // Get mandatory properties (with their values)
        var mandatoryProperties = {};
        mandatoryPropsArr.forEach(function (propName) {
            mandatoryProperties[propName] = allPropertiesValues[propName];
        });

        // Now we're ready to calculate assistive properties
        this._calculateFrameAssistiveProperties(mandatoryProperties, assistivePropsArr, allPropertiesValues, frameRtid, function (resultProperties) {
            frameDescriptionSpecialObj.description.properties = resultProperties; // update properties (filtered out not needed assistive properties)

            // Only after assistive properties are calculated, we calculate the Selector
            this._calculateFrameSelector(frameDescriptionSpecialObj.description, function (resultDescription) {
                frameDescriptionSpecialObj.description = resultDescription; // update description to include or not include selector
                callback(msg);
            }.bind(this));
        }.bind(this));
    },

    EVENT_RECORD: function (msg) {
        this._logger.trace("EVENT_RECORD: Called");
        this._handleRecordEvent(msg);
    },

    EVENT_INTERNAL_RECORD_QUEUE: function (msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_QUEUE: Called");
        this._handleRecordEvent(msg);
    },

    EVENT_INTERNAL_RECORD_DISPATCH_QUEUE: function(msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_DISPATCH_QUEUE: Called");
        this._handleRecordEvent(msg);
    },

    EVENT_INTERNAL_RECORD_QUEUE_CLEAR: function(msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_QUEUE_CLEAR: Called");
        msg._to = this.getParentId();
        ext.dispatcher.sendEvent(msg);
    },

    EVENT_INTERNAL_SEND_BROWSER_INFO: function(msg) {
        this._logger.trace("EVENT_INTERNAL_SEND_BROWSER_INFO: Called");
        if (this._contentID < 0) {
            this._logger.trace("EVENT_INTERNAL_SEND_BROWSER_INFO: Page has no content.");
            return;
        }

        msg._to.frame = this._contentID;
        ext.dispatcher.sendEvent(msg);
    },

    //find all the "object" element and get its qtp_slv_cookies; return the all the cookies with the ";" as seperation;
    //if no "object" element find in the document just return "";
    _getAllSlvCookies: function (callback) {
        // Collect all OBJECT tags and concatenate all the qtp_slv_cookies
        var description = new Msg('QUERY_DESC_TO_ID', this.getID(), { 'html tag': 'OBJECT' });
        description._attr_names = 'html tag';
        var self = this;
        this.QUERY_DESC_TO_ID(description, function (msg) {
            if(msg.status!=="OK" || !msg._data.WEB_PN_ID|| msg._data.WEB_PN_ID.length===0){
                return callback("");
            }
            var remaining = msg._data.WEB_PN_ID.length;
            var cookies = [];
            msg._data.WEB_PN_ID.forEach(function (id) {
                var cookieMsg = new Msg('QUERY_ATTR', id, { qtp_slv_cookie: null });
                self.QUERY_ATTR(cookieMsg, function (resultMsg) {
                    var cookie = resultMsg._data.qtp_slv_cookie;
                    if (cookie)
                        cookies.push(cookie);
                    if (--remaining === 0)
                        callback(cookies.join(';'));
                });
            });
        });
    },

    _handleRecordEvent: function (msg) {
        this._logger.trace("_handleRecordEvent: Called");

        this._calculateFrameDescription(msg, function (resMsg) {
            this._logger.trace("_handleRecordEvent: Callback: Finished calculating partial attributes. Sending event to parent.");
            resMsg._to = this.getParentId();
            ext.dispatcher.sendEvent(resMsg);
        }.bind(this));
    }
};
