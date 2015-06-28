// Temporary hardcoded start Record & end Record messages for testing the record functionality on mobile.
// These messages should be removed from here once we'll have replay functionality
var startRecordMsg = {
    "_attr_names": [
      "name",
      "value"
    ],
    "_data": {
        "name": [
          [
            "WebActivityState",
            "objectidentificationproperties"
          ]
        ],
        "value": [
          [
            1,
            "\n{\n\t\"browser\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"micclass\" ],\n\t\t\"mandatory\" : [ \"micclass\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"name\",\n\t\t\t\"title\",\n\t\t\t\"openurl\",\n\t\t\t\"opentitle\",\n\t\t\t\"hasstatusbar\",\n\t\t\t\"hasmenubar\",\n\t\t\t\"hastoolbar\",\n\t\t\t\"openedbytestingtool\",\n\t\t\t\"number of tabs\"\n\t\t],\n\t\t\"selector\" : \"creationtime\"\n\t},\n\t\"frame\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"micclass\" ],\n\t\t\"mandatory\" : [ \"micclass\", \"name\", \"url without form data\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"title\", \"url\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"image\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"alt\", \"html tag\", \"image type\", \"micclass\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"alt\",\n\t\t\t\"image type\",\n\t\t\t\"html id\",\n\t\t\t\"name\",\n\t\t\t\"file name\",\n\t\t\t\"class\",\n\t\t\t\"visible\",\n\t\t\t\"width\",\n\t\t\t\"height\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"link\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"text\" ],\n\t\t\"optionalFilter\" : [ \"text\", \"html id\", \"class\", \"name\", \"href\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"page\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"micclass\" ],\n\t\t\"mandatory\" : [ \"micclass\", \"url without form data\" ],\n\t\t\"optionalFilter\" : [ \"title\", \"url\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"viewlink\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [],\n\t\t\"mandatory\" : [ \"html tag\", \"innertext\", \"micclass\" ],\n\t\t\"optionalFilter\" : [],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webarea\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"alt\", \"html tag\", \"micclass\" ],\n\t\t\"optionalFilter\" : [ \"alt\", \"html id\", \"map name\", \"class\", \"href\", \"coords\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webaudio\" : \n\t{\n\t\t\"assistive\" : [ \"html id\", \"src\", \"current source\" ],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"sources\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"html id\",\n\t\t\t\"src\",\n\t\t\t\"sources\",\n\t\t\t\"current source\",\n\t\t\t\"duration\",\n\t\t\t\"autoplay\",\n\t\t\t\"loop\",\n\t\t\t\"class\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webbutton\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"type\", \"html id\", \"value\", \"class\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webcheckbox\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"type\", \"html id\", \"value\", \"class\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webedit\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\", \"type\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"name\",\n\t\t\t\"html id\",\n\t\t\t\"max length\",\n\t\t\t\"default value\",\n\t\t\t\"class\",\n\t\t\t\"rows\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webelement\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"innertext\", \"micclass\" ],\n\t\t\"optionalFilter\" : [ \"html id\", \"class\", \"innertext\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webfile\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"type\", \"html id\", \"class\", \"default value\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"weblist\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"name\",\n\t\t\t\"html id\",\n\t\t\t\"class\",\n\t\t\t\"default value\",\n\t\t\t\"items count\",\n\t\t\t\"visible items\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webnumber\" : \n\t{\n\t\t\"assistive\" : [ \"html id\" ],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\", \"type\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"html id\",\n\t\t\t\"name\",\n\t\t\t\"class\",\n\t\t\t\"default value\",\n\t\t\t\"min\",\n\t\t\t\"max\",\n\t\t\t\"step\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webradiogroup\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"html id\", \"class\", \"items count\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webrange\" : \n\t{\n\t\t\"assistive\" : [ \"html id\" ],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\", \"type\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"html id\",\n\t\t\t\"name\",\n\t\t\t\"class\",\n\t\t\t\"default value\",\n\t\t\t\"min\",\n\t\t\t\"max\",\n\t\t\t\"step\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webtable\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\" ],\n\t\t\"optionalFilter\" : [ \"html id\", \"border\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webvideo\" : \n\t{\n\t\t\"assistive\" : [ \"html id\", \"src\", \"current source\" ],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"sources\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"html id\",\n\t\t\t\"src\",\n\t\t\t\"sources\",\n\t\t\t\"current source\",\n\t\t\t\"duration\",\n\t\t\t\"autoplay\",\n\t\t\t\"loop\",\n\t\t\t\"class\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t}\n}\n"
          ]
        ]
    },
    "_msgType": "SRVC_SET_GLOBAL_VARIABLES",
    "_to": {
        "browser": -1,
        "frame": -1,
        "object": null,
        "page": -1
    }
};

