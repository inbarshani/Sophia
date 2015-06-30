function WebExtKit(toolkits) {
    this._logger = new LoggerUtil("Content.WebExtKit");
    this._toolkitManager = new ToolkitManager();
    this._tagElements = [];
    this._skipTypes = [];
    this.loadToolkits(toolkits);
}

WebExtKit.prototype = {
    name: "WebExtKit",
    priority: 1,

    loadToolkits: function (toolkits) {
        this._logger.trace("loadToolkits called");
        this._toolkitManager.loadToolkits(toolkits);
        this._tagElements = this._toolkitManager.getTagList();
    },

    createAO: function (element, parentID/*, noDefault*/) {
        this._logger.trace("createAO called");
        var ao = null;
        if (!Util.isNullOrUndefined(element) && !Util.isNullOrUndefined(element.tagName)) {
            var tagName = element.tagName.toLowerCase();
            if (this._tagElements.indexOf(tagName) !== -1 || this._tagElements.indexOf("default") !== -1) {
                var rootElem = { _elem: null };
                var control = this._toolkitManager.createControl(element, this._skipTypes, rootElem);
                if (control !== null) {
                    this._logger.trace("createAO: element found control. Contro is " + control.controlType);
                    this._skipTypes.push(control.controlType);
                    this._logger.trace("createAO: skipTypes push control types. skipTypes contains " + this._skipTypes.toString());
                    ao = new WebExtAO(Util.isNullOrUndefined(rootElem._elem) ? element : rootElem._elem, control, parentID);
                    this._skipTypes.pop();
                    this._logger.trace("createAO: skipTypes pop(); skipTypes contians " + this._skipTypes.toString());
                }
            }
        }
        return ao;
    },

    createRecordAOArray: function (element, parentID) {
        var aos = [];
        for (var curr = element; curr; curr = curr.parentElement) { // return the AO for the first interesting element
            var ao = this.createAO(curr, parentID, true);
            if (ao) {
                aos.push(ao);
            }
        }

        aos.reverse();
        var childAO = null;
        for (var i in aos) {
            childAO = aos[i];
            childAO.RegisterExtEventHandler();
            if (!childAO.UseDefaultEventHandlingForChildren())
                break;
        }

        var result = childAO ? [childAO] : null;
        return result;
    }
};