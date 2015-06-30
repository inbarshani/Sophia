// (c) Copyright 2011 Hewlett-Packard Development Company, L.P
//Messages
var MSG_TYPES = {
    REGISTER_FRAME: "REGISTER_FRAME",
    QUERY: "QUERY_ATTR",
    SRVC_SET_GLOBAL_VARIABLES: "SRVC_SET_GLOBAL_VARIABLES",
    SRVC_GET_ALL_BROWSERS: "SRVC_GET_ALL_BROWSERS",
    QUERY_DESC_TO_ID: "QUERY_DESC_TO_ID",
    SRVC_CALL_OBJ_EVENT: "SRVC_CALL_OBJ_EVENT",
    SRVC_INVOKE_METHOD: "SRVC_INVOKE_METHOD",
    SRVC_MAKE_OBJ_VISIBLE: "SRVC_MAKE_OBJ_VISIBLE",
    SRVC_GET_SCREEN_RECT: "SRVC_GET_SCREEN_RECT",
    SRVC_EDIT_SET: "SRVC_EDIT_SET",
    SRVC_GET_FORM: "SRVC_GET_FORM",
    RECORD: "RECORD",
    REQUEST_COMID: "REQUEST_COMID",
    RESPONSE_COMID: "RESPONSE_COMID",
    DISPATCH_TO_FRAME_ELEM: "DISPATCH_TO_FRAME_ELEM",
    MATCH_DESC_TO_ID: "MATCH_DESC_TO_ID",
    CMD_LIST_SELECT: "CMD_LIST_SELECT",
    CMD_LIST_DESELECT: "CMD_LIST_DESELECT",
    CMD_LIST_EXTEND_SELECT: "CMD_LIST_EXTEND_SELECT",
    FRAME_FROM_POINT: "FRAME_FROM_POINT",
    QUERY_GET_TABLE_DATA: "QUERY_GET_TABLE_DATA",
    SRVC_LOAD_KIT: "SRVC_LOAD_KIT",
    WEBEXT_REPORT_LINE: "WEBEXT_REPORT_LINE",
    WEBEXT_RECORD_EVENT:"WEBEXT_RECORD_EVENT"
};

function Msg(type, to, data, tab) {
    this._msgType = type;
    this._to = to || {};
    this._tab = tab;
    this._data = data;
}

Msg.prototype = {
    _msgType: null,
    _to: null,
    _tab: -1,
    _data: null,
    toString: function() {
        return "\nType:" + this._msgType + "\nTo:" + this._to + "\nTab:" + this._tab + "\nData:" + this._data;
    },
    clone: function () {
        return new Msg(this._msgType, this._to, this._data, this._tab);
    },
    QTP_COM_ID: -1
};

function mergeMessages(tgtMsg, srcMsg, valNameMapping, logger) {
    function mergeStatus(tgtMsg, srcMsg, logger)
    {
        // if no status to merge - return
        if (!srcMsg.status)
            return;

        // if target already has an error status - don't override it
        if (tgtMsg.status && tgtMsg.status !== "OK") {

            // display warning if source status is also an error
            if (logger && srcMsg.status !== "OK")
                logger.warn("mergeMessages: Trying to merge copy two error statuses: " + srcMsg.status + " into " + tgtMsg.status);

            return;
        }

        // merge the status
        tgtMsg.status = srcMsg.status;
    }

    valNameMapping = valNameMapping || {};
    // msg like SVRC_GET_FORM's msg._data is null, but contains a WEB_PN_ID as a return value
    // if we don't assign a default object here, statement below will throw a null exception
    tgtMsg._data = tgtMsg._data || {};

    for (var key in srcMsg._data) {
        tgtMsg._data[valNameMapping[key] || key] = srcMsg._data[key];
    }

    for (var p in valNameMapping) {
        if (p !== valNameMapping[p])
            tgtMsg._data[p] = tgtMsg._data[valNameMapping[p]];
    }

    mergeStatus(tgtMsg, srcMsg, logger);

    return tgtMsg;
}

