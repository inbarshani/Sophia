function AO(element, parentID) {
    this._elem = element;
    this._id = null;
    this._attrs = {
        micclass: function () {
            return this._micclass;
        }
    };
    this._methods = {};
    this._behaviors = [];
    this._micclass = [];
    this._parentID = Util.shallowObjectClone(parentID);
    this._logger = WebKit._logger;
    this._logger.trace("AO: new ao created for element " + element);
}


AO.prototype = {
    _parentID: null,
    _elem: null,
    _id: null,
    _attrs: null,
    _methods: null,
    _behaviors: null,
    _micclass: null,
    _logger: null,
    _outerAO: null,

    _noCoordinate: -9999, // constant

    mergeBehavior: function (behavior) {
        this._logger.trace("mergeBehavior: merging behavior to AO " + this._elem.tagName);

        if (behavior._micclass)
            this._micclass = behavior._micclass.concat(this._micclass);

        this._behaviors.push(behavior);

        // Eagerly merge in overrides and helper methods
        var funcs = behavior._helpers;
        for (var f in funcs) {
            this[f] = funcs[f];
        }
    },
    isLearnable: Util.alwaysFalse,
    _lazyInit: function (subObj, name) {
        if (name in this[subObj])
            return; // already initialized

        for (var i = this._behaviors.length - 1; i >= 0; --i) { // take last override
            var b = this._behaviors[i];
            if (b[subObj] && name in b[subObj]) {
                this[subObj][name] = b[subObj][name];
                break;
            }
        }
    },

    _isAttrAsync: function (attrName) {
        switch (attrName) {
            case "screen_rect":
            case "abs_x":
            case "abs_y":
            case "view_x":
            case "view_y":
            case "elementinterface":
                return true;
            default:
                return false;
        }
    },

    _getAttrPartialValue: function(property/*, msg*/)
    {
        Util.assert(this._isAttrAsync(property), "_getAttrPartialValue: called for sync attribute: " + property, this._logger);
        var val = null;
        switch (property) {
            case "abs_x":
                val = this.GetAttrSync("rect").left;
                break;
            case "abs_y":
                val = this.GetAttrSync("rect").top;
                break;
            default:
                this._logger.error("_getAttrPartialValue: unhandled attribute: " + property);
                return null;
        }

        return AttrPartialValueUtil.WrapValue(property, val);
    },

    GetAttr: function (property, msg, resultCallback) {
        this._logger.trace("GetAttr: query property " + property);
        var attrInfo = Description.getAttributeInfo(property);
        var propertyName = attrInfo.name;
        if (attrInfo.data) {
            msg = msg || new Msg(MSG_TYPES.QUERY, this.getID(), {});
            msg._data[propertyName] = attrInfo.data;
        }

        this._lazyInit("_attrs", propertyName);
        if (!this._attrs[propertyName]) {
            this._logger.debug("GetAttr: unknown attribute " + propertyName); // not a warning since BATCH_QUERY makes a matrix of RTID and the union of properties to fetch
            resultCallback(null);
            return;
        }

        if (this._isAttrAsync(propertyName)) {
            this._attrs[propertyName].call(this, msg, function (result) {
                resultCallback(Util.cleanSpecialChars(result));
            });
        }
        else {
            resultCallback(Util.cleanSpecialChars(this._attrs[propertyName].call(this, msg)));
        }
    },
    _findAncestor: function (pred) {
        for (var elem = this._elem; elem; elem = elem.parentElement)
            if (pred(elem))
                return elem;
    },
    _hasDOMHandler: function (name) {
        return this._findAncestor(function (e) {
            // if the 'onclick' handler is present but empty (e.g. <div onclick />) getAttribute will return "" which is falsy but should be recorded
            return !Util.isNullOrUndefined(e.getAttribute(name));
        });
    },
    _quirkyButton: function (button) {
        // Convert to quirksmode buttons http://www.quirksmode.org/js/events_properties.html#button
        return [1, 4, 2][button];
    },

    ReceiveEvent: function (recorder, ev) {
        if ( !this.UseEventConfiguration(ev) || recorder.isEventAllowedByConfig(this, ev) ){
            this._behaviors.slice().reverse().some(function (behavior) {
                return behavior._eventHandler && behavior._eventHandler.call( this.getRecordAO(), recorder, ev);
			}, this);
		}
    },

    ReceiveGesture: function (recorder, info) {
        this._behaviors.slice().reverse().some(function (behavior) {
            return behavior._gestureHandler && behavior._gestureHandler.call(this.getRecordAO(), recorder, info);
        }, this);
    },

    GetAttrSync: function (property, msg) {
        this._logger.trace("GetAttrSync: query property " + property);
        var attrInfo = Description.getAttributeInfo(property);
        var propertyName = attrInfo.name;
        
        if (attrInfo.data) {
            msg = msg || new Msg(MSG_TYPES.QUERY, this.getID(), {});
            msg._data[propertyName] = attrInfo.data;
        }

        this._lazyInit("_attrs", propertyName);

        if (this._attrs[propertyName]) {
            if (this._isAttrAsync(propertyName)) {
                var partialVal = this._getAttrPartialValue(propertyName, msg);
                partialVal.value = Util.cleanSpecialChars(AttrPartialValueUtil.GetValue(partialVal));
                return partialVal;
            }
            else
                return Util.cleanSpecialChars(this._attrs[propertyName].call(this, msg));
        }
        else {
            this._logger.debug("GetAttrSync: unknown attribute " + propertyName); // not a warning since BATCH_QUERY makes a matrix of RTID and the union of properties to fetch
            return null;
        }
    },
    QueryAttributesSync: function(attrsObj) {
        this._logger.trace("QueryAttributesSync: called for attributes: " + JSON.stringify(attrsObj));
        var attrsObjRes = {};
        var attrList = Object.keys(attrsObj);
        attrList.forEach(function (attr) {
            //property "id" is mapped as WEB_PN_ID as property id,which will be parsed as "WEB_PN_ID" in WebJsonParser.
            //so here the string "WEB_PN_ID" is represented as property "id", so query the "id" instead of "WEB_PN_ID" to get the real value.
            //and set the property id to "WEB_PN_ID", which will be parsed as WEB_PN_ID as property id.
            attrsObjRes[attr] = this.GetAttrSync(attr==="WEB_PN_ID"?"id":attr);
        }, this);

        return attrsObjRes;
    },
    QUERY_ATTR: function (msg, resultCallback) {
        this._logger.trace("QUERY_ATTR: called for attributes: " + JSON.stringify(msg._data));
        var attrs = Object.keys(msg._data);
        if (attrs.length < 1) {
            this._logger.warn("QUERY_ATTR: Called with no attributes");
            resultCallback(msg);
            return;
        }

        var multiResponses = new MultipleResponses(attrs.length);

        attrs.forEach(function (prop) {
            this._logger.debug("QUERY_ATTR: call GetAttr for '" + prop + "' property");
            //property "id" is mapped as WEB_PN_ID as property id,which will be parsed as "WEB_PN_ID" in WebJsonParser.
            //so here the string "WEB_PN_ID" is represented as property "id", so query the "id" instead of "WEB_PN_ID" to get the real value.
            //and set the property id to "WEB_PN_ID", which will be parsed as WEB_PN_ID as property id.
            this.GetAttr(prop==="WEB_PN_ID"?"id":prop, msg, multiResponses.callback(function (isDone, val) {
                msg._data[prop] = val;
                this._logger.debug("QUERY_ATTR: (GetAttr callback) " + prop + "=" + val);

                if (!isDone)
                    return;

                this._logger.debug("QUERY_ATTR: Finished querying all the requested attributes");
                resultCallback(msg);
            }.bind(this)));
        }.bind(this));
    },
    InvokeMethod: function (method, msg, resultCallback) {
        this._logger.trace("InvokeMethod: invoking method " + method + " for msg " + JSON.stringify(msg));
        this._lazyInit("_methods", method);

        if (!this._methods[method]) {
            this._logger.warn("InvokeMethod: unknown method " + method);
            ErrorReporter.ThrowGeneralError();
            return;
        }

        this._methods[method].call(this, msg, resultCallback);
    },
    QUERY_DESC_TO_ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_DESC_TO_ID: Started");

        this._internalQueryDescToId(msg, null, resultCallback);
    },
    QUERY_REPOSITORY_DESC2ID: function (msg, resultCallback) {
        this._logger.trace("QUERY_REPOSITORY_DESC2ID: Started");

        var additonalParams = { filter: Util.alwaysFalse, learn: true };
        this._internalQueryDescToId(msg, additonalParams, resultCallback);
    },
    _internalQueryDescToId: function (msg, optionalParamsObj, resultCallback) {
        this._logger.trace("_internalQueryDescToId: Started");

        Description.GetIDsByDescription(msg._data, Description.GetCandidateAOsForContent.bind(Description, this._parentID, this._elem), optionalParamsObj, function (filteredAOs) {
            resultCallback(Description.buildReturnMsg(msg._msgType, msg._to, filteredAOs, this._logger));
        }.bind(this));
    },
    getID: function () {
        this._logger.trace("getID: getting runtime id for element " + this._elem);
        if (!this._id) {
            this._logger.trace("getID: objID not cached, create it from rtidManager");
            var elem = this._elem;
            if (this._radios && this._radios.length > 0) {
                elem = this._radios[0];
            }
            var obj_id = content.rtidManager.GetIDForElement(elem);
            this._id = Util.shallowObjectClone(this._parentID);
            this._id.object = obj_id;
        }
        return Util.shallowObjectClone(this._id);
    },

    SRVC_MAKE_OBJ_VISIBLE: function (msg, callback) {
        this.InvokeMethod("MAKE_VISIBLE", msg, callback);
    },
    SRVC_HIGHLIGHT_OBJECT: function (msg, callback) {
        this.InvokeMethod("HIGHLIGHT_OBJECT", msg, callback);
    },
    SRVC_CALL_OBJ_EVENT: function (msg, callback) {
        // We don't want to wait for the response, but return immediately
        msg.delay = true;
        callback(msg);
        // Call to actual behavior with the fake callback
        this.InvokeMethod("CALL_EVENT", msg, Util.identity);
    },
    SRVC_EDIT_SET: function (msg, callback) {
        this.InvokeMethod("SET_VALUE", msg, callback);
    },
    SRVC_GET_FORM: function (msg, callback) {
        this.InvokeMethod("WEB_GETFORMA", msg, callback);
    },
    CMD_LIST_SELECT: function (msg, callback) {
        this.InvokeMethod('LIST_SELECT', msg, callback);
    },
    CMD_LIST_DESELECT: function (msg, callback) {
        this.InvokeMethod('LIST_DESELECT', msg, callback);
    },
    CMD_LIST_EXTEND_SELECT: function (msg, callback) {
        this.InvokeMethod('LIST_EXTEND_SELECT', msg, callback);
    },
    SRVC_GET_SCREEN_RECT: function (msg, callback) {
        this.InvokeMethod("GET_SCREEN_RECT", msg, callback);
    },
    QUERY_GET_TABLE_DATA: function (msg, callback) {
        this.InvokeMethod("GET_TABLE_DATA", msg, callback);
    },
    SRVC_INVOKE_METHOD: function (msg, callback) {
        this.InvokeMethod(msg._data.AN_METHOD_NAME, msg, callback);
    },
    QUERY_OBJ_PARENTS_FROM_ID: function (msg, callback) {
        this._logger.trace("onMessage: Started with: " + JSON.stringify(msg));

        msg._data = {};
        var ids = [];

        var aoParentIterator = this;
        do {
            ids.push(aoParentIterator.getID());
            aoParentIterator = aoParentIterator.getParent();
        } while (aoParentIterator);

        msg._data.WEB_PN_ID = ids.reverse();

        callback(msg);
    },

    onMessage: function (msg, resultCallback) {
        this._logger.trace("onMessage: Started with: " + JSON.stringify(msg));
        if (!this[msg._msgType]) {
            this._logger.error("onMessage: Unhandled msg: " + msg._msgType);
            ErrorReporter.ThrowNotImplemented("AO." + msg._msgType);
        }

        this[msg._msgType](msg, resultCallback);
    },
    // Helper methods (may be overridden by behaviors)
    _getTagsTree: function (str_array, element, level) {
        str_array.push(level + " " + element.tagName);
        var children = element.children;
        for (var i = 0; i < children.length; i++) {
            this._getTagsTree(str_array, children[i], level + 1);
        }
    },

    _fireEvent: function (target, event, data) {
        this._logger.trace("_fireEvent: fire event " + event + " with data " + JSON.stringify(data));
        switch (event) {
            case "focus":
                this._elem.focus();
                return;
            case "blur":
                this._elem.blur();
                return;
            case "submit":
                this._elem.submit();
                return;
            case "click":
                if (!content.settings.replayonlyclick) {
                    this._fireEvent(this._elem, "focus", data);
                    this._fireEvent(this._elem, "mousedown", data);
                    this._fireEvent(this._elem, "mouseup", data);
                }
                // we don't return here, so after firing the above events,
                // "click" event will continue to be handled by statments below
        }
        if (!EventTypes[event]) {
            this._logger.error("_fireEvent: unknown event " + event);
            return;
        }
        var type = EventTypes[event];
        var evt = document.createEvent(type);
        switch (type) {
            case "HTMLEvents":
            case "MutationEvents":
            case "UIEvents":
            case "KeyboardEvent":
                evt.initEvent(event, true, true);
                break;
            case "MouseEvents":
                var pt = { x: 0, y: 0 };
                if (data.pos) {
                    pt.x = data.pos.x;
                    pt.y = data.pos.y;
                } else {
                    pt.x = data.x || 0;
                    pt.y = data.y || 0;
                }
                var button = 0;
                switch (data["event button"]) {
                    case 2: //middle
                        button = 1; //W3C middle button
                        break;
                    case 1:
                        button = 2; //W3C right button
                        break;
                    case 0:
                        /* falls through */
                    default:
                        button = 0; //W3C Left Button
                        break;
                }
                var point = this._pointRelativeToElem(pt);
                evt.initMouseEvent(event, true, true, null, null, null, null, point.x, point.y, false, false, false, false, button, target);
                break;
            default:
                return;
        }
        this._logger.trace("_fireEvent: dispatch event " + type + " on element " + target);
        target.dispatchEvent(evt);
    },

    _isRealLink: function () {
        var elem = this._elem;
        if (!elem.href) {
            return false;
        }

        if (this._hasDirectTextChild(elem)) {
            return true;
        }

        if (this._hasBackgroundImage(elem)) {
            return true;
        }

        var all_children = this._elem.getElementsByTagName("*");
        for (var i = 0; i < all_children.length; i++) {
            if (this._hasDirectTextChild(all_children[i])) {
                return true;
            }
            if (this._hasBackgroundImage(all_children[i])) {
                return true;
            }
        }
        return false;
    },

    _hasDirectTextChild: function (elem) {
        var nodes = elem.childNodes;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].nodeType === 3) { // text node
                var text = nodes[i].data;
                text = text.trim();
                if (text.length > 0) {
                    return true;
                }
            }
        }
        return false;
    },

    _hasBackgroundImage: function (elem) {
        var backgroundImg = getComputedStyle(elem, null).backgroundImage;
        if (backgroundImg.length > 0 && backgroundImg !== "none") {
            return true;
        }
        return false;
    },


    _getAttributes: function (elem, msg) {
        var attrs = msg._data.attribute;
        return Util.map(attrs, function (attr) {
            return elem.getAttribute(attr) || "";
        }, this);
    },

    _getCSSValues: function (elem, msg) {
        var style = getComputedStyle(elem, null);
        var attrs = msg._data.style;
        return Util.map(attrs, style.getPropertyValue.bind(style));
    },

    _getImageParentAnchor: function () {
        var parent = this._elem.parentNode;
        var tagsAllowedInPath = ["FONT", "B", "I", "STRONG", "DIV", "NOBR", "EM", "DD", "CENTER", "SPAN"];
        // TODO:
        //var untilTop = REG_VAL_CHECK_IMAGE_LINK_UP_UNTIL_TOP;

        while (parent) {
            if (parent.tagName === "A") {
                return parent;
            }
            /*
                if (!untilTop) {
                    break;
                }
            */
            if (tagsAllowedInPath.indexOf(parent.tagName) === -1) {
                break;
            }
            parent = parent.parentNode;
        }
        return null;
    },

    _getParentAO: function (elem) {
        // in the case of regular object direct parent may be general, so we need to get next element
        for(var parent = elem.parentNode; parent; parent = parent.parentNode) {
            var pao = content.kitsManager.createAO(parent, this._parentID, true); // don't create default AO
            if (pao) 
                return pao;
        }
        return null;
    },

    _dispatchTouchEventOnDoc: function (element, type, point) {
        var addedId = false;
        if (!element.id) {
            element.id = '_fakeId_' + (new Date()).getTime();
            addedId = true;
        }
        try {
            ContentUtils.runOnDocSync(dispatchTouchEvent, [element.id, type, point]);
        }
        finally {
            if (addedId)
                element.id = '';
        }

        return;
        // Helper functions

        function dispatchTouchEvent(id, type, point) {
            var element = document.getElementById(id);
            var event = document.createEvent('Event');
            var touches = createTouchList(createTouch(element, point));
            event.initEvent('touch' + type, true, true);
            event.touches = touches;
            event.changedTouches = touches;
            return element.dispatchEvent(event);

            // Helper Functions
            function createTouch(element, point, id) {
                if (document.createTouch)
                    return document.createTouch(window, element, id, point.x, point.y, point.x, point.y);

                return {
                    view: window,
                    target: element,
                    identifier: id || 0,
                    pageX: point.x,
                    pageY: point.y,
                    clientX: point.x,
                    clientY: point.y
                };
            }

            function createTouchList(touches) {
                if (document.createTouchList)
                    return document.createTouchList(touches);

                return Array.isArray(touches) ? touches : [touches];
            }
        }
    },

    _pointRelativeToElem: function (pos) {
        var rect = this._elem.getBoundingClientRect();
        // pos is relative to _elem (or center if not specified)
        var x = (pos.x != this._noCoordinate)? pos.x : rect.width / 2;
        var y = (pos.y != this._noCoordinate) ? pos.y : rect.height / 2;

        return {
            x: rect.left + x,
            y: rect.top + y
        };
    },

    getParent: function () {
        return this._getParentAO(this._elem);
    },
    isObjSpyable: function () {
        return true;
    },
	getControlLearnType: function () {
        return ControlLearnType.Yes;
    },
    getChildrenLearnType: function () {
        return ChildrenLearnType.Yes;
    },
    UseEventConfiguration: function (event) {
        return true;
    },
    setOuterAO: function (ao){
        this._outerAO = ao;
    },
    getRecordAO: function () {
        return this._outerAO || this;
    }
};

