function GestureDetector() {
    this._logger = new LoggerUtil('Content.GestureDetector');
    this._detectors = [this.SwipeDetector, this.LongTapDetector].map(function (detector) {
        return new detector(this);
    }, this);

    var handler = this._addEvent.bind(this);
    ['start', 'move', 'end', 'cancel'].forEach(function (name) {
        document.addEventListener('touch' + name, handler, true);
    }, this);

    this._listeners = [];

    this._logger.trace('GestureDetector created');
}


GestureDetector.prototype = {
    _logger: null,
    _detectors: null,
    _listeners: null,

    fireEvent: function (event, info) {
        this._listeners.forEach(function (listener) {
            listener(event.target, info);
        });

        // No other detector should detect a gesture for this event
        this._detectors.forEach(function (d) {
            d.discard();
        });
    },

    addListener: function (listener) {
        if (this._listeners.indexOf(listener) === -1)
            this._listeners.push(listener);
    },

    _addEvent: function (e) {
        switch (e.type) {
            case 'touchstart':
                this._detectors.forEach(function (d) { d.touchStart(e); });
                break;
            case 'touchmove':
                this._detectors.forEach(function (d) { d.touchMove(e); });
                break;
            case 'touchend':
                this._detectors.forEach(function (d) { d.touchEnd(e); });
                break;
            case 'touchcancel':
                this._detectors.forEach(function (d) { d.touchCancel(e); });
                break;
            default:
                this._logger.warn('addEvent: unexpected event type - ' + e.type);
        }
    },
};

GestureDetector.prototype.SwipeDetector = function (owner) {
    this._owner = owner;
    this._logger = new LoggerUtil('Content.SwipeDetector');
    this._logger.trace("Created");
};

GestureDetector.prototype.SwipeDetector.prototype = {
    _owner: null,
    _logger: null,
    _info: null,

    _constants: {
        minDistance: 50,
        maxOffset: 30,  // If moved more than this in the other direction it's not a swipe 
        maxDuration: 1500,
    },

    discard: function () {
        this._info = null;
    },

    _relevant: function (e) {
        if (e.touches && e.touches.length === 1)
            return true;

        this.discard();
        this._logger.trace('_relevent: Ignoring irrelevant event');
        return false;
    },

    _deltaX: function () {
        return Math.abs(this._info.startX - this._info.x);
    },

    _deltaY: function () {
        return Math.abs(this._info.startY - this._info.y);
    },

    touchStart: function (e) {
        if (!this._relevant(e)) {
            return;
        }

        if (this._info)
            this._logger.warn('touchStart: Overwriting existing touch event');

        var touch = e.touches[0];
        this._info = {
            direction: null,
            target: e.target,
            start: e.timeStamp,
            startX: touch.pageX,
            startY: touch.pageY,
        };
    },

    touchMove: function (e) {
        if (!this._info)
            return;

        if (!this._relevant(e))
            return this.discard();

        if ((e.timeStamp - this._info.start) > this._constants.maxDuration) {
            this._logger.trace('touchMove: Timeout exceeded');
            return this.discard();
        }

        this._processTouch(e.touches[0]);
    },

    touchEnd: function (e) {
        if (this._info && e.changedTouches.length && this._processTouch(e.changedTouches[0]))
            this._fireEvent(e);
    },

    touchCancel: function (e) {
        this.touchEnd(e); // treat cancel as end
    },

    _processTouch: function (touch) {
        if (!this._info)
            return;

        this._info.x = touch.pageX;
        this._info.y = touch.pageY;

        switch (this._info.direction) {
            case null:
                if (this._deltaX() > this._constants.minDistance) {
                    if (this._deltaY() > this._constants.maxOffset) {
                        this._logger.trace('_processTouch: Aborting swipe, too much offset');
                        return this.discard();
                    }

                    this._logger.trace('_processTouch: Deducing direction to be horizontal');
                    this._info.direction = 'horizontal';
                }
                else if (this._deltaY() > this._constants.minDistance) {
                    if (this._deltaX() > this._constants.maxOffset) {
                        this._logger.trace('_processTouch: Aborting swipe, too much offset');
                        return this.discard();
                    }

                    this._logger.trace('_processTouch: Deducing direction to be vertical');
                    this._info.direction = 'vertical';
                }
                break;
            case 'vertical':
                if (this._deltaX() > this._constants.maxOffset) {
                    this._logger.trace('_processTouch: Aborting vertical swipe, too much offset');
                    return this.discard();
                }
                break;
            case 'horizontal':
                if (this._deltaY() > this._constants.maxOffset) {
                    this._logger.trace('_processTouch: Aborting horizontal swipe, too much offset');
                    return this.discard();
                }
                break;
            default:
                this._logger.error('_processTouch: unexpected direction: ' + this._direction);
        }
        return true;
    },

    _fireEvent: function (e) {
        if (!this._info.direction) {
            this._logger.trace('_fireEvent: Swipe with no direction');
            return;
        }

        var direction;
        var distance;
        if (this._info.direction === 'horizontal') {
            distance = this._info.x - this._info.startX;
            direction = distance > 0 ? 'Right' : 'Left';
        }
        else {
            distance = this._info.y - this._info.startY;
            direction = distance > 0 ? 'Down' : 'Up';
        }
        var absDistance = Math.round(Math.abs(distance));
        if (absDistance < this._constants.minDistance) {
            this._logger.trace('_fireEvent: Aborting swipe, distance shrunk');
            return;
        }

        var args = {
            event: 'swipe',
            direction: direction,
            duration: e.timeStamp - this._info.start,
            distance: absDistance
        };
        this._logger.trace('_fireEvent: Swipe ' + JSON.stringify(args));
        this._owner.fireEvent(e, args);
    },
};