var ErrorReporter = {
	ThrowGeneralError: function () {
		throw this.CreateExceptionObjFromStatus("ERROR");
	},
	ThrowNotImplemented: function (method) {
		var e = this.CreateExceptionObjFromStatus("NotImplemented");
		e.Details = method;
		throw e;
	},
	ThrowObjectNotFound: function () {
		throw this.CreateExceptionObjFromStatus("ObjectNotFound");
	},
	ThrowItemNotFound: function () {
		throw this.CreateExceptionObjFromStatus("ItemNotFound");
	},
	ThrowInvalidArg: function () {
		throw this.CreateExceptionObjFromStatus("InvalidArgument");
	},
	ThrowOutOfRange: function () {
		throw this.CreateExceptionObjFromStatus("OutOfRange");
	},
	ThrowMethodNotFound: function () {
	    throw this.CreateExceptionObjFromStatus("MethodNotFound");
	},
	CreateExceptionObjFromStatus: function (status) {
		return new Error(status);
	}
};

var Util = {

    /**
    * identity() returns the same value that is used as the argument. In math: f(x) = x
    * @param {*} x - Whatever you want
    * @returns {*} The value passed as an argument
    */
    identity: function (x) {
        return x;
    },
    identityWithCallback: function(x) {
        var resultCallback = arguments[arguments.length - 1];
 
        resultCallback(x);
    },
	isUndefined: function (x) {
		return typeof (x) === "undefined";
	},
	isNullOrUndefined: function(x) {
	    return Util.isUndefined(x) || x === null;
	},
	isObject: function (val) {
		return typeof (val) === "object" && !Array.isArray(val);
	},
	isFunction: function (val) {
	    return typeof (val) === "function";
	},
	isLegacyObject: function(obj) {
	    if (typeof (obj) !== "undefined")
	        return false;

	    // This is in the special case of document.all , here are it's charectaristics:
	    // * typeof(document.all) === 'undefined'
	    // * Boolean(document.all) === false
	    // * document.all.toString() === "[object HTMLAllCollection]"
	    var objStrVal = "" + obj; // this is so that if obj is null/undefined we don't get an exception
	    if (objStrVal.search("HTMLAllCollection") !== -1)
	        return true;

	    return false;
	},

    /**
    * parseJSON() safely parse JSON strings to objects
    * @param {String} string - JSON string to be parsed
    * @param {Object} [logger] - logger to be used to log errors
    * @returns {Object} object resulted from parsing the passed string. null is returned if parsing fails.
    */
	parseJSON: function (str, logger) {
		if (typeof(JSON) === "undefined" || JSON.parse == null) {
			if (logger)
				logger.error("JSON or JSON.parse is undefined");
			return null;
		}
		if (!str) {
			if (logger)
				logger.error("Tried to parse empty message");
			return null;
		}
		if (logger)
			logger.trace("Parsing string: \n" + str);

		try {
			return JSON.parse(str);
		}
		catch (e) {
			if (logger)
				logger.error("Failed to parse string with exception: " + e + "\nString was: " + str + "\nStack:" + e.stack);
			return null;
		}
	},

    /**
    * alwaysFalse() returns false
    * @returns {boolean} false
    */
	alwaysFalse: function () {
		return false;
	},

    /**
    * alwaysTrue() returns true
    * @returns {boolean} true
    */
	alwaysTrue: function () {
		return true;
	},

    /**
    * makeArray() method converts array-like objects to real arrays
    * @param {Object} seq - The array-like object
    * @returns {Array} an array containing the elements of the array-like object
    */
	makeArray: function (seq) {
		return Array.prototype.map.call(seq, this.identity);
	},

	/**
	 * The findIndex() method returns an index in the array, if an element in the array satisfies the provided testing function. Otherwise -1 is returned.
	 * Once Chrome & Safari support Array.findIndex (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) 
	 *  this function should be removed 
	 * @param {Array} arr - The array object to look in
	 * @param {Function} predicate - The predicate function to run on each element on the array
	 * @param {Object} [thisArg] - The context of in which the predicate should be called
	 * @returns {Number} The index in the array for which the predicate function is true
	 */
	arrayFindIndex: function (arr, predicate, thisArg) {
	    thisArg = thisArg || this;
	    var result = -1;
	    arr.some(function (element, index, array) {
	        if (predicate.call(thisArg, element, index, array)) {
	            result = index;
	            return true;
	        }
	        return false;
	    });

	    return result;
	},

    /**
	 * The find() method returns a value in the array, if an element in the array satisfies the provided testing function. Otherwise undefined is returned.
	 * Once Chrome & Safari support Array.find (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) 
	 *  this function should be removed 
	 * @param {Array} arr - The array object to look in
	 * @param {Function} predicate - The predicate function to run on each element on the array
	 * @param {Object} [thisArg] - The context of in which the predicate should be called
	 * @returns {*} The first value in the array that satisfies 'predicate' or 'undefined' if none do
	 */
	arrayFind: function (arr, predicate, thisArg) {
	    var index = Util.arrayFindIndex(arr, predicate, thisArg);
	    if (index !== -1)
	        return arr[index];
	},
    
	/**
	 * arrayCompact() method returns a copy of the array with all falsy values removed. In JavaScript, false, null, 0, "", undefined and NaN are all falsy. 
	 *                    returns null if parameter passed to it is not an array.
	 * @param {Array} arr - The array to compact
	 * @returns {Array} a copy of the array without all falsy elements
	 */
	arrayCompact: function(arr) {
	    if (!Array.isArray(arr))
	        return null;

	    return arr.filter(Util.identity);
	},

	/**
	 * arrayWrap() method returns the array of the object passed to it is an array, otherwise it returns an array with one elements which is the object passed to it
	 * @param {Object} obj - The object to wrap with an array
	 * @returns {Array} an array containing the object passed as param or obj obj is an array
	 */
	arrayWrap: function (obj) {
	    if (Array.isArray(obj))
	        return obj;

	    return [obj];
	},

    /**
	 * stringNthPosition() method returns the n`th position of a substring in a string
	 * @param {String} str - The string to search in
	 * @param {String} substr - The sub-string to search for
	 * @param {Number} n - The occurence number of the substring to search for
     * @returns {Number} the index of the n'th occurence of the substring in the string. This value is -1 if there's no n'th occurence of the substring.
	 */
	stringNthPosition: function (str, substr, n) {
	    var pos = -1;

	    while (n--) {
	        var index = str.indexOf(substr, pos + 1);
	        if (index === -1)
	            return -1;

	        pos = index;
	    }

	    return pos;
	},

	/**
	 * stringCount() method returns the number of occurences of a substring in a string. The returned number includes overlapping substrings.
     *   for example: "ababa" has 2 "aba"'s in it
     * @param {String} str - The string to search in
	 * @param {String} substr - The sub-string to search for
     * @returns {Number} the number of occurences of the subtring in the full string. -1 for empty substrings.
	 */
	stringCount: function (str, substr) {
	    if (!substr)
	        return -1;

	    var count = -1;
	    var index = -1;

	    do {
	        count++;
	        index = str.indexOf(substr, index + 1);
	    } while (index !== -1);

	    return count;
	},

	shallowObjectClone: function (srcObj) {
		var targetObj = {};
		for (var key in srcObj) {
			targetObj[key] = srcObj[key];
		}
		return targetObj;
	},
	deepObjectClone: function (srcObj) {
	    if (srcObj == null || typeof srcObj !== "object") {
	        return srcObj;
	    }
	    var targetObj;
	    if (Array.isArray(srcObj)) {
	        targetObj = [];
	        for (var index = 0; index < srcObj.length; index++) {
	            var cloneValue = arguments.callee(srcObj[index]);
	            targetObj[index] = cloneValue;
	        }
	        return targetObj;
	    }
	    var constr = srcObj.constructor;
	    switch (constr) {
	        case RegExp:
	            targetObj = new RegExp(srcObj);
	            break;
	        case Date:
	            targetObj = new Data(srcObj.getTime());
	            break;
	        default:
	            targetObj = {};
	            break;
	    }
	    for (var key in srcObj) {
	        targetObj[key] = arguments.callee(srcObj[key]);
	    }
	    return targetObj;
	},
	isFullyVisible: function (elemRect, containerRect) {
		return elemRect.top > containerRect.top &&
			elemRect.left > containerRect.left &&
			elemRect.right < containerRect.right &&
			elemRect.bottom < containerRect.bottom;
	},
    getCenterPoint: function (rect) {
        return {
            x: (rect.left + rect.right) / 2,
            y: (rect.top + rect.bottom) / 2
        };
    },
    isPoint: function (point) {
        return !Util.isUndefined(point) &&
                !Util.isUndefined(point.x) &&
                !Util.isUndefined(point.y);
    },
    isRect: function (rectCandidate) {
        return !Util.isUndefined(rectCandidate) &&
	            !Util.isUndefined(rectCandidate.top) &&
                !Util.isUndefined(rectCandidate.bottom) &&
                !Util.isUndefined(rectCandidate.left) &&
                !Util.isUndefined(rectCandidate.right);
    },

    isCircle:function (circleCandidate) {
        return !Util.isUndefined(circleCandidate) &&
	            !Util.isUndefined(circleCandidate.x) &&
                !Util.isUndefined(circleCandidate.y) &&
                !Util.isUndefined(circleCandidate.radius) &&
                circleCandidate.radius >= 0;
    },

    isEqualRects: function (rect1, rect2, threshold) {
        if (!threshold)
            threshold = 10;

        var isEdgeEqual = function (e1, e2) {
            return Math.abs(e1 - e2) < threshold;
        };

        if (!Util.isRect(rect1) || !Util.isRect(rect2))
            return false;

        return isEdgeEqual(rect1.top, rect2.top) &&
                isEdgeEqual(rect1.bottom, rect2.bottom) &&
                isEdgeEqual(rect1.left, rect2.left) &&
                isEdgeEqual(rect1.right, rect2.right);
    },

    /**
	 * isRectEmpty() method to check whether a rectangle has positive size.
     * @param {Object} rect - A rectangle contains left, top, right and bottom.
     * @returns {Boolean} True if rectangle is empty, false the other case.
    */
    isRectEmpty: function (rect) {
        if (!Util.isRect(rect)) return true;
        return rect.right <= rect.left || rect.bottom <= rect.top;
    },

    isPointInRect: function (point, rect, logger) {
        logger = logger || LoggerUtil.prototype.getEmptyLogger();

        if (!Util.isPoint(point)) {
            logger.error("isPointInRect: received invalid point: " + JSON.stringify(point));
            return false;
        }

        if (!Util.isRect(rect)) {
            logger.error("isPointInRect: received invalid rect: " + JSON.stringify(rect));
            return false;
        }

        return ((point.x >= rect.left) &&
                (point.x <= rect.right) &&
                (point.y >= rect.top) &&
                (point.y <= rect.bottom));
    },

    isPointInCircle: function(point, circle, logger) {
        logger = logger || LoggerUtil.prototype.getEmptyLogger();

        if (!Util.isPoint(point)) {
            logger.error("isPointInCircle: received invalid point: " + JSON.stringify(point));
            return false;
        }

        if (!Util.isCircle(circle)) {
            logger.error("isPointInCircle: received invalid circle: " + JSON.stringify(circle));
            return false;
        }
          
        var dx = circle.x - point.x;
        var dy = circle.y - point.y;
        var dist = (dx * dx) + (dy * dy);
        if (dist <= (circle.radius * circle.radius))
            return true;
        return false;
    },

    isPointInPoly: function (point, coords, logger) {
        logger = logger || LoggerUtil.prototype.getEmptyLogger();

        if (Util.isNullOrUndefined(coords) || !Array.isArray(coords)) {
            logger.error("isPointInPoly: received invalid coords: " + JSON.stringify(coords));
            return false;
        }

        var intersects = 0;
        var wherex = point.x;
        var wherey = point.y;
        var totalv = coords.length / 2;
        var totalc = totalv * 2;
        var xval = coords[totalc - 2];
        var yval = coords[totalc - 1];
        var end = totalc;
        var pointer = 1;

        if ((yval >= wherey) != (coords[pointer] >= wherey))
            if ((xval >= wherex) == (coords[0] >= wherex))
                intersects += (xval >= wherex) ? 1 : 0;
            else
                intersects += ((xval - (yval - wherey) *
                (coords[0] - xval) /
                (coords[pointer] - yval)) >= wherex) ? 1 : 0;

        // XXX I wonder what this is doing - so do I; this is a translation of ptinpoly.c
        while (pointer < end) {
            yval = coords[pointer];
            pointer += 2;
            if (yval >= wherey) {
                while ((pointer < end) && (coords[pointer] >= wherey))
                    pointer += 2;
                if (pointer >= end)
                    break;
                if ((coords[pointer - 3] >= wherex) ==
                    (coords[pointer - 1] >= wherex))
                    intersects += (coords[pointer - 3] >= wherex) ? 1 : 0;
                else {
                    intersects +=
                        ((coords[pointer - 3] - (coords[pointer - 2] - wherey) *
                        (coords[pointer - 1] - coords[pointer - 3]) /
                        (coords[pointer] - coords[pointer - 2])) >= wherex) ? 1 : 0;
                }
            }
            else {
                while ((pointer < end) && (coords[pointer] < wherey))
                    pointer += 2;
                if (pointer >= end)
                    break;
                if ((coords[pointer - 3] >= wherex) ==
                    (coords[pointer - 1] >= wherex))
                    intersects += (coords[pointer - 3] >= wherex) ? 1 : 0;
                else {
                    intersects +=
                        ((coords[pointer - 3] - (coords[pointer - 2] - wherey) *
                        (coords[pointer - 1] - coords[pointer - 3]) /
                        (coords[pointer] - coords[pointer - 2])) >= wherex) ? 1 : 0;
                }
            }
        }
        if ((intersects & 1) != 0)
            return true;

        return false;

    },

    getAgentNPObj: function () {
        return window.document.getElementById("__QTP__OBJ__");
    },
    assert: function (cond, msg, logger) {
        if (!cond) {
            if (logger)
                logger.error("ASSERT: " + msg);
            //alert(msg);
        }
    },
    generateQTPPropertyName: function () {
        return "__QTP__" + (new Date()).getTime();
    },
    padLeft: function (n, ndigits) { // pad a number with leading zeros to ndigits
        var num = "" + n; // convert number to string
        var zeros = ndigits - num.length; // how many zeros to pad
        while (zeros > 0) {
            num = "0" + num;
            --zeros;
        }
        return num;
    },
    getTextNodesValue: function (node) {
        if (node.tagName && node.tagName.toLowerCase() === "script") {
            return [];
        }

        if (node.nodeType === 3) {
            return [node.nodeValue];
        }
        var res = [];
        Array.prototype.forEach.call(node.childNodes, function (element) {
            res = res.concat(Util.getTextNodesValue(element));
        });
        return res;
    },
    cleanSpecialChars: function (strToClean) {
        if (typeof strToClean !== 'string')
            return strToClean;

        // Handle String
        var cleanAttrVal = strToClean.replace(/\n|\r/gm, "");
        cleanAttrVal = cleanAttrVal.replace(/\t/g, " ");
        return cleanAttrVal;
    },

    /**
     * cleanMultipleSpaces() method cleans multiple spaces and replaces them with a single space
     * @param {String} strToClean - The string to clean
     * @returns {String} the result clean string. if parameter is not a legal string, the parameter is returned instead.
     */
    cleanMultipleSpaces: function(strToClean) {
        if (typeof strToClean !== 'string')
            return strToClean;

        return strToClean.replace(/ +/g, ' '); // collapse adjacent spaces
    },
    browserApplicationVersion: function () {
        // For Firefox.
        if (typeof navigator === "undefined" && typeof require === "function") {
            var system = require("sdk/system");

	        if (system)
            {
                var appVersion = system.vendor + " " + system.name + " " + system.version;
                return appVersion;
            }
        }
        
        var versionText, browserName;
        if (navigator.userAgent.indexOf("Chrome") !== -1) {
            browserName = "Chrome";
        }
        else if (navigator.userAgent.indexOf("Firefox") !== -1) {
            versionText = "Firefox";
            browserName = "Mozilla Firefox";
        }
        else if (navigator.userAgent.indexOf("Safari") !== -1 && navigator.userAgent.indexOf("Version") !== -1) {
            versionText = "Version";
            browserName = "Safari";
        }
        else {
            throw ErrorReporter.CreateExceptionObjFromStatus("Cannot determine browser type: " + navigator.userAgent);
        }

        versionText = versionText || browserName;
        var searchRegex = new RegExp(versionText + "\\S+", "i");
        var sVersion = searchRegex.exec(navigator.userAgent)[0];
        sVersion = sVersion.slice((versionText + "/").length);
        var version = sVersion.split(".");
        return browserName + " " + version[0] + "." + version[1];
    },

	jsonStringify: function (jsonObj, logger) {
	    if (typeof (JSON) === "undefined") {
	        if (logger)
	            logger.error("jsonStringify: JSON is undefined");
	        return null;
	    }
	    if (JSON.stringify == null) {
	        if (logger)
	            logger.error("jsonStringify: JSON.stringify is undefined");
	        return null;
	    }
			
		return JSON.stringify(jsonObj);		
	},

    jsonPrettyStringify: function (jsonObj) {
        return JSON.stringify(jsonObj, undefined, 2);
    },

    cleanTextProperty: function (text) {
        if (typeof text !== 'string') {
            return text;
        }

        text = text.trimLeft();
        text = text.replace(/\t/g, " ");
        //for defect AGM 3497 [Cross browser support]Difference between properties between IE and Firefox & Chrome
        //replace the enter character with space in order that the behavior will be same in 3 browsers
        text = text.replace(/\r\n|\r|\n/g, " ");
        text = text.replace(/ +/g, " "); // collapse adjacent spaces
        text = text.replace(/\xA0/g, " "); // &nbsp;
        return text;
    },
    extend: function (obj, properties) {
        if (properties) {
            Object.keys(properties).forEach(function (key) {
                obj[key] = properties[key];
            });
        }
        return obj;
    },

    /**
    * Calculate and return the rectangle of the tab with the given dimensions
    * @param {Object} pageDimensions - Page Dimensions object contains the values for keys: innerHeight, outerHeight, innerWidth, outerWidth, window_rect
    * @param {Object} logger - the logger instance to be used
    * @returns the rectangle of the tab
    */
    calculateTabRect: function (pageDimensions, logger)
    {
        if (logger)
            logger.trace("calculateTabRect: pageDimensions: " + JSON.stringify(pageDimensions));

        // Since we can't calculate the top and bottom borders (due to the Omnibox) we assume the top and bottom borders are the same as those on the sides
        var borderPixels = (pageDimensions.outerWidth - pageDimensions.innerWidth) / 2; 

        var rect = {};
        var window_rect = pageDimensions.window_rect;
        rect.top = window_rect.top + (pageDimensions.outerHeight - pageDimensions.innerHeight) - borderPixels;
        rect.bottom = window_rect.top + pageDimensions.outerHeight;
        rect.left = window_rect.left + borderPixels;
        rect.right = window_rect.left + pageDimensions.outerWidth - borderPixels;

        return rect;
    },

    getMicClass: function (ao) {
        var micclass = ao.GetAttrSync('micclass');
        while (Array.isArray(micclass))
            micclass = micclass[0];
        return micclass;
    },

    isContainerMicclass: function (micclass) {
        return micclass === "Browser" || micclass === "Page" || micclass === "Frame";
    },

    /**
     * Polymorphic mapping. If `obj` is an Array, return obj.map(func), otherwise return func(obj)
     * @param {*} obj - Either a scalar or an Array
     * @param {function} func - The function that performs the mapping
     * @param {Object} [thisArg] - The context of in which the map function should be called
     * @returns obj as mapped by func
     */
    map: function (obj, func, thisArg) {
        thisArg = thisArg || this;
        if (Array.isArray(obj))
            return obj.map(func, thisArg);

        return func.call(thisArg, obj);
    },

    /**
     * objectFromArray() returns an object which has all array elements represented in it as properties
     * @param {Array} arr - The array who's elements should be translated to object properties
     * @param {Object} value - The value to give these properties (fixed value for all of the properties in the newly created object)
     * @returns {Object} a result object with the properties in the array
     */
    objectFromArray: function (arr, value) {
        var obj = {};

        if (!Array.isArray(arr))
            return obj;

        var length = arr.length;
        for (var i = 0; i < length; i++) {
            obj[arr[i]] = value;
        }

        return obj;
    },

    /**
     * simple class inheritance
     * @param {Function} child
     * @param {Function} base
     * @param {Object} [properties] override functions or new properties
     */
    inherit: function (child, base, properties) {
        var baseP = base.prototype;

        child.prototype = Object.create(baseP);
        var childP = child.prototype;

        childP.constructor = child;

        Util.extend(childP, properties);
    },

    functionStringify: function (func) {
        if (typeof (func) !== 'function')
            return null;

        return '(' + func.toString() + ')();';
    },

    convertXmlStrToJson: function (xmlDoc) {
        var x2js = new X2JS();
        return x2js.xml_str2json(xmlDoc);
    },

    isInjectableUrl: function (url) {
        if (!url)
            return false;

        // Starts with 'XX:'
        return !url.match(/^(?:chrome|about|javascript):/);
    },
    
    setTimeout: function (func, timeout) {
        var setTimeoutFunction;
        if (typeof window === "object") {
            setTimeoutFunction = window.setTimeout;
        } else if (typeof require === "function") {
            var timers = require("sdk/timers");
            if (timers)
                setTimeoutFunction = require("sdk/timers").setTimeout;
        }

        setTimeoutFunction = setTimeoutFunction || setTimeout;

        return setTimeoutFunction(func, timeout);
    },
    setInterval: function (func, timeout) {
        var setIntervalFunction;
        if (typeof window === "object") {
            setIntervalFunction = window.setInterval;
        } else if (typeof require === "function") {
            var timers = require("sdk/timers");
            if (timers)
                setIntervalFunction = require("sdk/timers").setInterval;
        }

        setIntervalFunction = setIntervalFunction || setTimeout;

        return setIntervalFunction(func, timeout);
    },
    clearInterval: function (id) {
        var clearIntervalFunction;
        if (typeof window === "object") {
            clearIntervalFunction = window.clearInterval;
        } else if (typeof require === "function") {
            var timers = require("sdk/timers");
            if (timers)
                clearIntervalFunction = require("sdk/timers").clearInterval;
        }

        clearIntervalFunction = clearIntervalFunction || clearInterval;

        return clearIntervalFunction(id);
    }
};

