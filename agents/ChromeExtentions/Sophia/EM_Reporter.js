function isElementInViewport (rect) {

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
}

(function () {
    if (window.__eumRumService) return;

    // respond to messages from extension (SophiaMessagingChannel)
    //  so that when a logical UI action is captured, UI objects are captured
    chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        console.log('Sophia content script got message: ' + JSON.stringify(message));
        if (message.sophiaCaptureUI)
        {
            reportUIObjects();
        }
    });


    chrome.storage.onChanged.addListener(function (changes, namespace) {
        console.log('Sophia reporter, update changes in storage: '+JSON.stringify(changes));
        for (key in changes) {
            if (namespace == "local") {
                var storageChange = changes[key];
                if (key == "sophiaTestId") {
                    if (storageChange.newValue == window.__eumRumService.testId) {
                        return;
                    } else {
                        window.__eumRumService.testId = storageChange.newValue;
                    }
                } else if (key == "dataUrl") {
                    if (storageChange.newValue == window.__eumRumService.dataUrl) {
                        return;
                    } else {
                        window.__eumRumService.dataUrl = storageChange.newValue;
                    }
                } else if (key == "baseAppUrl") {
                    if (storageChange.newValue == window.__eumRumService.baseAppUrl) {
                        return;
                    } else {
                        window.__eumRumService.baseAppUrl = storageChange.newValue;
                    }
                } else if (key == "fileUrl") {
                    if (storageChange.newValue == window.__eumRumService.fileUrl) {
                        return;
                    } else {
                        window.__eumRumService.fileUrl = storageChange.newValue;
                    }
                }
            }
        }
    });
       
    var lastSrcLength;
    var reportEventToSophia = function (action, document_root, event) {
        var dataUrl = window.__eumRumService.dataUrl;
        var testId = window.__eumRumService.testId;

        if (event == undefined) {
            console.log ('undefined event');
            return;
        }
        if (testId == undefined) {
            console.log ('no active test');
            return;
        }

        reportUIObjects();

        var docUrl = document_root.URL;
        var ts = new Date().getTime();
        var args = {
            type: "UI_raw",
            timestamp: ts,
            url: docUrl,
            eventType: event.type,
            testID: testId
        }
        if (action == "domChangeEvent" || action == "load") {
            // DOM change - report page source
            var src = DOMtoString (document_root);
////            console.log("Len: " + src.length);
            if (src.length == lastSrcLength) {
                return;
            } else {
                lastSrcLength = src.length;
                args.src = src;
            }
        } 
        else if (action=="log"){
            args.eventType = action;
            args.value = event.detail[0];
        }
        else {
            args.tagName = event.target.tagName;
            if (event.target.id) {
                args.elementId = event.target.id;
            }
            if (event.target.value) {
                args.value = event.target.value;
            }
            else
            {
                var element = event.target;
                var innerText = '';
                if (element.innerText)
                    innerText = element.innerText.trim();
                if (innerText.length > 0)
                    args.value = innerText;   
                else
                {
                    var parent = element.parentElement;
                    while (parent && !args.value)
                    {
                        if (parent.innerText)
                            innerText = parent.innerText.trim();
                        if (innerText.length>0)
                            args.value = parent.innerText;
                        else
                            parent = parent.parentElement;
                    }
                }
            }
            if (!args.value && args.tagName.toLowerCase() == "a") {
                args.value = event.target.href;
            }
        } 

        var data =  JSON.stringify(args);
        //console.log("report to Sophia: " + data);

        setTimeout(function() {
            //console.log('Reporting to Sophia, dataUrl: '+dataUrl);
            $.ajax({
                url: dataUrl,
                type: 'POST',
                data: data,
                dataType: 'json',
                success: function (doc) {
////                    console.log("data posted: " + doc);
                }
              });

        }, 50);

        // tell background to capture image and report to Sophia
        //  chrome.tabs in inaccessible in content script
        chrome.runtime.sendMessage({sophiaScreenshot: true},
            function(response) {
                console.log('Got response for capturing UI objects: '+response);
            });
    };    

    var reportErrorToSophia = function (errObj) {
        var data =  JSON.stringify(errObj);
        $.ajax({
            url: dataUrl,
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function (doc) {
    ////                    console.log("data posted: " + doc);
            }
        });
    };

    var reportUIObjects = function() {
        // capture all elements and report on them as well
        var dataUrl = window.__eumRumService.dataUrl;
        var testId = window.__eumRumService.testId;
        var kitsManager = null;
        if (content)
        {
            kitsManager = content.kitsManager;            
            window.__eumRumService.content = content;
        }
        else if (window.__eumRumService.content)
            kitsManager = window.__eumRumService.content.kitsManager;
        else
        {
            console.log('Sophia reportUIObjects failed: no content');
            return;
        }

        var docObjects = document.getElementsByTagName('*');
        var ts = new Date().getTime();
        var agentUIObjecs = [];
        for(var i=0;i<docObjects.length;i++){
            var ao = kitsManager.createAO(docObjects[i], content.frame.id);            
            var sophia_ao = {};
            sophia_ao.logical_name = ao.GetAttrSync('logical name');
            sophia_ao.rect = ao.GetAttrSync('rect');
            sophia_ao.micclass = ao.GetAttrSync('micclass');
            sophia_ao.visible = ao.GetAttrSync('visible');
            sophia_ao.font_family = ao.GetAttrSync('style', {_data: {style: 'font-family'}});;
            sophia_ao.text = ao.GetAttrSync('text');
            sophia_ao.title = ao.GetAttrSync('title');
            sophia_ao.color = ao.GetAttrSync('style', {_data: {style: 'color'}});
            sophia_ao.background = ao.GetAttrSync('style', {_data: {style: 'background-color'}});
            sophia_ao.font_size = ao.GetAttrSync('style', {_data: {style: 'font-size'}});
            sophia_ao.classNames = ao.GetAttrSync('class');
            if (sophia_ao.visible && isElementInViewport(sophia_ao.rect))
                agentUIObjecs.push(sophia_ao);
        }

        console.log('Sophia reporting on UI objects, #: '+agentUIObjecs.length);
        var args = {
            type: "UI_objects",
            timestamp: ts,
            testID: testId,
            objects: agentUIObjecs
        };
        $.ajax({
            url: dataUrl,
            type: 'POST',
            data: JSON.stringify(args),
            dataType: 'json',
            success: function (doc) {
                //console.log("data posted: " + JSON.stringify(args));
            }
          });
    };

    var reportTestStartToSophia = function (testId) {
        var ts = new Date().getTime();
        var args = {
            type: "Test",
            timestamp: ts,
            action: "start",
            testID: testId,
            description: "Automated test"
        }

        var data =  JSON.stringify(args);
        $.ajax({
            url: dataUrl,
            type: 'POST',
            data: data,
            dataType: 'json',
            success: function (doc) {
    ////                    console.log("data posted: " + doc);
            }
        });
    };

    var DOMtoString = function(document_root) {
        var html = '',
            node = document_root.firstChild;
        while (node) {
            switch (node.nodeType) {
            case Node.ELEMENT_NODE:
                html += node.outerHTML;
                break;
            case Node.TEXT_NODE:
                html += node.nodeValue;
                break;
            case Node.CDATA_SECTION_NODE:
                html += '<![CDATA[' + node.nodeValue + ']]>';
                break;
            case Node.COMMENT_NODE:
                html += '<!--' + node.nodeValue + '-->';
                break;
            case Node.DOCUMENT_TYPE_NODE:
                // (X)HTML documents are identified by public identifiers
                html += "<!DOCTYPE " + node.name + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') + (!node.publicId && node.systemId ? ' SYSTEM' : '') + (node.systemId ? ' "' + node.systemId + '"' : '') + '>\n';
                break;
            }
            node = node.nextSibling;
        }
        return html;
    }

    window.__eumRumService = {
        reportEventToSophia: reportEventToSophia,
        reportErrorToSophia: reportErrorToSophia,
        reportTestStartToSophia: reportTestStartToSophia
    };

    chrome.storage.local.get(['dataUrl', 'sophiaTestId', 'baseAppUrl', 'fileUrl'], function (result) {
        window.__eumRumService.dataUrl = result.dataUrl;
        window.__eumRumService.testId = result.sophiaTestId;
        window.__eumRumService.baseAppUrl = result.baseAppUrl;
        window.__eumRumService.fileUrl = result.fileUrl;
    });

})();

function xinspect(o,i){
    if(typeof i=='undefined')i='';
    if(i.length>50)return '[MAX ITERATIONS]';
    var r=[];
    for(var p in o){
        var t=typeof o[p];
        r.push(i+'"'+p+'" ('+t+') => '+(t=='object' ? 'object:'+xinspect(o[p],i+'  ')+'  /end of object '+p+'/ ' : o[p]+' '));
    }
    return r.join(i+'\n');
}