// (c) Copyright 2010 Hewlett-Packard Development Company, L.P.

var ContentUtils = {
    findFrameElemByID: function(id, doc, logger) {
        logger = logger || ContentUtils.getEmptyLogger();

        logger.trace("findFrameElemByID: called to find frame with id " + JSON.stringify(id));

        Util.assert(doc, "findFrameElemByID: received empty document !", logger);

        var childs = doc.querySelectorAll("IFRAME,FRAME");
        for (var i = 0; i < childs.length; ++i) {
            if (!ContentUtils.isInjectableFrame(childs[i], logger)) {
                var contentDoc = childs[i].contentDocument;
                if (!contentDoc) {
                    logger.warn("findFrameElemByID: unable to receive content document of uninjectable frame");
                    continue;
                }

                var foundChild = ContentUtils.findFrameElemByID(id, contentDoc, logger);
                if (foundChild) {
                    return foundChild;
                }
            } else {
                if (childs[i].__QTP__OBJ && RtIdUtils.IsRTIDEqual(childs[i].__QTP__OBJ.comID, id)) {
                    logger.debug("findFrameElemByID: frame found");
                    return childs[i];
                }
                if (!childs[i].__QTP__OBJ) {
                    logger.warn("findFrameElemByID: frame doesn't have __QTP__OBJ");
                }
            }
        }

        logger.warn("findFrameElemByID: couldn't find frame with id " + JSON.stringify(id) + " - returning NULL");
        return null;
    },
    
    isInjectableFrame: function(frameElement, logger) {
        logger = logger || ContentUtils.getEmptyLogger();
        logger.debug("isInjectableFrame: called");
        
        if (!frameElement.contentWindow) { // We are in Chrome version < 25 - no contentWindow
            logger.debug("isInjectableFrame: chrome < 25. Result  -> " + !!frameElement.__QTP__OBJ);
            return !Util.isNullOrUndefined(frameElement.__QTP__OBJ); // If __QTP__OBJ is defined - the frame is injectable
        }
        
        // We are in Chrome version > 25 - use common logic
        return ContentUtils.isInjectable(frameElement.contentWindow, logger);
    },
    
    isInjectable: function(win, logger) {        
        logger = logger || ContentUtils.getEmptyLogger();
        logger.trace("isInjectable: called");
        
        if (BrowserServices.isSpecialUninjectablePage(logger)) {
            logger.debug("isInjectable: BrowserServices says -> false");
            return false;
        }

        if (win === win.parent) { // We should be injected in top level documents (page)
            logger.debug("isInjectable: at page -> true");
            return true;
        }

        try{
            if (!win.frameElement) { // This is XSS restriction so we should be injected
                logger.debug("isInjectable: XSS -> true");
                return true;
            }
        }
        catch (err) {
            logger.debug("isInjectable: XSS -> true");
            return true;
        }

        if (win.frameElement.tagName === "OBJECT") {
            logger.info("isInjectable: This is not a frame, this is an object element (unsupported) -> false");
            return false;
        }

        var src = win.frameElement.src;
        if (src == null) {
            // you can get here if you do the following code: delete document.getElementById("myIframe").src
            logger.error("isInjectable: frameElement.src is undefined -> false");
            return false;
        }

        //check src is not about:blank or if browser supports inject in about:blank doesn't need to check 
        if (BrowserServices.isAboutBlankFrameInjectable) {
            logger.debug("isInjectable: -> true (isAboutBlankFrameInjectable); src:" + win.frameElement.src);
            return true;
        }

        if (src === "") {
            logger.debug("isInjectable: -> true (source is an empty string)");
            return true;
        }

        if (src.match(/^about:/) || src.match(/^javascript:/)) {
            logger.debug("isInjectable: -> false (" + src + ")");
            return false;
        }
 
        logger.debug("isInjectable: -> true");
        return true;
    },
    
    getEmptyLogger: function () {
        return {
            trace: function (msg) {
                //console.log(msg);
            },
            debug: function (msg) {
                //console.log(msg);
            },
            warn: function (msg) {
                //console.warn(msg);
            },
            info: function (msg) {
                //console.info(msg);
            },
            error: function (msg) {
                //console.error(msg);
            }
        };
    },
    isHTMLElement: function(elem, logger) {
        if (Util.isNullOrUndefined(elem)) {
            return false;
        }

        if (!(elem instanceof HTMLElement)) {
            return false;
        }

        return true;
    },
    getElementClientRect: function (elem, logger) {
        logger = logger || ContentUtils.getEmptyLogger();
        logger.trace("getElementClientRect: called");

        if (!ContentUtils.isHTMLElement(elem)) {
            logger.error("getElementClientRect: Received invalid element. returning.");
            return null;
        }

        var rect = elem.getBoundingClientRect();
        return {
            top: Math.floor(rect.top),
            left: Math.floor(rect.left),
            right: Math.floor(rect.right),
            bottom: Math.floor(rect.bottom)
        };
    },

    ElementBorder: function (elem) {
        this.overlay = document.createElement('div');
        Util.extend(this.overlay.style, {
            position: 'absolute',
            display: 'none',
            borderColor: '#444444',
            borderStyle: 'solid',
            zIndex: '9999'
        });

        document.body.appendChild(this.overlay);

        if (elem)
            this.wrap(elem);
    },

    highlightElement: function (elem) {
        var border = new this.ElementBorder(elem);
        
        var count = 0;
        // Flash three times (3*on + 3*off) 
        function drawRect() {
            if (++count > 6) {
                border.remove();
                return;
            }

            if (count % 2)
                border.show();
            else
                border.hide();

            setTimeout(drawRect, 150);
        }
        drawRect();
    },

    overrideJSDialogs: function () {
        var wasAccepted = {
            alert: function () { return true; },
            prompt: function (result) { return result !== null; },
            confirm: function (result) { return result; }
        };

        Object.keys(wasAccepted).forEach(function (name) {
            var orig = window[name];
            window[name] = function (msg, optional) {
                var result = orig.call(this, msg, optional); // 'this' is probably the window but allow it to vary

                var data = {
                    type: name,
                    accepted: wasAccepted[name](result)
                };

                if (typeof (result) === 'string' && result)
                    data.text = result; // add non-empty strings

                window.dispatchEvent(new CustomEvent('DialogHandled', { detail: data }));
                return result;
            };
            window[name].toString = function () { return orig.toString(); }; // mask the overriding for cosmetic reasons
        });
    },

    runOnDocSync: function (func, args, logger) {
        var args = args || [];
        var script = '(' + func.toString() + ')(' + args.map(JSON.stringify).join(',') + ')';

        if (logger)
            logger.trace("runOnDocSync: Started: " + script);

        if (typeof (script) === 'function')
            script = '(' + script.toString() + ')()';

        var ev = document.createEvent('Events');
        ev.initEvent('_QTP_Run_Script_With_Attr', true, false);
        window.document.documentElement.setAttribute("_QTP_Script", script);

        //set the result variable on the window (will be remove at the end of the script)
        window.document.documentElement.setAttribute("_QTP_Result", JSON.stringify({ res: null, ex: null }));
        window.dispatchEvent(ev);
        var res = JSON.parse(window.document.documentElement.getAttribute("_QTP_Result"));

        //removing the result from the window object.
        window.document.documentElement.removeAttribute("_QTP_Result");

        if (res.ex && logger)
            logger.error("runOnDocSync: got exception: " + res.ex);

        return res.res;
    }
};

