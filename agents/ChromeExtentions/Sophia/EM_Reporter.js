(function () {
    if (window.__eumRumService) return;

    chrome.storage.onChanged.addListener(function (changes, namespace) {
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
                } else if (key == "fileUploadUrl") {
                    if (storageChange.newValue == window.__eumRumService.fileUploadUrl) {
                        return;
                    } else {
                        window.__eumRumService.fileUploadUrl = storageChange.newValue;
                    }
                }
            }
        }
    });
        
    chrome.runtime.onMessage.addListener(
      function(message, sender, sendResponse) {
          console.log('got message with test Id: '+message);
            chrome.storage.local.set({
                'sophiaTestId': message.sophiaTestId
            }, function() {
                console.log('New test GUID saved');
            });
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
        var docUrl = document_root.URL;
        var ts = new Date().getTime();
        var args = {
            type: "UI",
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
        } else {
            args.tagName = event.target.tagName;
            if (event.target.id) {
                args.elementId = event.target.id;
            }
            if (event.target.value) {
                args.value = event.target.value;
            }
            if (args.tagName.toLowerCase() == "a") {
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

    chrome.storage.local.get(['dataUrl', 'sophiaTestId', 'baseAppUrl', 'fileUploadUrl'], function (result) {
        window.__eumRumService.dataUrl = result.dataUrl;
        window.__eumRumService.testId = result.sophiaTestId;
        window.__eumRumService.baseAppUrl = result.baseAppUrl;
        window.__eumRumService.fileUploadUrl = result.fileUploadUrl;
    });

})();