// Beware that the functions of _attrs and _method will always be called upon an AO context,
// so "this" is actually the AO instead of _attrs or _methods object
// Attributes below are either not queried any more or not relevant in chrome agent
/*
	"webelement old_name":
	"child":
	"IsIgnored":
	"webelementparentcount":
	"tree branch":
	"event replay":
*/

var CommonBehavior = {
    _micclass: ["WebElement", "Any Web Object"],    
    _attrs: {
        "logical name": function () {

            var id = this._elem.getAttribute('aria-labelledby');
            if (id) //  aria-labelledby can be space terminated, take the first one which should be most specific (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Techniques/Using_the_aria-labelledby_attribute)
                id = id.split(' ')[0]; 

            var elem = id && document.getElementById(id);
            var text = elem && Util.cleanSpecialChars(elem.innerText||elem.textContent);
            if (text)
                return text;

            text = Util.cleanSpecialChars(this._elem.getAttribute('aria-label'));
            if (text)
                return text;


            return this.GetAttrSync("name") || this.GetAttrSync("innertext");
        },
        "html tag": function () {
            return this._elem.tagName;
        },
        "tags tree": function () {
            var arr = [];
            this._getTagsTree(arr, this._elem, 0);
            // the returned value should be 
            // _data {
            //   WEB_PN_TAGS_TREE: WebAttrVal("table 0", "tbody 1", ...)
            // }
            // normally in JSONUtils, 1d array will be converted to multiple values
            // 2d array will be converted to a single WebAttrVal
            // but for properties appeared in _attr_names, JSONUtils will try first
            // to convert to data to multiple values, thus reduces array demision by one,
            // 3d array is needed.
            return [[arr]];
        },
        rect: function () {
            var client_rect = this._elem.getBoundingClientRect();
            return {
                left: Math.floor(client_rect.left),
                top: Math.floor(client_rect.top),
                right: Math.floor(client_rect.right),
                bottom: Math.floor(client_rect.bottom)
            };
        },
        pos: function () {
            var rect = this.GetAttrSync("rect");
            return { x: rect.left, y: rect.top };
        },
        x: function () {
            var rect = this.GetAttrSync("rect");
            return rect.left;
        },
        y: function () {
            var rect = this.GetAttrSync("rect");
            return rect.top;
        },
        width: function () {
            return this._elem.offsetWidth;
        },
        height: function () {
            return this._elem.offsetHeight;
        },
        view_x: function (msg, resultCallback) {
            var frameReqMsg = new Msg(MSG_TYPES.QUERY, Util.shallowObjectClone(this._parentID), { view_x: null });
            content.dispatcher.sendMessage(frameReqMsg, null, null, function (resMsg) {
                var frm_x = resMsg._data.view_x;
                this.GetAttr("x", msg, function (obj_x) {
                    //return the original target of the message.
                    msg._to.object = this.getID().object;
                    resultCallback(obj_x + frm_x);
                }.bind(this));
            }.bind(this));
        },
        view_y: function (msg, resultCallback) {
            var frameReqMsg = new Msg(MSG_TYPES.QUERY, Util.shallowObjectClone(this._parentID), { view_y: null });
            content.dispatcher.sendMessage(frameReqMsg, null, null, function (resMsg) {
                var frm_y = resMsg._data.view_y;
                this.GetAttr("y", msg, function (obj_y) {
                    //return the original target of the message.
                    msg._to.object = this.getID().object;
                    resultCallback(obj_y + frm_y);
                }.bind(this));
            }.bind(this));
        },
        parent: function () {
            var elem = this._elem;
            var ao;
            while (true) {
                elem = elem.parentElement;
                if (!elem) {
                    break;
                }
                ao = content.kitsManager.createAO(elem, this._parentID);
                if (ao) {
                    return ao.getID();
                }
            }
            return Util.shallowObjectClone(this._parentID);
        },
        abs_x: function (msg, resultCallback) {
            this.GetAttr("screen_rect", msg, function (result) {
                resultCallback(result.left);
            });
        },
        abs_y: function (msg, resultCallback) {
            this.GetAttr("screen_rect", msg, function (result) {
                resultCallback(result.top);
            });
        },
        screen_rect: function (msg, resultCallback) {
            var frameReqMsg = new Msg(MSG_TYPES.QUERY, Util.shallowObjectClone(this._parentID), { rect: null });
            content.dispatcher.sendMessage(frameReqMsg, null, null, function (resMsg) {
                var frm_rect = resMsg._data.rect;
                var frm_abs_x = frm_rect.left;
                var frm_abs_y = frm_rect.top;
                var ao = this._outerAO ? this._outerAO : this;
                ao.GetAttr("rect", msg, function (rect) { 
                    rect.left += frm_abs_x;   
                    rect.top += frm_abs_y;
                    rect.right += frm_abs_x;
                    rect.bottom += frm_abs_y;
                    //return the original target of the message.
                    msg._to.object = this.getID().object;
                    resultCallback(rect);
                }.bind(this));
            }.bind(this));
        },
        class: function () {
            return this._elem.className;
        },
        class_name: function () {
            return this.GetAttrSync("class");
        },
        innertext: function () {
            return Util.cleanTextProperty(this._elem.innerText||this._elem.textContent);
        },
        inner_text: function () {
            return this.GetAttrSync("innertext");
        },
        outertext: function () {
            return Util.cleanTextProperty(this._elem.outerText || this.GetAttrSync("innertext"));
        },
        outer_text: function () {
            return this.GetAttrSync("outertext");
        },
        innerhtml: function () {
            return this._elem.innerHTML;
        },
        inner_html: function () {
            return this.GetAttrSync("innerhtml");
        },
        outerhtml: function () {
            return this._elem.outerHTML;
        },
        outer_html: function () {
            return this.GetAttrSync("outerhtml");
        },
        "html id": function () {
            return this._elem.id;
        },
        title: function () {
            return this._elem.title;
        },
        version: function () {
            return Util.browserApplicationVersion();
        },
        visible: function () {
            var style = getComputedStyle(this._elem, null);
            return style.display !== "none" && style.visibility !== "hidden";
        },
        focus: function () {
            return this._elem.ownerDocument.activeElement === this._elem;
        },
        focused: function () {
            return this.GetAttrSync("focus");
        },
        attribute: function (msg) {
            return this._getAttributes(this._elem, msg);
        },
        "all attributes": function () {
            var res = [];
            Array.prototype.forEach.call(this._elem.attributes, function (attr) {
                res.push(attr.name);
                res.push(attr.value);
            });
            return res.join(";;");
        },
        "all styles": function () {
            var style = window.getComputedStyle(this._elem, null);
            var res = [];
            Array.prototype.forEach.call(style, function (styleName) {
                res.push(styleName);
                res.push(style.getPropertyValue(styleName));
            });
            return res.join(";;");
        },
        style: function (msg) {
            return this._getCSSValues(this._elem, msg);
        },
        value: function () {
            return this._elem.value;
        },
        xpath: function () {
            return window._QTP.AutoXpathRecorder(this._elem);
        },
        _xpath: function () {
            return window._QTP.AutoXpathRecorder(this._elem);
        },
        disabled: function () {
            return this._elem.disabled ? 1 : 0;
        },
        type: function () {
            return this._elem.type;
        },
        name: function () {
            return this._elem.name;
        },
        text: function () {
            return this._elem.innerText || this._elem.textContent;
        },
        elementinterface: function (msg, resultCallback) {
            return DotObjUtil.WrapElement(this._elem, this.getID(), resultCallback);
        },
        is_container: function () {
            return false;
        },
        ancestor: function () {
            for (var parent = this.getParent() ; parent; parent = parent.getParent()) {
                if (parent.GetAttrSync('is_container')) 
                    return parent.getID();
            }
        },
        source_index: function () {
            var ret = Array.prototype.indexOf.call(document.getElementsByTagName('*'), this._elem);
            if (ret >= 0)
                return ret;
            // return undefined
        },
        "all text items": function () {
            var arr = Util.getTextNodesValue(this._elem);
            return arr.join(";");
        }
    },

    // These methods no longer seem to be relevant
    // ID_TO_DESC
    // CONTAINS_POINT
    _methods: {
        WEB_GETFORMA: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad WEB_GETFORMA");

            // data field is null for this message type
            msg._data = msg._data || {};
            // form's browser, page and frame will be the same as its child element,
            // we only need to override the object part
            msg._data.WEB_PN_ID = msg._to;

            if (this._elem.form) {
                var form_ao = content.kitsManager.createAO(this._elem.form, this._parentID);
                msg._data.WEB_PN_ID.object = form_ao.getID().object;
            } else {
                msg._data.WEB_PN_ID = null;
            }

            resultCallback(msg);
        },

        MAKE_VISIBLE: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on command MAKE_VISIBLE");
            var elem = this._elem;
			var data = msg._data;
			var container = elem;
			var elem_rect = this.GetAttrSync("rect");
			var scroll_to_center = data.WEB_PN_SCROLL_TO_CENTER;
            var pt = data.pos?  { x: data.pos.x, y: data.pos.y } : { x: 0, y: 0};

            while (true) { // scroll all parent containers when necessary in current frame to reveal this._elem
                container = container.parentNode;
                if (!container) {
                    break;
                }
                if (container.tagName !== "DIV") {
                    continue;
                }
                var con_rect = content.kitsManager.createAO(container, this._parentID).GetAttrSync("rect");
                if (Util.isRectEmpty(con_rect)) {
                    continue;  //no need to scroll those zero-size containers 
                }
                var need_to_scroll = scroll_to_center || !Util.isFullyVisible(elem_rect, con_rect);
                if (need_to_scroll) {
                    if (scroll_to_center) {
                        container.scrollLeft += elem_rect.left - Util.getCenterPoint(con_rect) + pt.x;
                        container.scrollTop += elem_rect.top - Util.getCenterPoint(con_rect) + pt.y;
                    } else {
                        container.scrollLeft += elem_rect.left - con_rect.left + pt.x;
                        container.scrollTop += elem_rect.top - con_rect.top + pt.y;
                    }
                    elem_rect = this.GetAttrSync("rect");
                }
            }

            // scroll frame window if necessary
            var frame_rect = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
            if (scroll_to_center || !Util.isFullyVisible(elem_rect, frame_rect)) {
                if (scroll_to_center) {
                    window.scrollTo(elem_rect.left - Util.getCenterPoint(frame_rect) + pt.x + window.scrollX, elem_rect.top - Util.getCenterPoint(frame_rect) + pt.y + window.scrollY);
                }
                else {
                    window.scrollTo(elem_rect.left + pt.x + window.scrollX, elem_rect.top + pt.y + window.scrollY);
                }
            }

            // we are done in this level, dispatch the message to the parent frame of this frame
            var req_data = {
                pos: { x: (data.pos ? pt.x + elem_rect.left : elem_rect.left), y: (data.pos ? pt.y + elem_rect.top : elem_rect.top) },
                WEB_PN_SCROLL_TO_CENTER: data.WEB_PN_SCROLL_TO_CENTER
            };

            //sends the request to our frame to make sure it is visible.
            var reqMsg = new Msg(MSG_TYPES.SRVC_MAKE_OBJ_VISIBLE, Util.shallowObjectClone(this._parentID), req_data);
            content.dispatcher.sendMessage(reqMsg, null, null, function (/*resMsg*/) {
                this._logger.trace("CommonBehavior: MAKE_VISIBLE: on callback from parent's SRVC_MAKE_OBJ_VISIBLE. Get 'screen_rect' attribute");
                this.GetAttr("screen_rect", msg, function (rect) {
                    this._logger.trace("CommonBehavior: MAKE_VISIBLE: on callback from 'screen_rect' attribute. Value: " + JSON.stringify(rect));
                    msg._data.rect = rect;
                    msg._data.pos = { x: rect.left+pt.x, y: rect.top+pt.y };

                    // Remove plugin
                    // The package checks if this value is equal to 0 (NULL) and if it is - it assumes it's
                    // a failure. -1 on the other hand is "success" (note: HWND is unsigned)
                    msg._data.hwnd = -1;

                    resultCallback(msg);
                }.bind(this));
            }.bind(this));
        },
        GET_SCREEN_RECT: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad GET_SCREEN_RECT");
            this.GetAttr("screen_rect", msg, function (result) {
                msg._data.rect = result;
                resultCallback(msg);
            });
        },

        CONTAINS_TEXT: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad CONTAINS_TEXT");
            var str = msg._data;
            var regex = new RegExp(str);
            var result;
            if (regex.test(this.GetAttrSync("text"))) {
                result = true;
            } else {
                result = this.GetAttrSync("text").indexOf(str) !== -1;
            }

            // Don't return the result as it was this was in SYNC manner
            //resultCallback(result);
            resultCallback(msg);
        },

        CALL_EVENT: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad CALL_EVENT");
            var event = msg._data.event;
            event = event.toLowerCase().replace(/^on/, "");
            this._fireEvent(this._elem, event, msg._data);
            resultCallback(msg);
        },

        HIGHLIGHT_OBJECT: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on command HIGHLIGHT_OBJECT");
            ContentUtils.highlightElement(this._elem);
            resultCallback(msg);
        },

        TOUCH_SWIPE: function (msg, callback) {
            this._logger.trace("CommonBehavior: Swipe(" + JSON.stringify(msg._data) + ")");
            var direction = msg._data.direction;
            var distance = msg._data.distance;
            var duration = msg._data.duration;
            var element = this._elem;

            var point = this._pointRelativeToElem(msg._data.pos);
            
            // Perform start, some moves, end after waiting in between
            this._dispatchTouchEventOnDoc(element, 'start', point);

            var numberOfMoves = Math.max(2, Math.floor(duration / 100));
            var timeOutForStartEnd = 0.1 * duration;
            var timeOutForMove = (duration - 2 * timeOutForStartEnd) / numberOfMoves;
            var moveDistance = distance / numberOfMoves;

            setTimeout(function (self) {
                self._dispatchTouchEventOnDoc(element, 'move', point); // Make a move at the start location
                setTimeout(doMoves, timeOutForMove, numberOfMoves, self);
            }, timeOutForStartEnd, this);

            return;
            // Helper functions
        
            function doMoves(times, self) {
                point = movePoint(direction, point, moveDistance);
                self._dispatchTouchEventOnDoc(element, 'move', point);
                if (times > 1)
                    setTimeout(doMoves, timeOutForMove, times - 1, self);
                else {
                    // Fire the touchend event at the same location as the last touchmove
                    setTimeout(function (self) {
                        self._dispatchTouchEventOnDoc(element, 'end', point);
                        callback(msg); // we're done
                    }, timeOutForStartEnd, self);
                }                
            }

            function movePoint(direction, point, distance) {
                switch (direction.toLowerCase()) {
                    case 'left':
                        return { x: point.x - distance, y: point.y };
                    case 'right':
                        return { x: point.x + distance, y: point.y };
                    case 'up':
                        return { x: point.x, y: point.y - distance };
                    case 'down':
                        return { x: point.x, y: point.y + distance };
                }
                throw Error("Unexpeced direction: " + direction);
            }          
        },

        TOUCH_LONG_TAP: function (msg, callback) {
            this._logger.trace("CommonBehavior: LongTap(" + JSON.stringify(msg._data) + ")");
            var duration = msg._data.duration;
            var point = this._pointRelativeToElem(msg._data.pos);
            var element = this._elem;

            this._dispatchTouchEventOnDoc(element, 'start', point);
            setTimeout(function (self) {
                self._dispatchTouchEventOnDoc(element, 'end', point);
                callback(msg);
            }, duration, this);
        },

        IS_MOUSE_REPLAY_REQUIRED: function (msg, resultCallback) {
            this._logger.trace("CommonBehavior: on commnad IS_MOUSE_REPLAY_REQUIRED");
            //resultCallback(false);
            resultCallback(msg);
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('Common.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        var data = null;
        switch (ev.type) {
            case 'click':
                data = { event: 'onclick' };
                break;
            case 'dblclick':
                data = { event: 'ondblclick' };
                break;
            case 'mouseup':
                    data = {
                        event: 'onmouseup',
                        'event button': this._quirkyButton(ev.button)
                    };
                break;
            case 'mousedown':
                data = { 
                    event: 'onmousedown',
                    'event button': this._quirkyButton(ev.button)
                }
                break;
            case 'mouseover':
                data = { event: 'onmouseover' };
                break;
            case 'mouseout':
                data = { event: 'onmouseout' };
                break;
            case 'contextmenu':
                data = { event: 'oncontextmenu' };
                break;
            case 'dragstart':
                recorder.queueRecordEvent(this, ev, {
                    event: 'ondragstart',
                    'event point': { x: ev.clientX, y: ev.clientY },
                });
                return true;
            case 'dragend':
                recorder.discardQueuedRecordEvents();
                return true;
            case 'drop':
                recorder.sendRecordEventWithQueue(this, ev, {
                    event: 'ondrop',
                    'event point': { x: ev.clientX, y: ev.clientY },
                });
                return true;
        }

        if (data) {
            recorder.sendRecordEvent(this, ev, Util.extend(data, {
                'event point': { x: ev.clientX, y: ev.clientY },
            }));
            return true;
        }
    },
    _gestureHandler: function (recorder, info) {
        // By default record all gestures, but derived classes can override
        recorder.sendRecordEvent(this, null, info);
        return true;
    }
};

