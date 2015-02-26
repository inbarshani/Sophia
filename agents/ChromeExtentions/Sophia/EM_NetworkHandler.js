/**
 * Created by shershev on 13/01/2015.
 */
(function () {
    EMLog('d', 'd3', "### Loading EM_NetworkHandler");
    if (window.location.href === 'about:blank') {
        EMLog('d', 'g', 'Current URL is about:blank. Not instrumenting ');
        return;
    }
    if (window.__EM_NetworkHandler) {
        EMLog('d', 'g', 'NetworkHandler not Loaded, already exists ');
        return;
    }
    window.__EM_NetworkHandler = true;

    var actionsHandler = window._eumActionsHandler;

//wrapping of the xhr
    var xhr = new XMLHttpRequest();
    var oldOpen = xhr.constructor.prototype.open;
    var oldSend = xhr.constructor.prototype.send;
    var oldAbort = xhr.constructor.prototype.abort;
    var origSetRequestHeaders = xhr.constructor.prototype.setRequestHeader;
    window.__eumXHRWrappedFunctions = {
        xhrOpen: oldOpen,
        xhrSend: oldSend
    };
//abort is cancellation and shouldn't be recorded
    xhr.constructor.prototype.abort = function () {
        if (this.__eventThread) {
            EMLog('d', 'network', "pop from: xhr.constructor.prototype.abort");
            this.__eventThread.pop({isCancellation: true});
            EMLog('d', 'network', 'Popped from abort xhr, queue: ' + this.__eventThread.queue);
        }
        oldAbort();
    };

//    xhr.constructor.prototype.setRequestHeader = function (header, value) {
//        if (this.__eumUrl && this.__eumUrl.indexOf("/!gap_exec") === 0) {
//            try {
//                origSetRequestHeaders.apply(this, arguments);
//            } catch (e) {
//                EMLog('i', "Error in original send " + e);
//            }
//            return;
//        }
//        //invoke instrumented "setRequestHeader" implementation:
//        //header +':' + space + value + new line char
//        createNetworkObject(this);
//        this._eumNetworkObject.requestSize += header.length + 2 + value.length + 1;
//        EMLog('d', 'network', "Updating xhr report object " + this._eumNetworkObject.msgId + " with request header size " + this._eumNetworkObject.requestSize);
//
//        //invoke the original (real) setRequestHeader:
//        try {
//            origSetRequestHeaders.apply(this, arguments);
//        } catch (e) {
//            EMLog('i', 'network', "Error in set request headers xhr (in original code)");
//        }
//    };

    function createNetworkObject(xhrObj) {
        if (!xhrObj._eumNetworkObject) {
            xhrObj._eumNetworkObject = {};
            //xhrObj._eumNetworkObject.msgId = Date.now();
            xhrObj._eumNetworkObject.msgId = actionsHandler.dateNow();
        }
    }

    function escapeHTML(s) {
        return s.split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;');
    }

    function getFullQualifyURL(url) {
        var el = document.createElement('div');
        el.innerHTML = '<a href="' + escapeHTML(url) + '">x</a>';
        return el.firstChild.href;
    }

    var urlBlackList = ['/diamond/rest/api/V2/notifications/?startFrom='];
//wrap open to read the url of the xhr
    xhr.constructor.prototype.open = function (method, url) {
        if (url.indexOf("/!gap_exec") === 0) { //it's a phonegap hybrid-native call
            this.__eumUrl = url;
            try {
                oldOpen.apply(this, arguments);
            } catch (e) {
                EMLog('i', 'network', "Error in opening xhr (in original code)");
            }
            return;
        }

        for (var i = 0; i < urlBlackList.length; i++) {
            //if url starts with blacklist url - ignore
            if (url.indexOf(urlBlackList[i]) !== -1) {
                this.__eumIgnore = true;
            }
        }
        this.__eumUrl = url;
        createNetworkObject(this);
        EMLog('d', 'network', "Updating xhr report object " + this._eumNetworkObject.msgId);
        //consoleLog("Updating xhr report object " + this._eumNetworkObject.msgId, debug);
        EMLog('d', 'network', "Qualifying url " + url);
        var qualifyUrl = getFullQualifyURL(url);
        EMLog('d', 'network', "Qualified url " + qualifyUrl);
        if (qualifyUrl.toLowerCase().indexOf("file://") !== 0) {
            //method + space + qualifyURL + space +HTTP version + new line
            var reqSize = method.length + 1 + qualifyUrl.length + 8;
            EMLog('d', 'network', "xhr: " + this._eumNetworkObject.msgId + " reqSize:" + reqSize);
            this._eumNetworkObject.url = qualifyUrl;
            this._eumNetworkObject.requestSize = reqSize;
        }
        else {
            EMLog('d', 'network', "url " + url + " is local, skipping.");
        }
        this._eumNetworkObject.method = method;
        try {
            oldOpen.apply(this, arguments);
        } catch (e) {
            EMLog('i', 'network', "Error in opening xhr (in original code)");
        }
    };

//wrapping of the ready state function
    function wrapReadyStateFunction(xhrObject) {
        EMLog('d', 'network', "In wrapReadyStateFunction - XHR, URL: " + xhrObject.__eumUrl);
        //if wrapped already, do nothing
        if (xhrObject._wrappedReady) return;
        var thread = xhrObject.__eventThread;

        //if the xhr isn't connected to a thread, do nothing and mark it as wrapped
        if (!thread) {
            EMLog('d', 'network', "In wrapReadyStateFunction - XHR, URL: " + xhrObject.__eumUrl + " ,not connected to thread.");
            xhrObject._wrappedReady = true;
            return;
        }
        EMLog('d', 'network', "In wrapReadyStateFunction - XHR, URL: " + xhrObject.__eumUrl + " ,threadid:" + thread.id);
        var oldReadyState = xhrObject.onreadystatechange,
            oldOnLoad = xhrObject.onload,
            oldOnError = xhrObject.onerror;

        function increaseCounter(thread, xhr) {
            EMLog('d', 'network', "In wrapReadyStateFunction.increaseCounter ,threadid:" + thread.id);
            //set timeout for XHR of 30 secs (to be in line with android native instrumentation)
            xhr.__eumTimeout = actionsHandler.oldSetTimeout.call(window, function () {
                EMLog('d', 'network', "pop from: wrapReadyStateFunction->increaseCounter");
                thread.pop();
                delete xhr.__eumTimeout;
            }, 1000 * 30);
            thread.push();
        }

        function decreaseCounter(thread, xhr) {
            if (xhr.__eumTimeout) {
                EMLog('d', 'network', "pop from: wrapReadyStateFunction->decreaseCounter");
                thread.pop();
                actionsHandler.oldClearTimeout.call(window, xhr.__eumTimeout);
                delete xhr.__eumTimeout;
            }
        }

        //if a readystate function is declared
        if (oldReadyState) {
            //add 1 to queue
            increaseCounter(thread, xhrObject);
            EMLog('d', 'network', "Added task at ready state " + thread.toString());
            xhrObject._wrappedReady = true;
            //if the ready state isn't yet 4 (i.e. we arrived on time)
            if (xhrObject.readyState !== 4) {
                //change the ready state function
                xhrObject.onreadystatechange = function () {
                    //only set thread if we are at readystate === 4, the other readystates aren't doing anything
                    if (xhrObject.readyState === 4) {
                        actionsHandler.setThread(thread);
                        //var responseEnd = Date.now();
                        var responseEnd = actionsHandler.dateNow();
                        createNetworkObject(xhrObject);
//                        if (xhrObject.responseText != null) {
//                            var responseLength = xhrObject.responseText.length;
//                            if (xhrObject.getAllResponseHeaders() != null) {
//                                responseLength += xhrObject.getAllResponseHeaders().length;
//                            }
//                            EMLog('d', 'network', "xhr: " + xhrObject._eumNetworkObject.msgId + " responseLength " + responseLength);
//                            xhrObject._eumNetworkObject.responseLength = responseLength;
//                            xhrObject._eumNetworkObject.responseEnd = responseEnd;
//                            xhrObject._eumNetworkObject.responseCode = xhrObject.status;
//                        }
                    } else if (xhrObject.readyState === 2) { //first response byte received
                        //var responseStart = Date.now();
                        var responseStart = actionsHandler.dateNow();
                        createNetworkObject(xhrObject);
                        xhrObject._eumNetworkObject.responseStart = responseStart;
                    }
                    try {
                        //call the original callback
                        actionsHandler.doCallback(xhrObject, oldReadyState, 'xhr', arguments, thread);
                    } catch (e) {
                        EMLog('i', 'Script error in original callback' + e);
                    }
                    //if it's at ready state 4, reduce queue by 1 and close thread
                    if (xhrObject.readyState === 4) {
                        decreaseCounter(thread, xhrObject);
                        EMLog('d', "Popped after ready state queue: " + thread.queue);
                        actionsHandler.closeThread();
                        if (xhrObject._eumNetworkObject.url) {
                            var uaId = thread.startTime;
                            if (thread.nativeEventId) {
                                uaId = thread.nativeEventId;
                            }
                            window.__eumRumService.reportNetworkAction(uaId, xhrObject._eumNetworkObject.msgId, xhrObject._eumNetworkObject.requestSize, xhrObject._eumNetworkObject.method, xhrObject._eumNetworkObject.url,
                                xhrObject._eumNetworkObject.responseLength, xhrObject._eumNetworkObject.responseCode, xhrObject._eumNetworkObject.requestTime, xhrObject._eumNetworkObject.responseStart,
                                xhrObject._eumNetworkObject.responseEnd, '', '', '');

                        }
                    }
                };
            } else {
                //if we arrived to late, and readystate already done, remove 1 from queue, this shouldn't happen usually
                decreaseCounter(thread, xhrObject);
                EMLog('d', "Popped after ready state (couldn't wrap) queue: " + thread.queue);
            }
            //responding to xhr can be via onload or on ready state change, if it's by onload, wrap it instead
        } else if (oldOnLoad) {
            console.log("before increase counter 2");
            increaseCounter(thread, xhrObject);
            EMLog('d', "Added task at ready state ON LOAD " + thread.toString());
            xhrObject._wrappedReady = true;
            xhrObject.onload = function () {
                actionsHandler.setThread(thread);
                try {
                    actionsHandler.doCallback(xhrObject, oldOnLoad, 'xhr', arguments, thread);
                } catch (e) {
                    EMLog('i', 'Script error in original callback' + e);
                }
                decreaseCounter(thread, xhrObject);
                EMLog('i', "Popped after ready state on load " + thread.toString());
                actionsHandler.closeThread();
            };
        }
        //also wrap on error if exists
        if (oldOnError) {
            xhrObject._wrappedReady = true;
            xhrObject.onerror = function () {
                actionsHandler.setThread(thread);
                try {
                    actionsHandler.doCallback(xhrObject, oldOnError, 'xhr', arguments, thread);
                } catch (e) {
                    EMLog('i', 'Script error in original callback' + e);
                }
                //only reduce 1 from queue if the queue was increased in onload or onreadystate
                if (oldOnLoad || oldReadyState) decreaseCounter(thread, xhrObject);
                EMLog('d', "Popped after ready state error: " + thread.toString());
                actionsHandler.closeThread();
            };
        }
    }

    function clearUrlQueryParams(fullUrl) {
        var retUrl = fullUrl;
        if (fullUrl.indexOf("?") > 0) {
            retUrl = retUrl.substr(0, retUrl.indexOf("?"));
        }
        return retUrl;

    }

//wrap the send method of the xhr
    xhr.constructor.prototype.send = function (postData) {
        if (this.__eumUrl && this.__eumUrl.indexOf("/!gap_exec") === 0) {
            try {
                oldSend.apply(this, arguments);
            } catch (e) {
                EMLog('i', "Error in original send " + e);
            }
            return;
        }

        var self = this, ignore = !!this.__eumIgnore;
        //see if an active thread is present, searches for current event thread, or document load event
        if ((actionsHandler.currentEventThread || actionsHandler.documentLoadEvent) && !ignore) {
            self.__eventThread = actionsHandler.currentEventThread || actionsHandler.documentLoadEvent;
            EMLog('d', "In XHR send, URL: " + self.__eumUrl + " ,found open thread: " + self.__eventThread.toString());
        }
        //if found thread, try to wrap
        if (self.__eventThread) {
            if (self.__eumUrl) {
                self.__eventThread.eventChain += 'X->' + clearUrlQueryParams(self.__eumUrl) + ';';
            }
            wrapReadyStateFunction(this);
            //if couldn't wrap, try again in 10ms, this can happen in the following scenario
            // xhr.send(); (we are here)
            // xhr.onreadystatechange = function()...
            if (!this._wrappedReady) {
                actionsHandler.oldSetTimeout.call(window, function () {
                    wrapReadyStateFunction(self);
                }, 10);
            }
        }
        //createNetworkObject(this);
        //this._eumNetworkObject.requestTime = Date.now();
        this._eumNetworkObject.requestTime = actionsHandler.dateNow();
        //todo: add headers length to request size
        if (postData) {
            this._eumNetworkObject.requestSize += postData.length;
        }
        try {
            oldSend.apply(this, arguments);
        } catch (e) {
            EMLog('i', "Error in original send " + e);
        }
    };

})();



