(function () {
    EMLog('d', 'n', "### Loading EM_NameGens");
    if (window.__EMNamesGen) {
        EMLog('d', 'g','NameGens not Loaded, already exists ');
        return;
    }
    window.__EMNamesGen = true;

    if (window._namesResolver) {
        return;
    }

    // var rules = {};
    var listThreshold = window.__EUMhybridItemListThreshold; //if there are more then x items in a structure it's a list otherwise menu

    var currentEventType;
    var DEFAULT_CONTROL_TYPE = 'item';

    function logNaming(level, msg) {
        EMLog(level, 'n', 'nameResolving: ' + msg);
    }

    function notEmpty(str) {
        if (str !== undefined && str !== null && str.trim() !== '') {
            return true;
        }
        return false;
    }

    function emptyStr(str) {
        return !notEmpty(str);
    }

    function isValidWord(word) {
        if (!isNaN(Number(word)) || word.length < 2) {
            return false;
        }
        return true;
    }

    function getVisibleText(elem) {
        var treeWalker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT);
        var ret = {};
        while (treeWalker.nextNode()) {
            var currentNode = treeWalker.currentNode;
            var parentNode = currentNode.parentElement;
            if (notEmpty(currentNode.textContent)) {
                //check if parent is visible
                if (isVisible(parentNode)) {
                    ret.targetElem = parentNode;
                    ret.controlName = currentNode.textContent.trim();
                    return ret;
                }
            }
        }
        return ret;
    }


    function findHref(elem) {
        var text = "";
        if (notEmpty(elem.getAttribute('href'))) {
            var hrefAttr = elem.getAttribute('href');
            //logNaming('d', "in find href--: " + hrefAttr);
            var index = hrefAttr.lastIndexOf('/');
            text = hrefAttr.substring(index + 1);
        }
        if (text.length >= 3) { //otherwise it's not a meaningful name
            return text;
        }

    }

    function findImgSrc(elem) {
        logNaming('d', "in find img src: " + elem.outerHTML.substring(0, 50));
        var text = "";
        var srcAttr = elem.getAttribute("src");
        if (elem.nodeName.toLowerCase() === 'img' && srcAttr && srcAttr !== '') {
            var index = srcAttr.lastIndexOf('/');
            var imageName = srcAttr.substring(index + 1);
            index = imageName.lastIndexOf('.');
            if (index === -1) {
                index = imageName.length - 1;
            }
            var res = imageName.substring(0, index);
            text = res;
        }
        return text;

    };


    function findInputName(obj) {
        var objText = obj.innerText;
        if (notEmpty(objText) && obj.type !== 'text') {
            return objText;
        }
        var nameAttr = obj.getAttribute("name");
        if (notEmpty(nameAttr)) {
            return nameAttr;
        }
        nameAttr = obj.getAttribute("placeholder");
        if (notEmpty(nameAttr)) {
            return nameAttr;
        }

        var idAttr = obj.getAttribute("id");
        if (notEmpty(idAttr)) {
            return idAttr;
        }
        var valueAttr = obj.getAttribute("value");
        if (notEmpty(valueAttr)) {
            return valueAttr;
        }
        //rest of the attributes
        var res = '';
        for (var i = 0, attrs = obj.attributes, l = attrs.length; i < l; i++) {
            if (attrs.item(i).nodeName !== 'class') {
                res += attrs.item(i).nodeValue;
            }

        }
        return res;
    }


    function findSelectName(obj) {
        var parent = obj.parentNode;
        if (!parent) {
            return null;
        }
        var siblings = parent.childNodes;
        for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] !== obj) {
                if (siblings[i].tagName === 'DIV' || siblings[i].tagName === 'SPAN' || siblings[i].tagName === 'A') {
                    return siblings[i].innerText;
                }
            }
        }
    }



    function findA(obj) {
        var treeWalker = document.createTreeWalker(obj, NodeFilter.SHOW_ELEMENT);
        while (treeWalker.nextNode()) {
            var currentNode = treeWalker.currentNode;
            if (currentNode.tagName === 'A') {
                return currentNode;
            }
        }

    }

    function findImg(obj) {
        var treeWalker = document.createTreeWalker(obj, NodeFilter.SHOW_ELEMENT);
        while (treeWalker.nextNode()) {
            var currentNode = treeWalker.currentNode;
            if (currentNode.tagName === 'IMG') {
                return currentNode;
            }
        }
    }

    function getAName(obj) {
        var res = getVisibleText(obj);
        if (notEmpty(res.controlName)) {
            return res;
        }
        res = findHref(obj);
        if (notEmpty(res)) {
            return {controlName: res};
        }
        res = findImgSrc(obj);
        if (notEmpty(res)) {
            return {controlName: res};
        }
    }

    function getInputResult(obj) {
        var controlName = '';
        var controlType;
        var inputValue;
        var lcType = obj.type.toLowerCase();
        if (lcType === 'image') {
            controlName = obj.getAttribute('alt');
        } else if (obj.getAttribute('list')) {
            controlName = obj.getAttribute('list');
        } else if (lcType === 'text') {
            controlName = obj.getAttribute('name');
            controlType = 'textfield';
        }
        else if (lcType === 'button') {
            controlName = obj.getAttribute('value');
            controlType = 'button';
        }
        if (lcType === 'radio' || lcType === 'checkbox') {
            controlName = obj.getAttribute('name');
            controlType = obj.type;
            if (controlType === 'radio') {
                controlType = 'radiobutton';
            }
            inputValue = obj.getAttribute("checked") || '';
            if (inputValue === 'true') {
                inputValue = 'On';
            } else if (inputValue === 'false') {
                inputValue = 'Off';
            }
            //return {controlType: controlType, controlName: controlNameValue, gestureValue: inputValue};
        }
        if (lcType === 'submit') {
            controlName = obj.getAttribute('value');
            controlType = 'button';
        }
        if (emptyStr(controlName)) {
            controlName = findInputName(obj);
        }
        return {controlType: controlType, controlName: controlName, gestureValue: inputValue};
    }

    function hasBackgroundPosition(styles) {
        var backgroundPosition = styles.getPropertyValue("background-position");
        var poX, poY;
        if(backgroundPosition) {
            var backPos = backgroundPosition.split(" ");
            if(backPos[0] && backPos[0].split("px").length > 0) {
                poX = Number(backPos[0].split("px")[0]);
            }
            if(backPos[1] && backPos[1].split("px").length > 0){
                poY = Number(backPos[1].split("px")[0]);
            }

        }
        if((poX && poX!==0) || (poY && poY!==0)){
            return true;
        }
        return false;
    }

    var rules = [
        {    //description: "document title (html)",
            name: function (obj) {
                logNaming('d', "in self::html");
                if (obj.tagName === 'HTML') {
                    return {controlName: obj.ownerDocument.title};
                }
            }
        },
        {
            //description: "check if the element is radio button or checkbox",
            name: function (obj) {
                logNaming('d', "in input");
                if (obj.tagName === 'INPUT') {
                    return getInputResult(obj);

                }

            }

        },
        {
            //description: "check if the element is a button <button>",
            name: function (obj) {
                logNaming('d', "in <button> tagName=" + obj.tagName);
                if (obj.tagName === 'BUTTON') {
                    return {controlType: 'button', controlName: obj.innerText};
                }

            }

        },
        {   //description: "select name",
            name: function (obj) {
                logNaming('d', "in self::select");
                if (obj.tagName === 'SELECT') {
                    var selectData = findSelectName(obj);
                    if (emptyStr(selectData)) {
                        var opts = obj.options;
                        if (opts) {
                            for (var i = 0; i < opts.length; i++) {
                                if (obj.selectedIndex > -1) {
                                    logNaming('i', "select index " + obj.selectedIndex);
                                    selectData = opts[obj.selectedIndex].text;
                                }
                            }

                        }
                    }
                    return {controlType: 'dropdownlist', controlName: selectData};
                }

            }
        },


        {    //description: "'aria-labelledby' attribute",
            name: function (obj) {
                logNaming('d', "in self[@aria-labelledby]");
                if (obj.attributes && obj.getAttribute("aria-labelledby")) {
                    var label = obj.ownerDocument.getElementById(obj.getAttribute("aria-labelledby"));
                    if (label) return {controlName: label.text};
                }

            }
        },
        {    //description: "'aria-label' attribute",
            name: function (obj) {
                logNaming('d', "in self[@aria-label]");
                if (obj.attributes && obj.getAttribute("aria-label")) {
                    return {controlName: obj.getAttribute("aria-label")};
                }
            }
        },
        {    //description: "visible text (headline)",
            name: function (obj) {
                logNaming('d', "in self::h1");
                if (obj.tagName === 'H1' || obj.tagName === 'H2' || obj.tagName === 'H3'
                    || obj.tagName === 'H4' || obj.tagName === 'H5' || obj.tagName === 'H6') {
                    return {controlName: obj.innerText};
                }

            }
        },

        {    //description: "'alt' attribute",
            name: function (obj) {
                logNaming('d', "in self::img[@alt]");
                if (obj.tagName === 'IMG' || obj.tagName === 'AREA' || obj.tagName === 'INPUT') {
                    if (obj.attributes && obj.getAttribute("alt")) {
                        logNaming('i', 'n', "found alt attribute " + obj.getAttribute("alt"));
                        return {controlName: obj.getAttribute('alt')};
                    }
                }

            }
        },
        {    //description: "visible text",
            name: function (obj) {
                logNaming('d', "get text of obj ");
                var t = obj.tagName.toUpperCase();
                if (t != "SELECT" && t != "UL" && t != "OL" && t != "TABLE" && t != "TBODY" && t != "FORM" && t != "AUDIO" &&
                    t != "VIDEO" && !(t == "INPUT" && (obj.type == "text" || obj.type == "password"))) {

                    var ret = getVisibleText(obj);
                    if (notEmpty(ret.controlName)) {
                        return ret;
                    }
                }
            }
        },
        {    //description: "visible text (anchor)",
            name: function (obj) {
                logNaming('d', "in self::a " + obj.outerHTML.substring(0, 20));
                if (obj.tagName === 'A') {
                    return getAName(obj);
                }


            }
        },

        {    //description: "parent of a",
            name: function (obj) {
                logNaming('d', "in self::parent of a " + obj.outerHTML.substring(0, 20));
                var aObj = findA(obj);
                if (aObj) {
                    return getAName(aObj);
                }
            }
        },
        {    //description: "image name",
            name: function (obj) {
                logNaming('d', "in self::img " + obj.outerHTML.substring(0, 20));
                if (obj.tagName === 'IMG') {
                    var res = findImgSrc(obj);
                    if (notEmpty(res)) {
                        return {controlName: "image " + res};
                    }
                }


            }
        },
        {    //description: "'title' attribute",
            name: function (obj) {
                logNaming('d', "in self[@title]");
                if (obj.attributes && obj.getAttribute("title")) {
                    return {controlName: obj.getAttribute("title")};
                }

            }
        },

        {    //description: "default submit (form)",
            name: function (form) {
                if (form.tagName === 'FORM') {
                    var name;
                    for (var i = 0; i < form.elements.length; i++)
                        if (form.elements[i].type == "submit") {
                            if (!name) name = form.elements[i].innerText;
                            else if (name != form.elements[i].value) return;
                        }
                    return {controlName: name};
                }

            }
        },


        {    //description: "'name' attribute",
            name: function (obj) {
                logNaming('d', "get name attribute ");
                if (obj.attributes && obj.getAttribute("name")) {
                    logNaming('d', "found name attribute ");
                    var name = obj.getAttribute("name");
                    if (name && name.search(/\d/) == -1) return {controlName: name};
                }

            }
        },
        {    //description: "parent of a",
            name: function (obj) {
                logNaming('d', "in self::parent of img " + obj.outerHTML.substring(0, 20));
                var imgObj = findImg(obj);
                if (imgObj) {
                    return {controlName: findImgSrc(imgObj)};
                }
            }
        },
        {//description: background-image value
            name: function (obj) {
                logNaming('d', "in get background-image");
                var styles = window.getComputedStyle(obj);
                var backgroundImage = styles.getPropertyValue("background-image");
                logNaming('d', "background image is " + backgroundImage);
                if (backgroundImage && (backgroundImage.indexOf("url(") !== -1)) {
                    if(hasBackgroundPosition(styles)){ //it's probably sprite
                        return;
                    }
                    var res = backgroundImage.substring(backgroundImage.indexOf("url(") + 4);
                    if (res.indexOf(".") !== -1) {
                        res = res.substring(0, res.lastIndexOf("."));
                        if (res.lastIndexOf("/") !== -1) {
                            res = res.substring(res.lastIndexOf("/") + 1);
                        }
                    }
                    return {controlName: res};
                }

            }
        },

        {    //description: "'id' attribute",
            name: function (obj) {
                logNaming('d', "get id attribute ");
                if (obj.id) {
                    logNaming('d', "found id attribute ");
                    if (obj.id.search(/\d/) == -1 && isValidWord(obj.id))
                        return {controlName: obj.id.replace(/_|-/g, ' ')};
                }
            }
        },

        {    //description: "visible text (headline)",
            name: function (obj) {
                logNaming('d', "in self::p");
                if (obj.tagName === 'P') {
                    return {controlName: obj.childNodes[0].data};
                }

            }
        },


        {    //description: "'class' attribute",
            name: function (obj) {
                logNaming('d', "in self::*[@class]");
                if (obj.className) {
                    if (isValidWord(obj.className)) {
                        var dictionaryClass = findClassInDictionary(obj.className);
                        if (dictionaryClass) {
                            return dictionaryClass;
                        }
                        return {controlName: obj.className};
                    }
                }

            }
        }


    ];

    function getNamesRules() {
        return rules;
    }

    var classNamesDictionary = [];

    function findClassInDictionary(classNames) {
        var classesArr = classNames.split(" ");
        for (var i = 0; i < classesArr.length; i++) {
            var className = classesArr[i];
            for (var j = 0; j < classNamesDictionary.length; j++) {
                if (className.toLowerCase().indexOf(classNamesDictionary[j].toLowerCase()) > -1) {
                    return classNamesDictionary[j];
                }
            }
        }
        return undefined;
    }

    function isElementInViewport(top, left, bottom, right) {
        // console.log("namer in viewport top " + top + " left" + left + " bottom " + bottom + " right " + right);
        //console.log("namer window height " + window.innerHeight);
        //console.log("namer window width " + window.innerWidth);
        return (
            top >= 0 &&
            left >= 0 &&
            bottom <= (window.innerHeight + window.scrollY || document.documentElement.clientHeight + window.scrollY) &&
            right <= (window.innerWidth + window.scrollX || document.documentElement.clientWidth + window.scrollX)
            );
    }


    function isVisible(node, xpathFlag) {
        var computedStyle = window.getComputedStyle(node);
        var visibility = computedStyle.visibility;
        var fontSize = parseInt(computedStyle.fontSize);
        var rect = node.getBoundingClientRect();
        var width = rect.width;
        var height = rect.height;
        node.emTop = rect.top;
        var isInBounds = true;
        if (xpathFlag) {
            //console.log("namer orig top is " + rect.top);
            isInBounds = isElementInViewport(rect.top + window.scrollY, rect.left + window.scrollX, rect.bottom + window.scrollY, rect.right + window.scrollX);
        }
        //console.log("namer is In bounds%%%%%%%%%%%%%%%%%%%% " + isInBounds);
        return (visibility === "visible" && height >= 5 && width >= 5 && fontSize > 0 && isInBounds);
    }


    function beautifyString(str, alternativeSep) {
        var re = new RegExp("\\" + "r" + "\\" + "n|" + "\\" + "n|" + "\\" + "r", "gm");
        str = str.replace(re, " ");
//        str = str.replace(/(\r\n|\n|\r)/gm, " ");
        //TODO remove this when will chekin URL encoding
        if (alternativeSep) {
            str = str.replace(/(>|<)/gm, alternativeSep);
            str = str.replace(/(")/gm, '');
        } else {
            str = str.replace(/(>|<)/gm, " ");
            str = str.replace(/(")/gm, "&quot;");
        }
        str = str.trim();
        return str;
    }


    function findName(eventThread, regTarget) {
        logNaming('d', 'Enter find name with event type ' + eventThread.type);
        var element = eventThread.target;
        var startFindName = Date.now();
        var contextData = window._eumContextIdentifier.getContextNaming();
        //currentEventType = eventThread.type;
        if (eventThread.type === '__EUMBackButtonEvent') {
            logNaming('i', 'report back button');
            return {controlName: 'back', controlType: DEFAULT_CONTROL_TYPE, controlId: contextData.contextId, gestureValue: ''};
        }
        if (element instanceof HTMLDocument) {
            logNaming('i', 'html document');
            return {controlName: 'document', controlType: DEFAULT_CONTROL_TYPE, controlId: contextData.contextId, gestureValue: ''};
        }
        if (eventThread.type === 'scroll') {
            logNaming('i', 'scroll window');
            return {controlName: 'window', controlType: DEFAULT_CONTROL_TYPE, controlId: contextData.contextId, gestureValue: ''};
        }
        if (!element) {
            logNaming('i', "element doesn't exist");
            return null;
        }
        if (emptyStr(element.outerHTML)) {
            logNaming('i', element.innerHTML);
            logNaming('i', "outer html doesn't exist");
            return null;
        }
        if (!element.parentNode) {
            logNaming('i', "element parent node doesn't exist");
            return null;
        }
        //don't report it, browser didn't identify the tapped target
        if (element.tagName === 'HTML' || element.tagName === 'BODY') {
            return null;
        }

        logNaming('i', "find user action name: " + element.outerHTML.substring(0, 20));
        var nameRules = getNamesRules();
        var selector;
        for (var i = 0; i < nameRules.length; i++) {
            var res = nameRules[i].name(element);
            if (res && res.controlName) {
                if (notEmpty(res.controlName) || notEmpty(res.gestureValue)) {
                    logNaming('i', "found result from selector function: " + res.controlName + " " + res.gestureValue);
                    if (!res.controlType) {
                        res.controlType = DEFAULT_CONTROL_TYPE;
                    }
                    if (!res.gestureValue) {
                        res.gestureValue = '';
                    }
                    var derivedIdElement = createControlId(regTarget);
                    res.controlId = derivedIdElement.outerHTML;
                    res.controlId = beautifyString(res.controlId, "_");
                    logNaming('i', "control id is " + res.controlId);
                    if (res.controlName.length > 30) {
                        res.controlName = res.controlName.substring(0, 30); //limit the length of controlName to 30
                    }
                    res.controlName = beautifyString(res.controlName);
                    res.gestureValue = beautifyString(res.gestureValue);
                    logNaming('i', "gesture value is " + res.gestureValue);
                    res.contextId = contextData.contextId;
                    res.contextName = contextData.contextName;
                    var endFindTime = Date.now();
                    var timeTookToFind = endFindTime - startFindName;
                    logNaming('i', "find action name TOOK TIME: " + timeTookToFind);
                    logNaming('i', "nameR @@@@@ " + res.controlName + ", " + res.controlType + ", " + res.contextId + ", " + res.contextName);
                    return res;
                }

            }
        }
        var unresolvedId = getElementTreeXPath(regTarget, false);
        return {controlName: 'unresolved', controlType: DEFAULT_CONTROL_TYPE, controlId: unresolvedId, contextName: contextData.contextName, contextId: contextData.contextId, gestureValue: ''};
    }

    function createControlIdFromCurrentSketch(){
        var sketch = window._eumContextIdentifier.currentSketch;
        var id = '';
        for (var i = 0; i < sketch.length; i++) {
            id+=sketch[i].element;
        }
        EMLog('d', 'n',"Control id generated from sketch " + id);
        return beautifyString(id,"_");
    }


    function createControlId(elem) {
        var clonedNode = elem.cloneNode(true);
        var treeWalker = document.createTreeWalker(clonedNode, NodeFilter.SHOW_TEXT);
        while (treeWalker.nextNode()) {
            var currentNode = treeWalker.currentNode;
            currentNode.textContent = '';
        }
        clonedNode = cleanElement(clonedNode);
        return clonedNode;
    }


    function cleanNumbersFromAttributes(elem) {
        var attrs = elem.attributes;
        for (var i = 0; i < attrs.length; i++) {
            var clearedAttr;
            if (attrs[i].name === 'class') {
                clearedAttr = cleanUrl(attrs[i].value, true);
            } else {
                clearedAttr = cleanUrl(attrs[i].value);
            }
            elem.setAttribute(attrs[i].name, clearedAttr);
        }
    }

    function cleanStrAttr(element) {
        if (element.getAttribute("style")) {
            element.removeAttribute("style");
        }
        if (element.getAttribute("alt")) {
            element.removeAttribute("alt");
        }
        if (element.tagName === 'IMG' && element.getAttribute("src")) {
            element.removeAttribute("src");
        }
    }

    function cleanUrl(url, leaveStrWithoutNumbers) {
//        if (url.match(/^(?:[a-z]+:)?\/\//)) { //absolute url - turn to relative
//            url = url.replace(/^(?:\/\/|[^\/]+)*\//, ""); //make relative url
//        }
        if (url.indexOf("?") !== -1) {
            url = url.substring(0, url.lastIndexOf("?"));
        }
        var urlTokens = url.split("/");
        var newUrl = '';
        for (var i = 0; i < urlTokens.length; i++) {
            var matchArr = urlTokens[i].match(/.*\d{2}/g);
            if (!matchArr) { //there are no numbers in the string
                newUrl += urlTokens[i] + '/';
            }
            else if (leaveStrWithoutNumbers) {//there are digits in the string but we only cut them
                var replacedStr = urlTokens[i].replace(/[0-9]/g, '');
                newUrl += replacedStr + '/';
                //logNaming('i', 'new url after ' + newUrl);
            }
        }
        if (newUrl.indexOf('/') !== -1) {
            newUrl = newUrl.substring(0, newUrl.lastIndexOf('/'));
        }
        return newUrl;
    }

    function cleanElement(element) {
        var treeWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
        do {
            var currentNode = treeWalker.currentNode;
//            if (currentNode.tagName === 'A') {
//                var href = currentNode.href;
//                if (href) {
//                    href = cleanUrl(href);
//                }
//                currentNode.href = href;
//            }
//            if (currentNode.tagName === 'IMG') {
//                var src = currentNode.src;
//                if (src) {
//                    src = cleanUrl(src);
//                }
//                currentNode.src = src;
//            }
            cleanStrAttr(currentNode);
            cleanNumbersFromAttributes(currentNode);
            cleanBadAttributes(currentNode);

        } while (treeWalker.nextNode());
        return element;
    }

    function cleanBadAttributes(currentNode) {
        if (currentNode.getAttribute("undefined") !== undefined && currentNode.getAttribute("undefined") !== null) {
            currentNode.removeAttribute("undefined");
        }
    }

    function hashCode(str) {
        if (!str) return 100100;
        for (var ret = 0, i = 0, len = str.length; i < len; i++) {
            ret = ((ret << 5) - ret) + str.charCodeAt(i);
        }
        return Math.abs(ret);
    }

    function getElementTreeXPath(element, isList, listElement) {
        var startFindName = Date.now();
        if (element instanceof HTMLDocument || !element) {
            logNaming('i', 'html document get element id');
            return hashCode(window.location.href);
        }
        var paths = [];
        var origElement = element;
        // Use nodeName (instead of localName) so namespace prefix is included (if any).
        for (; element && element.nodeType == 1; element = element.parentNode) {
            var index = 0;
            for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
                // Ignore document type declaration.
                if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
                    continue;
                if (sibling.nodeName == element.nodeName && isVisible(sibling, true))
                    ++index;
            }


            var tagName = element.nodeName.toLowerCase();
            var pathIndex = (index ? "[" + (index + 1) + "]" : "");
            if (isList) {
                if (element === listElement) { //for the list element should not be specific id
                    pathIndex = "";
                }
            }
            paths.splice(0, 0, tagName + pathIndex);

        }

        var res = paths.length ? "/" + paths.join("/") : null;
        var endFindTime = Date.now();
        var timeTookToFind = endFindTime - startFindName;
        logNaming('i', "find action ID TOOK TIME: " + timeTookToFind);
        logNaming('i', "control Id is: " + res);
        return res;
    }

    var namesResolver = {};
    namesResolver.findName = findName;
    namesResolver.hashCode = hashCode;
    //namesResolver.fetchContext = fetchContext;
    namesResolver.getUniqueId = getElementTreeXPath;
    namesResolver.notEmpty = notEmpty;
    namesResolver.emptyStr = emptyStr;
    namesResolver.beautifyString = beautifyString;
    namesResolver.createControlId=createControlId;
    namesResolver.cleanUrl = cleanUrl;
    namesResolver.createControlIdFromCurrentSketch = createControlIdFromCurrentSketch;
    namesResolver.DEFAULT_CONTROL_TYPE = DEFAULT_CONTROL_TYPE;
    window._namesResolver = namesResolver;
})
();

