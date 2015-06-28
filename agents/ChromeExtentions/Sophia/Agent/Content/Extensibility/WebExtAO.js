function WebExtAO(element, control, parentID){
    AO.call(this, element, parentID);
    this._logger = new LoggerUtil("WebExtAO");
    this._control = control;
    //_innerAO is the ao object created by toolkit defines func_to_get_base_elem. If no func_to_get_base_elem return null;
    this._innerAO = this._initInternalElement(element);
    //_baseAO is the base ao object of element.
    this._baseAO = WebKit.createAO(element, this._parentID, false);
    this._baseAO.setOuterAO(this); 
    this._excludeAttrs = [];
    this.mergeBehavior(WebExtAOBehavior);
    this._initMicClass();
    this._sendingReport = false;
}

WebExtAO.prototype = new AO();
WebExtAO.prototype.constructor = WebExtAO;
WebExtAO.prototype._initMicClass = function () {
    this._micclass = [this._control.controlType];

    var otherTypes = this._control.getSettingVar("other supported types");
    if (otherTypes)
        this._micclass = this._micclass.concat(otherTypes.split('; '));
};

WebExtAO.prototype._initInternalElement = function (element) {
    var innerAO = null;
    this._logger.trace("WebExtAO._initInternalElement: started");
    var innerElem = this._control.getInternalElement(element);
    if (!Util.isNullOrUndefined(innerElem)) {
        innerAO = content.kitsManager.createAO(innerElem, this._parentID, true);
    }
    return innerAO;
};

WebExtAO.prototype.GetAttr = function (property, msg, resultCallback) {
    this._logger.trace("WebExtAO.GetAttr: query property " + property);
    var propertyValue = this.GetExtAttr(property,msg);

    if (!Util.isNullOrUndefined(propertyValue)) {
        return resultCallback(Util.cleanSpecialChars(propertyValue));
    }
    else {
        return this._processProperty(property, msg, function () { this.GetAttr(property, msg, resultCallback); });
    }
};
WebExtAO.prototype.GetAttrSync = function (property, msg) {
    this._logger.trace("WEbExtAO.GetAttrSync: query property " + property);
    var propertyValue = this.GetExtAttr(property,msg);

    if (!Util.isNullOrUndefined(propertyValue)) {
        return Util.cleanTextProperty(propertyValue);
    }
    else {
        return this._processProperty(property, msg, function () { return this.GetAttrSync(property, msg); });
    }
};

WebExtAO.prototype.GetExtAttr = function (property,msg) {
    this._logger.trace("WebExtAO.GetExtAttr: started to query" + property);
    var propertyValue = null;

    this._lazyInit("_attrs", property);
    if (this._attrs[property]) {
        propertyValue = this._attrs[property].call(this,msg);
    }
    else {
        propertyValue = this._getControlExtAttr(property);
    }
    this._logger.trace("WebExtAO.GetExtAttr: " + property + " = " + propertyValue);
    return propertyValue;
};

WebExtAO.prototype._getControlExtAttr = function (property) {
    var propertyValue = null;
    if (this._excludeAttrs.indexOf(property) === -1) {
        propertyValue = this._control.getExtProperty(this._elem, property);
        if (Util.isNullOrUndefined(propertyValue)) {
            this._logger.trace("WebExtAO.GetExtAttr:fail to get " + property + " attribute from control");
            propertyValue = null;
            this._excludeAttrs.push(property);
        }
    }
    // Handle arrays - convert property value from array to string, just like in C++ code 
    // When property is micclass, if propertyValue is an Array, it need to be returned as an array 
    if (Array.isArray(propertyValue) && property !== "micclass")
        propertyValue = propertyValue.join(';');
    return propertyValue; 
};

WebExtAO.prototype._processProperty = function (property, msg, func) {
    if (!Util.isNullOrUndefined(this._innerAO) && !this._isCoreProperty(property)) {
        return func.call(this._innerAO);
    }
    else {
        return func.call(this._baseAO);
    }
};

WebExtAO.prototype.InvokeMethod = function (method, msg, resultCallback) {
    if (method === "WEBEXT_GENERIC_METHOD_NAME") {
        this._logger.trace("InvokeMethod: invoke ext method");
        return this.InvokeExtMethod(method, msg, resultCallback);
    }
    
    if (method === "GET_TABLE_DATA") {
        var funcToGetTableData = this._control.getSettingVar("func_to_get_table_data");
        if (!Util.isNullOrUndefined(funcToGetTableData) && funcToGetTableData.length > 0) {
            this._logger.trace("InvokeMethod: invoke ext method for GET_TABLE_DATA");
            return this._getTableData(funcToGetTableData, msg, resultCallback);
        }
    }

    if (!Util.isNullOrUndefined(this._innerAO)) {
        return this._innerAO.InvokeMethod(method, msg, resultCallback);
    }
    else {
        return this._baseAO.InvokeMethod(method, msg, resultCallback);
    }
};

