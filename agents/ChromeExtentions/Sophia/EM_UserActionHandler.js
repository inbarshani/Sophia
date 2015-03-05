(function () {
    EMLog('d', 'd3', "### Loading EM_UserActionHandler");
    if(window.location.href==='about:blank'){
        EMLog('d', 'g', 'Current URL is about:blank. Not instrumenting ');
        return;
    }
    if (window.__EMUserActionHandler) {
        EMLog('d', 'g', 'UserActionHandler not Loaded, already exists ');
        return;
    }
    window.__EMUserActionHandler = true;

    var debug = 'd', verbose = 'v', info = 'i', debugLvl = 2;

    var screenshotId = 100;


//    consoleLog("Has object mutator support? " + !!window.MutationObserver, verbose);
    //0 for info, 1 for debug, 2 for verbose
    var reportIframeLogs = true,
        firstUserActionArrived = false,
        instrumentIframes = false,
        lastEvent, currentEventThread, lastThread,
        oldNodeEventListenerAdd = Node.prototype.addEventListener,
        windowOldEventListenerAdd = window.addEventListener,
        timeoutMap = {},
        oldSetTimeout = window.setTimeout,
        oldClearTimeout = window.clearTimeout,
        oldWindowRemoveListener = window.removeEventListener,
        oldAppendChild = Node.prototype.appendChild,
        oldNodeAttachEvent = Node.prototype.attachEvent,
        oldNodeDetachEvent = Node.prototype.detachEvent,
        oldWindowAttachEvent = window.attachEvent,
        oldWindowDetachEvent = window.detachEvent,
        origWindowAlert = window.alert,
        origDateNow = Date.now,
        backButtonEventName = '__EUMBackButtonEvent',
        nativeEventName = '__EUMNativeEventClick',
        nativeEvents = [backButtonEventName, nativeEventName],
        allDom3Events = ['blur', 'click', 'dblclick', 'change', 'touchstart', 'touchcancel', 'touchend', 'touchmove',
            'focus', 'focusin', 'focusout', 'input', 'keydown', 'keyup', 'keypress', 'mousedown', 'mouseenter', 'mouseleave',
            'mousemove', 'mouseout', 'mouseover', 'mouseup', 'scroll', 'change', 'wheel', 'drag', 'dragstart',
            'dragleave', 'dragenter', 'dragover', 'drop', 'dragend', 'select', 'touchenter', 'touchleave'],
        orderedDom3TouchEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'scroll', 'mouseenter', 'mouseout', 'mouseover', 'mousemove', 'mousedown', 'input', 'change', 'mouseleave', 'mouseup', 'click'],
        orderedDom3KeyboardEvents = ['keydown', 'keypress', 'input', 'change', 'keyup'],
        id = 0,
        callbacksMap = {},
        attachEventCBMap = {},
        d4SplitThreshold = 499,
        oldNodeRemoveEventListener = Node.prototype.removeEventListener,
        documentLoadEvent,
        dateNow = function(){return origDateNow() - 0},
        emptyCallback = function () {
        },
        oldCreateElement = document.createElement,
        inEventCallback = false, doneDocumentLoadEvent, sourceString,
        domContentLoaded = false, unloadCalled = false, reportToSophia = window.__eumRumService.reportToSophia, addedWorkaround = false, isIframe = false,
        registeredTargets = [],
        lastCallback = {};

    window.__eumWrappedFunctions = {
        setTimeout: oldSetTimeout,
        clearTimeout: oldClearTimeout,
        appendChild: oldAppendChild,
        createElement: oldCreateElement
    };
    var animationEndEvents = ['webkitTransitionEnd', 'transitionend', 'oTransitionEnd', 'otransitionend', 'MSTransitionEnd',
            'transitionend', 'animationend', 'webkitAnimationEnd'],
//        stickyEvents = ['scroll', 'touchmove'],
//        loadEvents = ['pageshow', 'load', 'DOMContentLoaded'],
        ignoreEvents = ['DOMSubtreeModified', "message", "orientationchange", "resize", "dataavailable", "deviceorientation", "devicemotion", "online", "offline", 'mouseover', 'mouseout', 'mousemove'],
        userDrivenEvents = ['click', 'touchstart', 'touchend', 'touchmove', 'touchcancel', 'mousemove', 'touchmove',
            'mouseover', 'orientationchange', 'scroll', 'keydown', 'keyup', 'mousedown', 'mouseup', backButtonEventName, nativeEventName, 'change'],
        reportOnlyIfAsyncEvents = ['scroll', 'mousemove', 'keyup', 'keydown', 'keypress', 'input', 'touchmove', 'swipe'],
        urlBlackList = ['/diamond/rest/api/V2/notifications/?startFrom='];

    function inIframe() {
        consoleLog("Checking if in iframe for " + window.location, debug);
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }

    var actionsHandler = {};
    window._eumActionsHandler = actionsHandler;

    function setCurrentEventThreadOnWindow(eventThread) {
        window._eumActionsHandler.currentEventThread = eventThread;
    }

    function setDocumentLoadEventOnWindow(documentLoadEvent) {
        window._eumActionsHandler.documentLoadEvent = documentLoadEvent;
    }

    isIframe = inIframe();
    consoleLog("In iframe ? " + isIframe, debug);
    function consoleLog(msg, lvl) {
        if (isIframe && !reportIframeLogs) return;
        if (lvl === debug && debugLvl < 1) {
            return;
        } else if (lvl === info && debugLvl < 0) {
            return;
        } else if (lvl === verbose && debugLvl < 2) {
            return;
        }
        EMLog(lvl, 'd3', msg);
    }

    function EventThread(type, event, isD4) {
        this.type = type;
        this.startTime = dateNow();
        this.queue = 0;
        this.id = id++;
        this.event = event;
        this.target = event.target;
        this.lastPop = false;
        this.images = [];
        this.instrumentType = 'd3';
        this.d3 = true;
        this.events = [];
        this.alerts = [];
        consoleLog("Setting up new event thread for " + type + " id:" + this.id, debug);
        //xhrs and timeouts
        this.eventChain = '';
        if (isD4) {
            return;
        }
        //if it's a native event that fired JAVASCRIPT function
        if (type === nativeEventName) {
            this.nativeEventId = window.__EumCurrentUserActionId;
            consoleLog("In new eventthread for Native event, id is: " + this.nativeEventId, info);
        }
    }

    EventThread.prototype.doNameResolve = function () {
        try {
            //if already done - do nothing
            if (this.nameResolve) return;
            if (this.nativeEventId) {
                //put defaults when native event id, it will be overridden by Native layer so no need to do the expensive name resolving
                consoleLog("Native event id is present, not doing name resolve", debug);
                this.nameResolve = {
                    controlName: '-',
                    hashCode: 0,
                    context: '-',
                    controlId: '-',
                    controlType: '-',
                    gestureValue: '-',
                    contextId: '-'
                };
                return;
            }
            //If it's an event that the user can't do directly (or it's native), don't do name resolving
            consoleLog("Doing name resolving for event thread: " + this.toString(), info);
            if (this.type === 'document.load' || this.type === 'unload' || nativeEvents.indexOf(this.type) !== -1) {
                consoleLog("Name resolve wasn't done - document.load or unload or native event", info);
                this.nameResolve = undefined;
            } else {
                var regTarget = findRegisteredTarget(this.target);
                if (regTarget === null) {
                    consoleLog("Registered target returned null, setting null on nameResolve", info);
                    this.nameResolve = null;
                    return;
                }
                var name = window._namesResolver.findName(this, regTarget);
                //If name is null, shouldn't happen, if it happens, don't report, and will need to see why it happened
                if (name === null) {
                    consoleLog("Name resolve returned null, setting null on nameResolve", info);
                    this.nameResolve = null;
                    return;
                }
                EMLog('i', 'n', "nameResolve: CREATE NAME RESOLVE for contextName: " + name.contextName);
                var observedChanges = {};
                observedChanges.changedNodes = 0;
                observedChanges.addedNodes = 0;

                if (window.location.href.indexOf("#/") !== -1) {
                    consoleLog("there was a history mechanism", debug);
                    window._eumContextIdentifier.currentSketch = null;
                }
                else if (!window._eumContextIdentifier.currentSketch) {
                    window._eumContextIdentifier.currentSketch = window._eumContextIdentifier.createSketch();
                    window._eumContextIdentifier.currentUrl = window.location.href;
                }


                this.nameResolve = {
                    controlName: name.controlName,
                    //hashCode: window._namesResolver.hashCode(name + contextName) || 1001001,
                    context: name.contextName,
                    controlId: name.controlId,
                    controlType: name.controlType,
                    gestureValue: name.gestureValue,
                    contextId: name.contextId
                };
                //this.foundActionName=true;
            }
        } catch (e) {
            consoleLog("Error in name resolving " + e, debug);
        }
    };


    function tooBigElement(elem) {
        consoleLog("check if element is too big " + elem.outerHTML.substring(0, 50));
        var elHeight = elem.offsetHeight;
        var g = document.getElementsByTagName('body')[0];
        if (g) {
            //consoleLog("BG Registered element height!" + elHeight,debug);
            //consoleLog("BG Body height!" + g.clientHeight,debug);
            if (elHeight >= g.clientHeight * 0.7) { //this element catches big portion of the document
                consoleLog("Registered element is too big!", debug);
                return true;
            }
        }
        return false;
    }

    function findRegisteredTarget(tappedTarget) {
        if (!tappedTarget.outerHTML) {
            consoleLog("tapped element is document, can't do name resolve", debug);
            return null;
        }
        //consoleLog("tapped target is " + tappedTarget.outerHTML.substring(0, 30));
        //consoleLog("in find best target " + tappedTarget.outerHTML.substring(0,20), debug);
        var cTarget = tappedTarget;
        var retTarget;
        while (cTarget.tagName !== 'HTML' && !(cTarget instanceof HTMLDocument) && !tooBigElement(cTarget)) {
            if (registeredTargets.indexOf(cTarget) >= 0) {
                retTarget = cTarget;
                break;
            }
            cTarget = cTarget.parentElement;
        }
        if (retTarget) {
            if ((retTarget instanceof HTMLDocument) || retTarget === window || retTarget.tagName === 'BODY') {
                consoleLog("in find best target return tapped target since registered is window or document or body ", debug);
                return tappedTarget;
            }
            return retTarget;
        }
        //consoleLog("in find best target return tapped target 2: " + tappedTarget.outerHTML.substring(0, 20), debug);
        //consoleLog("ret target is " + tappedTarget.outerHTML.substring(0, 30));
        return tappedTarget;
    }

    EventThread.prototype.fork = function () {
        //forked -> means this is d4 object, linkedForkedObject means this is d3 and has d4 thread already forked
        if (this.forked) return this;
        if (this.linkedForkedObject)  return this.linkedForkedObject;
        consoleLog("Forking to d4 thread", debug);
        var forkedObj = new EventThread(this.type, this.event, true);
        forkedObj.target = this.event ? this.event.target : '';
        forkedObj.queue = 0;
        forkedObj.startTime = this.startTime;
        //forked = thread of d3 on d4 object
        forkedObj.forked = true;
        forkedObj.id = this.id;
        forkedObj.instrumentType = 'd4';
        forkedObj.d3 = false;
        forkedObj.nameResolve = this.nameResolve;
        //linkedForkedObject = thread of d4 on d3 object
        this.linkedForkedObject = forkedObj;
        return forkedObj;
    };
    EventThread.prototype.toString = function () {
        return "ID: " + this.id + " Type: " + this.type + " queue: " + this.queue + " instrument: " + this.instrumentType;
    };
    EventThread.isD4 = function (delay) {
        return delay > d4SplitThreshold;
    };
    EventThread.prototype.push = function () {
        consoleLog("Push in thread id: " + this.id + " type:" + this.type, info);
        if (this.checkCounterId) {
            oldClearTimeout(this.checkCounterId);
        }
        this.queue++;
    };

    //Used after a thread queue is 0, makes sure that the thread doesn't have images that are still loading
    EventThread.prototype.didAllImageLoad = function () {
        var eventImages = this.images;
        consoleLog("Going over event images, have: " + eventImages.length, verbose);
        //this should be really quick
        for (var i = 0, len = eventImages.length; i < len; i++) {
            if (!eventImages[i].complete) {
                consoleLog("found incomplete image in thread", verbose);
                return false;
            }
        }
        return true;
    };

    //checks if should report the thread, will not report a thread that is contained in the reportOnlyIfAsyncEvent array, unless it had an async operation
    //which is decided in the doCallback function
    function shouldReportDoneThread(thread) {
        if (reportOnlyIfAsyncEvents.indexOf(thread.type) === -1) {
            return true;
        } else {
            consoleLog("Found event of type " + thread.type + " reporting? " + !!thread.hadAsync, info);
            //"!!var" makes sure the result will be boolean (covers the undefined case)
            return !!thread.hadAsync;
        }
    }

    function processEventType(thread) {
        var eventSet = {};
        var eventsStr = "";
        thread.events.forEach(function (event) {
            eventSet[event.type] = event;
            eventsStr += event.type + "#";
        });

        if (eventSet["touchcancel"] && eventSet["scroll"]) {
            thread.type = 'swipe';
            consoleLog("Found swipe event. - " + eventsStr, info);
            return;
        }
        markIfSwipe(thread, thread.events, eventsStr);

    }

    function markIfSwipe(thread, events, eventsStr) {
        var xDown, yDown;
        var xUp, yUp;
        var tStart = false;
        for (var i = 0; i < events.length; i++) {
            //consoleLog("event type " + events[i].type,info );
            if (events[i].type === 'touchstart' && !tStart) {
                xDown = events[i].location.x;
                //consoleLog("xdown is " + xDown,info);
                yDown = events[i].location.y;
                tStart = true;
                //consoleLog("ydown is " + yDown,info);
            } else if (events[i].type === 'touchmove') {
                xUp = events[i].location.x;
                yUp = events[i].location.y;
                //consoleLog("xup is " + xUp,info);
                //consoleLog("yup is " + yUp,info);

            }
        }
        if (!xDown || !yDown || !xUp || !yUp) {
            return;
        }
        var xDiff = Math.abs(xDown - xUp);
        var yDiff = Math.abs(yDown - yUp);
        consoleLog("swipe diff: " + xDiff + " " + yDiff, debug);
        if (xDiff >= 10 || yDiff >= 10) {
            thread.type = 'swipe';
            consoleLog("Found swipe event. - " + eventsStr, info);
        }
    }

    //this is called when a thread counter reaches 0 (duh)
    function handleCounterZero(thread) {
        consoleLog("In handlecounterZero, threadid:" + thread.id, verbose);
        if (thread.checkCounterId) {
            consoleLog("In handlecounterZero, removeoldtimeout for threadid:" + thread.id, verbose);
            oldClearTimeout(thread.checkCounterId);
        }
        if (!thread.didAllImageLoad()) {
            consoleLog("Not all images finished loading for thread: " + thread.toString() + ", returning", verbose);
            return;
        }
        consoleLog("Setting up check done timeout of event " + thread.toString(), verbose);
        //A thread will not report done when reaching 0 immediately, it will wait for 500 ms,
        // because events arrive one after the other and need to wait a bit to make sure that no other events arrive
        var myThread = thread;
        thread.checkCounterId = oldSetTimeout(function () {
            if (unloadCalled) {
                consoleLog("Unload was called, not reporting. Event is saved in the java", info);
                return;
            }
            consoleLog("Check counter timeout reached 0, event is: " + myThread.toString(), verbose);
            //will only report if queue is 0 (which can be not 0 if other events arrived by now and increased the counter) and it's not documentLoad event -
            // document load event is different and takes a bit longer and isn't implemented here
            if (myThread.queue === 0 && myThread.instrumentType === 'd3' && myThread !== documentLoadEvent && myThread !== doneDocumentLoadEvent && !unloadCalled) {
                consoleLog("Finished event of type: " + myThread.type + " took: " + (myThread.lastPop - myThread.startTime) + " id: " + myThread.id, info);
                doReportProbe(myThread);
                myThread.closed = true;
            }
            //Clear the timeout for the max timeout handling
            if (myThread.queue === 0 && myThread.maxActionTimeoutHandlerId) oldClearTimeout(myThread.maxActionTimeoutHandlerId);
        }, d4SplitThreshold);
    }

    //reduces the queue by 1 and sets the lastPop time to now, unless it's a cancellation pop (xhr.abort, and clearTimeout)
    EventThread.prototype.pop = function (options) {
        consoleLog("Pop from thread id: " + this.id + " type:" + this.type, info);
        options = options || {};
        if (!options.isCancellation) {
            this.lastPop = dateNow();
        }
        if (this.queue) this.queue--;
        if (this.queue === 0 && this.d3) {
            handleCounterZero(this);
        }
    };


    //This function adds an event listener of load on an image, and attaches the active thread that the image was loaded into it.
    //That way the current thread can wait for the image to load if it hadn't done so by the time queue reaches 0.
    function addEventListenerToImage(img, eventThread) {
        //if already added event - do not add;
        if (img._addedListener) return;
        var thread = eventThread || currentEventThread;
        //when the cb is called - remove the event listener
        var cb = function () {
            delete img._addedListener;
            img.removeEventListener('load', cb, true);
            img.removeEventListener('error', cb, true);
        };
        cb._eumThread = thread;
        img.addEventListener('load', cb, true);
        img.addEventListener('error', cb, true);
        img._addedListener = true;
        if (thread) {
            thread.images.push(img);
            consoleLog("Added image to array, for thread " + thread.toString(), verbose);
        }
    }


    //actual report to the probe
    function doReportProbe(thread) {
        //Go over events chain in the thread and decides whther the event type should be changed.
        //For example, used to identify swipe event
        processEventType(thread);

        if (!shouldReportDoneThread(thread)) return;
        //if got name resolve of null (not undefined) it means that Olga's name resolving failed at one point, so it's probably a 'trash' event
        //This shouldn't happen and should be investigated if it did.
        if (thread.nameResolve === null) {
            consoleLog("Not reporting a thread that has nameResolve of null", info);
            return;
        }
        if (thread.timedOut) {
            consoleLog("Not reporting a thread that timed out", info);
            return;
        }
        try {

            //if name resolve is not defined, it means that it wasn't done yet, which is usually the case of document.load events
            //Resolving names of document.load is at this point useless as it *should* be connected to the native event that started the document.load
            //OR to the event that caused the page switch (which should have loaded at the handleDocumentLoad function
            if (!thread.nameResolve) {
                if (nativeEvents.indexOf(thread.type) !== -1) {
                    consoleLog("Not reporting native event - should have been reported by the native layer. Return.", info);
                    return;
                } else if (!window.__eumIsDebug) {
                    return;
                }
                var tempContext = window._namesResolver.beautifyString(window._eumContextIdentifier.fetchContext(window.location.href).displayText);
                var tempHash = window._namesResolver.hashCode(tempContext) || 1001001;
                thread.nameResolve = {
                    controlName: 'documentLoad',
                    hashCode: tempHash,
                    context: tempContext,
                    controlId: tempHash,
                    controlType: window._namesResolver.DEFAULT_CONTROL_TYPE,
                    gestureValue: '',
                    contextId: tempHash
                }
            }
            //
            var finishedTime = thread.lastPop || dateNow(),
                result = thread.nameResolve,
                hashCode = result.hashCode,
            //name = result.name,
                controlId = result.controlId,
                controlName = result.controlName,
                controlType = result.controlType,
                contextName = result.context,
                gestureProp = result.gestureValue,
                contextId = result.contextId;
            if (thread.nativeEventId) {
                consoleLog("Going to report an event that started from native", debug);
            }
            EMLog('i', 'n', "nameResolve: go to report to probe " + controlName);

            if (hashCode === 100100) {
                consoleLog("Was about to report an action that wasn't identified correctly (hash = 100100), not reporting", info);
                return;
            }
            if (isIframe) {
                consoleLog("Reporting UA from inside Iframe!!", info);
            }
            //only log messages that name resolve wasn't done in Native
            if (contextName !== '-') {
                var n = dateNow();
                var endContext = window._namesResolver.beautifyString(window._eumContextIdentifier.fetchContext(window.location.href).displayText);
                consoleLog('Fetch context took: ' + (dateNow() - n), info);
                consoleLog('**EventChain**: ' + contextName + ',' + controlName + ',' + controlId + ',' + contextId + ',' + thread.eventChain + ',' + endContext + "," + (finishedTime - thread.startTime), info);
            }
            consoleLog('Events in thread: ' + JSON.stringify(thread.events), debug);
            var gestureName = 'tap';//TODO delete remark-----> window.__eumIsWeb?'click':'tap';
            if (thread.type === 'swipe') {
                gestureName = 'swipe';
                controlType = window._namesResolver.DEFAULT_CONTROL_TYPE;
            } else if (thread.type.indexOf('key') !== -1) { //it's keyup/down event
                gestureName = 'type';
            } else if (thread.type === 'scroll') {
                gestureName = 'scroll';
            }
            finishedTime = subtractAlerts(finishedTime, thread);
            consoleLog("check if page was changed", debug);
            if (window._eumContextIdentifier.currentUrl && window._eumContextIdentifier.currentUrl === window.location.href) {//the action didn't cause url change
                if (window.location.href.indexOf("#/") === -1) {
                    if (window._eumContextIdentifier.identifyPageTransition()) {
                        controlId = window._namesResolver.createControlIdFromCurrentSketch();
                    }
                }
            }
            window.__eumRumService.reportUserAction(thread.startTime, contextName, controlName, controlType, controlId, gestureName, thread.startTime, finishedTime, true, gestureProp, contextId, thread.nativeEventId);
        } catch (e) {
            consoleLog('Error reporting to probe: ' + e, info);
        }
    }

    function subtractAlerts(origTime, thread) {
        var totalAlertTime = 0;
        for (var i = 0; i < thread.alerts.length; i++) {
            consoleLog("There was an alert during current action", debug);
            totalAlertTime += thread.alerts[i];
        }
        var time = origTime - totalAlertTime;
        consoleLog("Finished time from alert " + time, debug);
        return time;
    }

    function addScriptToIframe(iframe) {
        var scriptId = "__eumInstrumentationScriptId";
        var doc;
        try {
            //both are pointing to the same place, just in case...
            doc = iframe.contentDocument || iframe.contentWindow.document;
            if (!doc) return;
        } catch (e) {
            //if we get exception than it is cross domain
            consoleLog("Can't inject script to Iframe - " + e + " probably cross domain protection ", info);
            return;
        }
        //to make sure the iframe is not already injected. Could also just set a property.
        if (doc.getElementById(scriptId)) return;
        var script = oldCreateElement.call(document, 'script');
        script.type = "text/javascript";
        script.id = scriptId;
        if (!sourceString) {
            consoleLog("Getting JS as Text", debug);
            sourceString = RUMService.getJSAsText();
            consoleLog("Got js as text: " + sourceString.substring(0, 30), debug);
        }
        script.text = sourceString;
        consoleLog("Appending script with text : " + script.text.substring(0, 30), debug);
        //append the script to the iframe document at head tag
        var headID = doc.getElementsByTagName("head")[0];
        if (headID) headID.appendChild(script);
    }

    function injectScriptToIframes() {
        var iframes = document.getElementsByTagName('iframe');
        for (var i = 0; i < iframes.length; i++) {
            addScriptToIframe(iframes[i]);
        }
    }

    //This function is called a lot, need to verify that it's quick
    function getIncompleteImages() {
        var now = dateNow();
        var incomplete = [], images = document.getElementsByTagName('img');
        consoleLog("Checking for images, found: " + images.length, verbose);
        for (var i = 0, len = images.length; i < len; i++) {
            if (!images[i].complete) {
                consoleLog("Found an incomplete image", verbose);
                incomplete.push(images[i]);
            }
        }
        consoleLog("Checking incomplete took: " + (dateNow() - now), info);
        return incomplete;
    }

    function clearUrlQueryParams(fullUrl) {
        var retUrl = fullUrl;
        if (fullUrl.indexOf("?") > 0) {
            retUrl = retUrl.substr(0, retUrl.indexOf("?"));
        }
        return retUrl;

    }

    //utility function, wraps a function so that it will always be called once after _delay_ since invocation
    //for example: function a() {}, var b = throttle(a,500); b(); b(); b(); b(); a will be called once after 500 ms
    function throttle(callback, delay) {
        var id;
        return function () {
            if (id) oldClearTimeout(id);
            id = oldSetTimeout(callback, delay);
        }
    }


    //adds load event listener on images that were found to be loading / created during thread execution
    function addUnloadedImagesToThread(thread) {
        if (!thread.d3) return;
        var incompleteImage = getIncompleteImages(), i, len;
        consoleLog("Checking for incomplete images ", verbose);
        if (incompleteImage.length > 0) {
            consoleLog("Found incomplete images", verbose);
            for (i = 0, len = incompleteImage.length; i < len; i++) {
                addEventListenerToImage(incompleteImage[i], thread);
            }
        }
    }


    //calls the original callback of the wrapped functions
    function doCallback(scope, callback, type, arguments, thread) {
        var asyncTaskDone = false;
        switch (type) {
            case 'addEventListener':
                //when calling node.addEventListener(type,callback, capture)
                //the callback can either be a function, or an object that implements handleEvent method
                //so checking if it's a function - calls it, else calls the handleEvent if exists, else does nothing


                if (typeof callback === 'function') {
                    callback.apply(scope, arguments);
                } else if (callback.handleEvent) {
                    callback.handleEvent.apply(callback, arguments);
                } else {
                    consoleLog("Didn't find what to call in add event listener", debug);
                }
                break;
            //set timeout can be called with a string (which then need to be called in eval,
            //or a function, when the rest of the arguments after the delay are to be passed to that function
            case 'setTimeout':
                if (typeof callback !== "function") {
                    //if callback was passed as a string...
                    //eval(callback);
                    window._evFunc(callback);
                }
                else if (typeof callback === 'function' && arguments) {
                    callback.apply(window, arguments);
                } else {
                    callback.call(window);
                }
                break;
            case 'xhr':
                callback.apply(scope, arguments);
                asyncTaskDone = true;
                break;
            default:
                break;
        }
        if (asyncTaskDone && thread) {
            thread.hadAsync = true;
        }
        //after doing callbacks, have to check if iframes were added - done here unless the flag is false
        if (instrumentIframes && !isIframe) injectScriptToIframes();
        //after callback - check if any images were added and not yet loaded, and connect them to the thread, so when they load we can add their loading time to the thread time
        if (thread) {
            addUnloadedImagesToThread(thread);
        }
    }

    //wraps the checking of document load done in a throttle, so it will check 3 secs after asked
    //We wait for 3 seconds to close the load event to make sure we catch all async operations that may start
    //in the load. The throttle function just make sure to reset the timeout and wait again 3 sec in case something new happens
    var throttleCloseDocumentThread = throttle(function () {
        if (domContentLoaded && documentLoadEvent && documentLoadEvent.didAllImageLoad() && documentLoadEvent.queue === 0) {
            consoleLog("Closed doc load thread " + documentLoadEvent.toString(), verbose);
            if (!isIframe) {
                consoleLog("Finished event of type: " + documentLoadEvent.type + " took: " + (documentLoadEvent.lastPop - documentLoadEvent.startTime) + " id: " + documentLoadEvent.id, debug);
                doReportProbe(documentLoadEvent);
                //clear the saved event, we don't want it for next page
//                jsBridge("clearSavedEvent");
//                jsBridge("clearSavedUrl");
                consoleLog("Cleared saved event", debug);
            } else {
                consoleLog("Finished event of doc load in an iframe, not reporting to probe isIfame? " + isIframe + " location: " + window.location, info);
            }
            doneDocumentLoadEvent = documentLoadEvent;
            documentLoadEvent = false;
        } else if (documentLoadEvent && documentLoadEvent.queue > 0) {
            consoleLog("Attempted to close document load while queue is not zero. queue:" + documentLoadEvent.queue, info);
        } else if (domContentLoaded && documentLoadEvent) {
            consoleLog("Images haven't finished loaded, not reporting doc load end yet", info);
        } else if (documentLoadEvent) {
            consoleLog("Attempted to close document load before DOMContentLoaded arrived", info);
        }
    }, d4SplitThreshold * 6);

    //closes the thread (sets the global variable to false)
    //if it's a document load - closes it after 3 seconds, so all the non user events and the xhr etc will be connected to it
    function closeThread() {
        consoleLog("In close thread currentEventThread : " + (currentEventThread ? currentEventThread.toString() : 'No thread'), verbose);
        if (!currentEventThread) {
            consoleLog("No thread to close", verbose);
            return;
        }
        if (currentEventThread === documentLoadEvent) {
            consoleLog("In close thread - currentEvent === doc load", verbose);
            throttleCloseDocumentThread();
        }
        lastThread = currentEventThread;
        lastThread.closeTime = dateNow();
        if (currentEventThread.d3) consoleLog("Closed thread, current event thread is now false " + currentEventThread.toString(), verbose);
        currentEventThread = false;
        setCurrentEventThreadOnWindow(currentEventThread);
    }

    var closeThreadId;

    //closes a thread after a delay,
    //used for closing a thread after native event, or after onevent callback,
    //(i.e. when we don't have direct access to the callbacks called - we open a window to catch the xhrs and timeouts)
    function closeThreadDelayed(delay) {
        consoleLog("In close thread delayed with delay " + delay, verbose);
        if (closeThreadId) oldClearTimeout(closeThreadId);
        closeThreadId = oldSetTimeout(closeThread, delay);
    }

    function setThread(type, event) {
        if (type instanceof EventThread) {
            currentEventThread = type;
        } else {
            currentEventThread = new EventThread(type, event);
        }
        setCurrentEventThreadOnWindow(currentEventThread);
    }

    //Returning false - means open a new event thread, returning true - means match it up with the last event
    function shouldOpenNewThread(type, event) {
        //first time entering - no last event is present, so new event
        if (!lastEvent) {
            consoleLog("No last event found, opening new thread for type: " + type, info);
            return true;
        }
        if (nativeEvents.indexOf(type) !== -1) {
            //if it's a native event - always start a new event
            return true;
        }
//        //open new thread for 'scroll'
//        if (type === 'scroll') {
//            return true;
//        }
        //Conditions to start new event thread: if it's a touchstart event and last one isn't touchstart
        //If it's change, and before that was click
        //if it's keydown and last one isn't keydown
        consoleLog("Deciding on event: " + type + " starttime: " + event.timeStamp + " lastEvent: " + lastEvent.type + " lastEvent time: " + lastEvent.event.timeStamp, debug);
        return (type === 'change' && lastEvent.type === 'click' && lastEvent.type !== 'change')
            || (type === 'touchstart' && lastEvent.type !== 'touchstart')
            || (type === 'mousedown' &&  lastEvent.type !=='mousedown' && window.__eumIsWeb)
            || (type === 'scroll' &&  lastEvent.type !=='scroll' && window.__eumIsWeb)
            || (type === 'keydown' && lastEvent.type !== 'keydown');
    }

    function setLastEvent(type, event, thread) {
        consoleLog("Setting last event of type " + type, debug);
        var keyEventOrder = orderedDom3KeyboardEvents.indexOf(type),
            touchEventOrder = orderedDom3TouchEvents.indexOf(type);
        if (!thread) {
            if (lastEvent) {
                consoleLog("thread doesn't exist in create last event, create it from lastevent.thread ", debug);
                thread = lastEvent.thread;
            }
        }
        //TODO: move from key orders to a new array with events I want to track
        //We don't really need the order just to know when to save the last event. In some cases we ignore it.
        if (keyEventOrder !== -1 || touchEventOrder !== -1 || nativeEvents.indexOf(type) !== -1) {
            consoleLog("create new last event ", debug);
            lastEvent = {event: event, type: type, thread: thread, startTime: dateNow()};
        }
    }

    function shouldIgnoreEvent(type, event) {
        //We ignore scripot load events and rumService iframe loads
        var shouldIgnore = false;
        //Actually this is a redundant check just to make sure as we do not instrument it.
        if (ignoreEvents.indexOf(type) !== -1 || animationEndEvents.indexOf(type) !== -1) {
            shouldIgnore = true;
        } else if (type === 'load') {
            if (event.target instanceof HTMLScriptElement) {
                consoleLog("Ignoring html script load", debug);
                shouldIgnore = true;
            } else if (event.target instanceof  HTMLIFrameElement) {
                if (event.target.src && event.target.src.indexOf('rumservice')) {
                    shouldIgnore = true;
                    consoleLog("Ignoring rumservice load", debug);
                }
            }
        }
        return shouldIgnore;
    }

    function detectAndSetThreadForEvent(type, event, callback) {
        var last = lastEvent || {},
            ignoring = false;
        consoleLog("Detecting event for type: " + type + " and target = " + event.target, verbose);
        if (shouldIgnoreEvent(type, event)) {
            consoleLog("ignoring event of type: " + type, verbose);
            ignoring = true;
            //It is important that this if will be before the next one as it should have higher priority than the docLoadevent
            //Since the docLoadEvent is kept open for 3 seconds, we want that each image load will first check if it is connected to
            //a real user action and only if not than by default will be connected to the docLoad event if still open
        } else if (callback && callback._eumThread) { //load of image
            consoleLog("has thread in target", debug);
            //If we get load image event we return the related user action event to be the current
            setThread(callback._eumThread);
        }
        //If during load a userAction arrives it will break the docload event. This is to make sure that events (like image loads) that
        //were not connected to the user action by mistake will not add up to the docLoad
        else if (documentLoadEvent && userDrivenEvents.indexOf(type) === -1 && !firstUserActionArrived) {
            //If we are in a document load event in progress and we get non-user event then we connect it.
            //to the load event (e.g. load).
            //If we get user driven event during the load we open a new thread (even if it is a non starting action event like mouseMove)
            consoleLog("Doc load", debug);
            setThread(documentLoadEvent);
        } else if (!shouldOpenNewThread(type, event)) {
            consoleLog("Matched up to current event: " + type + "to last thread: " + last.thread.type, debug);
            setThread(last.thread);
//            if (type ==='scroll') {
////                currentEventThread.type = 'scroll';
//                //TODO: it is not good incase of few scrolls need to add to each other
////                currentEventThread.startTime = dateNow();
//            }
        }
        else {
            if (type === 'load') {
                //We should not get here. In general all load events should be added to the doc load event
                //or identified as image load event.
                consoleLog("Was about to open a thread for load, not opening, target: " + event.target, debug);
            } else {
                consoleLog("found nothing, new event thread", debug);
                setThread(type, event);
                firstUserActionArrived = true;
            }
        }
        if (!ignoring) setLastEvent(type, event, currentEventThread);
        if (currentEventThread && !ignoring) {
            //for swipe detection
            currentEventThread.events.push({
                type: event.type,
                time: event.timeStamp,
                location: {
                    x: event && event.touches && event.touches[0] && event.touches[0].pageX || -1,
                    y: event && event.touches && event.touches[0] && event.touches[0].pageY || -1
                }
            });
        }
        return ignoring;
    }

    //Checks if a link has non standard protocol such as gilt:// etc
    //this is used for beginning user action in java
    function hasStandardProtocol(url) {
        if (url.indexOf('://') === -1) {
            return false;
        }
        return /^(ftp|http|https|file)/ig.test(url);
    }


    //helper function for adding query params to a url string or if the key already exists replace it with the new value
    function addQueryParamsToUrl(url, params) {
        var first = true;

        function replaceKeyValue(key, value) {
            //url is here because of closure
            //http://stackoverflow.com/questions/5413899/search-and-replace-specific-query-string-parameter-value-in-javascript
            var start = key + '=';
            var regex = new RegExp('([?|&]' + start + ')[^\&]+');
            url = url.replace(regex, '$1' + value);
        }

        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                //if param  key already exists, replace the value
                if (url.indexOf(key + '=') !== -1) {
                    replaceKeyValue(key, params[key]);
                    continue;
                }
                if (first) {
                    first = false;
                    if (url.indexOf('?') === -1) {
                        url += '?';
                    } else {
                        url += '&';
                    }
                    url += key + '=' + params[key];
                } else {
                    url += '&' + key + '=' + params[key];
                }
            }
        }
        return url;
    }

    //Wrapping of the event listener function - this function is responsible for many things:
    //1: if it was invoked because of an onclick workaround (i.e. manual addEventListener with a callback that contains workaround property set to true)
    //   then it bubbles up to the end and checks if any dom element has onevent property, and continues the flow normally, else just registers that an event has started
    //   and prepares a thread (the thread will only be used if some actions were actually called later, else it will just be collected by the GC
    //2: When an event occurs, it calls the detectEventAndSetThread method, which tries to understand if the event is related to a previous event and should be united,
    // or a new event should be opened
    //3: adds 1 to the queue, and removes 1 after the original callback is done, if in the original callback a setTimeout or xhr calls were made, they will be intercepted,
    // because a global currentEventThread is present with a reference to the current active thread
    //4: Adds a timeout of 2 mins for the thread, to make sure it's finished.

    function wrapAddEventListenerCallBack(type, callback, bool) {
        var that = this;
        return function (event) {
            //check if this event was tirggered programatically (via .triggerEvent call), inEventCallback will be true
            //if and only if an event callback was started, didn't end and another is being done right now
            var inOtherCallback = inEventCallback, hasOn, nonStandardUrlProtocol = false, nodeWithHref, eventListenerThread, ignoring = true;
            //make sure callback is actually a function, A way to generally handle undefined cases
            callback = callback || emptyCallback;
            consoleLog('Activating event: ' + event.type + " " + (callback.workaround ? "(workaround), " : ", ") + " target:" + (event.target.outerHTML || event.target.toString()).substr(0, 50).replace(/\s/g, " ") + ", current:" + (that.outerHTML || that.toString()).substr(0, 50).replace(/\s/g, " ") + ", currEvt:" + (currentEventThread ? currentEventThread.type : "none") + ", lastEvt:" + (lastEvent ? lastEvent.type : "none") + ", lastThreadEvt:" + (lastThread ? lastThread.type : "none"), info);
            //if this is onevent workaround, see if there is any ontype callback at all and if not - hasOn will be false. Looking for
            //the on.. events on the DOM itself
            //In this loop we just want to find if the user defined any handler for this event.
            //We do not perform thi chack for onscroll as it can only be defined on the window
            if (callback.workaround) {
                var eventType = 'on' + type,
                    node = event.target;
                hasOn = false;
                while (node) {
                    //check if has event type, or - for click - if has href set click event (because we are going in the DOM we will always find that 'a' with href
                    //The browser always translate click on a link to click event
                    if (node[eventType] || (type === 'click' && node.tagName === 'A' && node.href) ||
                        (node.tagName === 'INPUT' && node.getAttribute("type")!=null && node.getAttribute("type").toLowerCase() === 'submit')) {
                        //check protocol and add begin user action etc
                        hasOn = true;
                        if (node.tagName === 'A' && node.href) {
                            if (!hasStandardProtocol(node.href)) {
                                nodeWithHref = node;
                                nonStandardUrlProtocol = true;
                            }
                        }
                        if (!node._eumRegisteredTarget) {
                            //consoleLog("push node to registered " + node.outerHTML,debug);
                            registeredTargets.push(node);
                            node._eumRegisteredTarget = true;
                        }

                        break;
                    }
                    if (type === 'touchstart' && node.tagName === 'A' && node.href) {
                        if (!node._eumRegisteredTarget && hasStandardProtocol(node.href)) {
                            //consoleLog("push node to registered " + node.outerHTML,debug);
                            if (!node._eumRegisteredTarget) {
                                registeredTargets.push(node);
                            }
                            node._eumRegisteredTarget = true;
                        }
                    }
                    //Loop over all parent incase the event listener is on some parent instead of the target
                    node = node.parentNode;
                }

                if (hasOn) {
                    consoleLog("Added dummy workaround event for event: on" + type, debug);
                }
            }
            //if inOtherCallback is true - means the callback was called as part of another event, and should not be treated as a real user event, so no thread will be set for it
            if (!inOtherCallback) {
                //callback is the original user callback in most cases. Only in onClick... case it will be our callback
                ignoring = detectAndSetThreadForEvent(type, event, callback);
            }
            //This should be after the previous section. Do not move. The callback.workaround has 2 functions:
            // 1. Handle on...attributes (e.g. onClick=)
            // 2. Detect user action events that the user did not defined handler for them. For example, if the user only defined onClick handler
            //    but no onTouchStart handler then we will catch it through out handlers (.workaround) and open a new thread for it so when the
            //    the user onClick comes it will be attached to the touchStart.
            if (callback.workaround && !hasOn) {
                consoleLog("In workaround, didn't find any onevent, doing nothing for event: " + type, verbose);
                return;
            }
            //set last event to this type of event
            if (!ignoring) {
                eventListenerThread = currentEventThread;
            }
            consoleLog("In wrapAddEvent listener, currentEventThread: " + currentEventThread, debug);
            consoleLog("In wrapAddEvent listener, eventListenerThread: " + eventListenerThread, debug);
            if (eventListenerThread) {
                //if we have a thread - do the name resolving, and push one to queue
                eventListenerThread.doNameResolve();
                if (nonStandardUrlProtocol) {
                    //Should begin native user action as we detected url with non-standard protocl (e.g. gilt://)
                    consoleLog('Identified non standard url, beginning user action and adding id', info);
                    beginUserAction(eventListenerThread);
                    //Add our parameter ot the href so that the overrideUrl will detect it as our native user action that comes from JS
                    //If a native id already exists it will replace it value to the new value.
                    if ((!window.__eumIsIOS) || (url.indexOf('javascript:')!==0)) {
                        nodeWithHref.href = addQueryParamsToUrl(nodeWithHref.href, {'__eumNativeId': eventListenerThread.nativeEventId});
                    }

                    consoleLog('Href is: ' + nodeWithHref.href, info);
                }
                eventListenerThread.push();
                if (eventListenerThread.d3) {
                    consoleLog("Added task before event " + type + " callback " + eventListenerThread.toString(), verbose);
                }
            }
            if (!inOtherCallback) inEventCallback = true;
            event.__eumAddEventListenerTarget = that;
            try {
                //Call original callback. Always!!! even if we do not have an open event thread
                doCallback(that, callback, 'addEventListener', [event], eventListenerThread);
            } catch (e) {
                consoleLog("Script error - in original program " + e, info);
            }
            if (!inOtherCallback) inEventCallback = false;
            if (eventListenerThread) {
                consoleLog("pop from: wrapAddEventListenerCallBack", debug);
                eventListenerThread.pop();
                if (eventListenerThread.d3) consoleLog("Removing task after event " + type + " callback " + eventListenerThread.toString(), verbose);
            }
            //if it was called from other event callback, stop the flow
            if (inOtherCallback) return;
            //if we know an onEvent is going to happen, don't close immediately and capture all the XHRs and timeouts that will happen
            if (callback.workaround) {
                closeThreadDelayed(d4SplitThreshold);
            }
            //if it's a native event - don't close immediately, try to catch all the set timeouts and xhrs that will happen in the next second
            else if (nativeEvents.indexOf(type) !== -1) {
                closeThreadDelayed(d4SplitThreshold * 2);
            } else if (currentEventThread) {
                //only immediately close if wasn't initiated from workaround
                closeThread();
            }
            //Set general timeout for action to 2 minutes
            if (eventListenerThread && eventListenerThread.queue > 0) {
                var stuckEvent = eventListenerThread;
                if (!eventListenerThread.maxActionTimeoutHandlerId) {
                    eventListenerThread.maxActionTimeoutHandlerId = oldSetTimeout(function () {
                        if (stuckEvent.queue > 0) {
                            consoleLog(' Event got stuck, reporting timeout: ' + stuckEvent.type, info);
                            doReportProbe(eventListenerThread);
                            eventListenerThread.timedOut = true;
                        }
                    }, 1000 * 60 * 2);
                }
            }
        }
    }

    //wrap the document create element, currently intercepts creation of images, and adds them to the active thread
    document.createElement = function (tag) {
        var lower = tag.toLowerCase();
        consoleLog("document.createElement of:" + lower, verbose);
        //TODO: css / script tags ?
        //Pini didn't find many cases for that
        if (lower === 'img') {
            consoleLog("Adding event listener to img created", verbose);
            var img = oldCreateElement.call(document, tag);
            addEventListenerToImage(img);
            return img;
        }
        return oldCreateElement.call(document, tag);
    };

    //this is the same for addEventListener but for older versions - probably not needed
    if (oldNodeAttachEvent) {
        Node.prototype.attachEvent = function (type, callback) {
            consoleLog(' call to addEventListener intercepted: ' + type, verbose);
            var newCB = wrapAddEventListenerCallBack.call(this, type, callback);
            var cbMap = this._eumcbMapAE = this._eumcbMapAE || {};
            cbMap[type] = cbMap[type] || {};
            cbMap[type][callback] = newCB;
            return oldNodeAttachEvent.call(this, type, newCB);
        };

        Node.prototype.detachEvent = function (type, callback) {
            var cbMap = this._eumcbMapAE;
            if (cbMap) {
                if (cbMap[type]) {
                    if (cbMap[type][callback]) {
                        callback = cbMap[type][callback];
                        delete cbMap[type][callback];
                        if (Object.getOwnPropertyNames(cbMap[type]).length === 0) {
                            delete cbMap[type];
                            if (Object.getOwnPropertyNames(cbMap).length === 0) {
                                delete this._eumcbMapAE;
                            }
                        }
                    }
                }
            }
            return oldNodeDetachEvent.call(this, type, callback, bool);
        };
    }
    if (oldWindowAttachEvent) {
        window.attachEvent = function (type, callback) {
            var newCB = wrapAddEventListenerCallBack(type, callback);
            attachEventCBMap[type] = attachEventCBMap[type] || {};
            var temp = {};
            temp[callback] = newCB;
            attachEventCBMap[type] = temp;
            return oldWindowAttachEvent.call(this, type, newCB);
        };

        window.detachEvent = function (type, callback) {
            var origCallBackResolve = attachEventCBMap[type];
            if (origCallBackResolve) {
                if (origCallBackResolve[callback]) {
                    var retVal = oldWindowDetachEvent(type, origCallBackResolve[callback]);
                    delete origCallBackResolve[callback];
                    if (Object.getOwnPropertyNames(origCallBackResolve).length === 0) {
                        delete attachEventCBMap[type];
                    }
                    return retVal;
                }
            }
            return oldWindowDetachEvent.call(this, type, callback);
        };
    }

    //wrapping of the add event listener for Node elements (everything in the DOM except the window object)
    Node.prototype.addEventListener = function (type, callback, bool) {
        consoleLog(' call to addEventListener intercepted: ' + type, verbose);
        //For ignored events we just call the orig addEventListener
        if (ignoreEvents.indexOf(type) !== -1) {
            oldNodeEventListenerAdd.call(this, type, callback, bool);
            return;
        }
        //The call to wrapAddEventListener returns a new callback function that will execute the original callback
        var newCB = wrapAddEventListenerCallBack.call(this, type, callback, bool);
        //We create this map to be able to remove the callback later
        var cbMap = this._eumcbMap = this._eumcbMap || {};
        cbMap[type] = cbMap[type] || {};
        cbMap[type][callback] = newCB;
        //save current target for later use
        if (!this._eumRegisteredTarget && userDrivenEvents.indexOf(type) !== -1) {
            registeredTargets.push(this);
            //consoleLog(" 1 push node to registered " + this.outerHTML,debug);
            this._eumRegisteredTarget = true;
        }
        oldNodeEventListenerAdd.call(this, type, newCB, bool);
    };

    //When a call to removeEventListener is intercepted, there is a need to map the callback to be removed to the wrapped callback,
    //because the browser removes based on a match of all the arguments, and after we wrap the callback in addEventListener we need to provide
    //the browser with the wrapped callback for removal.
    Node.prototype.removeEventListener = function (type, callback, bool) {
        if (ignoreEvents.indexOf(type) !== -1) {
            oldNodeRemoveEventListener.call(this, type, callback, bool);
            return;
        }
        var cbMap = this._eumcbMap;
        if (cbMap) {
            if (cbMap[type]) {
                if (cbMap[type][callback]) {
                    var origCb = callback;
                    callback = cbMap[type][origCb];
                    delete cbMap[type][origCb];
                    //Check if the whole type entry is empty and delete it.
                    if (Object.getOwnPropertyNames(cbMap[type]).length === 0) {
                        delete cbMap[type];
                        if (Object.getOwnPropertyNames(cbMap).length === 0) {
                            delete this._eumcbMap;
                        }
                    }
                }
            }
        }
        //The callback in most cases will be our wrapped callback. But if we didn't find in the map this var will
        //contain the original user callback. This is rare case when some event is defined before our instrumentation is in place
        //This should not happen by sometimes happen.
        oldNodeRemoveEventListener.call(this, type, callback, bool);
    };

    //Same as Node.prototype but with a callback map specific for window
    window.addEventListener = function (type, callback, bool) {
        consoleLog('Activating event from window: ' + type, info);
        if (ignoreEvents.indexOf(type) !== -1) {
            windowOldEventListenerAdd.call(this, type, callback, bool);
            return;
        }
        var newCB = wrapAddEventListenerCallBack(type, callback, bool);
        callbacksMap[type] = callbacksMap[type] || {};
        var temp = {};
        temp[callback] = newCB;
        callbacksMap[type] = temp;
        windowOldEventListenerAdd.call(this, type, newCB, bool);
    };
    window.removeEventListener = function (type, callback, bool) {
        if (ignoreEvents.indexOf(type) !== -1) {
            oldWindowRemoveListener.call(this, type, callback, bool);
            return;
        }
        var origCallBackResolve = callbacksMap[type];
        if (origCallBackResolve) {
            if (origCallBackResolve[callback]) {
                oldWindowRemoveListener(type, origCallBackResolve[callback], bool);
                delete origCallBackResolve[callback];
                if (Object.getOwnPropertyNames(origCallBackResolve).length === 0) {
                    delete callbacksMap[type];
                }
                return;
            }
        }
        oldWindowRemoveListener.call(this, type, callback, bool);
    };

    window.alert = function (message) {
        var start = dateNow();
        origWindowAlert.call(window, message);
        var alertInterval = dateNow() - start;
        if (currentEventThread) {
            currentEventThread.alerts.push(alertInterval);
        }
    };

    //wrap clear timeout
    window.clearTimeout = function (id) {
        //clear the timeout
        oldClearTimeout(id);
        //if this id was connected to a thread
        if (timeoutMap[id]) {
            //pop the thread with cancellation
            consoleLog("pop from: clearTimeout", debug);
            timeoutMap[id].pop({isCancellation: true});
            if (timeoutMap[id].d3) consoleLog("Popped after clear timeout, queue: " + timeoutMap[id].queue, verbose);
            delete timeoutMap[id];
        }
    };

    //wrap set timeout
    window.setTimeout = function (callback, delay) {
        var args = false;
        //when no delay is passed - set it to 0
        if (delay === undefined) {
            delay = 0;
        }

        //check if D4, if delay > 499, if so than do not instrument at all
        if (EventThread.isD4(delay)) {
            //incase of d4 do not wrap
            return oldSetTimeout.apply(window, arguments);
        }

        //no current event thread exists - call the original timeout and exit
        if (!currentEventThread) {
            return oldSetTimeout.apply(window, arguments);
        }

        consoleLog("Found d3, setTimeout was instrumented, delay: " + delay, debug);

        //handle arguments passing in the set timeout function (yes this is possible, setTimeout(function, delay, arguments_for_function...)
        if (arguments.length > 2) {
            //removes the first 2 arguments (the callback and delay)
            args = [];
            for (i = 2; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            consoleLog("Args length is: " + args.length, info);
        }

        //save reference to the current active thread (this will be saved as closure for the wrapped set timeout callback
        var innerEventChain = currentEventThread;
        //setTimeOutCallbacks - map, key=callback's signature + delay, value is the counter with the callback occurence
        if (innerEventChain.setTimeoutCallbacks) {
            var curKey = callback.toString() + "." + delay;
            if (innerEventChain.setTimeoutCallbacks[curKey] >= 2) {
                return oldSetTimeout(callback, delay);
            }
        }
        if (innerEventChain) {
            innerEventChain.eventChain += 'T->' + delay + ';';
            innerEventChain.push();
            consoleLog(' Pushed from set timeout, delay: ' + delay + ' ' + innerEventChain.toString(), debug);
        }

        //wrap the callback
        var wrappedCallback = function () {
            consoleLog("Wrapcallback setTimeout was called for threadid:" + innerEventChain.id, debug);
            var changedThread = false;
            var d4Detected = false;
            //when the callback is called, remove the reference to this thread in the timeout map
            if (timeoutMap[toId]) {
                delete timeoutMap[toId];
            }
            //if an active thread is present
            if (innerEventChain) {
                if (delay <= d4SplitThreshold) {
                    //Checks wether there is a recursive call, to counter the fact that many functions are anonymous have to call their toString, this might be slow!!
                    var curKey = callback.toString() + "." + delay;
                    if (!innerEventChain.setTimeoutCallbacks) {
                        innerEventChain.setTimeoutCallbacks = {};
                    }
                    if (!innerEventChain.setTimeoutCallbacks[curKey]) {
                        innerEventChain.setTimeoutCallbacks[curKey] = 0;
                    }
                    innerEventChain.setTimeoutCallbacks[curKey]++;
                    if (innerEventChain.setTimeoutCallbacks[curKey] >= 2 && innerEventChain.d3) {
                        //this is a polling mechanism, ignore it/tag it as d4
                        consoleLog("Forking after found callback calling it self twice", debug);
                        consoleLog("pop from: setTimeout->wrappedCallback", debug);
                        innerEventChain.pop({isCancellation: true});
                        consoleLog("Popped in set timeout - cancelled chain because of recursive, queue is: " + innerEventChain.queue, verbose);
                        d4Detected = true;
                    }
                }
                // see if the thread was changed,
                changedThread = innerEventChain !== currentEventThread;
                //Set the thread if only if not found d4 since we canceled the execution and don't want the user callback to be
                //part of the thread.
                if (!d4Detected) {
                    setThread(innerEventChain);
                }
            }
            try {
                //Must call the user callback even if D4 but since I didn't do setThread it will not put it on the closure innerEventChain
                consoleLog("Wrapcallback setTimeout: call orig callback", debug);
                doCallback(window, callback, 'setTimeout', args, innerEventChain);
            } catch (e) {
                consoleLog(' Script error (In setTimeout callback)' + e, info);
            }
            //This whole section should not be executed if found d4 since already poped with cancellation.
            if (innerEventChain && !d4Detected) {
                consoleLog("pop from: setTimeout->wrappedCallback(1)", debug);
                innerEventChain.pop();
                consoleLog('Popped from set timeout with delay: ' + delay + ' queue is: ' + innerEventChain.queue + ' of ' + innerEventChain.instrumentType, debug);
                //only close thread if it was changed, this is here to prevent cases with backbutton, and on workaround,
                // where we leave the thread open for a bit,
                // to see if xhrs/settimeouts go out at that time because we don't know what callbacks will be executed
                //and if we close the thread without changing it we will close the thread for the rest of the
                // xhrs/settimeouts that are connected to that click / back button
                if (changedThread) {
                    consoleLog("Closing thread after pop from set timeout", debug);
                    closeThread();
                }
            }
        };
        //call the browser's original set timeout
        var toId = oldSetTimeout(wrappedCallback, delay);
        //if a thread is present, save reference to it in the map
        if (innerEventChain) {
            timeoutMap[toId] = innerEventChain;
        }
        return toId;
    };

    //Starts a user action retroactively in java, this is done when encountering calls from javascript to java
    function beginUserAction(thread) {
        reportToSophia('beginUserAction', document, event);
    }

    //initialisation
    (function init() {
        var doneReady = false;
        var beforeUnloadDone = false;
        //create dummy thread for document on load
        //Document.load events live for 3seconds since the last action - which can be xhr, settimeout etc
        //and window load / DOMContentLoaded etc
        var thread = new EventThread("document.load", {target: document});
        setThread(thread);
        consoleLog("Setting document load event to: " + thread.type, debug);
        documentLoadEvent = thread;
        //see if there is saved event and native event id
        readDataFromNative();
        //handle document load registering (copied from jQuery)
        if (document.readyState === "complete") {
            documentLoadEvent.push();
            consoleLog("Pushed before handle document load at document ready = complete " + documentLoadEvent.toString(), verbose);
            handleDocumentLoad();
            consoleLog("pop from: init (document load)", debug);
            documentLoadEvent.pop();
            consoleLog("Popped after ready state = complete, queue: " + documentLoadEvent.queue, verbose);
            closeThreadDelayed(d4SplitThreshold / 2);
        }
        //register to the document loaded
        Node.prototype.addEventListener.call(document, "DOMContentLoaded", handleDocumentLoad, false);
//            window.addEventListener("deviceready", handleDocumentLoad, false);
        window.addEventListener("load", handleDocumentLoad, false);

        function wrapPhonegap(event) {
            consoleLog("On device ready event", info);
            if (window.PhoneGap) {
                if (window.PhoneGap.exec) {
                    var originalExec = window.PhoneGap.exec;
                    window.PhoneGap.exec = function () {
                        var current = currentEventThread || documentLoadEvent || {},
                        //Convert arguments to a real array
                            args = Array.prototype.slice.call(arguments);
                        consoleLog("Current event thread in phonegap exec: " + current.toString(), info);
                        //Add to the phonegap the original args the nativeId as additional arg
                        if (args.length > 0 && current.d3) {
                            var nativeIdQuery;
                            for (var i = 0; i < args.length; i++) {
                                if (typeof args[i] === 'object') {
                                    nativeIdQuery = args[i];
                                    break;
                                }
                            }
                            if (!nativeIdQuery) {
                                nativeIdQuery = {};
                                args.push(nativeIdQuery);
                            }
                            //if there is a current event and has native id, pass it on to the java
                            if (current && current.nativeEventId) {
                                nativeIdQuery['__eumNativeId'] = current.nativeEventId;
                                //if has user action but started in JS - start a new UA in java
                            } else if (current) {
                                beginUserAction(current);
                                nativeIdQuery['__eumNativeId'] = id;
                            }
                        }
                        originalExec.apply(window.PhoneGap, args);
                    };
                }
                consoleLog("Found PhoneGap object, has exec?" + !!window.PhoneGap.exec, info);
            }
        }

        //register to phonegap device ready event to instrument phonegap exec function
        windowOldEventListenerAdd.call(window, 'deviceready', wrapPhonegap, true);


        //Add our event listeners to the "on..." events when defined as attr in the HTML (e.g. onClick, etc)
        function manuallyAddListeners() {
            //Note: adding scroll is problematic since it fire lots of it but in case the applicaiton
            //does not have callback for the scroll I will not catch the scroll event. unless I handle the swipe
            //event in a general way
            var eventsToAdd = ['click', 'mousedown', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'mouseup', 'load', 'keydown', 'keyup'];
            //cordova changes document.addEventListener to their own implementation - override it here,
            //So we make sure to use the original listeners
            var addEventListener = Node.prototype.addEventListener,
                removeEventListener = Node.prototype.removeEventListener;
            var callbackToAdd = function () {
            };

            //The callback.workaround has 2 functions:
            // 1. Handle on...attributes (e.g. onClick=)
            // 2. Detect user action events that the user did not defined handler for them. For example, if the user only defined onClick handler
            //    but no onTouchStart handler then we will catch it through out handlers (.workaround) and open a new thread for it so when the
            //    the user onClick comes it will be attached to the touchStart.
            callbackToAdd.workaround = true;
            //add listeners for on workaround
            eventsToAdd.forEach(function (event) {
                consoleLog("Adding workaround for event: " + event, info);
                //first remove to make sure no duplicates happen (even though browser shouldn't add same callback to same type twice, it can happen here because of the wrapping)
                //We relay on the fact that removeEventListener check the signature of the callback function thus removing the correct callback
                removeEventListener.call(document, event, callbackToAdd, true);
                addEventListener.call(document, event, callbackToAdd, true);
            });
            //add listeners for native events
            nativeEvents.forEach(function (nativeEvent) {
                //first remove to make sure no duplicates happen (even though browser shouldn't add same callback to same type twice, it can happen here because of the wrapping)
                removeEventListener.call(document, nativeEvent, emptyCallback, true);
                addEventListener.call(document, nativeEvent, emptyCallback, true);
            });
        }

        function readDataFromNative() {
            //try to see if there was a saved event
            var saved = window.__eumSavedEvent;
            if (window.__eumSavedUrl) {
                consoleLog("there was a saved url mechanism", debug);
                window._eumContextIdentifier.currentSketch = null;
            }
            //var savedUrl = window.__eumSavedUrl;
            consoleLog("Exist saved event: " + JSON.stringify(window.__eumSavedEvent), debug);
            if (documentLoadEvent && saved) {
                //if we are at doc load and there is a saved event (documentLoadEvent should always be present at this point)
                //then override most of the data
                documentLoadEvent.startTime = saved.startTime;
                documentLoadEvent.type = saved.type;
                documentLoadEvent.locationChange = true;
                documentLoadEvent.event.target = saved.target;
                documentLoadEvent.nameResolve = saved.nameResolve;
                documentLoadEvent.nativeEventId = saved.nativeEventId;
                documentLoadEvent.eventChain = saved.eventChain + 'URL->' + clearUrlQueryParams(window.location.href) + ';';
                consoleLog("Loaded saved event before: " + (dateNow() - saved.startTime) + " timestamp: " + saved.startTime, info);
            }
            //In general, this is for the case of action started from native.
            //In some cases (e.g. redirect) we will have a saved action that may already contain nativeId so
            //we want to make sure it will be saved and not overriden by mistake by a new nativeID (should not happen)
            //maybe not needed - can just retake it, should be the same
            if (window.__EumCurrentUserActionId && !documentLoadEvent.nativeEventId) {
                //if there is a native id, save it
                documentLoadEvent.nativeEventId = window.__EumCurrentUserActionId;
                window.__EumCurrentUserActionId = false;
            }
            consoleLog("Native event id on doc load: " + documentLoadEvent.nativeEventId, info);
        }


        //If we arrive here, it means that 3 seconds had passed with no action at doc load, and then
        //DOMContentLoaded or window.load happened, and it means that document is still loading, so reuse the document load event thread
        function reopenDocumentLoad() {
            consoleLog("Reopening doc load", debug);
            var queue = currentEventThread.queue || 0;
            currentEventThread = doneDocumentLoadEvent;
            setCurrentEventThreadOnWindow(currentEventThread);
            currentEventThread.queue = queue;
            documentLoadEvent = currentEventThread;
            setDocumentLoadEventOnWindow(documentLoadEvent);
            doneDocumentLoadEvent = false;
        }


        //function to be called for document load specific events (DOMContentLoaded and load on window).
        //This function is called several times and know to handle it
        function handleDocumentLoad(event) {
            unloadCalled = false;
            domContentLoaded = true;
            //This may happen if the 3 sec. that we wait to catch all actions in the load event turn out to be not enough.
            //So if we mark the load event as done but then get "DOMContentLoaded" event (which is clearly part of the load process),
            //we reopen the load event.
            if (event && !documentLoadEvent) {
                reopenDocumentLoad();
            }
//TODO:maybe need here as well, pini not sure. Maye new iframes were created during the load
//            var iframes = document.getElementsByTagName('iframe');
//            for (var idx =0; idx < iframes.length; idx++) {
//                attachSourceToIframe(iframes[idx]);
//            }

            //adding onevent work around
            consoleLog("Adding 'onevent' workaround", debug);
            manuallyAddListeners();
            if (doneReady) return;
            doneReady = true;
            consoleLog("In document load function", debug);
            if ((!(window.location.href === "about:blank")) && (document.URL.toLowerCase().indexOf("file://") != 0)) {
                var p;
                p = window.performance || window.msPerformance || window.webkitPerformance || window.mozPerformance;
                if (p && p.timing && p.navigation) {
                    consoleLog("webview supports navigation timing", info);
                    var pn = window.performance.navigation;
                    var pt = window.performance.timing;
                    var thread = currentEventThread;
                    var msgId = pt.requestStart;
                    consoleLog("report page load network statistics", info);
                    var uaId = thread.startTime;
                    if (thread.nativeEventId) {
                        uaId = thread.nativeEventId;
                    }
                    window.__eumRumService.reportNetworkAction(uaId, msgId, 0, "GET", document.location.href,
                        document.documentElement.innerHTML.length, 200, pt.requestStart, pt.responseStart,
                        pt.responseEnd, '', '', '');
                }
            }

        }

        //immediately call the init function
    }).call(this);


    actionsHandler.oldSetTimeout = oldSetTimeout;
    actionsHandler.oldClearTimeout = oldClearTimeout;
    actionsHandler.setThread = setThread;
    actionsHandler.doCallback = doCallback;
    actionsHandler.closeThread = closeThread;
    actionsHandler.dateNow = dateNow;

})();