var RtIdUtils = {
    IsRuntimeId: function (webId) {

        if (!webId) {
            return false;
        }

        if (typeof (webId) !== "object") {
            return false;
        }

        if (!("browser" in webId && "page" in webId && "frame" in webId && "object" in webId)) {
            return false;
        }

        if (webId.browser >= -1 && webId.page >= -1 && webId.frame >= -1) {
            // webId is legal runtime Id of AO
            return true;
        }
        else if (RtIdUtils.IsRTIDExtension(webId)) {
            // webId is legal runtime Id of Extension
            return true;
        }
        else if (RtIdUtils.IsRTIDTestingTool(webId)) {
            // webId is legal runtime Id of UFT / Testing Tool
            return true;
        }
        else {
            return false;
        }
    },
    IsRTIDAgent: function (rtid) {
        return rtid.browser === -1 && rtid.page === -1 && rtid.frame === -1 && rtid.object === null;
    },
    IsRTIDBrowser: function (rtid) {
        return rtid.browser !== -1 && rtid.page === -1 && rtid.frame === -1 && rtid.object === null;
    },
    IsRTIDPage: function (rtid) {
        return rtid.browser !== -1 && rtid.page !== -1 && rtid.frame === -1 && rtid.object === null;
    },
    IsRTIDFrame: function (rtid) {
        return rtid.browser !== -1 && rtid.page !== -1 && rtid.frame !== -1 && rtid.object === null;
    },
    IsRTIDAO: function (rtid) {
        return rtid.browser !== -1 && rtid.page !== -1 && rtid.frame !== -1 && rtid.object !== null;
    },
    IsRTIDExtension: function (rtid) {
        return RtIdUtils._IsRTIDEqualToControl(rtid, RtIdUtils.GetExtensionRtId());
    },
    IsRTIDTestingTool: function (rtid) {
        return RtIdUtils._IsRTIDEqualToControl(rtid, RtIdUtils.GetTestingToolRtId());
    },
    IsRTIDDaemon: function (rtid) {
        return RtIdUtils._IsRTIDEqualToControl(rtid, RtIdUtils.GetDaemonRtId());
    },
    _IsRTIDEqualToControl: function (rtid, controlRtId) {
         return rtid.browser === controlRtId.browser &&
            rtid.page === controlRtId.page &&
            rtid.frame === controlRtId.frame &&
            !rtid.object;
    },

    IsRTIDEqual: function (rtid1, rtid2) {
        if (!this.IsRuntimeId(rtid1) || !this.IsRuntimeId(rtid2))
            return false;
	
        if (rtid1.browser !== rtid2.browser)
            return false;

        if (rtid1.page !== rtid2.page)
            return false;

        if (rtid1.frame !== rtid2.frame)
            return false;

        if ((!this.IsRTIDAO(rtid1) && this.IsRTIDAO(rtid2)) ||
            (this.IsRTIDAO(rtid1) && !this.IsRTIDAO(rtid2)))
            return false;

        if (rtid1.object === rtid2.object)
            return true;

        if (rtid1.object.entry !== rtid2.object.entry)
            return false;

        if (rtid1.object.frameCockie !== rtid2.object.frameCockie)
            return false;

        return true;
    },

    GetExtensionRtId: function () {
        return { browser: -2, page: -2, frame: -2, object: null };
    },

    GetTestingToolRtId: function () {
        return { browser: -5, page: -5, frame: -5, object: null };
    },

    GetDaemonRtId: function () {
        return { browser: -7, page: -7, frame: -7, object: null };
    },
    GetAgentRtid: function () {
        return { browser: -1, page: -1, frame: -1, object: null };
    }
};

