/**
 * Created by shershev on 03/12/2014.
 */

(function () {
    EMLog('d', 'c', "### Loading EM_ContextIdentifier");
    if (window.__EMContextIdentifier) {
        EMLog('d', 'inj', 'ContextIdentifier not Loaded, already exists ');
        return;
    }
    window.__EMContextIdentifier = true;
    var onePageApp = false;

    var currentSketch = null;
    var currentUrl = window.location.href;

    function samePage(previousSketch, currentSketch) {
        var diffPercentage = 0;
        for (var i = 0; i < previousSketch.length; i++) {
            for (var j = 0; j < currentSketch.length; j++) {
                if (previousSketch[i].element === currentSketch[j].element) {
                    EMLog('i', 'c', "same element between pages");
                    currentSketch[j].included = true;
                    break;
                }

            }
            // previous element was not found in current elements
            if (j === currentSketch.length) {
                EMLog('i', 'c', "add percentage prev " + previousSketch[i].percentage);
                diffPercentage += previousSketch[i].percentage;
            }

        }
        for (var k = 0; k < currentSketch.length; k++) {
            if (!currentSketch[k].included) {
                EMLog('i', 'c', "add percentage current " + currentSketch[k].percentage);
                diffPercentage += currentSketch[k].percentage;
            }
        }

        EMLog('i', 'c', "add percentage current " + "diff percentage " + diffPercentage);
        if (diffPercentage > 0.7) {
            return false;
        }
        return true;
    }

    function isSuitableForSketch(element, percentBottom, percentTop, bodyHeight, bodyWidth) {
        var res = {};
        var elHeight = element.offsetHeight;
        var elWidth = element.offsetWidth;

        if ((elHeight >= bodyHeight * percentBottom && elHeight <= bodyHeight * percentTop) && elWidth >= bodyWidth * percentBottom) {
            if (isVisible(element)) {
                res.matches = true;
                res.percentage = elHeight / bodyHeight;
            }

        }
        else if (elHeight > bodyHeight * percentTop && elWidth >= bodyWidth * percentBottom) {
            res.tooBig = true;

        } else if (elHeight < bodyHeight * percentBottom) {
            res.tooSmall = true;
        }
        return res;
    }


    function iterateForSketch(queue, levelTop, percentBottom, percentTop, res) {
        var children;
        var level = 0;
        var nextLevel = null;
        var g = document.getElementsByTagName('body')[0];
        var bodyHeight = g.clientHeight;
        var body = document.body,
            html = document.documentElement;

        var docHeight = Math.max(body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight);
        var docWidth = Math.max(body.scrollWidth, body.offsetWidth,
            html.clientWidth, html.scrollWidth, html.offsetWidth);
        while (queue.length > 0 && level < levelTop) {
            var el = queue.shift();
            if (el === nextLevel) {
                level++;
                nextLevel = null;
            }
            var suitable = isSuitableForSketch(el, percentBottom, percentTop, docHeight, docWidth);
            if (suitable.matches) {
                //if (!hasChild(el, res)){
                res.push({element: el, percentage: suitable.percentage});
                //}

                //tempRes.push(el);
            } else {
                children = el.children;
                for (var i = 0; i < children.length; i++) {
                    queue.push(children[i]);
                    if (nextLevel === null) {
                        nextLevel = children[i];
                    }
                }
            }
            if (el.tagName !== 'BODY' && el.offsetHeight !== bodyHeight) {
                res.push(el);
                //tempRes.push(el);
            }
            //consoleLog(el.innerHTML,debug);

        }


    }

    function hasChild(el, res) {
        for (var i = 0; i < res.length; i++) {
            if (isDescendant(el, res[i].element)) {
                //res.splice(i, 1, el);
                //console.log("the child is already in sketch");
                return true;
            }
        }
        return false;
    }

    function iterateForSketch(queue, levelTop, percentBottom, percentTop, res) {
        var children;
        var level = 0;
        var nextLevel = null;
        var body = document.body,
            html = document.documentElement;

        var docHeight = Math.max(body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight);
        var docWidth = Math.max(body.scrollWidth, body.offsetWidth,
            html.clientWidth, html.scrollWidth, html.offsetWidth);
        while (queue.length > 0 && level < levelTop) {
            var el = queue.shift();
            if (el === nextLevel) {
                level++;
                nextLevel = null;
            }
            var suitable = isSuitableForSketch(el, percentBottom, percentTop, docHeight, docWidth);
            if (suitable.matches) {
                res.push({element: el, percentage: suitable.percentage});
            } else {
                children = el.children;
                for (var i = 0; i < children.length; i++) {
                    queue.push(children[i]);
                    if (nextLevel === null) {
                        nextLevel = children[i];
                    }
                }
            }

        }


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

    function isDescendant(parent, child) {
        if (child === null || child === undefined) {
            return false;
        }
        var node = child.parentNode;
        while (node !== null && node !== undefined) {
            if (node == parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }

    function isVisible(node) {
        var computedStyle = window.getComputedStyle(node);
        var visibility = computedStyle.visibility;
        var fontSize = parseInt(computedStyle.fontSize);
        var rect = node.getBoundingClientRect();
        var width = rect.width;
        var height = rect.height;
        var x = rect.left;
        var y = rect.top;
        node.emTop = rect.top;
        var isInBounds = isElementInViewport(rect.top + window.scrollY, rect.left + window.scrollX, rect.bottom + window.scrollY, rect.right + window.scrollX);
        var foundEl = document.elementFromPoint(x + width / 2, y + height / 2);
        var notOverlapped = true;
        if (foundEl !== node && !isDescendant(node, foundEl)) {
            notOverlapped = false;
        }
        return (visibility === "visible" && height >= 5 && width >= 5 && fontSize > 0 && isInBounds && notOverlapped);
    }


    function createSketchFromElement(element) {
        var tempEl = element.cloneNode();
        var children = tempEl.children;
        for (var i = 0; i < children; i++) {
            while (children[i].firstChild) {
                children[i].removeChild(children[i].firstChild);
            }
        }
        var elementId = window._namesResolver.createControlId(tempEl).outerHTML;
        return elementId;

    }

    function createSketch() {
        EMLog('i', 'c', "start create sketch");
        var start = Date.now();
        var res = {};
        res.content = [];
        var queue = [];
        //var tempRes = [];
        var bodyEl = document.getElementsByTagName('body')[0];
        queue.push(bodyEl);

        //var child;
        iterateForSketch(queue, 25, 0.05, 0.6, res.content);
        var resArr = [];
        var skt = '';
        for (var j = 0; j < res.content.length; j++) {
            skt = createSketchFromElement(res.content[j].element);
            EMLog('i', 'c', "element " + skt + "percent " + res.content[j].percentage);
            resArr.push({element: skt, percentage: res.content[j].percentage});
        }
        var result = {};
        result.content = resArr;
        var end = Date.now() - start;
        EMLog('i', 'c', "sketch took " + end);
        return result;
    }


    function getFirstVisibleTextLine(parent, maxLength) {
        var visibleText = "";
        var currentTop = 0;
        var firstVisibleTextNodeParent = null;
        if (parent === null || parent.childNodes === undefined) return {displayText: null, node: null};

        var treeWalker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);

        while (treeWalker.nextNode()) {
            var currentNode = treeWalker.currentNode;
            var parentNode = currentNode.parentElement;
            if (window._namesResolver.notEmpty(currentNode.textContent)) {
                //check if parent is visible
                if (isVisible(parentNode) && parentNode.tagName !== 'button' && parentNode.tagName !== 'input' && parentNode.type !== 'button') {
                    if (currentTop == 0) {
                        currentTop = parentNode.emTop;
                        firstVisibleTextNodeParent = parentNode;
                    } else if (parentNode.emTop > currentTop) {
                        //new line. Stop!
                        break;
                    }
                    visibleText += currentNode.textContent.trim() + " ";
                    if (visibleText.length > maxLength) {
                        break;
                    }
                }
            }
        }
        return {displayText: visibleText, node: firstVisibleTextNodeParent};

    }

    function fetchContext(str) {
        var startTimeStamp = new Date().getTime();
        var retComponent = getFirstVisibleTextLine(document.body, 30);
        var endTimeStamp = new Date().getTime();
        //console.log('d', 'retTxt: ' + retComponent.displayText + " duration: " + (endTimeStamp - startTimeStamp) + "ms");

        if (window._namesResolver.emptyStr(retComponent.displayText)) {
            var index = str.lastIndexOf('/') + 1;
            str = str.substring(index);
            //console.log('d', "str is " + str);
            retComponent.displayText = str;
        }
        return retComponent;
    }


    function removeBackWord(sentence) {
        var searchMask = "back ";
        var regEx = new RegExp(searchMask, "ig");
        var replaceMask = "";
        var result = sentence.replace(regEx, replaceMask);
        return result;
    }

    function identifyPageTransition(){
        EMLog('d', 'c', 'Identify page transiton');
        if (contextIdentifier.currentSketch) {
            EMLog('d', 'c', 'result has sketch! ');
            var nowSketch =  window._eumContextIdentifier.createSketch();
            var nowSketchContent = nowSketch.content;
            var previousSketch =  window._eumContextIdentifier.currentSketch.content;
            if (! window._eumContextIdentifier.samePage(previousSketch, nowSketchContent)) {
                EMLog('d', 'c', 'there was a page transition ');
                onePageApp = true;
                contextIdentifier.currentSketch = nowSketch;
                return true;

            }
        }else {
            onePageApp = false;
        }
    }

    function getContextNaming() {
        var nameObj, name, contextId, h1Titles;
        //console.log('context id comes from ' + window.location.href);
        if (window.location.href.indexOf("#/") !== -1) {
            EMLog('d', 'c', "history url");
            var ctx = window._namesResolver.cleanUrl(window.location.href.substring(window.location.href.indexOf("#/") + 2), true);
            return {contextId: ctx, contextName: ctx};
        }
        if (onePageApp) {
            EMLog('d', 'c', "it's a one page app - take first string as context name");
            nameObj = fetchContext(window.location.href);
            name = window._namesResolver.beautifyString(removeBackWord(nameObj.displayText));
            EMLog('d', 'c', 'context id is ' + name);
            var cId = name.replace(/\s+/g, '');
            return {contextId: cId, contextName: name};
        }
        contextId = window._namesResolver.cleanUrl(window.location.href, true);
        EMLog('d', 'c', 'context id is ' + contextId);
        h1Titles  = document.getElementsByTagName("H1");
        for (var i = 0; i < h1Titles.length; i++) {
            if (window._namesResolver.notEmpty(h1Titles[i].innerText) && isVisible(h1Titles[i])) {
                return {contextId: contextId || h1Titles[i].innerText, contextName: h1Titles[i].innerText};
            }
        }

        if (window._namesResolver.notEmpty(document.title)) {
            return {contextId: contextId || document.title, contextName: document.title};
        }
        nameObj = document.querySelector('div[class*=title]');//get first div with 'title' in the class name
        if(nameObj){
            name = window._namesResolver.beautifyString(nameObj.textContent);
            return {contextId: contextId || name, contextName: name};
        }
        if (window._namesResolver.notEmpty(contextId)) {
            return {contextId: contextId, contextName: contextId};
        }
        nameObj = fetchContext(window.location.href);
        name = window._namesResolver.beautifyString(nameObj.displayText);
        return {contextId: contextId || name, contextName: name};
    }

    var contextIdentifier = {};
    contextIdentifier.createSketch = createSketch;
    contextIdentifier.samePage = samePage;
    contextIdentifier.currentSketch = currentSketch;
    contextIdentifier.fetchContext = fetchContext;
    contextIdentifier.getContextNaming = getContextNaming;
    contextIdentifier.identifyPageTransition = identifyPageTransition;
    window._eumContextIdentifier = contextIdentifier;
})();



