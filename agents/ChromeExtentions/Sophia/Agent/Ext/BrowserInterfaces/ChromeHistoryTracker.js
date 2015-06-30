function HistoryTracker() {
    this._logger = new LoggerUtil("HistoryTracker");
    this._listeners = {};
    this._histories = {};
    chrome.webNavigation.onCommitted.addListener(this._navigationEventHandler.bind(this, 'onCommitted'));

    if (chrome.webNavigation.onHistoryStateUpdated)
        chrome.webNavigation.onHistoryStateUpdated.addListener(this._navigationEventHandler.bind(this, 'onHistoryStateUpdated'));
    else
        this._logger.info("HistoryTracker: onHistoryStateUpdated API is not available on this Chrome version. It's only supported as of version 22 and above.");

    chrome.webNavigation.onReferenceFragmentUpdated.addListener(this._navigationEventHandler.bind(this, 'onReferenceFragmentUpdated'));
    chrome.webNavigation.onErrorOccurred.addListener(this._onErrorOccurred.bind(this));

    if (chrome.tabs.onReplaced)
        chrome.tabs.onReplaced.addListener(this._onTabReplaced.bind(this));
    else
        this._logger.info("HistoryTracker: onReplaced API is not available on this Chrome version. It's only supported as of version 26 and above.");
    
    this._initInitialUrls();
}

HistoryTracker.prototype = {
    _logger: null,
    _histories: null, // tabId to History map
    _listeners: null,

    _initInitialUrls: function () {
        chrome.windows.getAll({ populate: true }, (function (windowsArr) {
            for (var i = 0; i < windowsArr.length; ++i) {
                for (var j = 0; j < windowsArr[i].tabs.length; ++j) {
                    if (windowsArr[i].type === "normal") {
                        var tab = windowsArr[i].tabs[j];
                        this._histories[tab.id] = this._createHistoryObject();
                        this._histories[tab.id].appendNode({ tabId: tab.id, url: tab.url });
                    }
                }
            }

        }).bind(this));
    },

    _createHistoryObject: function () {
        var history = new this.History();
        history.onBack(this._handleBackForwardEvents.bind(this, 'back'));
        history.onForward(this._handleBackForwardEvents.bind(this, 'forward'));
        return history;
    },

    _navigationEventHandler: function (eventName, data) {
        if ((data.frameId === 0) || // Top-level Frame (Page) 
            (data.transitionType === 'manual_subframe') || // Manual navigation in a subframe
            (data.transitionQualifiers.indexOf('forward_back') !== -1)) { // Back/Forward on subframe

            this._logger.trace('_navigationEventHandler ' + eventName + ' started with: ' + JSON.stringify(data));

            var tabId = data.tabId;
            if (!this._histories[tabId])
                this._histories[tabId] = this._createHistoryObject();

            this._histories[tabId].update(data);
        }
    },

    _onErrorOccurred: function (data) {
        this._logger.trace('_onErrorOccurred: started with: ' + JSON.stringify(data));
    },

    _onTabReplaced: function (tabId, replacedTabId) {
        this._logger.trace('_onTabReplaced: replacing tab id: ' + replacedTabId + ' with new tab id: ' + tabId);

        var currentNode = this._histories[tabId].currentNode();

        // Save history from old tab
        this._histories[tabId] = this._histories[replacedTabId];
        delete this._histories[replacedTabId];

        // Add new navigation to history
        this._histories[tabId].appendNode(currentNode.data);
    },

    // Callbacks for history
    _handleBackForwardEvents: function (eventName, tabId, isFrameEvent) {
        if (this._listeners[eventName])
            this._listeners[eventName](tabId, isFrameEvent);
    },

    onBack: function (callback) {
        this._listeners.back = callback;
    },

    onForward: function (callback) {
        this._listeners.forward = callback;
    },

    History: function () {
        // C'tor for HistoryTracker.prototype.History.prototype
        this._logger = new LoggerUtil("HistoryTracker.History");
        this._listeners = {};
    },
};