//Firefox and chrome support only 3 values for ready state
//complete - once it has loaded. 
//loading - once it is finished parsing but still loading sub-resources
//interactive - Returns "loading" while the Document is loading
//see: http://www.whatwg.org/specs/web-apps/current-work/multipage/dom.html#current-document-readiness
var ReadyState2Status = {
    unintialized: 0,
    complete: 4,
    loading: 1,
    interactive: 4    // Since REG_VAL_SYNC_ON_INTERACTIVE is mostly not set we return complete.
};


////////////////////////


function MultipleResponses(responsesToWaitFor) {
    this._logger = new LoggerUtil("Common.MultipleResponses");
    this._logger.info("Common.MultipleResponses");

    if (responsesToWaitFor < 1) {
        this._logger.debug("MultipleResponses: received invalid numOfResponses=" + responsesToWaitFor);
        return;
    }

    this._numOfResponses = responsesToWaitFor;
}

MultipleResponses.prototype = {
    _logger: null,
    _numOfResponses: -1,

    callback: function (func/* arguments number here may vary - last argument is a callback*/) {
        return (function () {
            --this._numOfResponses;
            this._logger.trace("callback called - waiting for " + this._numOfResponses);
            var argsArr = Array.prototype.map.call(arguments, Util.identity);
            argsArr = [this._numOfResponses === 0].concat(argsArr);
            func.apply(this, argsArr);
        }).bind(this);
    }
};

