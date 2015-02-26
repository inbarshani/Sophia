/**
 *
 */

 var __apWebConf = {
    appId:"1",
    appName:"MQM",
    appVersion:"1.0",
    probeURL:"http://localhost:8080/report"
};

//    if (window.__fbackReporter || !window.__apWebConf) return;
    window.__eumIsWeb = true;
    //window.__eumIsDebug = true;
    if(!window.sessionStorage.actionSequence){
	window.sessionStorage.actionSequence=0;
    }
    var reportUserAction = function (msgId, contextName, controlName, controlType, controlId, gestureName, startTime, endTime, isLongDuration, gestureProp, contextId, nativeId) {
        var timeInterval = endTime - startTime;
        EMLog('i', 'g', 'action stats: (' + (nativeId || 'NoNativeId') + '), ' + timeInterval + 'ms, ' + contextName + ', ' + controlName + ', ' + controlType + ', ' + gestureName + ', ' + gestureProp + ', ' + controlId + ', ' + contextId + ', ' + msgId);

//        var nativeIdParam = "";
//        if (nativeId) {
//            nativeIdParam = nativeId;
//        }
        //create a log object and store in actions queue
        var uaObj = new UserAction(msgId, contextName, controlName, controlType, controlId, gestureName, startTime, endTime, isLongDuration, gestureProp, contextId, nativeId,window.sessionStorage.actionSequence);
        window.sessionStorage.actionSequence++;        
        buffer.add(uaObj, false);
        return true; //jsBridge("updateUserAction", msgId, contextName, controlName, controlType, controlId, gestureName, startTime, endTime, isLongDuration, gestureProp, contextId, nativeIdParam);
    };

    //////////////////////////////////////////////////// WEB Code Start//////////////////////////
    var buffer = {
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
            if (DEBUG_MODE_JS) {
                console.log(this.logs);
            }

            window.__fbackReporter.report(this.logs, force);
            //cleaning
            this.logs = [];
            this.logsSize = 0;
            this.lastReport = new Date();
        },
        policy: function () {
            return this.logsSize > 2;
        }
    };

    function JSError(message, url, lineNumber){
        this.message = message;
        this.url = url;
        this.lineNumber = lineNumber;
        this.crashFormatedMsg = this.url+';;'+this.message+';;';
    }
    function UserAction(msgId, contextName, controlName, controlType, controlId, gestureName, startTime, endTime, isLongDuration, gestureProp, contextId, nativeId,actionSequence) {
        this.msgId = msgId;
        this.contextName = contextName;
        this.controlName = controlName;
        this.controlType = controlType;
        this.controlId = controlId;
        this.gestureName = gestureName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.isLongDuration = isLongDuration;
        this.gestureProp = gestureProp;
        this.contextId = contextId;
        this.nativeId = nativeId;
                            //pg_title;;           context_name;;				context_type;;        context_id;;				control_name;;       control_type;;                 control_id;; container_name;;container_type;;container_id;;gesture_name;;	gesture_props;;			act_start_time;;		act_interactive_time;;act_end_time;;act_background_time;;is_duration;;context_sequence_Id\n"
        this.formatedMsg = this.contextName + ";;" + this.contextName + ";;" + this.contextId + ";;" + this.contextId +  ";;" + this.controlName + ";;" + this.controlType + ";;" + this.controlId + ";;Browser;;Browser;;1111;;" + this.gestureName + ";;" + this.gestureProp + ";;" + this.startTime + ";;" + this.endTime + ";;" + this.endTime + ";;0;;" + (this.isLongDuration?1:0) + ";;"+actionSequence+";;\n";

    }

    var skip_Reporting = false; //////////////////////////// Note: remember to change to false in production /////////
    var DEBUG_MODE_JS = true; //////////////////////////// Note: remember to change to false in production //////////context-sequence-id
    function logDebug(msg) {
        if (arguments.length > 1) {
            var args = Array.prototype.slice.call(arguments);
            args.shift();
            msg = args.join(',');
        }
        if (msg) {
            if (DEBUG_MODE_JS) {
                console.log('reporter:' + msg);
            }
        }
    }

    function get_browser() {
        var N = navigator.appName, ua = navigator.userAgent, tem;
        var M = ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
        if (M && (tem = ua.match(/version\/([\.\d]+)/i)) != null) M[2] = tem[1];
        M = M ? [M[1], M[2]] : [N, navigator.appVersion, '-?'];
        return M[0];
    }

    function get_browser_version() {
        var N = navigator.appName, ua = navigator.userAgent, tem;
        var M = ua.match(/(opera|chrome|safari|firefox|msie)\/?\s*(\.?\d+(\.\d+)*)/i);
        if (M && (tem = ua.match(/version\/([\.\d]+)/i)) != null) M[2] = tem[1];
        M = M ? [M[1], M[2]] : [N, navigator.appVersion, '-?'];
        return M[1];
    }


    window.__fbackReporter = (function () {
        return {
            sessionIdCookieName: "unique_id",
            /** generating unique hexadecimal number with 32 digits */
            getCookie: function (name) {
                if (!name) {
                    return null;
                }

                name = ' ' + name + '=';

                var i, cookies;
                cookies = ' ' + window.document.cookie + ';';
                if ((i = cookies.indexOf(name)) >= 0) {
                    i += name.length;
                    cookies = cookies.substring(i, cookies.indexOf(';', i));
                    return cookies;
                }

                return null;
            },
            setCookie: function (win, name, subcookies, max_age) {
                var value = [], k, nameval, c, exp;

                if (!name) {
                    return false;
                }

                /* @HP-change-start: New-code-start */
                if ((typeof subcookies) == "string") {
                    value.push(encodeURIComponent(subcookies));

                } else {
                    /* New-code-end */

                    for (k in subcookies) {
                        if (subcookies.hasOwnProperty(k)) {
                            value.push(encodeURIComponent(k) + '=' + encodeURIComponent(subcookies[k]));
                        }
                    }

                    /* New-code-start */
                }
                /* @HP-change-end: New-code-end */

                value = value.join('&');

                nameval = name + '=' + value;

                /* @HP-change-start: removed 'site_domain' settings. It doesn't work well for all domains and if not setting it explicitly the domain will be of the current page. */

                /* Old-code-start */
                // c = [nameval, "path=/", "domain=" + impl.site_domain];
                /* Old-code-end */

                /* New-code-start */
                c = [nameval, "path=/"];
                /* New-code-end */

                /* @HP-change-end */

                if (max_age) {
                    exp = new Date();
                    exp.setTime(exp.getTime() + max_age * 1000);
                    exp = exp.toGMTString();
                    c.push("expires=" + exp);
                }

                if (nameval.length < 4000) {
                    win.document.cookie = c.join('; ');
                    // confirm cookie was set (could be blocked by user's settings, etc.)
                    return ( value === this.getCookie(name) );
                }

                return false;
            },
            sessionIdGen: function () {
                var rand = function (x) {
                    if (x < 0)
                        return NaN;
                    if (x <= 30)
                        return (0 | Math.random() * (1 << x));
                    if (x <= 53)
                        return (0 | Math.random() * (1 << 30)) + (0 | Math.random() * (1 << x - 30)) * (1 << 30);
                    return NaN;
                };
                var hex = function (num, length) {
                    var str = num.toString(16), i = length - str.length, z = "0";
                    for (; i > 0; i >>>= 1, z += z) {
                        if (i & 1) {
                            str = z + str;
                        }
                    }
                    return str;
                };
                return hex(rand(32), 8) + hex(rand(16), 4) + hex(0x4000 | rand(12), 4) + hex(0x8000 | rand(14), 4)
                    + hex(rand(48), 12);
            },
            //------------------------------------------------------------------------------------------------------------------

            encode64: function (input) {
                var base64KeyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
                //input = escape(input);
                var output = "";
                var chr1, chr2, chr3 = "";
                var enc1, enc2, enc3, enc4 = "";
                var i = 0;

                do {
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);

                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;

                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    } else if (isNaN(chr3)) {
                        enc4 = 64;
                    }

                    output = output + base64KeyStr.charAt(enc1) + base64KeyStr.charAt(enc2)
                    + base64KeyStr.charAt(enc3) + base64KeyStr.charAt(enc4);
                    chr1 = chr2 = chr3 = "";
                    enc1 = enc2 = enc3 = enc4 = "";
                } while (i < input.length);

                return output;
            },
            init: function (cmHpCamColor, appKey, appName, appVersion, fbackServer, win) {
                if (win === undefined) {
                    win = window;
                }
                win.onerror = function(message, url, lineNumber) {
                    var crash = new JSError(message, url, lineNumber);
                    buffer.add(crash,false);
                };
                win.addEventListener('beforeunload',function(e){
		          //report events buffer before close
		          buffer.report(true);		    
		        });
                // create cookie with new sessionId generated value, only if the cookie doesn't set yet
                if (this.getCookie(this.sessionIdCookieName) == null) {
                    this.setCookie(win, this.sessionIdCookieName, this.sessionIdGen());
                }
                this.appKey = appKey;
                this.appName = appName;
                this.appVersion = appVersion;
                this.sessionId = this.getCookie(this.sessionIdCookieName);
                this.fbackServer = fbackServer + "/" + appKey + "/" + this.sessionId;
                this.OSName = win.navigator.platform;
                this.browser = get_browser();
                this.browserVersion = get_browser_version();
                this.cmHpCamColor = cmHpCamColor;
                this.sessionStartTime = new Date().getTime();
                console.log('browser=' + this.browser + this.browserVersion + " OSName=" + this.OSName);
            },

            convertToRUMFormat: function (logs) {
                var data = "", userActionData = "", networkRequestData = "",crashData="", index, element, xhrElem;
                try {
                    data = "ST;;device_id;;vendor_name;;device_model;;os_name;;os_version;;app_key;;cm_ses_id;;app_name;;app_version_name;;app_version_code;;network_type;;carrier;;msg_time;;session_start_time;;resolution;;infuser_ver;;firmware_version;;phone_language;;thrown_traf_rate_net;;ch\n"
                    data = data + "ddd2345xdcf;;browser;;" + this.browser + this.browserVersion + ";;" + this.OSName + ";;0;;" + this.appKey + ";;" + this.sessionId + ";;" + this.appName + ";;" + this.appVersion + ";;0;;WIFI;;HP;;" + new Date().getTime() +";;"+this.sessionStartTime+ ";;" + screen.width + 'x' + screen.height + ";;1.4;;0;;EN;;0;;6549877789\n";

                    for (index = 0; index < logs.length; index++) {
                        element = logs[index];

                        if (element.xhrObj) {
                            //create network sample for RUM
                            xhrElem = element.xhrObj;
                            networkRequestData = networkRequestData + xhrElem.reqSize + ";;" + xhrElem.method + ";;;;" + this.cmHpCamColor + ";;;;" + xhrElem.url + ";;" + xhrElem.resLength + ";;;;" +
                            xhrElem.sendStatus + ";;" + xhrElem.pageTitle + ";;" + xhrElem.referrer + ";;" + xhrElem.sendTime + ";;" + xhrElem.responseStart + ";;" + xhrElem.responseEnd + "\n";
                        }
                        else if (element.formatedMsg) {
                            userActionData = userActionData + element.formatedMsg;
                        }else if(element.crashFormatedMsg){
                            crashData = crashData+element.crashFormatedMsg;
                        }
                    }
                    if (networkRequestData) {
                        //add networks request header and rows
                        data = data + "NETH;;cm_req_len;;cm_cmethod;;cm_cport;;cm_h_HpTvColor;;cm_h_HpCamColor;;wn_ref;;pg_len;;cm_un;;res_code;;pg_title;;referrer;;mobile_req_time;;mobile_res_st;;mobile_res_end\n";
                        data = data + "NET;;\n" + networkRequestData;
                    }
                    if (userActionData) {
                        //add user action header and rows
                        //data = data + "ACTH;;pg_title;;context_name;;context_id;;control_name;;control_type;;control_id;;gesture_name;;act_start_time;;act_interactive_time;;act_end_time;;act_background_time\n";
                        data = data + "ACTH;;pg_title;;context_name;;context_type;;context_id;;control_name;;control_type;;control_id;;container_name;;container_type;;container_id;;gesture_name;;gesture_props;;act_start_time;;act_interactive_time;;act_end_time;;act_background_time;;is_duration;;context_sequence_Id;;\n"
                        data = data + "ACT;;\n" + userActionData;
                    }
                    //if(crashData){
                    //    data = data + "";
                    //    data = "CRASH;;\n"+crashData;
                    //}
                } catch (e) {
                    console.log("failed to convert to rum format:" + e.stack);
                }
                return data;
            },
            report: function (logs, force) {
                if (DEBUG_MODE_JS) {
                    console.log(logs);
                }

                var data = this.convertToRUMFormat(logs);
                if (data != false) {
                    if (DEBUG_MODE_JS) {
                        console.log(new Date() + "feedback data for report:\n" + data);
                    }
                    //4628add2628a1f51a042cf6a3501c5d488aa1e63
                    var hash = CryptoJS.SHA256(data + "4628add2628a1f51a042cf6a3501c5d488aa1e63");

                    var encodedData = this.encode64(data + "SIG;;" + hash);
                    if (!skip_Reporting) {
                        //sending to server
                        var oReq = new XMLHttpRequest();
                        if (window.__eumXHRWrappedFunctions) {
                            window.__eumXHRWrappedFunctions.xhrOpen.call(oReq, "post", this.fbackServer, !force);
                            window.__eumXHRWrappedFunctions.xhrSend.call(oReq, encodedData);
                        } else {
//                            oReq.realOpen("post", this.fbackServer, !force);
//                            oReq.realSend(encodedData);
                        }

                    }
                }

            }
        };
    })();

    window.__fbackReporter.init('', __apWebConf.appId, __apWebConf.appName, __apWebConf.appVersion, __apWebConf.probeURL);

    //////////////////////////////////////////////////// WEB Code End//////////////////////////
    window.__eumRumService.reportUserAction = reportUserAction;
