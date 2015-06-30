var FrameBehavior = {
	_attrs: {
		"client rect": function () {
			return {
                top: Math.floor(this._elem.clientTop),
                left: Math.floor(this._elem.clientLeft),
                width: Math.floor(this._elem.clientWidth),
                height: Math.floor(this._elem.clientHeight)
			};
		}
	},
	_methods: {
	    "calculate relative rect": function (msg, resultCallback) {
	        msg._data.continuePropogation = true;
	        var rect = this.GetAttrSync("rect");
	        var clientRect = this.GetAttrSync("client rect");

			//calculate the width & height
			var width, height;
			if (msg._data.rect.bottom === 0 && msg._data.rect.right === 0) {
				width = clientRect.width;
				height = clientRect.height;
			}
			else {
				//caLculates the widht and height according to frame rect of inner frame
				width = msg._data.rect.right - msg._data.rect.left;
				height = msg._data.rect.bottom - msg._data.rect.top;
			}
			msg._data.rect.top += rect.top + clientRect.top;
			msg._data.rect.left += rect.left + clientRect.left;
			msg._data.rect.bottom = (msg._data.rect.top + height) < rect.bottom ? (msg._data.rect.top + height) : rect.bottom;
			msg._data.rect.right = (msg._data.rect.left + width) < rect.right ? (msg._data.rect.left + width) : rect.right;

			resultCallback(msg);
		}
	}
};

var PageBehavior = {
	_attrs: {
	},
	_methods: {
		"calculate relative rect": function (msg, resultCallback) {
		    var logger = this._logger;
		    logger.trace("PageBehavior: on command 'calculate relative rect' with " + JSON.stringify(msg));

		    if (!msg._data.screen_coord) {
		        msg._data.rect.bottom = Math.max(msg._data.rect.bottom, document.documentElement.getBoundingClientRect().bottom);
		        msg._data.rect.right = Math.max(msg._data.rect.right, document.documentElement.getBoundingClientRect().right);
		        resultCallback(msg);
		        return;
		    }
            //calcualte the screen coordinates of the given rectangle.
		    var pageMsg = new Msg("QUERY_ATTR", msg._data.pageId, { 'screen_rect': null });
		    content.dispatcher.sendMessage(pageMsg, null, "chrome", function(resMsg) {
		        var rect = resMsg._data.screen_rect;
                logger.trace("PageBehavior: command 'calculate relative rect' got screen_rect from the page: " + JSON.stringify(rect));
		        msg._data.rect.left += rect.left;
		        msg._data.rect.top += rect.top;
		        if (msg._data.rect.right === 0) {
		            msg._data.rect.right = rect.right;
		        } else {
		            msg._data.rect.right += rect.left;
		        }
		        if (msg._data.rect.bottom === 0) {
		            msg._data.rect.bottom = rect.bottom;
		        } else {
		            msg._data.rect.bottom += rect.top;
		        }

                logger.trace("PageBehavior: command 'calculate relative rect' calculated result rect: " + JSON.stringify(msg._data.rect));
		        resultCallback(msg);
		    });
		},
		"MAKE_VISIBLE": function(msg, resultCallback) {
			resultCallback(msg);
		}
	}
};

function Frame() {
	this._logger = new LoggerUtil("Content.Frame");
	this._logger.info("Frame was created");
	this._isPage = window === window.parent;
	this._recorder = new Recorder(this);
	window.addEventListener('message', this.responseFromHTMLHandler.bind(this), false);
	window.addEventListener("_QTP_RUN_SCRIPT_RESULT", this._runOnDocResult.bind(this));
	window.addEventListener('DialogHandled', this._recordDialogHandled.bind(this), false);
}

