var PageProxy = {

    _activeAO: null,
	
	setActiveAO : function(ao){
		this._activeAO = ao;
	},
	
	install:function(){
        this._logger = new LoggerUtil("Content.PageProxy ");
 
        window.addEventListener("_UFT_TOOLKIT_RESULT", this.onMessageFromPage.bind(this), false);
		
        content.domSubscriber.startNamespace();
		content.domSubscriber.addUtilityObject("_QTPUtil", new QTPUtil()); 
		content.domSubscriber.addUtilityObject("PageAgent", PageAgent, {"_UFT_INVOKE_REQUEST": "onInvokeRequest"});
		content.domSubscriber.addScript("PageAgent._logger = _logger;");
		content.domSubscriber.addFunction(ScriptWrapper);
        content.domSubscriber.endNamespace();
		
		PageAgent._logger = new LoggerUtil("Content.PageAgent");
	},
		
	onMessageFromPage : function (eventObj){
	    // detail: {op: "operation", data: {...} }
	    var detail = Util.deepObjectClone(eventObj.detail);
	    var data = detail.data;
		switch(detail.op)
		{
			case "Report":
				if (!Util.isNullOrUndefined(this._activeAO))
					this._activeAO.report(data.status, data.method, this._wrapParameters(data.parameters), data.details, data.eventType);
				
				break;

		    case "Record":
		        data = detail.data;
		        data.parameters = this._wrapParameters(data.parameters);
		        if (!Util.isNullOrUndefined(data.WEB_PN_ID)) {
		            var frameId = Util.shallowObjectClone(data.WEB_PN_ID);
		            frameId.object = null;
		            var msg = new Msg("WEBEXT_RECORD_EVENT", frameId, data);
		            content.dispatcher.sendMessage(msg);
		        }
		        break;
			default:
				this._logger.warn("Unsupported Operation: " + detail.op);
				break;
		}
	},

	_wrapParameters: function (parameters) {
	    // In WebJsonParser, it will layout the parameters which is of type array in plain view.
        // e.g. ["p1", "p2"] result in -> ["param":"p1", "param":"p2"]
	    // wrap it with another array and it will be layout correct as one array attribute value.
        // now result to ["param":["p1", "p2"]].
	    return [parameters];
	},
	
	// Parameters:
	// @elem, the element serves as _elem 
	// @script: the composed JS script that contains the method to invoke and all required functions.
	// @methodName: the name of the method to be invoked
	// @args: the arguments to be used for the method
	invokeOnPage : function (key, elem, script, methodName, args)		
	{
		var detail = {};
		detail.key = key;
		detail.elemId = PageAgent.flagElement(elem);
		detail.script = script;
		detail.methodName = methodName;
		detail.args = args;
		detail.WEB_PN_ID = (Util.isNullOrUndefined(this._activeAO)) ? null : this._activeAO.getID();

		var event = BrowserServices.createCrossOriginCustomEvent("_UFT_INVOKE_REQUEST", { detail: detail })

		window.dispatchEvent(event);
		
		var result = PageAgent.getResult();
		
		return result;
	}
};