var stopRecordMsg = {
    "_attr_names": [
      "name",
      "value"
    ],
    "_data": {
        "name": [
          [
            "WebActivityState",
            "objectidentificationproperties"
          ]
        ],
        "value": [
          [
            0,
            "\n{\n\t\"browser\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"micclass\" ],\n\t\t\"mandatory\" : [ \"micclass\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"name\",\n\t\t\t\"title\",\n\t\t\t\"openurl\",\n\t\t\t\"opentitle\",\n\t\t\t\"hasstatusbar\",\n\t\t\t\"hasmenubar\",\n\t\t\t\"hastoolbar\",\n\t\t\t\"openedbytestingtool\",\n\t\t\t\"number of tabs\"\n\t\t],\n\t\t\"selector\" : \"creationtime\"\n\t},\n\t\"frame\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"micclass\" ],\n\t\t\"mandatory\" : [ \"micclass\", \"name\", \"url without form data\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"title\", \"url\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"image\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"alt\", \"html tag\", \"image type\", \"micclass\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"alt\",\n\t\t\t\"image type\",\n\t\t\t\"html id\",\n\t\t\t\"name\",\n\t\t\t\"file name\",\n\t\t\t\"class\",\n\t\t\t\"visible\",\n\t\t\t\"width\",\n\t\t\t\"height\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"link\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"text\" ],\n\t\t\"optionalFilter\" : [ \"text\", \"html id\", \"class\", \"name\", \"href\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"page\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"micclass\" ],\n\t\t\"mandatory\" : [ \"micclass\", \"url without form data\" ],\n\t\t\"optionalFilter\" : [ \"title\", \"url\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"viewlink\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [],\n\t\t\"mandatory\" : [ \"html tag\", \"innertext\", \"micclass\" ],\n\t\t\"optionalFilter\" : [],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webarea\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"alt\", \"html tag\", \"micclass\" ],\n\t\t\"optionalFilter\" : [ \"alt\", \"html id\", \"map name\", \"class\", \"href\", \"coords\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webaudio\" : \n\t{\n\t\t\"assistive\" : [ \"html id\", \"src\", \"current source\" ],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"sources\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"html id\",\n\t\t\t\"src\",\n\t\t\t\"sources\",\n\t\t\t\"current source\",\n\t\t\t\"duration\",\n\t\t\t\"autoplay\",\n\t\t\t\"loop\",\n\t\t\t\"class\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webbutton\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"type\", \"html id\", \"value\", \"class\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webcheckbox\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"type\", \"html id\", \"value\", \"class\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webedit\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\", \"type\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"name\",\n\t\t\t\"html id\",\n\t\t\t\"max length\",\n\t\t\t\"default value\",\n\t\t\t\"class\",\n\t\t\t\"rows\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webelement\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"innertext\", \"micclass\" ],\n\t\t\"optionalFilter\" : [ \"html id\", \"class\", \"innertext\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webfile\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"type\", \"html id\", \"class\", \"default value\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"weblist\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"name\",\n\t\t\t\"html id\",\n\t\t\t\"class\",\n\t\t\t\"default value\",\n\t\t\t\"items count\",\n\t\t\t\"visible items\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webnumber\" : \n\t{\n\t\t\"assistive\" : [ \"html id\" ],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\", \"type\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"html id\",\n\t\t\t\"name\",\n\t\t\t\"class\",\n\t\t\t\"default value\",\n\t\t\t\"min\",\n\t\t\t\"max\",\n\t\t\t\"step\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webradiogroup\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\" ],\n\t\t\"optionalFilter\" : [ \"name\", \"html id\", \"class\", \"items count\", \"visible\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webrange\" : \n\t{\n\t\t\"assistive\" : [ \"html id\" ],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\", \"type\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"name\", \"type\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"html id\",\n\t\t\t\"name\",\n\t\t\t\"class\",\n\t\t\t\"default value\",\n\t\t\t\"min\",\n\t\t\t\"max\",\n\t\t\t\"step\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webtable\" : \n\t{\n\t\t\"assistive\" : [],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\" ],\n\t\t\"optionalFilter\" : [ \"html id\", \"border\" ],\n\t\t\"selector\" : \"index\"\n\t},\n\t\"webvideo\" : \n\t{\n\t\t\"assistive\" : [ \"html id\", \"src\", \"current source\" ],\n\t\t\"baseFilter\" : [ \"html tag\", \"micclass\" ],\n\t\t\"mandatory\" : [ \"html tag\", \"micclass\", \"sources\" ],\n\t\t\"optionalFilter\" : \n\t\t[\n\t\t\t\"html id\",\n\t\t\t\"src\",\n\t\t\t\"sources\",\n\t\t\t\"current source\",\n\t\t\t\"duration\",\n\t\t\t\"autoplay\",\n\t\t\t\"loop\",\n\t\t\t\"class\",\n\t\t\t\"visible\"\n\t\t],\n\t\t\"selector\" : \"index\"\n\t}\n}\n"
          ]
        ]
    },
    "_msgType": "SRVC_SET_GLOBAL_VARIABLES",
    "_to": {
        "browser": -1,
        "frame": -1,
        "object": null,
        "page": -1
    }
};


