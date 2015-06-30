/**
 * Represents the Recorder
 * @constructor
 * @param {Object} frame - The frame object this recorder belongs to
 */
function Recorder(frame) {
    this._logger = new LoggerUtil('Content.Recorder');
    this._logger.info('Recorder was created');

    this.frame = frame;

    //var gestureDetector = new GestureDetector();
    //gestureDetector.addListener(this._recordGesture.bind(this));

    this.recordingEvents = ['click', 'change', 'focus', 'blur', 'keydown', 'keyup', 'submit', 'mouseup', 'mouseover', 'mouseout', 'dragstart', 'drop', 'dragend', 'contextmenu',
        /* Web Ext Events*/ 'mousedown', 'dblclick', 'keypress', 'textInput', 'select', 'reset'];

    this.handler = this.handlerFunc.bind(this);

    this.recordingEvents.forEach(function (e) {
        document.addEventListener(e, this.handler, true);
    }, this);

    // we use 'beforeunload' since it's a cancellable event, non-cancellable events like 'unload' and 'pagehidden' are not fired
    // and 'hashchange' for websites which only cause a change of the hashtag without any unloading or navigation
    ['beforeunload', 'hashchange'].forEach(function (eventName) {
        window.addEventListener(eventName, this.sendBrowserRecordInfo.bind(this));
    }, this);
}

