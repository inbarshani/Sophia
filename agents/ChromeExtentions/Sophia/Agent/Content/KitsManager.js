function KitsManager() {
	this._logger = new LoggerUtil("Content.KitsManager");
	//FIXME: for now, we just load the hard-coded WebKit, need to change this to loading kits according SRVC_LOAD_KIT message
	this.LoadKit(WebKit);   
}

KitsManager.prototype = {
	_kits: [],
	LoadKit: function (kit) {
		this._logger.trace("LoadKit: loading kit " + kit.name);
		for (var i = 0; i < this._kits.length; i++) {
			if (this._kits[i].priority < kit.priority) {
				break;
			}
		}
		this._kits.splice(i, 0, kit);
	},
	createAO: function (element, parentID, noDefault) {
		this._logger.trace("createAO: creating AO for element " + element);
		if (!element) {
			this._logger.error("createAO: null element, AO not created");
			ErrorReporter.ThrowInvalidArg();
		}
		for (var i = 0; i < this._kits.length; i++) {
			var ao = this._kits[i].createAO(element, parentID, noDefault);
			if (ao) {
				return ao;
			}
		}
		this._logger.debug("createAO: create AO failed for element " + element);
		return null;
	},
	createRecordAOArray: function (element, parentID) {
	    this._logger.trace("createRecordAOArray: creating AO for element " + element);
	    if (!element) {
	        this._logger.error("createRecordAOArray: null element, AO not created");
	        ErrorReporter.ThrowInvalidArg();
	    }

	    for (var i = 0; i < this._kits.length; ++i) {
	        var aoArr = this._kits[i].createRecordAOArray(element, parentID);
	        if (aoArr && aoArr.length > 0)
	            return aoArr;
	    }
	    this._logger.error("createRecordAOArray: create AO failed for element " + element);
	    return null;
	},
	createPageAO: function (parentID) {
	    this._logger.trace("createPageAO: Started");
        //get the webkit
	    return WebKit.createPageAO(parentID);
	},
	createVirtualTextAO: function (range, parentID) {
	    this._logger.trace("createVirtualTextAO: Started");
	    return WebKit.createVirtualTextAO(range, parentID);
	}
};

function ObjectRTIDManager() {
    this._logger = new LoggerUtil("Content.ObjectRTIDManager");
    content.dispatcher.addListener("RegistrationResult", this);
}

ObjectRTIDManager.prototype = {
    _logger: undefined,
    _nextEntry: -1,
    _frameCockie: -1,
    _knownElements: [],
    onRegistrationResult: function (registrationResData) {
        this._logger.info("onRegistrationResult: Started for frame cookie " + registrationResData.frameCount);
        this._frameCockie = registrationResData.frameCount;
    },
    GetIDForElement: function (element) {
        this._logger.trace("GetIDForElement: Started for " + element);
        if (element.objRTID) {
            this._logger.debug("GetIDForElement: No need to create new ID element already known");
            return element.objRTID;
        }

        element.objRTID = { entry: ++this._nextEntry, frameCockie: this._frameCockie };
        this._knownElements[element.objRTID.entry] = element;
        return element.objRTID;
    },
    GetElementFromID: function (id) {
        if (id.frameCockie !== this._frameCockie) {
            this._logger.error("GetElementFromID: Got ID from a different frame generation!" + JSON.stringify(id));
            return null;
        }
        if (id.entry < 0 || id.entry > this._nextEntry) {
            this._logger.error("GetElementFromID: Got unknown entry ! id = " + JSON.stringify(id));
            return null;
        }
        return this._knownElements[id.entry];
    }
};