ContentUtils.ElementBorder.prototype = {
    overlay: null,
    elem: null,
    show: function () {
        this.overlay.style.display = 'block';
    },
    hide: function () {
        this.overlay.style.display = 'none';
    },
    // Returns whether the wrapped element was changed
    wrap: function (elem) {
        if (this.elem === elem)
            return false;

        this.elem = elem;
        var border = 4;
        function pixels(n) { return n + 'px'; }
        var rect = elem.getBoundingClientRect();

        // In Safari for <OPTION> & <AREA> elements return an empty rectangle.
        // In this case we draw the rectangle around their parents
        // Note that height & width == 0 is also wrong
        if (!(rect.width || rect.height))
            rect = elem.parentElement.getBoundingClientRect();

        Util.extend(this.overlay.style, {
            border: pixels(border),

            top: pixels(rect.top + window.pageYOffset),
            left: pixels(rect.left + window.pageXOffset),
            // Width and height should not make the object bigger (which would add scroll bars for page)
            width: pixels(rect.width - (border * 2)),
            height: pixels(rect.height - (border * 2))
        });
        // Setting the border resets the borderStyle
        this.overlay.style.borderStyle = 'solid';
        this.show();
        return true;
    },

    run: function (f) {
        return f(this.overlay);
    },
    remove: function () {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.elem = null;
            this.overlay = null;
        }
    }
};