HistoryTracker.prototype.History.prototype = {
    _logger: null,
    _current: null, // of type LinkedNode
    _listeners: null,

    update: function (data) {
        if (this._isAutomaticNavigationRedirect(data)) {
            this._logger.trace("update: client redirect ==> Replacing current history node.");
            this._replaceCurrentNode(data);
            return;
        }

        if (!this._isUserInitiatedBackForward(data))  {
            // Check if navigation is done to the previous URL and that it's not committed due to a form submit event, then it won't be added to the history
            if (this._current && (this._current.data.url === data.url) && (data.transitionType !== 'form_submit')) {
                this._logger.trace("update: Navigating to the same url as the current one. Do nothing.");
                return;
            }

            this._logger.trace("update: Not Back/Forward. Adding a new node to history.");
            this.appendNode(data);
            return;
        }

        // back or forward event

        if (!this._current) {
            this._logger.error('Missing current history entry');
            return;
        }

        var isFrame = (data.frameId !== 0);

        var previous = '<empty>';
        if (this._current.getPrevious()) {
            previous = this._current.getPrevious().data.url;
            if (previous === data.url) {
                this._dispatchEvent("back", data.tabId, isFrame);
                this._current = this._current.getPrevious();
                return;
            }
        }

        var next = '<empty>';
        if (this._current.getNext()) {
            next = this._current.getNext().data.url;
            if (next === data.url) {
                this._dispatchEvent("forward", data.tabId, isFrame);
                this._current = this._current.getNext();
                return;
            }
        }

        // When loading a page with subframes the subframes' urls aren't added to the history list, therefore if we have an 
        // unrecognized Back/Forward on a subframe we assume it's a Back operation
        if (data.frameId !== 0) {
            this._logger.info('update: Unknown Back/Forward on sub-frame ==> assuming Back: ' + data.url + '\n' + 'Previous: ' + previous + '\nNext: ' + next);
            this._dispatchEvent("back", data.tabId, isFrame);
            this._current = this._current.getPrevious();
            return;
        }

        this._logger.error('update: Unknown Back/Forward: ' + data.url + '\n' +
            'Previous: ' + previous + '\nNext: ' + next
            );
    },

    _isUserInitiatedBackForward: function (data) {
        if (data.transitionQualifiers.indexOf('forward_back') === -1)
            return false;

        if (data.frameId === 0)
            return true;

        // For subframe navigations we sometimes get 'forward_back' when the user performed a regular navigation
        // Real Back/Forward operations have 'auto_subframe' (and not 'manual_subframe')
        if (data.transitionType === 'auto_subframe')
            return true;

        return false;
    },

    _isAutomaticNavigationRedirect: function (data) {
        if (data.transitionQualifiers.indexOf('client_redirect') === -1)
            return false;

	// transitionType = Link means that the user clicked on a link which caused the current navigation
        if (data.transitionType === 'link')
            return false;

        return true;
    },

    currentNode: function () {
        return this._current;
    },

    appendNode: function (data) {
        this._current = new LinkedNode(data, this._current, null);
    },

    onBack: function (callback) {
        this._listeners.back = callback;
    },

    onForward: function (callback) {
        this._listeners.forward = callback;
    },

//#region Privates
    _replaceCurrentNode: function (data) {
        if (this._current)
            this._current = new LinkedNode(data, this._current.getPrevious(), this._current.getNext());
        else
            this._current = new LinkedNode(data, null, null);
    },

    _dispatchEvent: function (eventName, tabId, isFrameEvent) {
        if (this._listeners[eventName])
            this._listeners[eventName](tabId, isFrameEvent);
    },
//#endregion 
};

function LinkedNode(data, prev, next) {
    this.data = data;
    this.setPrevious(prev);
    this.setNext(next);
}

LinkedNode.prototype = {
    data: null,
    _previous: null,
    _next: null,

    getNext: function () {
        return this._next;
    },

    setNext: function (node) {
        if (this._next)
            this._next._previous = null;
            
        this._next = node;
        if (node)
            node._previous = this;
    },

    getPrevious: function () {
        return this._previous;
    },

    setPrevious: function (node) {
        if (this._previous)
            this._previous._next = null;

        this._previous = node;
        if (node)
            node._next = this;
    },
};