////////////////////////
var AttrPartialValueUtil = {
    IsPartialValue: function (val) {
        return val && val.type === 'partial';
    },

    WrapValue: function (attrName, val, attachedData) {
        return { type: "partial", attr: attrName, value: val, data: attachedData };
    },

    GetValue: function (wrappedValue, logger) {
        logger = logger || LoggerUtil.prototype.getEmptyLogger();

        Util.assert(AttrPartialValueUtil.IsPartialValue(wrappedValue), "AttrPartialValueUtil.GetValue: Received an object which is not a wrapped Partial value", logger);

        return wrappedValue.value;
    },

    GetAttachedData: function (wrappedValue, logger) {
        logger = logger || LoggerUtil.prototype.getEmptyLogger();

        Util.assert(AttrPartialValueUtil.IsPartialValue(wrappedValue), "AttrPartialValueUtil.GetValue: Received an object which is not a wrapped Partial value", logger);

        return wrappedValue.data;
    }
};

var StatusUtil = {
    OK: "OK",
    OBJECT_NOT_FOUND: "ObjectNotFound",
    OBJECT_NOT_UNIQUE: "ObjectNotUnique",

    /**
    * isUnexpected() functions returns a boolean indicating whether or not the status is an unexpected failure status. 
    *               If the status is one of the known UFT statuses, or an empty status (undefined, null...) false is returned. 
    *               Otherwise true is returned.
    * @param {*} status - the status of a message
    * @returns {boolean} true if the status indicates an unexpected failure status
    */
    isUnexpected: function (status) {
        if (!status)
            return false;

        switch (status) {
            case StatusUtil.OK:
            case StatusUtil.OBJECT_NOT_FOUND:
            case StatusUtil.OBJECT_NOT_UNIQUE:
                return false;
        }

        return true;
    }
};

var ControlLearnType = {
    "Yes": 0,
    "No": 1,
    "IfChildren": 2
};

var ChildrenLearnType = {
    "Yes": 0,
    "No": 1,
    "LetMeSupply": 2
};

if (typeof exports !== "undefined") {
    // Ensure RtIdUtils is exported if exports exist. This is necessary for RtIdUtils to be available
    // in Firefox add-on.
    exports.Util = Util;
}