var PageAgent = {
	_logger:null,
	
    _scriptwrappers: [],

    _activeScriptWrapper: null,

	// Called when specificied event is received.
	// @eventObj: the event object, of type CustomEvent
    onInvokeRequest: function (eventObj) {

		var detail = eventObj.detail;

		var key = detail.key;

		var scriptWrapper = null;
        for (var index in this._scriptwrappers) {
			var obj = this._scriptwrappers[index];
            if (obj.key === key) {
			    scriptWrapper = obj;
			    break;
			}
		}

        if (scriptWrapper === null) {
			this._logger.info("create a new script wrapper.");
            scriptWrapper = new ScriptWrapper(key, detail.script);
			this._scriptwrappers.push(scriptWrapper);
		}

		var elemId = detail.elemId;
		var elem = this.getElement(elemId);
        var aoId = detail.WEB_PN_ID;

        var res = scriptWrapper.invoke(elem, detail.methodName, detail.args, aoId);

		// set result in documentElement's attribute, for Content script to query;
		this.setResult(res);

		this._logger.info("invoke result: " + res);		
	},

    wrap: function (obj) {
		// Encode special objects: HTMLElement, document, window
        var result = { special: true };

        if (obj instanceof HTMLElement) {
			result.type = "element";
			result.id = this.flagElement(obj);
		}
        else if (obj instanceof Window) {
			result.type = "window";
        } else if (obj instanceof Document) {
			result.type = "document";
		} else if (obj instanceof window.Event)
		{
			result.type = "event";
			result.data = this.wrapEvent(obj);
		}
        else {
			result = obj;
		}

		return result;
	},

    unwrap: function (obj) {
		var result = obj;
		// restore special objects: Window/Document/HTMLElement
        if (obj !== null && obj !== undefined && obj.special) {
            switch (obj.type) {
                case "document":
                    result = window.document;
                    break;
                case "window":
                    result = window;
                    break;
                case "element":
                    result = this.getElement(obj.id);
                    break;
                case "event":
                    result = this.unwrapEvent(obj.data);
                    break;
                default:
                    break;
			}
        } else {
			result = obj;
		}

		return result;
	},

    _getNextId: function () {
		var attr = document.documentElement.getAttribute("___nextUFTID");
        if (attr === null || attr === undefined) {
			attr = 1;
		}
        else {
			attr = 1 + parseInt(attr, 10);
		}

		document.documentElement.setAttribute("___nextUFTID", attr);

		return attr;
	},

    keyCustomAttribute: "_UFT_CUSTOM_ID",

    flagElement: function (elem) {
		var attribute = elem.getAttribute(this.keyCustomAttribute);
        if (attribute === null || attribute === undefined) {
			attribute = this._getNextId();
			elem.setAttribute(this.keyCustomAttribute, attribute);
		}

		return attribute;
	},

    getElement: function (id) {
		var elements = document.querySelectorAll("[" + this.keyCustomAttribute + "=\"" + id + "\"]");
		if (elements.length === 0) {
			_logger.error("Failed to find element with custom id " + id);
			return null;
		}
		else if (elements.length > 1)
			_logger.warn("more than one element matches the custom attribute id of " + id);
		var element = elements[0];

		return element;
	},

	_customResultAttributeKey: "__UFT__SYNC__RES",

    setResult: function (obj) {
		document.documentElement.setAttribute(this._customResultAttributeKey, Util.jsonStringify(obj, _logger));
	},

    getResult: function () {
		var jsonStr = document.documentElement.getAttribute(this._customResultAttributeKey);

		var jsonObj = JSON.parse(jsonStr);
        if (jsonObj.status === PageAgent.INVOKE_STATUS_PASS) {
			jsonObj.data = this.unwrap(jsonObj.data);
		}

		return jsonObj;
	},

	// Convert an event object to JSON string. 
	// Note: we cannot stringify event object by default because of DOM elements
	//  so we go through each attribute and wrap DOM related objects.
	//
    wrapEvent: function (eventObj) {
		var obj = {};
		for (var key in eventObj) {
		    obj[key] = this.wrap(eventObj[key]);
		}

		obj.eventPrototype = eventObj.constructor.name;

		var jsonStr = Util.jsonStringify(obj, _logger);
		return jsonStr;
	},

	// Restore the event obj from JSON string
	// Note: refer to wrapEvent to see how we handle the DOM objects.
    unwrapEvent: function (eventStr) {
		var o = JSON.parse(eventStr);
		for (var key in o) {
			o[key] = this.unwrap(o[key]);
		}

		return o;
    },

	INVOKE_STATUS_PASS: "passed",
	INVOKE_STATUS_FAIL: "failed",
	INVOKE_ERROR_METHOD_NOT_FOUND: "MethodNotFound",
	INOVKE_ERROR_GENERAL: "GeneralERROR",
};

// Serves for executing toolkit script in specific scope.
//
function ScriptWrapper(key, script) {
	this.key = key;
	var _elem = null;

	eval(script); // make the functions present and avaiable in private scope.


	this.invoke = function(elem, methodName, args, aoId){
		// restore _elem which is being used by toolkit script.
		// !!!Important!!!
		_elem = elem;

		this._elem = elem;
		this._aoId = aoId;
		PageAgent._activeScriptWrapper = this;

		var result;
		var m;		
	    try {
	        m = eval(methodName);
	        if ((typeof m) !== "function") {
	            throw { message: methodName + " is not a function" };
	        }
		    if (window[methodName] === m) {
		        throw { message: methodName + " is a window function" };
		    }
		} catch(e) {
			return {status:PageAgent.INVOKE_STATUS_FAIL, data:{type:PageAgent.INVOKE_ERROR_METHOD_NOT_FOUND, error:e.message}};
		}

		if (m !== null && m !== undefined) {
		    try {
		        var ret = m.apply(null, args);
		        result = { status: PageAgent.INVOKE_STATUS_PASS, data: PageAgent.wrap(ret) };
		    } catch (e) {
		        _logger.error("error in executing code, e=" + e);
		        result = { status: PageAgent.INVOKE_STATUS_FAIL, data: { type: PageAgent.INOVKE_ERROR_GENERAL, error: e.message } };
		    }
		}
		
		return result;
	};
}