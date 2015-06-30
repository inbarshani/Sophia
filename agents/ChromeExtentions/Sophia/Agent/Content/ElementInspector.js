function ElementInspector(frameId) {
    this._logger = new LoggerUtil("Content.ElementInspector");
    this._frameId = frameId;
    this._handlers = {};
    var mouseEvents = ['click', 'dblclick', 'mousedown', 'mouseup', 'mouseover'];
    var defaultHandler = this._eventHandler.bind(this);
    mouseEvents.forEach(function (name) {
        this._handlers[name] = defaultHandler;
    }, this);

    this._handlers.mousemove = this._mouseMove.bind(this);

    this._handlers.mouseout = this._mouseOut.bind(this);
    this._handlers.keydown = this._keyDown.bind(this);
    this._handlers.keyup = this._keyUp.bind(this);
}

ElementInspector.prototype = {
    _logger: null,
    _frameId: null,
    _handlers: null,
    _outliner: null,

    startSpy: function () {
        this._logger.trace("startSpy: called");
        this._outliner = new ContentUtils.ElementBorder();
        this._outliner.run(function (elem) { elem.style.cursor = 'pointer'; });

        Object.keys(this._handlers).forEach(function (h) { document.addEventListener(h, this._handlers[h], true); }, this);
    },

    stopSpy: function () {
        this._logger.trace("stopSpy: called");
        this._outliner.remove();
        this._outliner = null;

        Object.keys(this._handlers).forEach(function (h) { document.removeEventListener(h, this._handlers[h], true); }, this);
    },

    _eventHandler: function (ev) {
        this._logger.trace('_eventHandler: called');
        if (ev.metaKey) {
            this._logger.trace('handler is paused, exiting');
            return;
        }

        ev.stopPropagation();
        ev.preventDefault();
        if (ev.type === 'click')
            this._inspect(ev);
    },

    _addTitle: function (elem) {
        var ao = content.kitsManager.createAO(elem, this._frameId);
        var self = this;
        ao.GetAttr('micclass', null, function (micclasses) {
            var micclass = Array.isArray(micclasses) ? micclasses[0] : micclasses;
            self._outliner.run(function (overlay) { overlay.title = 'Class Name: ' + micclass + '\nhtml tag: ' + elem.tagName; });
        });
    },

    _inspect: function (ev) {
        this._outliner.hide();
        var point = { x: ev.clientX, y: ev.clientY };
        var queryClientPointMsg = new Msg("QUERY_OBJ_CLIENT_POINT_TO_ID", Util.shallowObjectClone(this._frameId), { pos: point });

        content.dispatcher.sendMessage(queryClientPointMsg, null, null, function (resMsg) {
            this._logger.trace("_inspect: QUERY_OBJ_CLIENT_POINT_TO_ID result: " + JSON.stringify(resMsg));
            var webIdsArr = resMsg._data.WEB_PN_ID;

            if (!Array.isArray(webIdsArr) || webIdsArr.length < 1) {
                this._logger.trace("_inspect: QUERY_OBJ_CLIENT_POINT_TO_ID didn't return any Runtime Ids");
                return;
            }

            this._dispatchInspectMsg(webIdsArr.pop()); // get Last Element in the array
        }.bind(this));
    },

    _mouseMove: function (ev) {
        if (ev.metaKey) {
            this._outliner.hide();
            return;
        }
        ev.stopPropagation();
        ev.preventDefault();

        this._outliner.hide(); // allow getting the real element by hiding the outliner
        var elem = document.elementFromPoint(ev.x, ev.y);
        if (elem.tagName === 'IFRAME')
            return;// If entering a frame, don't need to show rect on outer document

        if (this._outliner.wrap(elem))
            this._addTitle(elem);

        this._outliner.show();
    },

    _mouseOut: function (ev) {
        if (!ev.relatedTarget) // if the related target is undefined it means it's part of another document
            this._outliner.hide();
    },

    _dispatchInspectMsg: function (rtid) {
        this._logger.trace("_dispatchInspectMsg: called");
        var inspectAutMsg = new Msg("EVENT_INSPECT_ELEMENT", content.dispatcher.getParentDispatcherID(), { WEB_PN_ID: [rtid] });
        content.dispatcher.sendEvent(inspectAutMsg);
    },

    _keyDown: function (ev) {
        if (ev.keyCode === 27) { // ESC
            this._logger.trace("keyDownHandler: Cancelling Spy");
            var inspectAutMsg = new Msg("EVENT_INSPECT_CANCEL", content.dispatcher.getParentDispatcherID(), {});
            content.dispatcher.sendEvent(inspectAutMsg);
            return;
        }

        if (ev.metaKey) {
            this._outliner.hide();
        }
    },

    _keyUp: function (ev) {
        if (ev.metaKey) {
            this._outliner.show();
        }
    }
};