Recorder.prototype = {
    _logger: null,
    frame: null,
    isRecording: null,
    recordingEvents: null,
    handler: null,
    handlerFunc: function (ev) {
        if (!this.isRecording)
            return;

        this._logger.trace('handlerFunc got event of type: ' + ev.type);
        var aoArr = content.kitsManager.createRecordAOArray(ev.target, this.frame.id);
        aoArr.forEach(function (ao) {
            ao.ReceiveEvent(this, ev);
        }, this);
    },

    _recordGesture: function (elem, info) {
        if (!this.isRecording)
            return;

        var ao = content.kitsManager.createAO(elem, this.frame.id);
        this._logger.trace('_recoredGesture: got gesture ' + name);
        ao.ReceiveGesture(this, info);
    },

    _EVENT_CONFIG_ENUM: { // constant configuration
        TYPES: {
            // Enumeration of listening type 
            EVT_NEVER: 0,
            EVT_ANYCASE: 1,			// connect only if handle exists for this event
            EVT_HANDLER: 2,			// connect only if handle exists for this event
            EVT_BEHAVIOR: 4,			// connect if there is a behavior for the element
            EVT_BEHAVIOR_OR_HANDLER: 6,// connect if handle exists or their is a behavior for the element
            // Enumeration of recording type
            EVS_DELETE: 0,					// delete the event
            EVS_DISABLE: 1,					// disable the event
            EVS_ENABLE: 2,					// record event
            EVS_ON_NEXT_EVENT: 4,			// flag for next event recording
            EVS_ENABLE_ON_NEXT_EVENT: 6,	// record the event if another event will happen on the object
            // Enumeration of event record decisions
            ERD_IGNORE: 0,  // should ignore the event
            ERD_RECORD: 1,  // should record the event
            ERD_CONTINUE: 2 // can not determine
            // TODO: Enumeration of event level
            // ECL_NOTASSIGNED: -1, ECL_CURRENT: 0, ECL_CUSTOM: 1, ECL_DEFAULT: 2, ECL_MEDIUM: 3, ECL_HIGH: 4, ECL_FROMFILE: 5
        },

        // There are some events not controlled by config, should let them go.
        // Set the mask true bellow, if configuration not care.
        RESERVED_EVENTS: Util.objectFromArray(['ondragend','onkeyup','onselect','ontextInput'], true)
    },

    _eventConfig: { // Default event config at BASIC level, if fail to update from UFT, use this copy.
        "any web object": { "onclick": { "listen": 2, "record": 2 }, "oncontextmenu": { "listen": 2, "record": 2 }, "ondragstart": { "listen": 2, "record": 2 }, "ondrop": { "listen": 2, "record": 2 }, "onkeydown": { "listen": 1, "record": 2 }, "onmouseover": { "listen": 2, "record": 1 }, "onmouseup": { "listen": 2, "record": 1 } },
        "image": { "onclick": { "listen": 1, "record": 2 }, "onmouseover": { "listen": 2, "record": 6 } },
        "link": { "onclick": { "listen": 1, "record": 2 } },
        "webarea": { "onclick": { "listen": 1, "record": 2 }, "onmouseover": { "listen": 2, "record": 6 } },
        "webbutton": { "onclick": { "listen": 1, "record": 2 } }, "webcheckbox": { "onclick": { "listen": 1, "record": 2 } },
        "webedit": { "onblur": { "listen": 1, "record": 2 }, "onchange": { "listen": 1, "record": 2 }, "onfocus": { "listen": 1, "record": 2 }, "onpropertychange": { "listen": 0, "record": 2 }, "onsubmit": { "listen": 1, "record": 2 } },
        "webfile": { "onblur": { "listen": 1, "record": 2 }, "onfocus": { "listen": 1, "record": 2 } }, "weblist": { "onblur": { "listen": 1, "record": 2 }, "onchange": { "listen": 1, "record": 2 }, "onfocus": { "listen": 1, "record": 2 } },
        "webnumber": { "onblur": { "listen": 1, "record": 2 }, "onchange": { "listen": 1, "record": 2 }, "onfocus": { "listen": 1, "record": 2 } },
        "webradiogroup": { "onclick": { "listen": 1, "record": 2 } },
        "webrange": { "onchange": { "listen": 1, "record": 2 } }
    },

    /*
    * Event Configuration Setter
    * @param {Object} config - The config object contains new config need to update.
    * @returns {Undefined}
    */
    updateEventConfig: function (config) {
        this._logger.trace('updateEventConfig() set event configuration with: ' + config);
        if (config) {
            this._eventConfig = config;
        }
    },

    /*
    * Filter event by user configuration, prevent further handling.
    * @param {Object} ao - The agent object which the event has occured on
    * @param {Object} ev - The actual DOM Event as received by the event listener
    * @returns {Boolean} filtered - True if allowed, should record. 
                                    False if not allow by config.
    */
    isEventAllowedByConfig: function (ao, ev) {
        this._logger.trace('isEventAllowedByConfig() got event of type: ' + ev.type);

        var isAllowed = false;
        var micclasses = ao._micclass;
        var handlerName = 'on' + ev.type;

        var _checkEach = function (micclass) {
            micclass = micclass.toLowerCase();

            // If no config for current micclass, then look for next
            if (!this._eventConfig[micclass])
                return true;
            var micclassConfig = this._eventConfig[micclass];

            //If current micclass have no config for this event, then continue to look for it in next micclass.
            if (!micclassConfig[handlerName])
                return true;
            var handlerConfig = micclassConfig[handlerName];

            //Go detail check, if succeed, break loop, otherwise go to next micclass
            switch (this._makeRecordDecision(handlerConfig, ao._hasDOMHandler(handlerName))) {
                case this._EVENT_CONFIG_ENUM.TYPES.ERD_RECORD:
                    isAllowed = true;
                    return false;
                case this._EVENT_CONFIG_ENUM.TYPES.ERD_IGNORE:
                    return false;
                case this._EVENT_CONFIG_ENUM.TYPES.ERD_CONTINUE:
                    return true;
            }
            return true;
        };

        // Custom config can use HTML tag, check by tag name first
        if (_checkEach.call(this,ao.GetAttrSync("html tag"))) {
            // Then check by micclass
            micclasses.every(_checkEach, this);
        }

        // Allow reserved events, if configuration not care
        if (this._EVENT_CONFIG_ENUM.RESERVED_EVENTS[handlerName])
            return true;

        return isAllowed; 
    },

    /*
    * Make decision on current event using combination of listening and recording type, tell outside record or not.
    * @param {Object} handlerConfig - Object contains the listening type and recording type.
    * @param {Object} ao - Object contains event target object.
    * @returns {Boolean} False if need to check in next micclass, True if checked and should stop.
    */
    _makeRecordDecision: function (handlerConfig, hasDOMHandler) {

        var t = this._EVENT_CONFIG_ENUM.TYPES;

        // Check listening type first
        switch (handlerConfig.listen) {
            case t.EVT_NEVER: 
            case t.EVT_BEHAVIOR: //Chrome doesn't have 'behavior' like IE
                return t.ERD_IGNORE;
            case t.EVT_HANDLER: 
            case t.EVT_BEHAVIOR_OR_HANDLER: 
                if (!hasDOMHandler) { // No handler, ignore.
                    return t.ERD_IGNORE; 
                }
                break;
            case t.EVT_ANYCASE: 
                break; // Go to subsequent check
            default:
                this._logger.warn('_makeRecordDecision: Unknown listening type:' + handlerConfig.listen);
                break;
        }

        // Check recording type second
        switch (handlerConfig.record) {
            case t.EVS_DISABLE: // Disabled, no need record.
            case t.EVS_DELETE: // Treat it as DISABLE.
                return t.ERD_IGNORE;
            case t.EVS_ON_NEXT_EVENT:
            case t.EVS_ENABLE_ON_NEXT_EVENT:
                //TODO: Treat ENABLE_ON_NEXT_EVENT as ENABLE, but little difference need to be handled, not implement yet here.
            case t.EVS_ENABLE:
                return t.ERD_RECORD;// allow to record
            default:
                this._logger.warn('_makeRecordDecision: Unknown recording type:' + handlerConfig.record);
                return t.ERD_CONTINUE; // Look for config in next micclass
        }
    },

    startRecord: function () {
        if (this.isRecording)
            return;

        this.isRecording = true;
        this._startMonitoringSynthesizedEvents();
    },

    stopRecord: function () {
        if (!this.isRecording)
            return;

        this.isRecording = false;
        this._stopMonitoringSynthesizedEvents();
    },

    /**
    * Sends a Record event to the Frame object which contains the AO that the event occurred on.
    * @param {Object} ao - The agent object which the event has occured on
    * @param {Object} event - The actual DOM Event as received by the event listener (can be null)
    * @returns {Object} params - Extra data that should be added to the recorded event message (e.g. point, text .. etc.)
    */
    sendRecordEvent: function (ao, event, params) {
        this._logger.trace("sendRecordEvent: called");
        this._sendRecordEventHelper('EVENT_RECORD', ao, event, params);
    },

    /**
    * Sends a Record event to be queued as part of a transaction. We queue events in cases which recording of one event depends on the future arrival
    * of another event using the sendRecordEventWithQueue() method (for example Drag is not recorded without receiving a Drop event). The event queue is cleared either 
    * when an event is sent using the sendRecordEventWithQueue() in which all events in the Queue are sent to the testing tool,
    * or when discardQueuedRecordEvents() which clears the event queue,
    * or when an event is sent using sendRecordEvent() which causes all events stored in the event queue to be discarded.
    * @param {Object} ao - The agent object which the event has occured on
    * @param {Object} event - The actual DOM Event as received by the event listener
    * @returns {Object} params - Extra data that should be added to the recorded event message (e.g. point, text .. etc.)
    */
    queueRecordEvent: function (ao, event, params) {
        this._logger.trace("queueRecordEvent: called");
        this._sendRecordEventHelper('EVENT_INTERNAL_RECORD_QUEUE', ao, event, params);
    },

    /**
    * Sends a Record event to be sent as part of a recording event transaction. Events that are sent with this method, instruct the transaction queue to dispatch all
    * previously queued recording events - which were sent using the queueRecordEvent() method - along with this event as the last event. This also causes the transaction
    * Queue to be cleared after dispatching all events in it.
    * @param {Object} ao - The agent object which the event has occured on
    * @param {Object} event - The actual DOM Event as received by the event listener
    * @returns {Object} params - Extra data that should be added to the recorded event message (e.g. point, text .. etc.)
    */
    sendRecordEventWithQueue: function (ao, event, params) {
        this._logger.trace("sendRecordEventWithQueue: called");
        this._sendRecordEventHelper('EVENT_INTERNAL_RECORD_DISPATCH_QUEUE', ao, event, params);
    },

    /**
    * Sends an event indicating that a transaction was aborted, and all previously queued events should be discarded.
    */
    discardQueuedRecordEvents: function () {
        this._logger.trace("discardQueuedRecordEvents: called");
        var msg = new Msg('EVENT_INTERNAL_RECORD_QUEUE_CLEAR', this.frame.getID(), {});
        content.dispatcher.sendEvent(msg);
    },

    _createObjectDescription: function (ao, micclass) {
        var objIdentificationProps = this.frame.getObjIdentificationProps(micclass);
        return Description.createRecordDescription(ao, objIdentificationProps);
    },

    _createRecordData: function (ao, event, params) {
        this._logger.trace("_createRecordData: started");
        var micclass = Util.getMicClass(ao);
        var description = this._createObjectDescription(ao, micclass);

        this._logger.trace('_createRecordData: AO Data: ' + JSON.stringify(description.description));

        var recordData = {
            WEB_PN_ID: [[ao.getID()]],
            micclass: [[micclass]],
            'recorded description': [[description]]
        };

        if (!Util.isNullOrUndefined(event)) {
            var eventID = SpecialObject.CreateEventId(event, ao.getID());
            recordData["event id"] = [[eventID]];
        }
        Util.extend(recordData, params);

        return recordData;
    },

    _sendRecordEventHelper: function (msgType, ao, event, params) {
        if (this._isSynthesizedEvent()) {
			// The reason this code is found here and not in the handlerFunc() is because
			// it's too expensive to do this check in the handler func for every event
			// so we do it just on those events we would wish to record
            this._logger.info("sendRecordEvent: ignoring synthesized event");
            return;
        }

        var recordData = this._createRecordData(ao, event, params);
        var msg = new Msg(msgType, this.frame.getID(), recordData);
        content.dispatcher.sendEvent(msg);
    },

    sendRecordExtEvent: function (ao, methodName, params) {
        var recordData = this._createRecordData(ao);
        var msg = new Msg('EVENT_RECORD', this.frame.getID(), recordData);

        msg._data.WEBEXT_PN_METHOD_NAME = methodName;
        msg._data.WEBEXT_PN_PARAMETERS = params;

        content.dispatcher.sendEvent(msg);
    },

    sendBrowserRecordInfo: function () {
        if (!this.isRecording)
            return;

        var micclass = Util.getMicClass(this.frame);
        if (micclass !== "Page")
            return;

        var browserContentHelper = new BrowserContentHelper(this.frame);

        this._logger.trace("_sendBrowserRecordInfo: creating message to dispatch");

        var recordData = this._createRecordData(browserContentHelper, { type: "", clientX: 0, clientY: 0 });
        recordData.pageDescription = this._createObjectDescription(this.frame, micclass);

        var msg = new Msg('EVENT_INTERNAL_RECORD_BROWSER_INFO', RtIdUtils.GetAgentRtid(), recordData);

        content.dispatcher.sendEvent(msg);
    },

    _startMonitoringSynthesizedEvents: function() {
        if (BrowserServices.overrideDispatchEvent) {
            this._logger.debug("_startMonitoringSynthesizedEvents: Going to override CreateEvent function");
            content.domSubscriber.evalInDocument(BrowserServices.overrideDispatchEvent);
        }
    },

    _stopMonitoringSynthesizedEvents: function() {
        if (BrowserServices.restoreDispatchEvent) {
            this._logger.debug("_stopMonitoringSynthesizedEvents: Going to restore CreateEvent function");
            content.domSubscriber.evalInDocument(BrowserServices.restoreDispatchEvent);
        }
    },

    _isSynthesizedEvent: function () {
        if (!BrowserServices.isSynthesizedEvent)
            return false;

        return ContentUtils.runOnDocSync(BrowserServices.isSynthesizedEvent);
    }
};