Frame.prototype = {
    _isPage: false,
    id: null,
    _callbacks: {},
    _nextCallbackID: -1,
    _parentPageId: null,
    _runOnDocCallbackMap: [],
    _elementInspector: null,
    _objIdentificationProps: null,
    
    //Methods
    init: function () {
        this._logger.trace("Init: Starting frame initialization.");

        var registrationData = {
            isPage: this._isPage,
            numOfChilds: window.frames.length
        };

        this.id = { browser: -1, page: -1, frame: -1, object: null };
        content.dispatcher.addListener("RegistrationResult", this);


        if(this._isPage) {
            // Add title and url to the registrationData
            this.GetAttr("title", null, function(title) {
                registrationData.title = title;
                this.GetAttr("url", null, function(url) {
                    registrationData.url = url;
                    content.dispatcher.connect(registrationData);
                });
            }.bind(this));
        }
        else {
            content.dispatcher.connect(registrationData);
        }
    },
    buildLayoutTree: function (msg, callback) {
        if (!this._isPage) {
            this._logger.error("buildLayoutTree: Method should start from page!!");
            callback(msg);
            return;
        }

        this.sendRequestToHTMLContext(msg, callback);
    },
    onMessage: function (msg, resultCallback) {
        this._logger.trace("onMessage: Started with the following msg:" + JSON.stringify(msg));
        if (!this[msg._msgType]) {
            this._logger.trace("onMessage Unhandled msg: " + msg._msgType);
            ErrorReporter.ThrowNotImplemented("Frame." + msg._msgType);
        }

        this[msg._msgType](msg, resultCallback);
    },
    DISPATCH_TO_FRAME_ELEM: function (msg, resCallback) {
        this._logger.trace("DISPATCH_TO_FRAME_ELEM: Started");
        //creates the frame element AO
        var ao;
        if (!msg._data.targetIsPage) {
            this._logger.debug("DISPATCH_TO_FRAME_ELEM: Message meant for Frame element");
            //Find the decendant with the wanted ComID
            var associatedElement = ContentUtils.findFrameElemByID(msg._data.frameElemComID, document, this._logger);
            Util.assert(associatedElement, "DISPATCH_TO_FRAME_ELEM: Couldn't find associated frame element", this._logger);
            ao = content.kitsManager.createAO(associatedElement, this.getID());
        }
        else {
            this._logger.debug("DISPATCH_TO_FRAME_ELEM: Message meant for page");
            ao = content.kitsManager.createPageAO(this.getID());
        }
        
        //gets the wrapped frame message
        ao.onMessage(msg._data.frameElemMsg, function(resMsg) {
            msg._data.frameElemMsg = resMsg;
            
            if (msg._data.frameElemMsg._data.continuePropogation) {
                delete msg._data.frameElemMsg._data.continuePropogation;
                if (this._isPage) {
                    this._logger.debug("DISPATCH_TO_FRAME_ELEM: Propogating to page AO");
                    var ao1 = content.kitsManager.createPageAO(this.getID());
                    ao1.onMessage(msg._data.frameElemMsg, function (resMsg2) {
                        msg._data.frameElemMsg = resMsg2;
                        resCallback(msg);
                    });
                } else {
                    this._logger.debug("DISPATCH_TO_FRAME_ELEM: Continue propogation of the message to our parent frame");
                    var parentRequestMsg = new Msg(msg._msgType, content.dispatcher.getContainingContextID(), {});
                    parentRequestMsg._data.frameElemMsg = msg._data.frameElemMsg;
                    parentRequestMsg._data.frameElemComID = this.getID();

                    content.dispatcher.sendMessage(parentRequestMsg, null, null, function (resMsg) {
                        msg._data.frameElemMsg = resMsg._data.frameElemMsg;
                        resCallback(msg);
                    });
                }
            } else {
                resCallback(msg);
            }
        }.bind(this));
    },
    buildNestedMessage: function (msg) {
        this._logger.debug("buildNestedMessage: Creating message for querying our frame element");
        var ret = new Msg(MSG_TYPES.DISPATCH_TO_FRAME_ELEM, Util.shallowObjectClone(msg._to), {});
        ret._data.frameElemMsg = new Msg(msg._msgType, msg._to, msg._data || {});
        ret._to = content.dispatcher.getContainingContextID();
        if (ret._to.frame < 0) {       //indicates that frame should be self
            ret._to = this.getID();
            ret._data.targetIsPage = true;
        }
        ret._data.frameElemComID = this.getID();
        return ret;
    },
    getAttrFromParent: function (name, msg,resultCallback) {
        if (this._isPage) {//in case this is page there is no frame element.
            resultCallback(null);
            return;
        }
        var reqData = {};
        if ((name === "attribute") || (name === "style"))
            reqData = msg._data;
        else
            reqData[name] = null;
        var reqMsg = new Msg("QUERY_ATTR", msg._to, reqData);
        var frameElemMsg = this.buildNestedMessage(reqMsg);
        this._logger.debug("getAttrFromParent: Need to send query for our frame element for: " + name);
        content.dispatcher.sendMessage(frameElemMsg, null, null, function (resMsg) {
            resultCallback(resMsg._data.frameElemMsg._data[name]);
        });
    },
    getElementAttribute: function(prop,origMsg,resCallback){
        this._logger.trace("getElementAttribute: Started for property: " + prop);
        if(this._isPage){
            //this is page just create Page AO and ask him the property
            var ao = content.kitsManager.createPageAO(this.getID());
            var queyMsg = new Msg("QUERY_ATTR", ao.getID(), {});
            queyMsg._data[prop] = origMsg._data[prop];
            ao.onMessage(queyMsg, resCallback);
        }
        else{
            //Ask the parent since our AO resides in the parent.
            this.getAttrFromParent(prop,origMsg,resCallback);
        }
    },
    QUERY_ATTR: function (msg,resultCallback) {
        this._logger.trace("QUERY_ATTR: Started");
        var frameElemMsg;
        var attrs = Object.keys(msg._data);

        if (attrs.length < 1) {
            this._logger.warn("QUERY_ATTR: Called with no attributes");
            resultCallback(msg);
            return;
        }

        var multiResponses = new MultipleResponses(attrs.length);
        attrs.forEach(function (valName) {
            this.GetAttr(valName, msg, multiResponses.callback(function (isDone,val) {
                val = Util.cleanSpecialChars(val);
                this._logger.trace("QUERY_ATTR:" + valName + "=" + (typeof(val) === "object" ? JSON.stringify(val) : val));
                msg._data[valName] = val;
                
                if (!isDone)
                    return;

                this._logger.debug("QUERY_ATTR: Finished querying all the requested attributes");
                resultCallback(msg);
            }.bind(this)));
        }.bind(this));
    },
    INTERNAL_BATCH_QUERYATTR: function (msg,resCallback) {
        this._logger.trace("INTERNAL_BATCH_QUERYATTR: Started");

        if (msg._data.msgs.length < 1) {
            this._logger.error("INTERNAL_BATCH_QUERYATTR: Got Batch Query fro no object ?!?!");
            resCallback(msg);
            return;
        }

        var logger = this._logger;

        //iterates over the msgs that needs to be executed.
        var waitForAllMessages = new MultipleResponses(msg._data.msgs.length);
        msg._data.msgs.forEach(function (objMsg, index) {
            content.dispatcher.sendMessage(objMsg, null, null, waitForAllMessages.callback(function (isDone,resMsg) {
                msg._data.msgs[index] = resMsg;

                if (!isDone)
                    return;

                logger.debug("INTERNAL_BATCH_QUERYATTR: Finished with all object, let wrap it up");
                resCallback(msg);
            }));
        }, this);
    },
    CMD_BROWSER_BACK: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_BACK");
        msg.delay = true;
        resultCallback(msg);
        
        // We set the real back to be executed after 12 ms (the magic number which works) ,to address back/forward replay
        // error on new Firefox agent.
        //    Notice the value can neither be too small (the message may not be delivered yet before back is executed)
        //    nor too big (UFT's next message may comes before back is executed).
        // Information about timeout:
        // the minimal timeout as specified in HTML5 is 4 ms, any value less than that should be rounded up to 4
        // and the timeout is only clumped to 4 ms if we are in nested setTimeouts
        // https://groups.google.com/a/chromium.org/forum/#!msg/blink-dev/Hn3GxRLXmR0/XP9xcY_gBPQJ
        window.setTimeout(function () {
            window.history.back();
        }, 12);
    },
    CMD_BROWSER_FORWARD: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_FORWARD");
        msg.delay = true;
        resultCallback(msg);
        
        // Refer to CMD_BROWSER_BACK above for why we have this timeout.
        window.setTimeout(function () {
            window.history.forward();
        }, 12);
    },
    CMD_BROWSER_REFRESH: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_REFRESH");
        msg.delay = true;
        resultCallback(msg);
        window.location.reload();
    },
    CMD_BROWSER_NAVIGATE: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_NAVIGATE: started");
        var url = msg._data.url;
        msg.delay = true;
        resultCallback(msg);
        window.location.href = url;
    },
    FRAME_FROM_POINT: function (msg, resultCallback) {
        this._logger.trace("FRAME_FROM_POINT: started");
        this.sendRequestToHTMLContext(msg, resultCallback);
    },
    _initInspectionMode: function (mode) {
        this._logger.trace("_handleInspectionMode: started with mode: " + mode);

        if (!this._elementInspector)
            this._elementInspector = new ElementInspector(this.getID());

        switch (mode)
        {
            case "spy":
                this._elementInspector.startSpy();
                break;
            case "record":
                this._startRecord();
                break;
        }
    },
    SRVC_SET_GLOBAL_VARIABLES_INTERNAL: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_GLOBAL_VARIABLES_INTERNAL: Started");

        if (msg._data.objectidentificationproperties)
            this._objIdentificationProps = JSON.parse(msg._data.objectidentificationproperties);

        this._handleWebActivityStateSetting(msg._data.WebActivityState);

        resultCallback(msg);
    },
    SRVC_SET_EVENT_CONFIGURATION_INTERNAL: function (msg, resultCallback) {
        this._logger.trace("SRVC_SET_EVENT_CONFIGURATION: Started");
        // Save config into Recorder
        this._recorder.updateEventConfig( msg._data.config );
        resultCallback(msg);
    },
    _handleWebActivityStateSetting: function (webActivityState) {
        this._logger.trace("_handleWebActivityState: Started");
        if (webActivityState === 1) { // Record
            this._startRecord();
        }
        else {
            this._stopRecord();
        }
    },
    _startRecord: function() {
        this._recorder.startRecord();
    },
    _stopRecord: function() {
        this._recorder.stopRecord();
    },
    CMD_SPY_START: function (msg, resultCallback) {
        this._logger.trace("CMD_SPY_START: Started");

        Util.assert(this._elementInspector, "CMD_SPY_START: element inspector is null", this._logger);

        // Initialize ElementInspector
        this._elementInspector.startSpy();
        resultCallback(msg);
    },
    CMD_SPY_END: function (msg, resultCallback) {
        this._logger.trace("CMD_SPY_END: Started");

        if (this._elementInspector)
            this._elementInspector.stopSpy();
        else
            this._logger.warn("CMD_SPY_END: no element inspector found");

        resultCallback(msg);
    },
    SRVC_LOAD_KIT: function (msg, resultCallback) {
        var progid = msg._data.progid;
        this._logger.trace("SRVC_LOAD_KIT: started on " + progid);
        if (progid === "Mercury.WebExtKit") {
            if (!Util.isNullOrUndefined(msg._data.toolkits)) {
                content.webExtKit = new WebExtKit(msg._data.toolkits);
                content.kitsManager.LoadKit(content.webExtKit);
            }
        }
        else {
            this.warnUnimplemented("Browser.SRVC_LOAD_KIT: " + progid);
        }
        resultCallback(msg);
    },
    QUERY_OBJ_POINT_TO_ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_OBJ_POINT_TO_ID: Started");
        //convert point to frame rectangle
        this._calcRelativeRect(msg, true, function (frameAbsRect) {
            msg._data.pos.x -= frameAbsRect.left;
            msg._data.pos.y -= frameAbsRect.top;
            this._logger.debug("QUERY_OBJ_POINT_TO_ID: After converting to frame coordinates pos={" + msg._data.pos.x + " ," + msg._data.pos.y + "}");
            var aos = this._getAOFromClientPoint(msg._data.pos);
            var ids = aos.map(function (ao) { return ao.getID(); });
            var micclass = aos.map(function (ao) { return Util.getMicClass(ao) });

            var containers = this._getContainers();
            var containerIds = containers.map(function (container) { return container.id; });
            var containerMicclass = containers.map(function (container) { return container.micclass; });

            msg._data.WEB_PN_ID = containerIds.concat(ids);
            msg._data.micclass = containerMicclass.concat(micclass);
            resultCallback(msg);
        }.bind(this));
        
    },
    QUERY_OBJ_CLIENT_POINT_TO_ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_OBJ_CLIENT_POINT_TO_ID: Started");
        var objects = this._getAOFromClientPoint(msg._data.pos);
        msg._data.WEB_PN_ID = objects.map(function (ao) {
            return ao.getID();
        });
        resultCallback(msg);
    },
    _getAOFromClientPoint: function (point) {
        this._logger.debug("_getAOFromClientPoint: called with point=" + JSON.stringify(point));
        //create AO from point by elementFromPoint method of document
        //return its id in WEB_PN_ID
        var e = document.elementFromPoint(point.x, point.y);
        if (!e) {
            // Workaround for <select size=2><option></option></select> Elements in Chrome32 in which elementFromPoint returns null
            e = this._elementFromPointForSelectElement(point);
        }
        if (!e)
            this._logger.error("Element from point failed for point: " + JSON.stringify(point));

        if (e && e.tagName && e.tagName.toUpperCase() === "IMG") {
            //since when img element contains area tags in FF the function elementFromPoint will just return img element not the webarea element ,
            //therefore add the function to identify the webarea element 
            var WebAreaElem = this._elementFromPointForWebArea(e, point);
            if (!Util.isNullOrUndefined(WebAreaElem)) {
                e = WebAreaElem;
            }
        }
        var ao = content.kitsManager.createAO(e, this.getID());
        var aoLists = [];
        while (!Util.isNullOrUndefined(ao)) {
            if (ao.isObjSpyable())
                aoLists.push(ao);
            ao = ao.getParent();
        }
        aoLists.reverse();
        return aoLists;
    },
    _elementFromPointForWebArea: function (imgElem, point) {
        var mapName = imgElem.useMap;
        if (Util.isNullOrUndefined(mapName)) 
            return null;
        if (mapName.indexOf('#') == 0) {
            mapName = mapName.substring(1);
        }
        var elemMap = document.getElementById(mapName);
        if (Util.isNullOrUndefined(elemMap)) {
            var nodelist = document.getElementsByName(mapName);
            if (nodelist && nodelist.length > 0) {
                elemMap = nodelist[0];
            }
        }
        if (Util.isNullOrUndefined(elemMap))
            return null;

        var rectImg = ContentUtils.getElementClientRect(imgElem, this._logger);
        if (!rectImg)
            return null;
        var p = { x: point.x, y: point.y };
        p.y -= rectImg.top;
        p.x -= rectImg.left;
        var i = 0, elemCount = elemMap.children.length;
        for (i = 0; i < elemCount; ++i) {
            var elemArea = elemMap.children[i];
            if (elemArea.tagName.toLowerCase() !== "area")
                continue;
            if (Util.isNullOrUndefined(elemArea.coords))
                continue;
            var coords = elemArea.coords.split(',');
            var shape = Util.isNullOrUndefined(elemArea.shape) ? "" : elemArea.shape.toLowerCase();
            switch (shape) {
                case "rect":
                case "rectangle":
                    {
                        if (coords.length != 4)
                            continue;
                        var rect = {
                            left: Math.floor(coords[0]),
                            top: Math.floor(coords[1]),
                            right: Math.floor(coords[2]),
                            bottom: Math.floor(coords[3])
                        };
                        if (Util.isPointInRect(p, rect, this._logger))
                            return elemArea;
                    }
                    break;
                case "circ":
                case "circle":
                    {
                        if (coords.length != 3)
                            continue;
                        var circle = {
                            x: Math.floor(coords[0]),
                            y: Math.floor(coords[1]),
                            radius: Math.floor(coords[2]),
                        }
                        if (Util.isPointInCircle(p, circle, this._logger))
                            return elemArea;
                    }
                    break;
                case "poly":
                case "polygon":
                    {
                        if (Util.isPointInPoly(p, coords, this._logger))
                            return elemArea;
                    }
                    break;
                default:
                    break;
            }
        }
        return null;
    },
    _getContainers: function () {
        var containers=[ { id : this.getID() , micclass : Util.getMicClass(this) } ];
        if (!this._isPage) {
            var page={
                id:this._parentPageId,
                micclass:"Page"
            };
            containers.push(page);
        }
        var browserId = { browser: this.getID().browser, page: -1, frame: -1, object: null };
        var browser={
            id:browserId,
            micclass:"Browser"
        };
        containers.push(browser);
        containers.reverse();
        return containers;
    },

    _elementFromPointForSelectElement: function (point) {
        // Workaround for issue in which elementFromPoint() returns null for points inside '<select size=2><option></option></select>' Elements in Chrome32
        // Chromium Issue 335010: http://code.google.com/p/chromium/issues/detail?id=335010
        // Chromium defect ID: http://code.google.com/p/chromium/issues/detail?id=335010
        this._logger.warn("_elementFromPointForSelectElement: Started");
        var selectItems = document.getElementsByTagName("select");
        var resultArr = [];
        Array.prototype.forEach.call(selectItems, function (selectElement) {
            var rect = ContentUtils.getElementClientRect(selectElement, this._logger);
            if (!rect)
                return;

            if (!Util.isPointInRect(point, rect, this._logger))
                return;

            resultArr.push(selectElement);
        }, this);

        switch (resultArr.length) {
            case 0:
                this._logger.error("_elementFromPointForSelectElement: Found 0 Select elements that contain the point: " + JSON.stringify(point));
                return null;
            case 1:
                this._logger.trace("_elementFromPointForSelectElement: Found a good candidate select element - returning it");
                return resultArr[0];
            default:
                this._logger.error("_elementFromPointForSelectElement: Found more than 1 candidate element - returning null. Number of elements found: " + resultArr.length);
                return null;
        }
    },
    _attrs: {
        title: function () {
            return window.document.title;
        },
        url: function () {
            //trims the / at the end of the url value.
            return window.document.location.href.replace(/\/$/, "");
        },
        state: function () {
            return ReadyState2Status[document.readyState];
        },
        micclass: function () {
            return this._isPage ? ["Page"] : ["Frame"];
        },
        name: function () {
            return window.name;
        },
        text: function () {
            return document.body.innerText|| document.body.textContent;
        },
        "load time": function () {
            return Math.round(BrowserServices.getLoadTime(this._logger));
        },
        "logical name": function () {
            if (this._isPage) {
                return this._attrs.title.call(this);
            } else {
                return this._attrs.name.call(this);
            }
        },
        "innerheight": function() {
            return window.innerHeight;
        },
        "height": function() {
            return this._attrs.innerheight.call(this);
        },
        "innerwidth": function() {
            return window.innerWidth;
        },
        "width": function() {
            return this._attrs.innerwidth.call(this);
        },
        "outerheight": function () {
            return window.outerHeight;
        },
        "outerwidth": function() {
            return window.outerWidth;
        },
        "url without form data": function () {
            var url = this._attrs.url.call(this);
            var pos = url.indexOf("?");

            if (pos !== -1) {
                return url.substring(0, pos);
            } else {
                return url;
            }
        },
        "html_info": function() {
            var ret = this._getFrameSource();
            return {
                MMF_HANDLE: SpecialObject.CreateMMFile(ret.html),
                FRAME_BASE_URL: ret.baseUrl
            };
        },
        "all text items": function() {
            var arr = Util.getTextNodesValue(document.body);
            return arr.join(";");
        },
        "window_rect": function() {
            return {
                top: window.screenY,
                left: window.screenX,
                right: (window.screenX + window.outerWidth),
                bottom: (window.screenY + window.outerHeight)
            };
        },
        "text selection obj": function() {
            var selection = window.getSelection();
            if (selection.type && (selection.type.toLowerCase() !== "range")) // for WebKit based browsers there's a property 'type' on the selection object
                return "";

            if (selection.rangeCount === 0) // for Mozilla, this indicates that there's nothing selected (in WebKit based browsers this value is always 1 for some reason even when there's no selection)
                return "";

            var range = selection.getRangeAt(0);
            var selectedTxt = range.toString();
            if (selectedTxt.length === 0)
                return "";

            var virtualTxt = content.kitsManager.createVirtualTextAO(range, this.getID());
            return virtualTxt.getID();
        },
        "user-input in post data": function() { return ""; },
        "non user-input in post data": function() { return ""; },
        "user input in get data": function() { return ""; },
        "non user-input in get data": function() { return ""; },
        "all data in get method": function () { return ""; },
        "document size": function () { return null; },
        "ssvtype": function () { return null; },
        "frame recursive index": function () { return null; }
    },
    
    _attrsAsync: {
        "html tag": function (msg, resCallback) {
            this.getAttrFromParent("html tag", msg, resCallback);
        },
        "html id": function (msg, resCallback) {
            this.getAttrFromParent("html id", msg, resCallback);
        },
        "visible": function (msg, resCallback) {
            Util.assert(!this._isPage, "_attrsAsync['visible']: unsupported for Page objects", this._logger);
            this.getAttrFromParent("visible", msg, resCallback);
        },
        "style": function (msg, resCallback) {
                this.getElementAttribute("style", msg, resCallback);
        },
        "attribute": function (msg, resCallback) {
                this.getElementAttribute("attribute", msg, resCallback);
        },
        "rect": function (msg, resCallback) {
            this._calcRelativeRect(msg, true, resCallback);
        },
        "x": function (msg, resCallback) {
            this._attrsAsync.abs_x.call(this, msg, resCallback);
        },
        "abs_x": function (msg, resCallback) {
            this._calcRelativeRect(msg, true, function (res) {
                resCallback(res.left);
            });
        },
        "y": function (msg, resCallback) {
            this._attrsAsync.abs_y.call(this, msg, resCallback);
        },
        "abs_y": function (msg, resCallback) {
            this._calcRelativeRect(msg, true, function (res) {
                resCallback(res.top);
            });
        },
        "view_x": function (msg, resCallback) {
            this._calcRelativeRect(msg, false, function (res) {
                resCallback(res.left);
            });
        },
        "view_y": function (msg, resCallback) {
            this._calcRelativeRect(msg, false, function (res) {
                resCallback(res.top);
            });
        },
        "elementinterface": function (msg, resCallback) {
            DotObjUtil.WrapDocument(window.document, this.getID(), resCallback);
        },
        "text obj from point": function (msg, resCallback) {
            //convert point to frame rectangle
            this._calcRelativeRect(msg, true, function (frameAbsRect) {
                var point = msg._data["text obj from point"];
                var elem = document.elementFromPoint(point.x - frameAbsRect.left, point.y - frameAbsRect.top);

                var range = new Range();
                range.setStartBefore(elem);
                range.setEndAfter(elem);

                var virtualTxt = content.kitsManager.createVirtualTextAO(range, this.getID());
                resCallback(virtualTxt.getID());
            }.bind(this));
        },
        "all attributes": function (msg, resCallback) {
            Util.assert(!this._isPage, "_attrsAsync['all attributes']: unsupported for Page objects", this._logger);
            this.getAttrFromParent("all attributes", msg, resCallback);
        },
        "all styles": function (msg, resCallback) {
            Util.assert(!this._isPage, "_attrsAsync['all styles']: unsupported for Page objects", this._logger);
            this.getAttrFromParent("all styles", msg, resCallback);
        },
    },

    QueryAttributesSync: function (attrsObj) {
        this._logger.trace("QueryAttributesSync: called for attributes: " + JSON.stringify(attrsObj));
        var attrsObjRes = {};
        var attrList = Object.keys(attrsObj);
        attrList.forEach(function (attr) {
            attrsObjRes[attr] = this.GetAttrSync(attr);
        }, this);

        return attrsObjRes;
    },

    _getTabRect: function () {
        this._logger.trace("_getTabRect: called");
        Util.assert(this._isPage, "_getTabRect: unsupported for frame objects", this._logger);
        var pageDimensions = this.QueryAttributesSync({ innerHeight: null, outerHeight: null, innerWidth: null, outerWidth: null, window_rect: null });
        return Util.calculateTabRect(pageDimensions, this._logger);
    },

    _getPartialPixelsVal: function (property, wrappedVal) {
        this._logger.trace("_getPartialPixelsVal: called");

        var rectProp;
        var axis;
        switch (property) {
            case "abs_x":
                axis = "x";
                rectProp = "left";
                break;
            case "abs_y":
                axis = "y";
                rectProp = "top";
                break;
            default:
                this._logger.error("_getPartialPixelsVal: unsupported axis value: " + axis);
        }


        var val = 0;
        var frameRuntimeId = null;

        // For Frames we need to add the current value and continue up the chain
        if (AttrPartialValueUtil.IsPartialValue(wrappedVal)) {
            // For frames we want to consider their values by calculating the attached data
            val = AttrPartialValueUtil.GetValue(wrappedVal, this._logger);
            frameRuntimeId = AttrPartialValueUtil.GetAttachedData(wrappedVal, this._logger);
        }

        var axisPixels = 0;

        // If this is the first frame we are calculating the partial attr for, frame runtime id is empty
        // otherwise we'll add the pixels of the frame element that initially added this data
        if (RtIdUtils.IsRuntimeId(frameRuntimeId)) {
            var frameElem = ContentUtils.findFrameElemByID(frameRuntimeId, document, this._logger);
            var frameAO = content.kitsManager.createAO(frameElem, this.getID());
            axisPixels = frameAO.GetAttrSync(axis);
        }

        var newVal = val + axisPixels;
        if (this._isPage)
            return newVal + this._getTabRect()[rectProp];
        else
            return AttrPartialValueUtil.WrapValue(property, newVal, this.getID());
    },

    _getPartialAttrValFromParent: function (property, wrappedVal) {
        this._logger.trace("_getPartialAttrValFromParent: called");

        if (wrappedVal === null) {
            // if there's no wrapped val then we'll need to return a partial value so that it'll be calculated in the parent
            this._logger.trace("_getPartialAttrValFromParent: returning partial attr for property: " + property);
            return AttrPartialValueUtil.WrapValue(property, null, this.getID());
        }

        // if wrappedVal is not null, it means that it was sent by a child frame element, so let's get it's value
        Util.assert(AttrPartialValueUtil.IsPartialValue(wrappedVal), "_getPartialAttrValFromParent: received a value which is not a partial value", this._logger);

        var frameRtid = AttrPartialValueUtil.GetAttachedData(wrappedVal);
        Util.assert(RtIdUtils.IsRTIDFrame(frameRtid), "_getPartialAttrValFromParent: received a runtime id whihc is not for frame", this._logger);

        var frameElem = ContentUtils.findFrameElemByID(frameRtid, document, this._logger);
        Util.assert(frameElem, "_getPartialAttrValFromParent: couldn't find a frame with rtid: " + JSON.stringify(frameRtid), this._logger);

        var frameAO = content.kitsManager.createAO(frameElem, this.getID());
        return frameAO.GetAttrSync(property);
    },

    _getPartialElementAttributeVal: function(property, wrappedVal) {
        this._logger.trace("_getPartialElementAttributeVal: called");

        var agentObject = null;
        if (AttrPartialValueUtil.IsPartialValue(wrappedVal)) {
            // A child Frame is asking its parent (me) for help in calculating the attribute's val
            var frameRtid = AttrPartialValueUtil.GetAttachedData(wrappedVal);
            var frameElem = ContentUtils.findFrameElemByID(frameRtid, document, this._logger);
            agentObject = content.kitsManager.createAO(frameElem, this.getID());
        }
        else if (this._isPage) {
            // Returning the value of the Page's attribute
            agentObject = content.kitsManager.createPageAO(this.getID());
        }
        else {
            // this is not a page and no wrapped val => this is a Frame which needs to ask it's parent for help in calculating
            return AttrPartialValueUtil.WrapValue(property, null, this.getID());
        }

        var propInfo = Description.getAttributeInfo(property);
        var queryMsg = new Msg("QUERY_ATTR", agentObject.getID(), {});
        queryMsg._data[propInfo.name] = propInfo.data;
        return agentObject.GetAttrSync(propInfo.name, queryMsg);
    },

    _getAttrPartialValue: function (property, wrappedVal) {

        var propertyName = Description.getAttributeInfo(property).name;

        switch (propertyName) {
            case "abs_x":
            case "abs_y":
                return this._getPartialPixelsVal(property, wrappedVal);
            case "html tag":
            case "html id":
                return this._getPartialAttrValFromParent(property, wrappedVal);
            case "attribute":
            case "style":
                return this._getPartialElementAttributeVal(property, wrappedVal);
            default:
                this._logger.error("_getAttrPartialValue: unhandled attribute: " + property);
                break;
        }

        return currentVal;
    },

    GetAttrSync: function (property) {
        this._logger.trace("GetAttrSync: query property " + property);
        var propInfo = Description.getAttributeInfo(property);

        var func = this._attrs[propInfo.name];

        if (func)
            return func.call(this);

        if (this._attrsAsync[propInfo.name])
            return this._getAttrPartialValue(property, null);

        this._logger.error("GetAttrSync: attribute " + propInfo.name + " is unsupported");
        return null;
    },

    GetAttr: function (property, msg, resCallback) {
        this._logger.trace("GetAttr: query property " + property);

        var propInfo = Description.getAttributeInfo(property);
        if (propInfo.data) {
            msg = msg || new Msg(MSG_TYPES.QUERY, this.getID(), {});
            msg._data[propInfo.name] = propInfo.data;
        }

        // Sync properties
        var syncAttrFunc = this._attrs[propInfo.name];
        if (syncAttrFunc) {
            resCallback(syncAttrFunc.call(this));
            return;
        }

        var asyncAttrFunc = this._attrsAsync[propInfo.name];
        if (asyncAttrFunc) {
            asyncAttrFunc.call(this, msg, resCallback);
            return;
        }

        this._logger.error("GetAttr: Unsupported attribute:" + propInfo.name);
        resCallback(null);
    },

    _getParentPageID: function () {
        return Util.shallowObjectClone(this._parentPageId);
    },
    _calcRelativeRect: function (msg, screen_coord, resultCallback) {
        this._logger.trace("_calcRelativeRect started");

        var reqData = {
            rect: {
                top: 0,
                left: 0,
                bottom: 0,
                right: 0
            },
            pageId: this._getParentPageID(),
            screen_coord: screen_coord,
            AN_METHOD_NAME: "calculate relative rect"
        };
        var reqMsg = new Msg(MSG_TYPES.SRVC_INVOKE_METHOD, msg._to, reqData);
        var msgToFrame = this.buildNestedMessage(reqMsg);
        content.dispatcher.sendMessage(msgToFrame, null, null, function(resMsg) {
            var rect = resMsg._data.frameElemMsg._data.rect;
            resultCallback(rect);
        });
    },
    _runOnDoc: function (script, resultCallback) {
        this._logger.trace("_runOnDoc: started");
        var requestMsg = new Msg("EXECUTE_IN_PAGE", this.getID(), { script: script });
        
        // Store callback
        var callbackId = ++Frame.prototype._nextCallbackID;
        this._runOnDocCallbackMap[callbackId] = resultCallback;
        requestMsg.callbackId = callbackId;

        //fire the event.
        var ev = BrowserServices.createCrossOriginCustomEvent("_QTP_Run_Script", { "detail": requestMsg });
        window.dispatchEvent(ev);
    },
    _runOnDocResult: function (resEvent) {
        this._logger.trace("_runOnDocResult: started");

        var resMsg = resEvent.detail;

        try {
            this._logger.trace("_runOnDocResult received response: " + JSON.stringify(resMsg));
        }
        catch (ex){
            this._logger.trace("_runOnDocResult received response but unable to print to log - circular object");
        }

        if (resMsg._msgType !== "EXECUTE_IN_PAGE") { /* Not our message discarrd it*/return true; }
        
        //removes the properties from the document element that were used in the process
        var callback = this._runOnDocCallbackMap[resMsg.callbackId];
        delete this._runOnDocCallbackMap[resMsg.callbackId];

        if (callback) {
            this._logger.trace("_runOnDocResult: Callback found - returning result");
            callback(resMsg._data);
        }
        else {
            this._logger.error("_runOnDocResult: No Callback found.");
        }
    },
    _runFuncOnDoc: function (f) {
        var res = this._runOnDoc('(' + f.toString() + ')();');
        if (Util.isUndefined(res))
            ErrorReporter.ThrowGeneralError();
        if (res.ex)
            throw res.ex;
        return res.res;
    },

    invokeMethods: {
        GET_ID_FROM_SOURCE_INDEX: function (msg, resultCallback) {
            this._logger.warn("GET_ID_FROM_SOURCE_INDEX is not implemented");
            resultCallback(msg);
        },
        DOC_EXECUTE_SCRIPT: function (msg, resultCallback) {
            this._logger.trace("DOC_EXECUTE_SCRIPT: Started");

            var logger = this._logger;
            var rtid = this.getID();

            this._runOnDoc(msg._data.text, function (resultData) {
                logger.debug("DOC_EXECUTE_SCRIPT: Got result for script " + resultData.script);
                if (resultData.ex) {
                    logger.debug("DOC_EXECUTE_SCRIPT: Got Excepion in script:" + resultData.ex);
                    msg._data['JScript Exception'] = resultData.ex.toString();
                }

                //check if the return value is object we need the .Object mechanisim
                if (resultData.result && (Util.isObject(resultData.result) || Array.isArray(resultData.result))) {
                    logger.debug("DOC_EXECUTE_SCRIPT: The result of this script is an object, wrapping it with DotObject proxy object");
                    var proxy = new DotObjJSProxy(resultData.result, rtid);
                    msg._data.value = SpecialObject.CreateDotObj(proxy.getID());
                    msg._data.activex_interface = true;
                }
                else {
                    msg._data.value = resultData.result;
                }

                resultCallback(msg);
            });
        },
        SAVE_FRAME_SOURCE_NOT_RECURSIVE: function (msg, resultCallback) {
            this._logger.trace("SAVE_FRAME_SOURCE_NOT_RECURSIVE: started");
            var path = msg._data.WEB_N_SSV_PATH;
            var base = msg._data.WEB_N_SSV_FRAME_BASE_NAME;
            var fullPath = path + "\\" + base + ".html";
            var frameSource = this._getFrameSource().html;

            msg._data.result = SpecialObject.CreateFrameSource(fullPath, frameSource);
            resultCallback(msg);
        }
    },
    SRVC_INVOKE_METHOD: function (msg, resultCallback) {
        this._logger.trace("SRVC_INVOKE_METHOD: started");
        var name = msg._data.AN_METHOD_NAME;
        var func = this.invokeMethods[name];
        if (!func)
            ErrorReporter.ThrowNotImplemented("Frame.invokeMethod: " + name);

        func.call(this, msg, resultCallback);
    },
    getID: function () {
        return { browser: this.id.browser, page: this.id.page, frame: this.id.frame, object: null };
    },
    CMD_BROWSER_EMBED_SCRIPT: function (msg, resultCallback) {
        this._logger.trace("CMD_BROWSER_EMBED_SCRIPT: Started");
        content.domSubscriber.evalInDocument(msg._data.text);
        resultCallback(msg);
    },
    onRegistrationResult: function (registrationData) {
        this._logger.trace("onRegistrationResult: Started with " + JSON.stringify(registrationData));
        var scriptArray = registrationData.scriptsToEmbed;
        this._parentPageId = Util.shallowObjectClone(registrationData._parentPageId);
        this.id = Util.shallowObjectClone(registrationData._frameId);

        Util.assert(scriptArray, "onRegistrationResult: Frame registration process failed.", this._logger);
        if (scriptArray.length) {
            var script = scriptArray.join("\n");
            this._logger.debug("registerFrameResult: Going to embed the following script:" + script);
            content.domSubscriber.evalInDocument(script);
        }

        if (BrowserServices.isDialogHandlingSupported) {
            this._logger.debug("registerFrameResult: Going to override JavaScript dialog functions");
            content.domSubscriber.evalInDocument('(' + ContentUtils.overrideJSDialogs.toString() + ')();');
        }

        if (!Util.isNullOrUndefined(registrationData.extToolkits) && registrationData.extToolkits.length>0) {
            if (Util.isNullOrUndefined(content.webExtKit)) {
                content.webExtKit = new WebExtKit(registrationData.extToolkits);
                content.kitsManager.LoadKit(content.webExtKit);
            }
            else {
                content.webExtKit.loadToolkits(registrationData.extToolkits);
            }
        }
        //now we have all that we need in order to inject our component that handles requests that can only be computed in the
        //HTML context
        this._logger.info("onRegistrationResult: Injecting our HTML component");
        FrameInHTMLContext._id = this.id;
        content.domSubscriber.startNamespace();
        content.domSubscriber.addUtilityObject("FrameInHTMLContext", FrameInHTMLContext, {
            "_QTP_Run_Script": "RunOnDocEventHandler",
            "UFT_DOT_OBJ_MARK_FOR_RUNSCRIPT_RESULT": "onMarkObjectResult"
        });
        content.domSubscriber.endNamespace();

        this._initInspectionMode(registrationData.inspectionMode);

        if (registrationData.globalVariables && registrationData.globalVariables.objectidentificationproperties)
            this._objIdentificationProps = JSON.parse(registrationData.globalVariables.objectidentificationproperties);

        if(this._recorder && registrationData.eventConfig)
            this._recorder.updateEventConfig(registrationData.eventConfig);

    },
    MATCH_DESC_TO_ID: function (msg, resultCallback) {
        this._logger.trace("MATCH_DESC_TO_ID started on" + (this._isPage ? " page " : " frame with " + JSON.stringify(msg)));
        var logger = this._logger;
        
        var internalCallback = function(match) {
            logger.debug("MATCH_DESC_TO_ID - in result callback: " + (match.length ? ("matched " + match.length)  : "didn't match"));
            if (match.length > 0) {
                match = match.map(function(m) { return m.getID(); });
                msg._data.WEB_PN_ID = msg._data.WEB_PN_ID.concat(match);
            }

            resultCallback(msg);
        };
        
        // if called from DoesPageHaveFrames in QTP, no need to return all children, only frames
        if (msg._data.micclass && msg._data.micclass === "Frame") {            
            if(this._isPage) {
                internalCallback([]);
            }
            else {
                Description.filterAOList([this], msg._data, internalCallback);    
            }
        } else {
            var additonalParams = { extraAOs: this._isPage ? null : [this] };
            Description.findObjId(msg._data, Description.GetCandidateAOsForContent.bind(Description, this.getID(), null), additonalParams, internalCallback);
        }
    },
    QUERY_REPOSITORY_DESC2ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_REPOSITORY_DESC2ID: Started");
        var additonalParams = { filter: function (ao) { return ao && (ao.isLearnable() || content.settings.shouldlearnwebelement); } ,learn: true};
        this._internalQueryDescToId(msg, additonalParams, resultCallback);
    },
    QUERY_DESC_TO_ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_DESC_TO_ID: Started");
        this._internalQueryDescToId(msg, null, resultCallback);
    },
    _internalQueryDescToId: function (msg, optionalParamsObj, resultCallback) {
        this._logger.trace("_internalQueryDescToId: Started");

        if (!resultCallback) {
            this._logger.error("_internalQueryDescToId: Called without callback! " + JSON.stringify(msg));
        }

        Description.GetIDsByDescription(msg._data, Description.GetCandidateAOsForContent.bind(Description, this.getID(), null), optionalParamsObj, (function (filteredAOs) {
            resultCallback(Description.buildReturnMsg(msg._msgType, msg._to, filteredAOs, this._logger));
        }).bind(this));
    },
    _getFrameSource: function () {
        var _html = "";
        var children = document.childNodes;
        var len = children.length;
        var _baseUrl = "";
        var bases = document.getElementsByTagName("BASE");
        if (bases[0]) {
            _baseUrl = bases[0].href;
        }
        for (var i = 0; i < len; i++) {
            if (children[i].nodeType === Node.ELEMENT_NODE) {
                _html += children[i].outerHTML;
                // <BASE href=http://war> will be replaced with <href=http://war>.
                _html = _html.replace(/<BASE /g, "<");
                // remove agent
                _html = _html.replace(/<embed type="application\/x-hp-chrome-agent"[^>]+>/, "");
            } else if (children[i].nodeType === Node.COMMENT_NODE) {
                _html += "<!-- -->";
            } else if (children[i].nodeType === Node.DOCUMENT_TYPE_NODE) {
                var doctype = document.doctype;
                _html +=
					'<!DOCTYPE ' +
					doctype.name +
					(doctype.publicId ? ' PUBLIC "' + doctype.publicId + '"' : '') +
					(doctype.systemId ? ' "' + doctype.systemId + '"' : '') +
					'>';
            }
        }
        return { html: _html, baseUrl: _baseUrl };
    },

    SRVC_MAKE_OBJ_VISIBLE: function (msg, resultCallback) {
        var msgToFrame = this.buildNestedMessage(msg);
        content.dispatcher.sendMessage(msgToFrame, null, null, function (resMsg) {
            resultCallback(msg);
        });
    },

    // Used for Text Checkpoint
    SRVC_GET_TEXT: function (msg, resultCallback) {
        this._logger.trace("SRVC_GET_TEXT: started");

        var allRange = new Range();
        allRange.setStartBefore(document.body);
        allRange.setEndAfter(document.body.lastChild);

        var allTxt = Util.cleanSpecialChars(allRange.toString());
        allTxt = Util.cleanMultipleSpaces(allTxt);

        var beforeText = msg._data["text before"] || "";
        var afterText = msg._data["text after"] || "";

        var startPos = 0;
        if (beforeText !== "") {
            var beforeIndex = msg._data.indexoftextbefore || 0;
            startPos = Util.stringNthPosition(allTxt, beforeText, beforeIndex);
            if (startPos === -1) {
                msg._data.text = "";
                resultCallback(msg);
                return;
            }

            startPos += beforeText.length;
        }

        var endPos = startPos;
        if (afterText !== "") {
            endPos = allTxt.indexOf(afterText, startPos);
            if (endPos === -1) {
                msg._data.text = "";
                resultCallback(msg);
                return;
            }
        }

        var txtLength = endPos - startPos;
        var MAX_TEXT_SIZE = 65000;
        var text;
        if (txtLength < MAX_TEXT_SIZE) {
            text = allTxt.substr(startPos, txtLength);
        }
        else {
            text = allTxt.substr(startPos, MAX_TEXT_SIZE - 3);
            text += "...";
        }
        
        msg._data.text = text;
        resultCallback(msg);
        return;
    },

    SRVC_GET_SCREEN_RECT: function (msg, resultCallback) {
        this._calcRelativeRect(msg,true, function (res) {
            msg._data.rect = res;
            resultCallback(msg);
        });
    },
    
    SRVC_HIGHLIGHT_OBJECT: function (msg, resultCallback) {
        this._logger.trace("SRVC_HIGHLIGHT_OBJECT: Called");
        var msgToFrame = this.buildNestedMessage(msg);
        content.dispatcher.sendMessage(msgToFrame, null, null, function (resMsg) {
            resultCallback(msg);
        });
    },
  

    _calculatePartialProperties: function(propsObj) {
        Object.keys(propsObj).forEach(function (prop) {
            var val = propsObj[prop];
            if (AttrPartialValueUtil.IsPartialValue(val)) {
                propsObj[prop] = this._getAttrPartialValue(prop, val);
            }
        }, this);
    },

    _calculatePartialAttributes: function (msg) {
        this._logger.trace("_calculatePartialAttributes: Called");
        msg._data["recorded description"][0].forEach(function (specialDescriptionObj) {
            var description = specialDescriptionObj.description;
            this._calculatePartialProperties(description.properties);
            this._calculatePartialProperties(description['smart identification properties']);
        }, this);
    },

    _isAgentObjectInThisContext: function(aoRtid) {
        var aoRtidCopy = Util.shallowObjectClone(aoRtid);
        aoRtidCopy.object = null;
        return RtIdUtils.IsRTIDEqual(this.getID(), aoRtidCopy);
    },

    EVENT_RECORD: function (msg) {
        this._logger.trace("EVENT_RECORD: Called");
        this._handleRecordEvent(msg);
    },

    EVENT_INTERNAL_RECORD_QUEUE: function(msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_QUEUE: Called");
        this._handleRecordEvent(msg);
    },

    EVENT_INTERNAL_RECORD_DISPATCH_QUEUE: function (msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_DISPATCH_QUEUE: Called");
        this._handleRecordEvent(msg);
    },

    EVENT_INTERNAL_RECORD_QUEUE_CLEAR: function(msg) {
        this._logger.trace("EVENT_INTERNAL_RECORD_QUEUE_CLEAR: Called");

        // if we're in a page, forward the message to the page which resides in the extension side
        // otherwise - send to parent context
        msg._to = this._isPage ? this._getParentPageID() : content.dispatcher.getContainingContextID();
        content.dispatcher.sendEvent(msg);
    },

    EVENT_INTERNAL_SEND_BROWSER_INFO: function (msg) {
        this._logger.trace("EVENT_INTERNAL_SEND_BROWSER_INFO: Called");
        this._recorder.sendBrowserRecordInfo();
    },

    _handleRecordEvent: function(msg) {
        this._logger.trace("_handleRecordEvent: Called. IsPage? " + this._isPage);

        // if we're in a page, forward the message to the page which resides in the extension side
        // otherwise - send to parent context
        msg._to = this._isPage ? this._getParentPageID() : content.dispatcher.getContainingContextID();
        this._calculatePartialAttributes(msg);

        var recordedDescriptionArr = msg._data["recorded description"][0];
        var recordedMicclassArr = msg._data.micclass[0];
        var runtimeIdsArr = msg._data.WEB_PN_ID[0];
        var agentObjectRtid = runtimeIdsArr[0]; // the agent object is the first object in the array
        var micclass, objIdentificationProps, objDesc;

        // Add Recording Description & RTIDs of Custom parent containers
        if (this._isAgentObjectInThisContext(agentObjectRtid)) {
            var recordedElem = content.rtidManager.GetElementFromID(agentObjectRtid.object);
            var parentElem = recordedElem.parentElement;
            while (!Util.isNullOrUndefined(parentElem)) {
                // recursively iterate through the parent AOs
                // and check if it is a container. If yes, add it to the description path.
                var parentAO = content.kitsManager.createAO(parentElem, this.id, true);
                if (parentAO && parentAO.GetAttrSync("is_container")) {
                    this._logger.trace("_handleRecordEvent: parent container found, adding its record description");
                    micclass = Util.getMicClass(parentAO);
                    objIdentificationProps = this.getObjIdentificationProps(micclass);
                    objDesc = Description.createRecordDescription(parentAO, objIdentificationProps);
                    recordedDescriptionArr.push(objDesc);
                    recordedMicclassArr.push(micclass);
                    runtimeIdsArr.push(parentAO.getID());
                }
                parentElem = parentElem.parentElement;
            }
        }

        // If we're in Page or a Frame which contains the AO directly, we need to add it's description to the description object
        if (this._isPage || this._isAgentObjectInThisContext(agentObjectRtid)) {
            this._logger.trace("_handleRecordEvent: Interesting Frame/Page for record. Adding it's data. IsPage? " + this._isPage);
            micclass = Util.getMicClass(this);
            objIdentificationProps = this.getObjIdentificationProps(micclass);
            objDesc = Description.createRecordDescription(this, objIdentificationProps);
            recordedDescriptionArr.push(objDesc);
            recordedMicclassArr.push(micclass);
            runtimeIdsArr.push(this.getID());
        }

        if (this._isPage)
            this._addBrowserRecordData(msg);

        content.dispatcher.sendEvent(msg);
    },

    _addBrowserRecordData: function (msg) {
        // After adding the Page recorded description, we now need to add the description of the Browser. 
        // This is done here because some browser description needs to be calculated from the Content.

        var browserContentHelper = new BrowserContentHelper(this);
        var micclass = Util.getMicClass(browserContentHelper);
        var objIdentificationProps = this.getObjIdentificationProps(micclass);
        var objDesc = Description.createRecordDescription(browserContentHelper, objIdentificationProps);
        
        msg._data["recorded description"][0].push(objDesc);
        msg._data.micclass[0].push(micclass);
        msg._data.WEB_PN_ID[0].push(browserContentHelper.getID());    
    },

    WEBEXT_RECORD_EVENT: function (msg) {
        if (this._recorder.isRecording) {
            this._logger.trace("WEBEXT_RECORD_EVENT: Started");
            var ao = content.kitsManager.createAO(content.rtidManager.GetElementFromID(msg._data.WEB_PN_ID.object), this.id, false);
            if (!Util.isNullOrUndefined(ao)) {
                this._recorder.sendRecordExtEvent(ao, msg._data.methodName, msg._data.parameters);
            }
        }
    },

   /**
    * Get Object Identification Properties of a given miccclass divided into 4 categories:
    *   mandatory / assistive / baseFilter / optionalFilter
    *
    * @param {String} micclass 
    * @returns {Object} Object which contains all properties required for learning/recording of the input micclass
    */
    getObjIdentificationProps: function (micclass) {
        micclass = micclass.toLowerCase(); // MicClasses in obj identification props are received in lower case

        Util.assert(this._objIdentificationProps, "getObjIdentificationProps: Object identification properties object is empty !", this._logger);
        
        return this._objIdentificationProps[micclass];
    },

    sendRequestToHTMLContext: function (msg, callback) {
        this._logger.trace("sendRequestToHTMLContext: Started");
        var requestMsg = {
            callbackID: ++Frame.prototype._nextCallbackID,
            msgType: "request",
            source: "Frame",
            data: msg
        };
        this._callbacks[requestMsg.callbackID] = callback;
        this._logger.trace("sendRequestToHTMLContext: Going to send to HTML the following request: " + JSON.stringify(requestMsg));
        window.postMessage(requestMsg, "*");
    },

    _recordDialogHandled: function (event) {
        this._logger.trace("_recordDialogHandled: Recording handeling of " + event.detail.type);
        if (!this._isPage) {
            // In sub-frames the HandleDialog is recorded before the thing that caused the dialog because the previous
            // record-handling is stuck on its way through the parent frames (due to the dialog).
            setTimeout(function () { 
                window.top.dispatchEvent(event);
            }, 200);
            return;
        }

        var button = event.detail.accepted ? 'micOK' : 'micCancel';
        var commandText = 'HandleDialog ' + button + (event.detail.text ? "," : "");
        var data = {
            text: commandText,
            AN_ITEM_TEXT: event.detail.text,
            // Handle dialog is recorded on the browser, setup slots for its information
            'recorded description': [[]],
            micclass: [[]],
            WEB_PN_ID: [[]]
        };

        var msg = new Msg('EVENT_RECORD', this._getParentPageID(), data);
        this._addBrowserRecordData(msg);
        content.dispatcher.sendEvent(msg);
    },

    responseFromHTMLHandler: function (msgEventObj) {
        var responsetMsg = msgEventObj.data;

        if (typeof (responsetMsg) !== "object")
            return;

        if (responsetMsg.msgType !== "response")
            return;

        //this message is from an unknown source then we need to ignore it without any logging
        if (responsetMsg.source !== "Frame" && responsetMsg.source !== "FrameInHTMLContext")
            return;

        //checks if this is our response 
        if (Util.isUndefined(responsetMsg.callbackID))
            return;

        if (!this._callbacks[responsetMsg.callbackID]) {
            this._logger.error("responseHandler: No callback for the given response!");
            return;
        }

        try {
            //this._callbacks[responsetMsg.callbackID](responsetMsg.data);
            this._callbacks[responsetMsg.callbackID](Util.deepObjectClone(responsetMsg.data));
        }
        catch (ex) {
            this._logger.error("responseHandler: callback has exception ex =" + ex.message);
        }
        finally {
            delete this._callbacks[responsetMsg.callbackID];
        }
    }
};