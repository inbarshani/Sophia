/*******************************************************************************************
 Background:
 - This JS code should be instrumented in mobile application.
 - When using a webview (embeded browser of a mobile application) that loads url,
 This JS should be loaded just before it, F.i:
 //actual instrumentation to url:
 webview.loadUrl("/");//a hack to avoid bug in loading we must load root context before.
 webview.loadUrl("javascript:" + feedback_mobile_js_content);
 //original url to load:
 webview.loadUrl("http://google.com/");

 - The code is instrumented automatically by the apkinfuser.
 - The JS replace the original js request methods such as "open", "send", "setRequestHeader"
 with the istrumented methods that takes the measurements and then invoke the original (real)
 methods.
 - also "load" event is replaced separately and invoked once in code.

 Notice - usage instructions:
 - The instrumentation is per url page! when moving to different page the whole js should be
 loaded again. the way to do that is to override WebViewClient.onPageStarted method:
 @ Override
 public void onPageStarted(WebView view, String url, Bitmap favicon){
              view.loadUrl("javascript:" + feedback_mobile_js_content);
          }
 - In order to avoid the instrumented js to keep asking: "are you sure you want to leave this page?"
 We need also the following code in the "WebChromeClient":
 public boolean onJsBeforeUnload(WebView view, String url, String message, JsResult result) {
              result.confirm();
              return true;
          }
 ********************************************************************************************/

/*
 function rs_execute(msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor, headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart, responseEnd, postData, reqHeaders, responseHeaders) {

 headerHpTvColor = window.encodeURIComponent(headerHpTvColor);
 headerHpCamColor = window.encodeURIComponent(headerHpCamColor);
 pageTitle = window.encodeURIComponent(pageTitle);
 documentLocationHref = window.encodeURIComponent(documentLocationHref);
 referrer = window.encodeURIComponent(referrer);
 postData = window.encodeURIComponent(postData);
 reqHeaders = window.encodeURIComponent(reqHeaders);
 responseHeaders = window.encodeURIComponent(responseHeaders);

 var url = "rumservice://updateNetworkMessage:" + msgId + ":" + pageTitle + ":" + requestSize + ":" + clientMethod + ":" + clientPort + ":" + headerHpTvColor + ":" +
 headerHpCamColor + ":" + documentLocationHref + ":" + responseSize + ":" + userName + ":" + responseCode + ":" + referrer + ":" + requestTime + ":" + responseStart + ":" + responseEnd + ":" +
 postData + ":" + reqHeaders + ":" + responseHeaders;

 logDebug("rs_execute: "+url);
 //alert(url);
 ///alert("in execute2: "+responseEnd);

 var iframe = document.createElement("IFRAME");
 iframe.setAttribute("src", url);
 document.documentElement.appendChild(iframe);
 iframe.parentNode.removeChild(iframe);
 iframe = null;

 //logDebug("document: \n"+document.body);
 //logDebug("RUMService: "+typeof RUMService);
 //logDebug("RUMService (Java): "+RUMService.getClass().getName());
 /*
 if (!skip_RUMService) {
 logDebug('updateNetworkMessage(' +
 Array.prototype.slice.call([msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor,
 headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart,
 responseEnd, postData, reqHeaders, responseHeaders]) + ")");

 RUMService.updateNetworkMessage(msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor,
 headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart,
 responseEnd, postData, reqHeaders, responseHeaders);
 } else {
 logDebug('skip_RUMService = true! skipping: updateNetworkMessage(' +
 Array.prototype.slice.call([msgId, pageTitle, readyForSending, requestSize, clientMethod, clientPort, headerHpTvColor,
 headerHpCamColor, documentLocationHref, responseSize, userName, responseCode, referrer, requestTime, responseStart,
 responseEnd, postData, reqHeaders, responseHeaders]) + ")");

 } */

/*} */


//logDebug("page window.location:" + window.location);
//logDebug("page window.document.href: " + window.document.href);
//logDebug("page document.URL" + document.URL);

//just make sure it works
//window.RUMService.notifyLoaded(9090, "blablabla");
//window.__eumNotifyLoaded =
//function () {

