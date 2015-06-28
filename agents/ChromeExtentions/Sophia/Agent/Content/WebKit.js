var WebKit = {
	_logger: new LoggerUtil("Content.WebKit"),
	name: "WebKit",
	priority: 0,
	createAO: function (element, parentID, noDefault) {
		this._logger.trace("createAO: creating AO for element " + element);
		if (element.tagName === "OPTION") {// Don't create AO for OPTION, needed so spy won't think it's pointing at hidden option elements
			element = element.parentNode;
		}
		var ao = new AO(element, parentID);
		this._logger.trace("createAO: merging common behavior");
		ao.mergeBehavior(CommonBehavior);

		switch (element.tagName) {
			case "A":
				if (ao._isRealLink()) {
					ao.mergeBehavior(LinkBehavior);
				} 
				else if (noDefault) { // not a real link and do not want to create default AO
					return null;
				}
				break;
			case "IMG":
				ao.mergeBehavior(ImageBehavior);
				if (ao._getImageParentAnchor()) // image link
					ao.mergeBehavior(ImageLinkBehavior);
				break;
			case "BUTTON":
				ao.mergeBehavior(ButtonBehavior);
				break;
			case "INPUT":
				switch (element.type) {
					case "button":
					case "submit":
					case "reset":
						ao.mergeBehavior(ButtonBehavior);
						break;
					case "text":
						ao.mergeBehavior(EditBehavior);
						break;
					case "image":
						ao.mergeBehavior(ImageBehavior);
						break;
					case "checkbox":
						ao.mergeBehavior(CheckBoxBehavior);
						break;
					case "radio":
						ao._radios = Array.prototype.filter.call(
							document.querySelectorAll("input[type=radio]"),
							function (elem) { return elem.name === ao._elem.name; }
						);
						ao._activeRadio = 0;
						for (var i = 0; i < ao._radios.length; i++) {
							if (ao._radios[i].checked) {
								ao._activeRadio = i;
								break;
							}
						}
						ao.mergeBehavior(RadioGroupBehavior);
						ao._elem = ao._radios[ao._activeRadio];
						break;
					case "file":
						ao.mergeBehavior(FileInputBehavior);
						break;
					case "hidden":
						if (noDefault)
							return null;
						break;
					case "range":
						ao.mergeBehavior(EditBehavior);
						ao.mergeBehavior(RangeBaseBehavior);
						ao.mergeBehavior(RangeBehavior);
						break;
					case "number":
						ao.mergeBehavior(EditBehavior);
						ao.mergeBehavior(RangeBaseBehavior);
						ao.mergeBehavior(NumberBehavior);
						break;
					default:
						ao.mergeBehavior(EditBehavior);
						break;
				}
				break;
			case "TEXTAREA":
				ao.mergeBehavior(EditBehavior);
				break;
			case "SELECT":
				ao.mergeBehavior(ListBehavior);
				break;
			case "AREA":
				ao.mergeBehavior(AreaBehavior);
				break;
			case "TABLE":
				ao.mergeBehavior(TableBehavior);
				break;
			case "IFRAME":  //This will answer queryies from our child Frames.
			case "FRAME":
				ao.mergeBehavior(FrameBehavior);
				break;
			case "VIDEO":
				ao.mergeBehavior(MediaBaseBehavior);
				ao.mergeBehavior(VideoBehavior);
				break;
			case "AUDIO":
				ao.mergeBehavior(MediaBaseBehavior);
				ao.mergeBehavior(AudioBehavior);
				break;
		    case "FORM":
		        if (noDefault)
		            return null;
		        ao.mergeBehavior(FormBehavior);
		        break;
		    case "OBJECT":
		        if (noDefault)
		            return null;
		        ao.mergeBehavior(PluginBehavior);
		        break;
		    case "SPAN":
		    case "DIV":
		        if (this._isElementContentEditable(element)) {
		            this._logger.debug("createAO: This is a content editable element");
		            ao.mergeBehavior(ContentEditableBehavior);
		        }
		        else {
		            return noDefault ? null : ao;
		        }
		        break;
			default:
				if (noDefault) {
					return null;
				}
		}

		return ao;
	},
	createPageAO: function (parentID) {
		var ao = this.createAO(document.documentElement, parentID);
		ao.mergeBehavior(FrameBehavior);
		ao.mergeBehavior(PageBehavior);
		return ao;
	},

	createVirtualTextAO: function (range, parentID) {
	    var ao = new AO(range, parentID);
	    ao.mergeBehavior(VirtualTextBehavior);
	    return ao;
	},

	_uninterestingMicClasses: Util.objectFromArray(['WebElement', 'WebTable'], true),
	_getInterestingAOHierarchy: function (ao, element, parentID) {
	    var res = [];
	    if (element.form) {
	        var formAO = this.createAO(element.form, parentID);
	        res.push(formAO);
	    }

	    res.push(ao);
	    return res;
	},
	_getInterestingAO: function (element, parentID) {
	    for (var curr = element; curr; curr = curr.parentElement) { // return the AO for the first interesting element
	        var ao = this.createAO(curr, parentID, true);
	        if (ao) {
	            var micClass = Util.getMicClass(ao);
	            if (!this._uninterestingMicClasses[micClass])
	                return ao;
	        }
	    }
	    // if no interesting elements, return the AO for the bottom element
	    return this.createAO(element, parentID, false);
	},
	createRecordAOArray: function (element, parentID) {
	    var ao = this._getInterestingAO(element, parentID);
	    return this._getInterestingAOHierarchy(ao, element, parentID);
	},
	_isElementContentEditable: function(elem){
	    while (elem) {
	        if (elem.nodeType !== 1 || elem.contentEditable === "inherit" || !elem.contentEditable) {
	            elem = elem.parentElement;
	            continue;
	        }
	        return elem.contentEditable !== "false";
	    }
	    return false;
	}
};