/**
 * Represents the communication channel for in/out communications from the JS context when being injected by the Mobile Center
 * @constructor
 */
function MobileCenterComChannel() {
    EventDispatcher.call(this, new LoggerUtil("ComChannels.MobileCenterComChannel"));
    this._mobileCenter = window._hpmcBridge;
    Util.assert(this._mobileCenter != null, "C'tor: MobileCenterComChannel is undefined", this._logger);

    Object.defineProperty(this, "id", {
        value: "MobileCenterComChannel",
        writable: false
    });

    this._logger.trace("MobileCenterComChannel: ctor completed");
}

Util.inherit(MobileCenterComChannel, EventDispatcher, {
    _mobileCenter: null,

    // *** Public methods ***
    init: function () {
        this._logger.trace("init");

        // Register to mobile events
        this._mobileCenter.onStartRecord = this._onStartRecord.bind(this);
        this._mobileCenter.onStopRecord = this._onStopRecord.bind(this);
        this._mobileCenter.onStartReplay = this._onStartReplay.bind(this);
        this._mobileCenter.onStopReplay = this._onStopReplay.bind(this);
        this._mobileCenter.onRequest = this._onRequest.bind(this);
    },

    connect: function () {
        this._logger.trace("connect: called");
        this._mobileCenter.connect(this._onConnect.bind(this));
    },

    disconnect: function () {
        this._logger.trace("disconnect: called");
        // Do nothing
    },

    sendMessage: function (msg) {
        this._logger.error("sendMessage: - Not implemented, message: " + JSON.stringify(msg));
    },

    sendEvent: function (eventMsg) {
        this._logger.info("sendEvent: called");
        this._mobileCenter.sendEvent(eventMsg, function (err) {
            if (err)
                this._logger.error("sendEvent: error sending: " + JSON.stringify(eventMsg));
        }.bind(this));
    },

    // *** Mobile events ***
    _onConnect: function (err) {
        if (err)
            this._logger.error("_onConnect: error connecting");
    },

    _onStartRecord: function (eventCallback) {
        this._logger.info("_onStartRecord: called");
        this._onRequest(startRecordMsg, function (ignoreParameter) { eventCallback(); });
    },

    _onStopRecord: function (eventCallback) {
        this._logger.info("_onStopRecord: called");
        this._onRequest(stopRecordMsg, function (ignoreParameter) { eventCallback(); });
    },

    _onStartReplay: function (eventCallback) {
        this._logger.info("_onStartReplay: called");
        eventCallback();
    },

    _onStopReplay: function (eventCallback) {
        this._logger.info("_onStopReplay: called");
        eventCallback();
    },

    _onRequest: function (requestMsg, responseCallback) {
        this._logger.trace("_onRequest: called");
        try {
            this._dispatchEvent("message",
                requestMsg,
                null,
                function (resMsg) {
                    resMsg.status = resMsg.status ? resMsg.status : "OK";
                    responseCallback(resMsg);
                }.bind(this));
        } catch (e) {
            this._logger.error("_onRequest: Exception:" + e + ", Details: " + (e.Details || "") + ", Stack: " + e.stack);
            if (requestMsg)
                requestMsg.status = e.message || "ERROR";

            responseCallback(requestMsg);
        }
    }
});

////////////////////////