GestureDetector.prototype.LongTapDetector = function (owner) {
    this._owner = owner;
    this._logger = new LoggerUtil('Content.LongTapDetector');
    this._logger.trace("Created");
};

GestureDetector.prototype.LongTapDetector.prototype = {
    _owner: null,
    _logger: null,
    _info: null,

    _constants: {
        maxOffset: 10,
        minTime: 750,
    },

    discard: function () {
        this._info = null;
    },

    _relevant:function(e) {
        return e.touches && e.touches.length === 1;
    },

    touchStart: function (e) {
        if (!this._relevant(e)) {
            this.discard();
            return;
        }

        if (this._info)
            this._logger.warn('touchStart: overwrting existing info');

        var touch = e.touches[0];
        this._info = {
            x: touch.pageX,
            y: touch.pageY,
            start: e.timeStamp,
        };
    },

    touchMove: function (e) {
        if (!this._info)
            return;

        if (!this._relevant(e)) {
            this._logger.warn('touchMove: got irrelevant move, should have been discareded in touchStart');
            return this.discard();
        }

        this._processTouch(e.touches[0]);
    },

    touchEnd: function (e) {
        if (this._info && e.changedTouches.length && this._processTouch(e.changedTouches[0])) {
            if ((e.timeStamp - this._info.start) >= this._constants.minTime) {
                this._fireEvent(e);
                return;
            }
            this._logger.trace('touchEnd: discarding longTap, time too short');
        }
        this.discard();
    },

    touchCancel: function (e) {
        return this.touchEnd(e);
    },

    _processTouch: function (touch, timeStamp) {
        if ((Math.abs(touch.pageX - this._info.x) > this._constants.maxOffset) ||
            (Math.abs(touch.pageY - this._info.y) > this._constants.maxOffset)) {
            this._logger.trace('touchMove: discarded, too much offset or too little time');
            this.discard();
            return false;
        }

        return true;
    },

    _fireEvent: function (e) {
        var args = {
            event: 'longTap',
            duration: e.timeStamp - this._info.start,
        };
        this._logger.trace('_fireEvent: LongTap ' + JSON.stringify(args));
        this._owner.fireEvent(e, args);
    },
};