//}();
//window.__eumNotifyLoaded();
try {
    //This is only a safety fuse incase onPageFinished is not fired by the webview
    //logDebug('Notify loaded was called: document.URL: ' + document.URL);
    if (!document.URL || document.URL === ""  || document.URL === "about:blank") {
        logDebug('Can not notify loaded, document url is empty: ' + document.URL);
    } else if(!window.__eumReportNotifyLoaded) {
        //logDebug('Report Notify loaded url: ' + document.URL);
        var docUrl = document.URL ;
        //logDebug('Report Notify loaded url: ' + docUrl);
        RUMService.notifyLoaded(window.hpwebview, docUrl);
        logDebug('Reported Notify loaded url: ' + docUrl);
//                window.RUMService.notifyLoaded(window.hpwebview, docUrl);
        window.__eumReportNotifyLoaded = true;
        //if (!_fback) {


            //for development:
            var skip_RUMService = false; //////////////////////////// Note: remember to change to false in production!! used for debug web from regular browser //
            var DEBUG_MODE_JS = false; //////////////////////////// Note: remember to change to false in production //////////
            //will do console.log only in debug mode:
            function logDebug(msg) {
                if (DEBUG_MODE_JS) {
                    console.log(msg);
                }
            }

            /*
             function getFullQualifyURL(url){
             var img = document.createElement('img');
             img.src = url; // set string url
             url = img.src; // get qualified url
             img.src = null; // no server request
             return url;
             } */

            function escapeHTML(s) {
                return s.split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;');
            }

            function getFullQualifyURL(url) {
                var el = document.createElement('div');
                el.innerHTML = '<a href="' + escapeHTML(url) + '">x</a>';
                return el.firstChild.href;
            }

            var _fback = (function () {
                try {
                    var browser = 'unknown';
                    var elementsArray = [];
                    //private varibles
                    var buffer = {};
                    var currentTime = new Date().getTime();
                    var page = currentTime;
                    logDebug('page: ' + page);
                    //identifier generetor
                    var clock = {
                        counter: 0,
                        id: function () {
                            return 'xhr' + (this.counter++);
                        }
                    };
                    //helper to get interesting info out of the event
                    function parseEvent(event) {
//                var params = {};
//                if(event instanceof MouseEvent){
//                    return {button:event.button};
//                }else if (event instanceof KeyboardEvent){
//                    return {char:String.fromCharCode(event.keyCode)};
//                }else{
//                    return {};
//                }
//                return params;
                    }

                    //the real _fback object
                    return {
                        init: function (sessionId, fbackServer, win, events) {
                            if (win === undefined) {
                                win = window;
                            }

                            this.eventsToCapture = events;
                            this.sessionId = sessionId;
                            if (navigator.userAgent.indexOf('Firefox') != -1 && parseFloat(navigator.userAgent.substring(navigator.userAgent.indexOf('Firefox') + 8)) >= 3.6) {//Firefox
                                browser = 'firefox';
                                elementsArray = [win.HTMLButtonElement, win.HTMLInputElement, win.HTMLDivElement];
                            } else if (navigator.userAgent.indexOf('Chrome') != -1 && parseFloat(navigator.userAgent.substring(navigator.userAgent.indexOf('Chrome') + 7).split(' ')[0]) >= 15) {//Chrome
                                browser = 'chrome';
                                elementsArray.push(win.Node);
                            }
                            logDebug('browser=' + browser);
                            buffer = {
                                logs: [],
                                logsSize: 0,
                                lastReport: null,
                                add: function (logMsg, forceReport) {
                                    this.logs.push(logMsg);
                                    this.logsSize++;
                                    if (forceReport || this.policy()) {
                                        this.report();
                                    }
                                },
                                report: function (force) {
                                    logDebug('this.logs=' + this.logs);//TODO remove
                                    //sending to server
                                    /*
                                     var data = JSON.stringify(this.logs);
                                     var oReq = new XMLHttpRequest();
                                     oReq.realOpen("post", fbackServer, !force);
                                     oReq.realSend(data);
                                     */
                                    //cleaning
                                    this.logs = [];
                                    this.logsSize = 0;
                                    this.lastReport = new Date();
                                },
                                policy: function () {
                                    return this.logsSize > 0;
                                }
                            };
                            //handling addEventListener
                            for (var index in this.eventsToCapture) {
                                var currentEvent = this.eventsToCapture[index];
                                logDebug('FeedBack starts capturing event: ' + currentEvent);
                                document.addEventListener(currentEvent,
                                    function (event) {
                                        _fback.log(1, {type: 'dom-event', event: event});
                                    },
                                    true);
                                document.addEventListener(currentEvent, function (event) {
                                    _fback.log(0, {type: 'dom-event'});
                                }, false);
                            }
                            /*for(var index in elementsArray){
                             var element = elementsArray[index];
                             var realAddEventListener = element.prototype.addEventListener;
                             element.prototype.addEventListener = function(type,listener,a,b){
                             return realAddEventListener.call(this,type,_fback.gen(listener),a,b);
                             };
                             }*/

                            //handling XHR requests
                            var winXMLHttpRequest = win.XMLHttpRequest;
                            if (winXMLHttpRequest) {
                                //save original (real) request data on tmp vars: "open"/"send"/"setRequestHeader"
                                var realOpen = winXMLHttpRequest.prototype.open;
                                var realSend = winXMLHttpRequest.prototype.send;
                                var realsetRequestHeader = winXMLHttpRequest.prototype.setRequestHeader;//catch request headers
                                //create new vars on XHR to hold the real data:
                                winXMLHttpRequest.prototype.realOpen = realOpen;
                                winXMLHttpRequest.prototype.realSend = realSend;
                                winXMLHttpRequest.prototype.realsetRequestHeader = realsetRequestHeader;//catch request headers
                                var reqSize = 0;

                                //"setRequestHeader" instrumentation:
                                winXMLHttpRequest.prototype.setRequestHeader = function (header, value) {

                                    //invoke instrumented "setRequestHeader" implementation:
                                    try {
                                        //header +':' + space + value + new line char
                                        reqSize += header.length + 2 + value.length + 1;
                                        logDebug("feedback_mobile.js: invoke instrumented setRequestHeader implementation, started...");
                                        _fback.log(1, {type: 'xhr-setRequestHeader', header: header, value: value, xhrId: this.xhrId});
                                        var headerStr = header + ": " + value + "\n";
                                        this.reqheaders += headerStr;
                                        rs_execute(parseInt(this.xhrId.substring(3)), "", false, 0, "", 0, "", "", "", 0, "", 0, "", 0, 0, 0, "", this.reqheaders, "");
                                        logDebug("feedback_mobile.js: invoke instrumented setRequestHeader implementation, ended successfully");
                                    } catch (instrumentedSetRequestHeaderExeption) {
                                        logDebug('feedback_mobile.js: invoking instrumented setRequestHeader failed ' + instrumentedSetRequestHeaderExeption);
                                    }
                                    //invoke the original (real) setRequestHeader:
                                    logDebug("feedback_mobile.js: invoke the original (real) setRequestHeader");
                                    return realsetRequestHeader.apply(this, Array.prototype.slice.call(arguments));
                                };


                                //"open" instrumentation:
                                winXMLHttpRequest.prototype.open = function (method, url) {
                                    //invoke instrumented "open" implementation:
                                    try {
                                        logDebug("qualifying url: " + url);
                                        qualifyURL = getFullQualifyURL(url);
                                        logDebug("qualified url is: " + qualifyURL);
                                        if (qualifyURL.toLowerCase().indexOf("file://") != 0) {
                                            //method + space + qualifyURL + space +HTTP version + new line
                                            reqSize = method.length + 1 + qualifyURL.length + 8;
                                            this.reqheaders = "";
                                            logDebug("4 reqSize:" + reqSize);
                                            logDebug("feedback_mobile.js: invoke instrumented open implementation, started");
                                            logDebug("invoke instrumented open with method=" + method + " , qualifyURL=" + qualifyURL);
                                            var xhrIdentifier = clock.id() + new Date().getTime();
                                            this.xhrId = xhrIdentifier;
                                            _fback.log(1, {type: 'xhr-open', qualifyURL: qualifyURL, method: method, xhrId: this.xhrId});
                                            logDebug("xhrId = " + this.xhrId);
                                            rs_execute(parseInt(this.xhrId.substring(3)), "", false, 0, method, 0, "", "", qualifyURL, 0, "", 0, "", 0, 0, 0, "", "", "");
                                            logDebug("feedback_mobile.js: invoke instrumented open implementation, ended successfully");
                                        }
                                        else {
                                            logDebug("url " + url + " is local, skipping.");
                                        }
                                    } catch (instrumentedOpenExeption) {
                                        logDebug('feedback_mobile.js: invoke instrumented open implementation failed ' + instrumentedOpenExeption);
                                    }
                                    //invoke the original (real) open:
                                    logDebug("feedback_mobile.js: invoke the original (real) open");
                                    return realOpen.apply(this, Array.prototype.slice.call(arguments));
                                    //_fback.log(0,{type:'xhr-open'});
                                };


                                //"send" instrumentation:
                                winXMLHttpRequest.prototype.send = function (postData) {
                                    if (this.xhrId) {
                                        //invoke instrumented "send" implementation:
                                        try {
                                            logDebug("feedback_mobile.js: invoke instrumented send implementation, started...");
                                            _fback.log(1, {type: 'xhr-send', xhrId: this.xhrId});

                                            //save original onreadystatechange:
                                            /*var realonreadystatechange = this.onreadystatechange;
                                            logDebug("realonreadystatechange = "+realonreadystatechange);
                                            this.realonreadystatechange = realonreadystatechange;// backup orig onreadystatechange on this
                                            */
                                            this.addEventListener("readystatechange", function () {
                                                try {
                                                    if (this.readyState == 2) {
                                                        logDebug("feedback_mobile.js: invoke override this.readyState == 2, started...");
                                                        this.headersRecievedTime = new Date().getTime();
                                                        logDebug('headersRecievedTime: ' + this.headersRecievedTime);
                                                        logDebug("feedback_mobile.js: invoke override this.readyState == 2, ended...");
                                                    }
                                                    if (this.readyState == 4) {
                                                        try {
                                                            logDebug("feedback_mobile.js: invoke override this.readyState == 4, started...");
                                                            var responseCode = this.status;
                                                            if(responseCode == 200){
                                                                if(this.getResponseHeader("Location") != null)
                                                                    responseCode = 302;
                                                            }
                                                            logDebug("response headers: " + this.getAllResponseHeaders());
                                                            _fback.log(1, {type: 'readyState4',
                                                                xhrId: this.xhrId,
                                                                event: event,
                                                                headers: this.getAllResponseHeaders(),
                                                                headersRecievedTime: this.headersRecievedTime});
                                                            _fback.log(0, {type: 'readyState4'});//TODO: is needed for logs?
                                                            var responseXml = this.responseXML;
                                                            var title = "";
                                                            var referrer = "";
                                                            var resLength = 0;
                                                            if (responseXml != null) {
                                                                title = responseXml.title;
                                                                referrer = responseXml.referrer;

                                                            }
                                                            if (this.responseText != null) {
                                                                resLength = this.responseText.length;
                                                                if (this.getAllResponseHeaders() != null) {
                                                                    resLength += this.getAllResponseHeaders().length;
                                                                }
                                                            }
                                                            var loadTime = new Date().getTime();
                                                            var responseStart = loadTime;
                                                            if (this.headersRecievedTime &&
                                                                this.headersRecievedTime != undefined &&
                                                                this.headersRecievedTime != 'undefined' &&
                                                                this.headersRecievedTime != 0) {
                                                                responseStart = this.headersRecievedTime;
                                                            }
                                                            //init responseEnd to be greater or equal to the responseStart.
                                                            //for cases such as return code 404
                                                            var responseEnd = new Date().getTime();
                                                            responseEnd = (responseStart > responseEnd ? responseStart : responseEnd);

                                                            logDebug('referrer=' + referrer +
                                                                ' resLength=' + resLength +
                                                                ' this.headersRecievedTime=' + this.headersRecievedTime +
                                                                ' responseStart=' + responseStart +
                                                                ' responseEnd=' + responseEnd);
                                                            rs_execute(
                                                                parseInt(this.xhrId.substring(3)), //1
                                                                title, //2
                                                                true, //3
                                                                0, //4
                                                                "", //5
                                                                0, //6
                                                                "", //7
                                                                "", //8
                                                                "", //9
                                                                resLength, //10
                                                                "", //11
                                                                responseCode, //12
                                                                referrer, //13
                                                                0, //14
                                                                responseStart, //15
                                                                responseEnd, //16
                                                                "", //17
                                                                "", //18
                                                                this.getAllResponseHeaders() //19
                                                            );

                                                        } catch (readystateOverrideException) {
                                                            logDebug('feedback_mobile.js: invoke override this.readyState == 4, implementation failed ' + readystateOverrideException);
                                                        }
                                                        logDebug("feedback_mobile.js: invoke override this.readyState == 4, ended.");

                                                    }

                                                    //invoke real\orig readystatechange

                                                    /*if (this.realonreadystatechange &&
                                                        (this.realonreadystatechange != undefined) &&
                                                        (this.realonreadystatechange != null) &&
                                                        ((typeof this.realonreadystatechange) == 'function')) {
                                                        logDebug("Calling original onreadystatechange");
                                                        realonreadystatechange.apply(this, Array.prototype.slice.call(arguments));
                                                    }*/
                                                } catch (e) {
                                                    logDebug('could not invoke this.onreadystatechange ' + e);
                                                }
                                            }, false);

                                            logDebug("3 reqSize:" + reqSize);
                                            var post = "";
                                            if (postData) {
                                                post = postData;
                                                reqSize += postData.length;
                                            }

                                            //also add the headers we can get from JS
                                            // 'user-agent: '+ value + new line char
                                            logDebug("2 reqSize:" + reqSize);
                                            reqSize += 12 + navigator.userAgent.length + 1;
                                            logDebug("1 reqSize:" + reqSize);
                                            rs_execute(parseInt(this.xhrId.substring(3)),//1
                                                "",//2
                                                false,//3
                                                reqSize,//4
                                                "",//5
                                                0,//6
                                                "",//7
                                                "",//8
                                                "",//9
                                                0,//10
                                                "",//11
                                                0,//12
                                                "",//13
                                                _fback.currentEvent.xhr[this.xhrId].sendTime,//14
                                                0,//15
                                                0,//16
                                                post,//17
                                                "",//18
                                                ""//19
                                            );
                                            //no additional request headers are expected, clear the collection.
                                            this.reqheaders = "";
                                            logDebug("feedback_mobile.js: invoke instrumented send implementation, ended successfully");
                                        } catch (instrumentedSendExeption) {
                                            logDebug('changing orig send failed ' + instrumentedSendExeption);
                                        }
                                    }
                                    return realSend.apply(this, Array.prototype.slice.call(arguments));
                                };

                            }
                            //win.addEventListener('beforeunload',function(e){
                            //    _fback.report({type:'before-bye',xhr:{}},true);
                            //    return "are you sure?";
                            //});
                            _fback.report({type: 'hi', xhr: {}});
                        },
                        gen: function (origFunc) {
                            return function (event) {
                                _fback.log(1, {type: 'dom-event', event: event});
                                origFunc.apply(this, Array.prototype.slice.call(arguments));
                                _fback.log(0, {type: 'dom-event'});
                            };
                        },
                        log: function (isBegin, data) {
                            //console.log(data);
                            try {
                                var currentTime = new Date().getTime();
                                logDebug("in log(), isBegin=" + isBegin + ", data.type=" + data.type);
                                if (isBegin) {
                                    if (data.type === 'dom-event') {
                                        var event = 'unknown';
                                        if (data.event && data.event.type) {
                                            event = data.event.type;
                                        }
                                        var id = 'unknown';
                                        if (data.event && data.event.target && data.event.target.id) {
                                            id = data.event.target.id;
                                        }
                                        var tag = 'unknown';
                                        if (data.event && data.event.target && data.event.target.nodeName) {
                                            tag = data.event.target.nodeName;
                                        }
                                        _fback.currentEvent = {type: data.type, tag: tag, id: id, event: event, startTime: currentTime, xhr: {}, eventObj: parseEvent(data.event)};
                                    } else if (data.type === 'xhr-open') {
                                        logDebug("data.url=" + data.url);
                                        _fback.currentEvent.xhr[data.xhrId] = {url: data.url, method: data.method, openTime: currentTime, setHeaders: {}};
                                        logDebug('url: ' + _fback.currentEvent.xhr[data.xhrId].url + ' method: ' + data.method + ' opentime: ' + _fback.currentEvent.xhr[data.xhrId].openTime);
                                    } else if (data.type === 'xhr-setRequestHeader') {
                                        _fback.currentEvent.xhr[data.xhrId].setHeaders[data.header] = data.value;
                                    } else if (data.type === 'xhr-send') {
                                        logDebug("in xhr-send");
                                        if (_fback.currentEvent.xhr[data.xhrId]) {

                                            _fback.currentEvent.xhr[data.xhrId].sendTime = currentTime;
                                            logDebug("in xhr-send - object exists, time set to " + _fback.currentEvent.xhr[data.xhrId].sendTime);

                                        }
                                        if (_fback.currentEvent.type === 'global-xhr') {
                                            var objToReport = {type: _fback.currentEvent.type, xhr: {}};
                                            objToReport.xhr[data.xhrId] = _fback.currentEvent.xhr[data.xhrId];
                                            _fback.report(objToReport);
                                            delete _fback.currentEvent[data.xhrId];
                                        }
                                    } else if (data.type === 'readyState4') {
                                        _fback.currentEvent = {type: data.type,
                                            xhrId: data.xhrId,
                                            startTime: currentTime,
                                            xhr: {},
                                            eventObj: parseEvent(data.event),
                                            headers: data.headers,
                                            headersRecievedTime: data.headersRecievedTime};//added resp headers
                                        logDebug('headersRecievedTime: ' + data.headersRecievedTime);
                                    }
                                }
                                else if (!isBegin) {
                                    _fback.currentEvent.endTime = currentTime;
                                    logDebug('_fback.currentEvent.endTime: ' + _fback.currentEvent.endTime);
                                    _fback.currentEvent.processingTime = currentTime - _fback.currentEvent.startTime;
                                    logDebug('_fback.currentEvent.processingTime: ' + _fback.currentEvent.processingTime);
                                    _fback.report(_fback.currentEvent);
                                    _fback.currentEvent = {type: 'global-xhr', xhr: {}};
                                }
                                //buffer.add();
                            } catch (e) {
                                logDebug('FeedBack: Error while executing log()' + e);
                            }
                        },
                        report: function (data, force) {
                            data.page = page;
                            data.sessionID = this.sessionId;
                            buffer.add(data, force);
                        },
                        currentEvent: {type: 'global-xhr', xhrId: clock.id() + new Date().getTime(), xhr: {}}
                    };
                } catch (e) {
                    logDebug('could not init FeedBack:' + e);
                }
            })//end var _fback
            ();


            //used by the window.addEventListener bellow for supporting iframes:
            var _addJSToIframes = {
                instrument: function () {
                    try {
                        var doc = null;
                        var frames = document.getElementsByTagName("iframe");

                        if (frames != null) {
                            for (var i = 0; i < frames.length; ++i) {
                                //support multi browser:
                                if (frames[i].contentDocument) doc = frames[i].contentDocument;
                                else if (frames[i].contentWindow) doc = frames[i].contentWindow.document;
                                else if (frames[i].document) doc = frames[i].document;

                                if (doc != null) {
                                    //create the script for the iframe:
                                    var script = document.createElement('script');
                                    script.type = "text/javascript";
                                    if (!skip_RUMService) {
                                        script.text = RUMService.getJSAsText();
                                    }
                                    //append the script to the iframe document at head tag
                                    var headID = doc.getElementsByTagName("head")[0];
                                    headID.appendChild(script);
                                }
                            }
                        }
                    } catch (e) {
                        logDebug('feedback_mobile.js: could not invoke _addJSToIframes.instrument function  ' + e);
                    }
                }
            }; //end var _addJSToIframes

            //page already loaded BEFORE feedback is injected? if yes, do not register onload event,
// report the previously collected data in navigation timing
            /* Uncomment to debug feedback existence
             setInterval(function () {
             console.log('Script is up and running');
             }, 4000);*/

            logDebug("**** page is loading: " + document.location.href);
//if (document.location.href.toLowerCase().indexOf("file://") != 0) {
            function GetMessageBody(form) {
                var data = "";
                for (var i = 0; i < form.elements.length; i++) {
                    var elem = form.elements[i];
                    if (elem.name) {
                        var nodeName = elem.nodeName.toLowerCase();
                        var type = elem.type ? elem.type.toLowerCase() : "";

                        // if an input:checked or input:radio is not checked, skip it
                        if (nodeName === "input" && (type === "checkbox" || type === "radio")) {
                            if (!elem.checked) {
                                continue;
                            }
                        }

                        var param = "";
                        // select element is special, if no value is specified the text must be sent
                        if (nodeName === "select") {
                            for (var j = 0; j < elem.options.length; j++) {
                                var option = elem.options[j];
                                if (option.selected) {
                                    var valueAttr = option.getAttributeNode("value");
                                    var value = (valueAttr && valueAttr.specified) ? option.value : option.text;
                                    if (param != "") {
                                        param += "&";
                                    }
                                    param += encodeURIComponent(elem.name) + "=" + encodeURIComponent(value);
                                }
                            }
                        }
                        else {
                            param = encodeURIComponent(elem.name) + "=" + encodeURIComponent(elem.value);
                        }

                        if (data != "") {
                            data += "&";
                        }
                        data += param;
                    }
                }
                return data;
            }

function imitate_form_send(evt) {
    logDebug("in form submit");
    frm = evt.target;
    method = frm.getAttribute("method");
    uri = frm.getAttribute("action");
    logDebug("... with method=" + method + " and action=" + uri);
    if ((method != null) && (uri != null)) {
        if ((method == "post") || method == "get") {
            //adjust uri
            isPost = (method == "post");
            uri = getFullQualifyURL(uri);
            data = GetMessageBody(form);
            if (!isPost) {
                //append data as query parameters
                uri = uri + "?" + data;
            }
            //This is a header: "Content-Type", "application/x-www-form-urlencoded"
            reqHeader = "Content-Type: application/x-www-form-urlencoded";
            time = new Date().getTime();
            id = time;
            reqSize = uri.length + 13; //uri+"POST"/"GET"+spaces and newlines
            if (isPost)
                reqSize += reqHeader.length + data.length;
            logDebug("sending report for submit event: " + uri + ", data: " + data);
            rs_execute(id,//id
                "",//title
                true,//readyForSending
                reqSize,//reqSize
                isPost ? "POST" : "GET",//method
                0,//client port
                "",//7
                "",//8
                uri,//uri
                0,//responseSize
                "",//username
                302,//responseCode
                "",//referrer
                time,//senttime
                time,//requeststart
                time,//requestend
                isPost ? data : "",//postdata
                isPost ? reqHeader : "",//18
                ""//19
            );
        }
    }
}

            function ajax_form_submit (evt) {
                frm = evt.target;
                uri = frm.getAttribute("action");
                logDebug("ajax_form_submit, action=" + uri);
                if ((uri == null) || (uri.trim().length == 0)){
                    //there is custom code that sends the form. stop.
                    return;
                }
                method = frm.getAttribute("method");
                if ((method == null) || (method.trim().length == 0)) {
                    method = "GET"; // this is the default
                }else{
                    method = method.toUpperCase();
                }
                logDebug("ajax_form_submit, method=" + method);
                // get message data
                var data = GetMessageBody(form);   // defined in ajax_form.js

                // send the request
                var httpRequest =  new XMLHttpRequest();
                // try..catch is required if working offline
                try {
                    if(method === "POST"){//POST
                        logDebug("ajax_form_submit, sending POST, data="+data);
                        httpRequest.open(method, uri, false);  // synchron
                        httpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                        httpRequest.send(data);
                    }else{ //GET
                        url = uri+"?"+data;//add the data as query parameters
                        logDebug("ajax_form_submit, sending GET, url="+url);
                        httpRequest.open(method, url, false);  // synchron
                        httpRequest.send();
                    }
                    //If everything went well, block the default from submit.
                    logDebug("ajax_form_submit, done, returning false");
                    return false;
                }
                catch (e) {
                    //alert("Cannot connect to the server!");
                    logDebug("ajax_form_submit, send failed, returning true: "+ e);
                    return true;
                }
                return true;
            }

            function registerFormsSubmit() {
                var allForms = document.forms;
                if ((allForms == null) || (allForms.length == 0)) {
                    logDebug("registerFormsSubmit: no forms found in document");
                    return;
                }
                logDebug("registerFormsSubmit: found " + allForms.length + " forms in document");
                for (i = 0; i < allForms.length; i++) {
                    form = allForms[i];
                    action = form.getAttribute("action");
                    if(action != null) {
                        logDebug("form element found, register submit event to form. action="+action);
                        form.addEventListener("submit", /*imitate_form_send*/ajax_form_submit);
                    }else{
                        logDebug("form element found, but action==null");
                    }

                }
            }

            if ((!(document.location.href === "about:blank")) && (document.URL.toLowerCase().indexOf("file://") != 0)) {
                var p;
                p = window.performance || window.msPerformance || window.webkitPerformance || window.mozPerformance;
                if (p && p.timing && p.navigation) {
                    if (document.readyState == "complete") {
                        logDebug("**** webview supports navigation timing");
                        pn = window.performance.navigation;
                        pt = window.performance.timing;
                        logDebug("**** LOAD TIME: timing onload: pt.requestStart         =" + pt.requestStart);
                        logDebug("**** LOAD TIME: timing onload: pt.responseStart        =" + pt.responseStart);
                        logDebug("**** LOAD TIME: timing onload: pt.responseEnd          =" + pt.responseEnd);
                        //logDebug("**** LOAD TIME: timing onload: this.headersRecievedTime=" + this.headersRecievedTime);
                        //yaron added in order to avoid responseStart > responseEnd.
                        //happens when error code 404 is returned from 127.0.0.1
                        //if (pt.responseEnd > 0) {
                        //if (document.location.href.toLowerCase().indexOf("file://") != 0) {

                        var id = typeof window.hpExternalId === 'undefined' ? pt.requestStart : window.hpExternalId; // we use this id to make sure duplicate reports, if happen, are united.
                        logDebug("**** LOAD TIME: page already loaded. Taking nav-timing values.");
                        registerFormsSubmit();
                        var pt_responseEnd = (pt.responseStart > pt.responseEnd ? pt.responseStart : pt.responseEnd);
                        rs_execute_native(
                            id,//1
                            document.title,//2
                            true,//3
                            0,//4
                            typeof (window.hpLoadedPost === 'undefined') ? "GET" : "POST",//5
                            0,//6
                            "",//7
                            "",//8
                            document.location.href,//9
                            document.documentElement.innerHTML.length,//10
                            "",//11
                            200,//12
                            document.referrer,//13
                            pt.requestStart,//14
                            pt.responseStart,//15
                            pt_responseEnd,//16
                            "",//17
                            "",//18
                            ""//19
                        );


                    }
                    else {
                        logDebug("**** adding onload event listener. doc.state= " + document.readyState);
                        window.addEventListener("load",
                            function load(event) {
                                try {
                                    //skip onload in case of a local file:
                                    if (/^(file).*/.test(document.location.href) == false) {
                                        //window.removeEventListener("load", load, false); //remove listener, no longer needed
                                        logDebug("**** onload, doc=" + document.location.href);
                                        _loadTimeMeasurement.onPageLoad();
                                        //_addJSToIframes.instrument();
                                    }
                                    registerFormsSubmit();
                                } catch (e) {
                                    logDebug('feedback_mobile.js: could not invoke window.addEventListener.load(event)  ' + e);
                                }
                            },
                            false);


                    }

                } else {
                    logDebug("**** no navigation timing");
                }
            } else {
                logDebug("local file, loading is not reported: " + document.location.href);
            }


//used by the window.addEventListener bellow:
            var _loadTimeMeasurement = {
                counter: 0,
                id: function () {
                    return (this.counter++);
                },
                onPageLoad: function () {
                    try {
                        logDebug("**** page is loaded: " + document.location.href);

                        var p;
                        p = window.performance || window.msPerformance || window.webkitPerformance || window.mozPerformance;
                        if (p && p.timing && p.navigation) {
                            logDebug("**** webview supports navigation timing");
                            pn = window.performance.navigation;
                            pt = window.performance.timing;
                            var id = typeof window.hpExternalId === 'undefined' ? pt.requestStart : window.hpExternalId;
                            //var id = pt.requestStart;//this.id() + new Date().getTime();
                            logDebug("**** timing onload: pt.requestStart         =" + pt.requestStart);
                            logDebug("**** timing onload: pt.responseStart        =" + pt.responseStart);
                            logDebug("**** timing onload: pt.responseEnd          =" + pt.responseEnd);
                            //yaron added in order to avoid responseStart > responseEnd.
                            //happens when error code 404 is returned from 127.0.0.1
                            var pt_responseEnd = (pt.responseStart > pt.responseEnd ? pt.responseStart : pt.responseEnd);
                            rs_execute(
                                id,//1
                                document.title,//2
                                true,//3
                                0,//4
                                    typeof window.hpLoadedPost === 'undefined' ? "GET" : "POST",//5
                                0,//6
                                "",//7
                                "",//8
                                document.location.href,//9
                                document.documentElement.innerHTML.length,//10
                                "",//11
                                200,//12
                                document.referrer,//13
                                pt.requestStart,//14
                                pt.responseStart,//15
                                pt_responseEnd,//16
                                "",//17
                                "",//18
                                ""//19
                            );


                        } else {
                            logDebug("**** no navigation timing");
                        }
                    } catch (e) {
                        logDebug('feedback_mobile.js: could not invoke _loadTimeMeasurement.onPageLoad ' + e);
                    }

                }
            }


            _fback.init('TODO', '', window, []);
        //}

    }
} catch (e) {
    logDebug('Failed to notify loaded');
}