var ButtonBehavior = {
    _micclass: ["WebButton", "StdObject"],
    _attrs: {
        "name": function () {
            if (this._elem.tagName === "INPUT") {
                if (this._elem.value) {
                    return this._elem.value;
                }
                // only supply the default value when "value" is NA, to make it compatible with old IE
                if (!this._elem.hasAttribute("value")) {
                    switch (this._elem.type) {
                        case "submit":
                            return "Submit Query";
                        case "reset":
                            return "Reset";
                    }
                }
                if (this._elem.name) {
                    return this._elem.name;
                }
            } else {
                return this._elem.innerText || this._elem.textContent || this._elem.name;
            }
        },

        "value": function () {
            return this._elem.value || this._elem.innerText || this._elem.textContent;
        },

        "disabled": function () {
            return this._elem.disabled ? 1 : 0;
        },

        "type": function () {
            return this._elem.type;
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('Button.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
		if (ev.type === 'click') {
            recorder.sendRecordEvent(this, ev, {
                event: 'onclick',
                'event point': { x: ev.clientX, y: ev.clientY },
            });   
            return true;
        }
    },
};

var EditBehavior = {
    _micclass: ["WebEdit", "StdObject"],
    _attrs: {
        "name": function () {
            return this._elem.name ||
                // Get correct micClass for derived classes (e.g. WebRange)
                Util.getMicClass(this); 
        },

        "value": function () {
            //TODO: SetUseSpecialChars(true);
            if (this._elem.value) {
                return this._elem.value.replace("\n", "\r\n");
            } else {
                return "";
            }
        },

        "default value": function () {
            //TODO: SetUseSpecialChars(true)
            return this._elem.defaultValue;
        },

        "cols": function () {
            return this._elem.size || this._elem.cols;
        },

        "width in characters": function () {
            return this.GetAttrSync("cols");
        },

        "rows": function () {
            return this._elem.rows || 0;
        },

        "kind": function () {
            if (this._elem.tagName === "INPUT") {
                return "singleline";
            } else if (this._elem.tagName === "TEXTAREA") {
                return "multiline";
            }
        },

        "type": function () {
            return this._elem.type;
        },

        "disabled": function () {
            return this._elem.disabled ? 1 : 0;
        },

        "readonly": function () {
            return this._elem.readOnly ? 1 : 0;
        },

        "max length": function () {
            if (this._elem.tagName.toLowerCase() === "textarea")
                return this._elem.maxLength == 0x80000 ? -1 : this._elem.maxLength;
            if (this._elem.tagName.toLowerCase() === "input")
                return this._elem.maxLength == -1 ? 0x80000 : this._elem.maxLength;
            return this._elem.maxLength;
        },

        "data": function () {
            return this.GetAttrSync("value");
        },

        "innertext": function () {
            return this._elem.tagName === "TEXTAREA" ? Util.cleanTextProperty(this.GetAttrSync("value")) : "";
        },

        "placeholder": function () {
            return this._elem.placeholder || "";
        },

        "pattern": function () {
            return this._elem.pattern || "";
        },

        "required": function () {
            return this._elem.required || false;
        }
    },

    _methods: {
        "SET_VALUE": function (msg, resultCallback) {
            this._logger.trace("EditBehavior: on command SET_VALUE");
            if (Util.isNullOrUndefined(msg._data.value)) {
                ErrorReporter.ThrowInvalidArg();
            }
            this._elem.value = msg._data.value;
            resultCallback(msg);
        },
        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("EditBehavior: on command SET_DATA");
            msg._data.value = msg._data.data;
            this.InvokeMethod("SET_VALUE", msg, resultCallback);
        }
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('Edit.eventHandler: Received recordable event: ' + ev.type);

        switch (ev.type) {
            case 'click': return true;
            case 'change': 
                recorder.sendRecordEvent(this, ev, {
                    event: 'onchange',
                    value: this._elem.value,
                    type: this._elem.type,
                    force_record: true,
                });
                return true;
        }
    },

    _helpers: {
        isLearnable: Util.alwaysTrue,
    }

};

var ContentEditableBehavior = {
    _micclass: ["WebEdit"],
    _attrs: {
        "value": function () {
            //TODO: SetUseSpecialChars(true);
            if (this._elem.innerHTML) {
                return this._elem.innerHTML.replace("\n", "\r\n");
            } else {
                return "";
            }
        },
        "name": function () {
            return this._elem.getAttribute("name") || "";
        },
        "kind": function () {
            return "other";
        },
        "readonly": function () {
            return 0;
        },
        "disabled": function () {
            return 0;
        },
        "type": function () {
            return "";
        },
        "max length": function () {            
            return -1;
        },
        "data": function () {
            if (this._elem.innerHTML) {
                return this._elem.innerHTML.replace("\n", "\r\n");
            } else {
                return "";
            }
        }
    },
    _methods: {
        "SET_VALUE": function (msg, resultCallback) {
            this._logger.trace("ContentEditableBehavior: on command SET_VALUE");
            if (Util.isNullOrUndefined(msg._data.value)) {
                ErrorReporter.ThrowInvalidArg();
            }
            this._elem.innerHTML = msg._data.value;
            resultCallback(msg);
        },
        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("ContentEditableBehavior: on command SET_DATA");
            msg._data.value = msg._data.data;
            this.InvokeMethod("SET_VALUE", msg, resultCallback);
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue
    },

    _eventHandler: function (recorder, ev) {
        this._logger.trace('ContentEditable.eventHandler: Received recordable event: ' + ev.type);

        switch (ev.type) {
            case 'click': return true;
            case 'focus':
                this._elem._beforeChangeTxtValue = this._elem.textContent || "";
                return true;
            case 'blur':
                if (this._elem.textContent !== this._elem._beforeChangeTxtValue) {
                    recorder.sendRecordEvent(this, ev, {
                        event: 'onchange',
                        value: this._elem.textContent,
                        type: this._elem.type,
                        force_record: true,
                    });
                }
                return true;
        }
    },
};

var LinkBehavior = {
    _micclass: ["Link", "Hyperlink", "Text"],
    _attrs: {
        href: function () {
            return this._elem.href || "";
        },
        url: function () {
            return this.GetAttrSync("href");
        },
        target: function () {
            return this._elem.target || "";
        },
        color: function () {
            return getComputedStyle(this._elem, null).color;
        },
        "background color": function () {
            return getComputedStyle(this._elem, null).backgroundColor;
        },
        font: function () {
            return getComputedStyle(this._elem, null).fontFamily;
        },
        innertext: function () {
            var elemInnerText = this._elem.innerText || this._elem.textContent;
            return Util.cleanTextProperty(elemInnerText);
        },
        data: function () {
            return this.GetAttrSync("text");
        },
        name: function () {
            var text = this._elem.innerText || this._elem.textContent||"";
            return Util.cleanTextProperty(text);
        },
        text: function () {
            return this.GetAttrSync("name");
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('Link.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
		if (ev.type === 'click') {
            recorder.sendRecordEvent(this, ev, {
                event: 'onclick',
                'event point': { x: ev.clientX, y: ev.clientY },
            });
            return true;
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
    }
};

var ImageBehavior = {
    _micclass: ["Image"],
    _attrs: {
        "logical name": function () {
            switch (this._elem.tagName) {
                case "IMG":
                    return this._getNiceName(this._elem.alt) ||
						this._getNiceName(this._elem.src);
                case "INPUT":
                    return this._getNiceName(this._elem.alt) ||
						this._getNiceName(this._elem.name) ||
						this._getNiceName(this._elem.src);
                case "AREA":
                    return this._getNiceName(this._elem.alt) ||
						this._getNiceName(this._elem.href);
            }
        },

        "name": function () {
            return this._getNiceName(this._elem.name) || "Image";
        },

        "alt": function () {
            return this._elem.alt || "";
        },

        "src": function () {
            return this._elem.src || "";
        },

        "file name": function () {
            var src = this.GetAttrSync("src");
            if (src.indexOf("data:") === 0)
                return "";
            return src.replace(/.*\//, "");
        },

        "image type": function () {
            return this._getImageTypeName();
        }
    },

    _helpers: {
        _getNiceName: function (name) {
            if (!name) {
                return name;
            }
            var nice_name = name;
            nice_name = nice_name.replace(/.*\\/, "");  // compatability with WIFF
            nice_name = nice_name.replace(/.*\//, "");  // remove directory
            nice_name = nice_name.replace(/\.[^.]*$/, ""); // remove extension
            return nice_name;
        },

        _getImageTypeName: function () {
            if (this._elem.tagName === "INPUT") {
                return "Image Button";
            }
            var isMap = this._elem.isMap;
            var useMap = this._elem.useMap || "";
            if (isMap && useMap.length > 0) {
                return "Client & Server Side ImageMap";
            }
            if (isMap) {
                return "Server Side ImageMap";
            }
            if (useMap.length > 0) {
                return "Client Side ImageMap";
            }
            return "Plain Image";
        },
        isLearnable: Util.alwaysTrue
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('Image.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);

        var eventData;
        switch (ev.type) {
            case 'click':
                eventData = getEventData.call(this, ev);
                recorder.sendRecordEventWithQueue(this, ev, eventData);
                return true;
            default:
                return false;
        }

        return; 

        // Helper function
        function getEventData(ev) {
            var imgType = this.GetAttrSync('image type');
            return {
                event: 'on' + ev.type,
                'event point': { x: ev.clientX, y: ev.clientY },
                'image type': imgType
            };
        }
    },
};
var ImageLinkBehavior = {
    _micclass: ["Image", "Hyperlink"],
    _attrs: {
        "href": function () {
            var parentAnchor;
            return (parentAnchor = this._getImageParentAnchor()) ?
				parentAnchor.href : "";
        },

        "url": function () {
            return this.GetAttrSync("href");
        },

        "target": function () {
            var parentAnchor;
            return (parentAnchor = this._getImageParentAnchor()) ?
				parentAnchor.target : "";
        },

        "image type": function () {
            var type = this._getImageTypeName();
            if (type !== "Server Side ImageMap") {
                type = "Image Link";
            }
            return type;
        },

        "attribute": function (msg) {
            var attrVal = this._getAttributes(this._elem, msg);
            if (attrVal)
                return attrVal;

            var parentAnchorElem = this._getImageParentAnchor();
            if (parentAnchorElem)
                return this._getAttributes(parentAnchorElem, msg) || "";

            return "";
        }
    },

    override: {
        getParent: function () {
            var anchor = this._getImageParentAnchor();
            return this._getParentAO(anchor);
        }
    }
};

var CheckBoxBehavior = {
    _micclass: ["WebCheckBox", "HtmlToggle"],
    _attrs: {
        "part_value": function () {
            return this._elem.checked ? "ON" : "OFF";
        },

        "data": function () {
            return this.GetAttrSync("part_value");
        },

        "value": function () {
            return this._elem.value || "ON";
        },

        "checked": function () {
            return this._elem.checked ? 1 : 0;
        }
    },
    _methods: {
        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("CheckBoxBehavior: on command SET_DATA");
            if (this.GetAttrSync("part_value") !== msg._data.data) {
                this._fireEvent(this._elem, "click", {});
            }
            resultCallback(msg);
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('CheckBox.eventHandler: Received recordable event: ' + ev.type);
		switch (ev.type) {
            case 'click':
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    part_value: this._elem.checked ? 'ON' : 'OFF',
                });
                return true;
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
    }
};

var RadioGroupBehavior = {
    _micclass: ["WebRadioGroup", "HtmlToggle"],
    _attrs: {
        "checked": function () {
            return this._radios[this._activeRadio].checked ? 1 : 0;
        },

        "value": function () {
            var val = this._elem.value || "";
            var not_unique = this._radios.filter(function (elem) {
                return elem.value === val;
            }).length > 1;
            if (val === "" || val === "on" || not_unique) {
                return "#" + this._activeRadio;
            }
            return val;
        },

        "all items": function () {
            return this._radios.map(function (elem) {
                return elem.value || "on"; // IE & FF return "on" as default value
            }).join(";");
        },

        "selected item index": function () {
            return this._activeRadio + 1;
        },

        "items count": function () {
            return this._radios.length;
        },

        "data": function () {
            return this.GetAttrSync("value");
        }
    },

    _methods: {
        "SET_ACTIVE_RADIO_BY_VALUE": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command SET_ACTIVE_RADIO_BY_VALUE");
            var val = msg._data.value;
            if (!val) {
                resultCallback(msg);
                return;
            }
            var matches = val.match(/^#(\d+)$/);
            if (matches) {
                var index = parseInt(matches[1], 10);
                if (index >= 0 && index < this._radios.length) {
                    this._elem = this._radios[index];
                    this._activeRadio = index;
                } else {
                    ErrorReporter.ThrowItemNotFound();
                }
            } else {
                for (var i = 0; i < this._radios.length; i++) {
                    if (this._radios[i].value === val) {
                        this._elem = this._radios[i];
                        this._activeRadio = i;
                        resultCallback(msg);
                        return;
                    }
                }
                ErrorReporter.ThrowItemNotFound();
            }

            resultCallback(msg);
        },

        "CALL_EVENT": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command CALL_EVENT");
            this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, function (resMsg) {
                var event = resMsg._data.event;
                event = event.replace(/^on/, "");
                this._fireEvent(this._elem, event, resMsg._data);
                resultCallback(resMsg);
            }.bind(this));
        },

        "MAKE_VISIBLE": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command MAKE_VISIBLE");
            this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, function (/*resMsg*/) {
                CommonBehavior._methods.MAKE_VISIBLE.call(this, msg, resultCallback);
            }.bind(this));
        },

        "SET_ACTIVE_RADIO_BY_ELEMENT": function () {
            this._logger.trace("RadioGroupBehavior: on command SET_ACTIVE_RADIO_BY_ELEMENT");
            ErrorReporter.ThrowNotImplemented("SET_ACTIVE_RADIO_BY_ELEMENT");
        },

        "SET_DATA": function (msg, resultCallback) {
            this._logger.trace("RadioGroupBehavior: on command SET_DATA");
            msg._data.value = msg._data.data;
            this.InvokeMethod("SET_ACTIVE_RADIO_BY_VALUE", msg, resultCallback);
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('RadioGroup.eventHandler: Received recordable event: ' + ev.type);
		switch (ev.type) {
            case 'click':
                recorder.sendRecordEvent(this, ev, {
                    event: 'onclick',
                    value: this.GetAttrSync('value'),
                });
                return true;
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
    }
};

var ListBehavior = {
    _micclass: ["WebList", "StdObject"],
    _attrs: {
        "name": function () {
            return this._elem.name || "select";
        },

        "select type": function () {
            return this._elem.multiple ? "Extended Selection" : (this._elem.size > 1 ? "Single Selection" : "ComboBox Select");
        },

        "multiple value": function () {
            return this.GetAttrSync("selection");
        },

        "selection": function () {
            return this._getOptionTextWithPred(this._selectedPred);
        },

        "value": function () {
            return this.GetAttrSync("selection");
        },

        "default value": function () {
            return this._getOptionTextWithPred(function (option) {
                return option.defaultSelected;
            });
        },

        "all items": function () {
            return Array.prototype.map.call(this._elem.options,
                function (e) { return e.text; }
            ).join(';');
        },

        "items count": function () {
            return this._elem.options.length;
        },

        "selected item index": function () {
            if (this._elem.multiple) {
                var indexes = [];
                for (var i = 0; i < this._elem.options.length; i++) {
                    if (this._elem.options[i].selected) {
                        indexes.push(i);
                    }
                }
                return indexes.join(";");
            } else {
                var val = this._elem.selectedIndex;
                return (val != null && val !== -1) ? val.toString() : "";
            }
        },

        "selected items count": function () {
            if (this._elem.multiple) 
                return Array.prototype.filter.call(this._elem.options, this._selectedPred).length;
            else 
                return 1;
        },

        "visible items": function () {
            return this._elem.size;
        },

        "multiple": function () {
            return this._elem.multiple;
        },

        "hwnd": function () {

        },

        "data": function () {
            return this.GetAttrSync("value");
        },

        "innertext": function () {
            var all_items = this.GetAttrSync("all items");
            all_items = all_items.replace(/;/g, " ");
            all_items = " " + all_items;
            all_items = all_items.replace(/\xA0/g, " ");
            all_items = all_items.replace(/\r|\n/g, "");
            return all_items;
        }
    },

    _methods: {
        "ITEM_TO_NUM": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command ITEM_TO_NUM");
            var item = msg._data.AN_ITEM_TEXT;
            for (var i = 0; i < this._elem.options.length; ++i) {
                if (this._elem.options[i].value === item) {
                    msg._data.item_index = i;
                    resultCallback(msg);
                    return;
                }
            }
            ErrorReporter.ThrowItemNotFound();
        },

        "NUM_TO_ITEM": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command NUM_TO_ITEM");
            var index = msg._data.item_index;
            if (index < 0 || index >= this._elem.options.length) {
                ErrorReporter.ThrowItemNotFound();
            }
            msg._data.AN_ITEM_TEXT = this._elem.options[index].text;
            resultCallback(msg);
        },

        "LIST_SELECT": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_SELECT");
            var rtn = this._getOptionItemToSelect(msg._data.value);
            this._elem.selectedIndex = rtn.index;
            resultCallback(msg);
        },

        "LIST_EXTEND_SELECT": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_EXTEND_SELECT");
            var rtn = this._getOptionItemToSelect(msg._data.value);
            rtn.option.selected = true;
            resultCallback(msg);
        },

        "LIST_DESELECT": function (msg, resultCallback) {
            this._logger.trace("ListBehavior: on command LIST_DESELECT");
            var rtn = this._getOptionItemToSelect(msg._data.value);
            rtn.option.selected = false;
            resultCallback(msg);
        },

        "SET_DATA": function (data, resultCallback) {
            // Throw an exception - method seems not to be in use 
            // (it doesn't work in the current state)
            ErrorReporter.ThrowNotImplemented("AO->ListBehavior._methods.SET_DATA");

            this._logger.trace("ListBehavior: on command SET_DATA");
            data = data.data;
            var matches = data.match(/^#(\d+)$/);
            if (matches) {
                data.value = parseInt(matches[1], 10);
            } else {
                data.value = data;
            }
            this.InvokeMethod("LIST_SELECT", data, resultCallback);
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('List.eventHandler: Received recordable event: ' + ev.type);
		switch (ev.type) {
            case 'click':
                return true;
		    case "mousedown":
		        if (ev.target === this._elem)  // Don't update selection when clicking on an OPTION element
		            this._updatePreviousSelection();

		        return false; // No recording, only saving previous selection
            case 'change':
                var selection = this._elem.multiple ? // when multiple, the package expects 'value' to be an array
                    [this._getOptionsWithPred(this._selectedPred)] :
                    this.GetAttrSync('selection');

                recorder.sendRecordEvent(this, ev, {
                    event: 'onchange',
                    value: selection,
                    previous_selection: [this._elem.previousSelection],
                });
                this._updatePreviousSelection();
                return true;
        }
    },
    _helpers: {
        _getOptionItemToSelect: function (item) {
            var rtnVal = {};
            if (typeof (item) === "number") {
                if (item >= 0 && item < this._elem.options.length) {
                    rtnVal.index = item;
                    rtnVal.option = this._elem.options[item];
                }
            } else {
                for (var i = 0; i < this._elem.options.length; ++i) {
                    if (this._elem.options[i].text === item) {
                        rtnVal.index = i;
                        rtnVal.option = this._elem.options[i];
                        break;
                    }
                }
            }
            if (rtnVal.index === undefined) {
                ErrorReporter.ThrowItemNotFound();
            }
            return rtnVal;
        },
        _getUniqueValue: function (opt, i) {
            if (!opt) // for empty strings return the index
                return '#' + i;

            var matches = Array.prototype.filter.call(this._elem.options, function (curr) {
                return opt === curr.text;
            });
	    
	    if (matches.length === 1) {
	        return opt;
	    }
		
	    // for duplicate values, return the index
	    return '#' + i;
        },
        _getOptionsWithPred: function (pred) {
            var arr = [];            
            Array.prototype.forEach.call(this._elem.options, function (option, i) {
                if (pred(option)) {
                    arr.push(this._getUniqueValue(option.text, i));
                }
            }, this);
            return arr;
        },
        _getOptionTextWithPred: function (pred) {
            return this._getOptionsWithPred(pred).join(';');
        },
        _selectedPred: function(e) { return e.selected; },
        _updatePreviousSelection: function () {
            this._elem.previousSelection = this._getOptionsWithPred(this._selectedPred);
        },
        isLearnable: Util.alwaysTrue,
        UseEventConfiguration: function (event) {
            return event.type !== "mousedown";
        }
    }
};

var TableBehavior = {
    _micclass: ["WebTable"],
    _attrs: {
        "name": function () {
            if (this._elem.name) {
                return this._elem.name;
            }
            var children = this._elem.getElementsByTagName("*");

            for (var i = 0; i < children.length; i++) {
                if (["TH", "TR", "TD"].indexOf(children[i].tagName) !== -1) {
                    continue;
                }
                var ao = content.kitsManager.createAO(children[i], this._parentID);
                if (Util.getMicClass(ao) === "WebElement") {
                    continue;
                }
                var name = ao.GetAttrSync("name");
                if (name && name.trim() !== "") {
                    return name;
                }
            }
            return "WebTable";
        },

        "border": function () {
            return this._elem.border;
        },

        "rows": function () {
            return this._elem.rows.length;
        },

        "cols": function (msg) {
            Util.assert(typeof msg._data.cols === "object" || Util.isNullOrUndefined(msg._data.cols), "TableBehavior.cols: The passed '_data.cols' argument is neither object nor undefined! Value: " + msg._data.cols, this._logger);

            if (this._elem.rows.length === 0) {
                return 0;
            }
            return this._elem.rows[0].cells.length;
        },

        "column names": function () {
            for (var i = 0; i < this._elem.rows.length; i++) {
                var colName = this._elem.rows[i].innerText || this._elem.rows[i].textContent;
                if (colName.trim() !== "") {
                    return Util.makeArray(this._elem.rows[i].cells).map(innerText).join(";");
                }
            }
            // Helper function
            function innerText(e) { return e.innerText||e.textContent; }
        },

        "logical name": function () {
            var caption = this.GetAttrSync("table caption");
            if (caption) {
                return caption;
            }

            // The table name is the name of the first object that has a non empty name 
            var rows = this._elem.rows;
            for (var i = 0; i < rows.length; i++) {
                var cells = rows[i].cells;
                for (var j = 0; j < cells.length; j++) {
                    var children = cells[j].children;
                    for (var k = 0; k < children.length; k++) {
                        var ao = content.kitsManager.createAO(children[k], this._parentID);
                        var rtnVal;
                        // if this a table then instead of taking the entire table text we take
                        // the logical name of this table
                        if (children[k].tagName === "TABLE") {
                            rtnVal = ao.GetAttrSync("logical name");
                        } else {
                            rtnVal = ao.GetAttrSync("innertext");
                        }
                        // if we got meaningfull text then return
                        if (rtnVal && rtnVal.trim() !== "") {
                            return rtnVal;
                        }
                    }

                    // for cases where the cell itself contains text
                    var innerText = cells[j].innertext || cells[j].textContent;
                    if (innerText.trim() !== "")
                        return innerText;
                }
            }

        },

        "cell id": function (msg) {
            var row = msg._data["cell id"][0][0];
            var col = msg._data["cell id"][0][1];
            var id = msg._to;

            // when the coordinates are (0,0) - return the table id
            if (row === 0 && col === 0) {
                return id;
            }

            // change index to zero-based
            --row;
            --col;

            // row index out of bounds
            if (row < 0 || row >= this._elem.rows.length) {
                return;
            }

            // if the column was zero (now it is -1) then return the row id
            if (col === -1) {
                id.object = content.kitsManager.createAO(this._elem.rows[row], this._parentID).getID().object;
                return id;
            }

            // column index out of bounds
            if (col < 0 || col >= this._elem.rows[row].cells.length) {
                return;
            }

            id.object = content.kitsManager.createAO(this._elem.rows[row].cells[col], this._parentID).getID().object;
            return id;
        },

        "table caption": function () {
            return this._elem.caption ? this._elem.caption.innerText || this._elem.caption.textContent : "";
        }
    },
    _methods: {
        "GET_TABLE_DATA": function (msg, resultCallback) {
            this._logger.trace("TableBehavior: on command GET_TABLE_DATA");
            var rows = this._elem.rows;
            var maxcol = 0;
            for (var i = 0; i < rows.length; i++) {
                var cells = rows[i].cells;
                var rowText = [[]];
                for (var j = 0; j < cells.length; j++) {
                    var ao = content.kitsManager.createAO(cells[j], this._parentID);
                    rowText[0].push(ao.GetAttrSync("text"));
                }
                if (cells.length > maxcol) {
                    maxcol = cells.length;
                }
                msg._data["WEB_PN_ROW_DATA" + (i + 1)] = rowText;
            }
            msg._data.row = rows.length;
            msg._data.WEB_AN_MAX_COLUMN = maxcol;
            resultCallback(msg);
        },

        "GET_TABLE_COLUMN": function (msg, resultCallback) {
            this._logger.trace("TableBehavior: on command GET_TABLE_COLUMN");
            if (typeof (msg._data.row) !== "number") {
                ErrorReporter.ThrowInvalidArg();
            }

            var rows = this._elem.rows;
            if (msg._data.row < 1 || msg._data.row > rows.length) { // Out of range (one based)
                ErrorReporter.ThrowOutOfRange();
            }

            msg._data.col = rows[msg._data.row - 1].cells.length;
            resultCallback(msg);
        },

        "GET_TABLE_CELL_DATA": function (msg, resultCallback) {
            this._logger.trace("TableBehavior: on command GET_TABLE_CELL_DATA");
            if (typeof (msg._data.row) !== "number" || typeof (msg._data.col) !== "number") {
                ErrorReporter.ThrowInvalidArg();
            }

            var rows = this._elem.rows;
            if (msg._data.row < 1 || msg._data.row > rows.length) { // Out of range (one based)
                ErrorReporter.ThrowOutOfRange();
            }

            var cells = rows[msg._data.row - 1].cells;
            if (msg._data.col < 1 || msg._data.col > cells.length) { // Out of range (one based)
                ErrorReporter.ThrowOutOfRange();
            }
            var ao = content.kitsManager.createAO(cells[msg._data.col - 1], this._parentID);
            msg._data.text = ao.GetAttrSync("text");
            resultCallback(msg);
        },

        "GET_ROW_WITH_CELLTEXT": function (msg, resultCallback) {
            this._logger.trace("TableBehavior: on command GET_ROW_WITH_CELLTEXT");
            var start_row = msg._data.row;
            var column = msg._data.col;
            var text = msg._data.text;

            if (typeof (start_row) !== "number" || typeof (column) !== "number") {
                ErrorReporter.ThrowInvalidArg();
            }

            if (start_row > this._elem.rows.length) {
                ErrorReporter.ThrowOutOfRange();
            }

            if (column > this._elem.rows[start_row > 0 ? start_row - 1 : 0].cells.length) {
                ErrorReporter.ThrowOutOfRange();
            }

            msg._data = {};
            msg._attr_names = ["row"];

            msg._data.row = -1;

            var table_text = this.GetAttrSync("text");
            if (table_text.indexOf(text) === -1) { //Check if text in the table at all.
                resultCallback(msg);
                return;
            }

            var i = start_row > 0 ? start_row - 1 : 0;
            for (; i < this._elem.rows.length; i++) {
                if (column > 0) {
                    var row_text = content.kitsManager.createAO(this._elem.rows[i].cells[column - 1], this._parentID).GetAttrSync("text");
                    if (row_text.indexOf(text) !== -1) {
                        msg._data.row = i + 1;
                        resultCallback(msg);
                        return;
                    }
                } else { // look under all columns
                    for (var j = 0; j < this._elem.rows[i].cells.length; j++) {
                        var cell_text = content.kitsManager.createAO(this._elem.rows[i].cells[j], this._parentID).GetAttrSync("text");
                        if (cell_text.indexOf(text) !== -1) {
                            msg._data.row = i + 1;
                            resultCallback(msg);
                            return;
                        }
                    }
                }
            }
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue
    }
};

var AreaBehavior = {
    _micclass: ["WebArea"],
    _attrs: {
        "logical name": function () {
            if (this._elem.alt) {
                return this._elem.alt;
            }

            var img = this._getImageElement();
            if (img) {
                return img.src;
            }

            return "WebArea";
        },

        "image type": function () {
            return "Client Side ImageMap";
        },

        "alt": function () {
            return this._elem.alt;
        },

        "url": function () {
            return this._elem.href;
        },

        "href": function () {
            return this.GetAttrSync("url");
        },

        "src": function () {
            var img = this._getImageElement();
            return img ? img.src : "";
        },

        "rect": function () {
            var img = this._getImageElement();
            var rect = { left: 0, top: 0, right: 0, bottom: 0 };
            if (!img) {
                return rect;
            }

            var img_rect = img.getBoundingClientRect();
            var coords = this._elem.coords.split(/\s*,\s*/);
            coords = coords.map(function (e) { return parseInt(e, 10); });
            switch (this._elem.shape.toLowerCase()) {
                case "rect":
                    if (coords.length === 4) {
                        rect.left = coords[0];
                        rect.top = coords[1];
                        rect.right = coords[2];
                        rect.bottom = coords[3];
                    }
                    break;
                case "circle":
                    if (coords.length === 3) {
                        var x = coords[0];
                        var y = coords[1];
                        var radius = coords[2];
                        if (radius < 0) {
                            break;
                        }
                        rect.left = x - radius;
                        rect.top = y - radius;
                        rect.right = x + radius;
                        rect.bottom = y + radius;
                    }
                    break;
                case "poly":
                case "polygon":
                    if (coords.length >= 2) {
                        var x1, x2;
                        var y1, y2;
                        x1 = x2 = coords[0];
                        y1 = y2 = coords[1];
                        for (var i = 2; i < coords.length; i += 2) {
                            x1 = x1 < coords[i] ? x1 : coords[i];
                            x2 = x2 > coords[i] ? x2 : coords[i];
                            y1 = y1 < coords[i + 1] ? y1 : coords[i + 1];
                            y2 = y2 > coords[i + 1] ? y2 : coords[i + 1];
                        }
                        rect.left = x1;
                        rect.top = y1;
                        rect.right = x2;
                        rect.bottom = y2;
                    }
                    break;
            }
            return {
                left: img_rect.left + rect.left,
                top: img_rect.top + rect.top,
                right: img_rect.left + rect.right,
                bottom: img_rect.top + rect.bottom
            };
        },

        "width": function () {
            var rect = this.GetAttrSync("rect");
            return rect.right - rect.left;
        },

        "height": function () {
            var rect = this.GetAttrSync("rect");
            return rect.bottom - rect.top;
        },

        "map name": function () {
            var parent = this._elem;
            while (parent) {
                if (parent.tagName === "MAP") {
                    break;
                }
                parent = parent.parentNode;
            }

            if (parent) {
                return parent.name;
            }
        },

        "coords": function () {
            return this._elem.coords;
        },

        "coordinates": function () {
            return this.GetAttrSync("coords");
        },
        "visible": function () {
            // Hardcoded defect. Always returning true to keep this aligned with IE.
            // Correct behavior should be to return the visibility of the image element.
            return true;
        },
    },
    _helpers: {
        _getImageElement: function () {
            var parent = this._elem;
            while (parent) {
                if (parent.tagName === "MAP") {
                    break;
                }
                parent = parent.parentNode;
            }

            if (parent) {
                var name = parent.name;
                for (var i = 0; i < document.images.length; i++) {
                    if (document.images[i].useMap.substring(1) === name) {
                        return document.images[i];
                    }
                }
            }
        },
        getParent: function () {
            var img = this._getImageElement();
            return content.kitsManager.createAO(img, this._parentID);
        },
        isLearnable: Util.alwaysTrue,
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('WebArea.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
		if (ev.type === 'click') {
            recorder.sendRecordEvent(this, ev, {
                event: 'onclick',
                'event point': { x: ev.clientX, y: ev.clientY },
            });
            return true;
        }
    },
};

var FileInputBehavior = {
    _micclass: ["WebFile", "WebEdit", "WebButton", "StdObject"],
    _attrs: {
        "name": function () {
            return this._elem.name || "WebFile";
        },
        "readonly": function () {
            return this._elem.readonly ? 1 : 0;
        },
        "width in characters": function () {
            return this._elem.size;
        },
        "value": function () {
            return this._getFilesText();
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        _getFilesText: function () {
            var files = [];
            for (var i = 0; i < this._elem.files.length; ++i) {
                files.push(this._elem.files[i]);
            }
            var filesText = files.map(function(file) { return file.name; }).join(", ");
            return filesText;
        }
    },
    _eventHandler: function (recorder, ev) {
        this._logger.trace('WebFile.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
		switch (ev.type) {
            case 'click':
                return true;
            case 'focus':
                recorder.sendRecordEvent(this, ev, { event: 'onfocus' });
                this._elem._beforeChangeFilesValue = this._getFilesText();
                return true;
            case 'blur':
                var filesText = this._getFilesText();
                if (filesText !== this._elem._beforeChangeFilesValue) {
                    recorder.sendRecordEvent(this, ev, {
                        event: 'onchange',
                        value: filesText,
                        type: this._elem.type,
                        force_record: true,
                    });
                }
                return true;
            default:
                return false;
        }
    }
};

var RangeBaseBehavior = {
    _attrs: {
        "min": function () {
            return this._elem.min;
        },

        "max": function () {
            return this._elem.max;
        },

        "step": function () {
            return this._elem.step;
        }
    }
};

var RangeBehavior = {
    _micclass: ["WebRange"],
    _attrs: {
        "require web replay": Util.alwaysTrue
    },
    _helpers: {
        isLearnable: Util.alwaysTrue
    }
};

var NumberBehavior = {
    _micclass: ["WebNumber"],
    _helpers: {
        isLearnable: Util.alwaysTrue
    }
};

var MediaBaseBehavior = {
    _attrs: {
        "src": function () {
            return this._elem.src;
        },

        "current source": function () {
            return this._elem.currentSrc;
        },

        "sources": function () {
            var srcs = Array.prototype.map.call(this._elem.getElementsByTagName('source'), function (e) { return e.src; });
            return srcs.join(';');
        },

        "duration": function () {
            var d = this._elem.duration || 0;
            return Math.round(d * 1000);
        },

        "current time": function () {
            var d = this._elem.currentTime || 0;
            return Math.round(d * 1000);
        },

        "autoplay": function () {
            return this._elem.autoplay;
        },

        "loop": function () {
            return this._elem.loop;
        },

        "controls": function () {
            return this._elem.controls;
        },

        "muted": function () {
            return this._elem.muted;
        },

        "playing": function () {
            return !(this._elem.paused || this._elem.ended);
        },

        "volume": function () {
            var d = this._elem.volume;
            return d.toFixed(2);
        },

        "playback rate": function () {
            var d = this._elem.playbackRate;
            return d.toFixed(2);
        },
    }
};

var VideoBehavior = {
    _micclass: ["WebVideo"],
    _attrs: {
        "name": function () {
            return "WebVideo";
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue
    }
};

var AudioBehavior = {
    _micclass: ["WebAudio"],
    _attrs: {
        "name": function () {
            return "WebAudio";
        }
    },
    _helpers: {
        isLearnable: Util.alwaysTrue
    }
};

var VirtualTextBehavior = {
    MIN_CHARS_IN_TEXT: 10,
    _attrs: {
        "micclass": function() {
            return "";
        },
        "text before": function () {
            return this._getTextBeforeData().text;
        },
        "text after": function () {
            var selectedRange = this._elem;

            // Create a custom Range object for all after the selected
            var afterTxtRange = new Range();
            afterTxtRange.setStart(selectedRange.endContainer, selectedRange.endOffset);
            afterTxtRange.setEndAfter(document.body.lastChild);

            // Get all after text
            var allAfterTxt = Util.cleanSpecialChars(afterTxtRange.toString().trimLeft());
            allAfterTxt = Util.cleanMultipleSpaces(allAfterTxt);

            // Return if the after text is too short
            if (allAfterTxt.length <= VirtualTextBehavior.MIN_CHARS_IN_TEXT)
                return allAfterTxt;

            // Cut the text in the first space after the minimum number of chars
            var lastSpaceIndex = allAfterTxt.indexOf(' ', VirtualTextBehavior.MIN_CHARS_IN_TEXT);
            if (lastSpaceIndex === -1)
                return allAfterTxt;

            var afterTxt = allAfterTxt.substr(0, lastSpaceIndex);
            return afterTxt;
        },
        "newindexoftextafter": function () {
            // Since we get the text just after the "Selected Text", So the LastIndex should always be 1
            return 1;
        },
        "indexoftextbefore": function () {
            return this._getTextBeforeData().index;
        },
        "frame name": function () {
            return "";
        },
        "is input text": function () {
            var range = this._elem;
            var relatedElement = range.commonAncestorContainer;
            
            var nodeName = relatedElement.nodeName.toLowerCase();      
            switch (nodeName) {
                case "input":
                case "textarea":
                    return true;
            }

            return false;
        }
    },
    _helpers: {
        isLearnable: Util.alwaysFalse,
        _getTextBeforeData: function () {
            if (this._txtBeforeData) // instantiate this lazily
                return this._txtBeforeData;

            var selectedRange = this._elem;

            // Create a custom Range object for all before the selected
            var beforeTxtRange = new Range();
            beforeTxtRange.setStart(document.body, 0);
            beforeTxtRange.setEnd(selectedRange.startContainer, selectedRange.startOffset);

            // Get all after text
            var allBeforeText = Util.cleanSpecialChars(beforeTxtRange.toString().trimRight());
            allBeforeText = Util.cleanMultipleSpaces(allBeforeText);

            // Return if the before text is too short
            if (allBeforeText.length <= VirtualTextBehavior.MIN_CHARS_IN_TEXT)
                return allBeforeText;

            // Cut the text in the first space after the minimum number of chars
            var lastSpaceIndex = allBeforeText.lastIndexOf(' ', allBeforeText.length - VirtualTextBehavior.MIN_CHARS_IN_TEXT);

            if (lastSpaceIndex === -1) {
                this._txtBeforeData = {
                    text: allBeforeText,
                    index: 1
                };
            }
            else {
                var beforeTxt = allBeforeText.substr(lastSpaceIndex + 1);
                this._txtBeforeData = {};
                this._txtBeforeData.text = beforeTxt;
                this._txtBeforeData.index = Util.stringCount(allBeforeText, beforeTxt);
            }

            return this._txtBeforeData;
        }
    }
};

var FormBehavior = {
    _eventHandler: function (recorder, ev) {
        this._logger.trace('FormBehavior.eventHandler: Received recordable event on ' + this._elem.tagName + ': ' + ev.type);
        switch (ev.type) {
            case 'keydown':
                if (ev.which === 13) // 13 is the 'Enter' key
                    this._elem._submitTargetElem = ev.target;
                return true;
            case 'keyup':
            case 'click':
                this._elem._submitTargetElem = null;
                return true;
            case 'submit':
                // Check if there's a target element for the submit
                if (!this._elem._submitTargetElem)
                    return true;

                var ao = content.kitsManager.createAO(this._elem._submitTargetElem, this._parentID);
                recorder.sendRecordEvent(ao, ev, {
                    event: 'onsubmit'
                });
                return true;
        }
    }
};

var PluginBehavior = {
    _attrs: {
        qtp_slv_cookie: function () {
            var ret = this._elem.getAttribute('qtp_slv_cookie') ;
            this._logger.trace('Asked for qtp_slv_cookie returning: ' + ret);
            return ret || '';
        }
    }
};

var EventTypes = {
    "domfocusin": "UIEvents",
    "domfocusout": "UIEvents",
    "domactivate": "UIEvents",
    "click": "MouseEvents",
    "dblclick": "MouseEvents",
    "mousedown": "MouseEvents",
    "mouseup": "MouseEvents",
    "mouseover": "MouseEvents",
    "mousemove": "MouseEvents",
    "mouseout": "MouseEvents",
    "contextmenu": "MouseEvents",
    "domsubtreemodified": "MutationEvents",
    "domnodeinserted": "MutationEvents",
    "domnoderemoved": "MutationEvents",
    "domnoderemovedfromdocument": "MutationEvents",
    "domnodeinsertedintodocument": "MutationEvents",
    "domattrmodified": "MutationEvents",
    "domcharacterdatamodified": "MutationEvents",
    "load": "HTMLEvents",
    "unload": "HTMLEvents",
    "abort": "HTMLEvents",
    "error": "HTMLEvents",
    "select": "HTMLEvents",
    "change": "HTMLEvents",
    "submit": "HTMLEvents",
    "reset": "HTMLEvents",
    "focus": "HTMLEvents",
    "blur": "HTMLEvents",
    "resize": "HTMLEvents",
    "scroll": "HTMLEvents",
    "keydown": "KeyboardEvent",
    "keypress": "KeyboardEvent",
    "keyup": "KeyboardEvent"
};