WebExtAO.prototype._getTableData = function (getTableDataFunc, msg, resultCallback) {
    // Convert the 2-dimentional array to GET_TABLE_DATA desired format.
    var fillTableData = function (msg, data) {
        if (!Array.isArray(data)) {
            this._logger.error("The return value is not array for function " + getTableDataFunc);
            return;
        }

        var rows = data;
        var maxcol = 0;
        for (var i = 0; i < rows.length; ++i) {
            var cells = rows[i];

            if (!Array.isArray(cells)) {
                this._logger.error("The content is not array at row #" + i);
                return;
            }

            if (cells.length > maxcol) {
                maxcol = cells.length;
            }
            
            var rowText = [cells];
            msg._data["WEB_PN_ROW_DATA" + (i + 1)] = rowText;
        }
        msg._data.row = rows.length;
        msg._data.WEB_AN_MAX_COLUMN = maxcol;
    }.bind(this);

    var callbackWrapper = function (msg) {
        if (msg._data.WEBEXT_PN_METHOD_RETURN_VALUE) {
            fillTableData(msg, msg._data.WEBEXT_PN_METHOD_RETURN_VALUE);
        }

        resultCallback(msg);

    }.bind(this);

    this.invokeMethodOnControl(getTableDataFunc, [], msg, callbackWrapper);
};

WebExtAO.prototype.InvokeExtMethod = function (method, msg, callback) {
    if (method !== "WEBEXT_GENERIC_METHOD_NAME") {
        this._logger.warn("WebExtAO.InvokeExtMethod: the method name is not supported by Web Ext");
        ErrorReporter.ThrowGeneralError();
        return;
    }

    var extMethod = msg._data.WEBEXT_PN_METHOD_NAME;
    this._logger.trace("WebExtAO.InvokeExtMethod: the ext method name is " + extMethod);
    if (extMethod.length === 0) {
        this._logger.warn("WebExtAO.InvokeExtMethod: the method name is empty");
        ErrorReporter.ThrowInvalidArg();
    }
    var argsList = [];
    var argsCount = msg._data.WEBEXT_PN_METHOD_PARAMS_COUNT;
    this._logger.trace("InvokeExtMethod: the params count is " + argsCount);

    if (argsCount > 50 || argsCount<0) {
        this._logger.warn("WebExtAO.InvokeMethod: the argCount is not correct.WEBEXT_PN_METHOD_PARAMS_COUNT = " + argsCount.toString());
        ErrorReporter.ThrowInvalidArg();
    }
    else {
        for (var index = 0; index < argsCount; index++) {
            argsList.push(msg._data["WEBEXT_PN_METHOD_PARAM_" + index.toString()]);
        }
    }

    this.invokeMethodOnControl(extMethod, argsList, msg, callback);
};

WebExtAO.prototype.invokeMethodOnControl = function (methodName, argsList, msg, resultCallback) {

    var ret = this._invokeHandlerOnControl(methodName, argsList);
    
    var waitingForReportCallback = function (msg) {
        if (this._sendingReport) {
            window.setTimeout(waitingForReportCallback.bind(this), 50, msg);
        }
        else {
            resultCallback(msg);
        }
    }.bind(this);

    switch (ret.status) {
        case "pass":
            if (!Util.isNullOrUndefined(ret.data) && Util.isNullOrUndefined(msg._data.WEBEXT_PN_METHOD_RETURN_VALUE)) {
                msg._data.WEBEXT_PN_METHOD_RETURN_VALUE = ret.data;
            }

            waitingForReportCallback(msg);
            break;
        case "fail":
            this._processExtMethodCallError(ret.data, methodName, msg, waitingForReportCallback);
            break;

        default:
            ErrorReporter.ThrowGeneralError();
            break;
    }
};

WebExtAO.prototype._invokeHandlerOnControl = function (handlerName, argsList) {
    PageProxy.setActiveAO(this);
    var ret = this._control.invokeExtMethod(this._elem, handlerName, argsList);
    PageProxy.setActiveAO(null);
    return ret;
};

WebExtAO.prototype.isObjSpyable = function () {
    return this._control.isObjSpyable();
};

WebExtAO.prototype.report = function (status, method, parameters, details, type) {
    this._logger.trace("report: report started");
    var data = {
        WEBEXT_PN_REPORT_STATUS: status,
        WEBEXT_PN_METHOD_NAME: method,
        WEBEXT_PN_PARAMETERS: parameters,
        WEBEXT_PN_REPORT_DETAILS: details,
        WEBEXT_PN_REPORT_EVENT_TYPE: type
    };
    this._sendingReport = true;
    var msg = new Msg("WEBEXT_REPORT_LINE", this.getID(), data);
    content.dispatcher.sendMessage(msg, RtIdUtils.GetExtensionRtId(), null, function () {
        this._sendingReport = false;
    }.bind(this));

};
    
