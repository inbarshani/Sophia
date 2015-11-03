var requestMsgWrapper = {
    "uid": 1,
    "type": "request",
    "data": {
        "data": null
    }
};


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


function SophiaMessagingChannel() {
    EventDispatcher.call(this, new LoggerUtil("ComChannels.SophiaMessagingChannel"));
}

Util.inherit(SophiaMessagingChannel, EventDispatcher, {

    _sophiaTestId: '',
    _dataUrl: '',
    _baseAppUrl: '',
    _fileUrl: '',

    // *** Public methods ***
    init: function() {
        console.log('SophiaMessagingChannel init log');
        this._logger.trace("SophiaMessagingChannel init");
        var that = this;


        chrome.storage.local.get(['dataUrl', 'sophiaTestId', 'baseAppUrl', 'fileUrl'], 
            this._setValuesFromStorage.bind(this));

        chrome.storage.onChanged.addListener(this._updateValues.bind(this));

        chrome.runtime.onConnect.addListener(function(port) {
            //console.log("SophiaMessagingChannel background: received connection request from content script on port " + port);
            port.onMessage.addListener(function(msg) {
                console.log("SophiaMessagingChannel background: received message '" + JSON.stringify(msg) + "'");
                // currently do nothing as we handle the messages in send message
                // if decide to do something here, needs to handle the this binding
                if (that && that._sophiaTestId)
                {
                    that._recordScreenshot();
                }
            });
        });

    },

    getComChannelID: function() {
        console.log('SophiaMessagingChannel getComChannelID log');
        this._logger.trace("SophiaMessagingChannel getComChannelID: called");
        return "SophiaMessagingChannel";
    },

    connect: function(nativeMessagingHost) {
        console.log('SophiaMessagingChannel connect log');
        this._logger.trace("SophiaMessagingChannel connect: trying to connect to native messaging host " + this._nativeMessagingHost);
    },



    disconnect: function() {
        console.log('SophiaMessagingChannel disconnect log');
        this._logger.trace("SophiaMessagingChannel disconnect: close connection to native messaging host '" + this._nativeMessagingHost + "'");
    },

    sendMessage: function(msg) {
        //console.log('SophiaMessagingChannel sendMessage log: ' + JSON.stringify(msg));
        console.log("SophiaMessagingChannel sendMessage got msg: " + 
            JSON.stringify(msg));
        // get to the actual message we want, if it's there
        if (msg && msg.data && msg.data.data && msg.data.data._data) {
            var msgData = msg.data.data._data;
            //console.log('SophiaMessagingChannel sendMessage msgData: ' + JSON.stringify(msgData));
            //console.log('SophiaMessagingChannel get _sophiaTestId: ' + this._sophiaTestId);
            //console.log('SophiaMessagingChannel get _dataUrl: ' + this._dataUrl);
            //console.log('SophiaMessagingChannel get _baseAppUrl: ' + this._baseAppUrl);
            //console.log('SophiaMessagingChannel get _fileUrl: ' + this._fileUrl);

            var recordDesc = msgData["recorded description"];
            var desc = {};
            if (recordDesc && recordDesc.length > 0 && recordDesc[0] && recordDesc[0].length > 0) {
                desc = recordDesc[0][0]["description"];
            }
            console.log('SophiaMessagingChannel sendMessage desc: ' + JSON.stringify(desc));

            var eventID = msgData["event id"];
            var eventName = '';
            if (eventID && eventID.length > 0 && eventID[0] && eventID[0].length > 0) {
                eventName = eventID[0][0]["name"];
            }
            console.log('SophiaMessagingChannel sendMessage eventName: ' + JSON.stringify(eventName));

            var eventValue = msgData["value"];
            console.log('SophiaMessagingChannel sendMessage eventValue: ' + JSON.stringify(eventValue));

            var eventType = msgData["type"];
            console.log('SophiaMessagingChannel sendMessage eventType: ' + JSON.stringify(eventType));

            if (eventName && eventName.length > 0)
            {
                var ts = new Date().getTime();
                var args = {
                    type: "UI_logical",
                    timestamp: ts,
                    //url: docUrl,
                    testID: this._sophiaTestId,
                    uiObject: desc,
                    eventName: eventName,
                    eventType: eventType,
                    eventValue: eventValue
                }

                $.ajax({
                    url: this._dataUrl,
                    type: 'POST',
                    data: JSON.stringify(args),
                    dataType: 'json',
                    success: function (doc) {
                        console.log("SophiaMessagingChannel sendMessage data posted: " + doc);
                    }
                  });

                this._recordScreenshot();
            }

        }
    },

    // *** Private methods ***


    _recordScreenshot: function(){
        console.log('SophiaMessagingChannel recordScreenshot');
        console.log('SophiaMessagingChannel Send message to capture UI and screenshot');
        // tell content script to capture UI objects and report to Sophia
        chrome.tabs.query({
            active: true
        }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {sophiaCaptureUI: true}, 
                function(response) {
                    console.log('SophiaMessagingChannel Got response for capturing UI objects: '+response);
                });
        });

        // tell background to capture image and report to Sophia
        chrome.runtime.sendMessage({sophiaScreenshot: true},
            function(response) {
                console.log('SophiaMessagingChannel Got response for capturing screenshot: '+response);
            });

    },

    _setValuesFromStorage: function(result)
    {
        this._dataUrl = result.dataUrl;
        this._sophiaTestId = result.sophiaTestId;
        this._baseAppUrl = result.baseAppUrl;
        this._fileUrl = result.fileUrl;
        console.log('SophiaMessagingChannel set _sophiaTestId: ' + this._sophiaTestId);
        console.log('SophiaMessagingChannel set _dataUrl: ' + this._dataUrl);
        console.log('SophiaMessagingChannel set _baseAppUrl: ' + this._baseAppUrl);
        console.log('SophiaMessagingChannel set _fileUrl: ' + this._fileUrl);
    },

    _updateValues: function(changes, namespace) {
        console.log('SophiaMessagingChannel _updateValues changes: ' + changes);
        for (key in changes) {
            if (namespace == "local") {
                var storageChange = changes[key];
                if (key == "sophiaTestId") {
                    if (!storageChange.newValue && this._sophiaTestId) {
                        this._onStopRecord();
                    } else if (storageChange.newValue && !this._sophiaTestId) {
                        this._onStartRecord();
                    }

                    this._sophiaTestId = storageChange.newValue;
                    console.log('SophiaMessagingChannel changed _sophiaTestId: ' + this._sophiaTestId);
                } else if (key == "dataUrl") {
                    this._dataUrl = storageChange.newValue;
                } else if (key == "baseAppUrl") {
                    this._baseAppUrl = storageChange.newValue;
                } else if (key == "fileUrl") {
                    this._fileUrl = storageChange.newValue;
                }
            }
        }
    },

    _onStartRecord: function(eventCallback) {
        this._logger.info("_onStartRecord: called");

        requestMsgWrapper.data.data = startRecordMsg;
        requestMsgWrapper.uid = UUID();

        this._onRequest(requestMsgWrapper, function(ignoreParameter) {
            if (eventCallback) eventCallback();
        });
    },

    _onStopRecord: function(eventCallback) {
        this._logger.info("_onStopRecord: called");

        requestMsgWrapper.data.data = stopRecordMsg;
        requestMsgWrapper.uid = UUID();

        this._onRequest(requestMsgWrapper, function(ignoreParameter) {
            if (eventCallback) eventCallback();
        });
    },

    _onRequest: function(requestMsg, responseCallback) {
        this._logger.trace("_onRequest: called");
        try {
            this._dispatchEvent("message",
                JSON.stringify(requestMsg),
                null,
                function(resMsg) {
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

function UUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