WebExtAO.prototype._processExtMethodCallError = function (errorResult, method, msg,callback) {
    if (Util.isNullOrUndefined(errorResult)) {
        ErrorReporter.ThrowGeneralError();
    }
    else {
        switch (errorResult.ErrorType) {
            case "Error":
                msg._data.WEBEXT_PN_EXE_ERROR_FILE = this._control.controlType + ".js";
                msg._data.WEBEXT_PN_EXE_ERROR_DESCRIPTION = errorResult.ErrorDescription;
                ErrorReporter.ThrowGeneralError();
                break;
            case "MethodNotFound":
                this._lazyInit("_methods", method);
                if (!this._methods[method]) {
                    this._logger.warn("InvokeMethod: unknown method " + method);
                    ErrorReporter.ThrowMethodNotFound();
                }
                else {
                    this._methods[method].call(this, msg, callback);
                }
                break;
            default:
                ErrorReporter.ThrowGeneralError();
                break;
        }
    }
};


WebExtAO.prototype.getControlLearnType = function () {
    return this._control._learnControl;
};

WebExtAO.prototype.getChildrenLearnType = function () {
    return this._control._learnChildren;
};

WebExtAO.prototype.getChildrenForLearn = function (element) {
    return this._control.getChildrenForLearn(element);
};


WebExtAO.prototype.RegisterExtEventHandler = function () {
    PageProxy.setActiveAO(this);
    this._control.RegisterExtEventHandler(this._elem);
    PageProxy.setActiveAO(null);

};

WebExtAO.prototype.ReceiveEvent = function (recorder, ev) {

    var attr = ev.target.getAttribute("_uft_ext_events_hooked");
    var json = attr ? JSON.parse(attr) : null;
    var eventAttached = (json && json.events) ? json.events.indexOf("on" + ev.type.toLowerCase()) >= 0 : false;

    if (!eventAttached) {
	
		if(this._elem === ev.target){
			if( this.UseDefaultEventHandling() ){
				if(this._baseAO){
					this._baseAO.ReceiveEvent( recorder, ev );
				}
			}
		}
		else{ // for child element
			if( this.UseDefaultEventHandlingForChildren() ){
				var aoArr = WebKit.createRecordAOArray(ev.target, recorder.frame.id);
				aoArr.forEach(function (ao) {
					ao.ReceiveEvent( recorder, ev );
				}, recorder);
			}
		}
    }
};

WebExtAO.prototype.UseDefaultEventHandlingForChildren = function () {
    return this._control.UseDefaultEventHandlingForChildren();
};

WebExtAO.prototype.UseDefaultEventHandling = function () {
    return this._control.UseDefaultEventHandling();
};

WebExtAO.prototype.UseEventConfiguration = function (event) {
    return this.UseDefaultEventHandling();
};

var WebExtAOBehavior = {
    _attrs: {
        "is_container": function () {
            if (!Util.isNullOrUndefined(this._control)) {
                return this._control.isContainer();
            }
            else {
                return false;
            }
        },
        "logical name": function () {
            //webext may defined the "logical_name" or "logical name" to let user defined the logical name
            return this._getControlExtAttr("logical name") || this._getControlExtAttr("logical_name");
        },
        "cell id": function (msg) {
            //call func_to_get_cell_elem to get the cell element from row and col
            var funcGetCellElemName = this._control.getSettingVar("func_to_get_cell_elem");
            if (Util.isNullOrUndefined(funcGetCellElemName))
                return null;
            //zero base;
            var row = msg._data["cell id"][0][0];
            var col = msg._data["cell id"][0][1];
            var ret = this._invokeHandlerOnControl(funcGetCellElemName, [row, col]);
            if (ret.status === "pass" && ret.data instanceof HTMLElement)
            {
                return content.kitsManager.createAO(ret.data, this._parentID).getID();
            }
            else
                return null;
        },
        "innerhtml": function () {
            var innerHTML = this._elem.innerHTML;
            return innerHTML.replace(/ _uft_custom_id="[0-9]+"/g,'');
        },
        "outerhtml": function () {
            var outerHTML = this._elem.outerHTML;
            return outerHTML.replace(/ _uft_custom_id="[0-9]+"/g,'');
        }       
    },
    _helpers: {
        isLearnable: Util.alwaysTrue,
        _isCoreProperty: function (property) {
            var bIsCoreProp = false;
            switch (property) {
                case "html tag":
                case "height":
                case "width":
                case "abs_x":
                case "abs_y":
                case "x":
                case "y":
                case "coords":
                case "rect":
                case "pos":
                case "screen_rect":
                case "real rect":
                case "real pos":
                    bIsCoreProp = true;
                    break;
            }
            return bIsCoreProp;
        },
    }
};
