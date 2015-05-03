var dataUrl;
var testGuid;
var testId;
var baseAppUrl;
var fileUploadUrl;

(function () {
    if (window.__eumRumService) return;

    chrome.storage.local.get(['dataUrl', 'testId', 'baseAppUrl', 'fileUploadUrl'], function (result) {
        dataUrl = result.dataUrl;
        testId = result.testId;
        baseAppUrl = result.baseAppUrl;
        fileUploadUrl = result.fileUploadUrl;
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        for (key in changes) {
            if (namespace == "local") {
                var storageChange = changes[key];
                if (key == "testGuid") {
                    if (storageChange.newValue == testGuid) {
                        return;
                    } else {
                        testGuid = storageChange.newValue;
                    }
                } else if (key == "testId") {
                    if (storageChange.newValue == testId) {
                        return;
                    } else {
                        testId = storageChange.newValue;
                    }
                } else if (key == "dataUrl") {
                    if (storageChange.newValue == dataUrl) {
                        return;
                    } else {
                        dataUrl = storageChange.newValue;
                    }
                } else if (key == "baseAppUrl") {
                    if (storageChange.newValue == baseAppUrl) {
                        return;
                    } else {
                        baseAppUrl = storageChange.newValue;
                    }
                } else if (key == "fileUploadUrl") {
                    if (storageChange.newValue == fileUploadUrl) {
                        return;
                    } else {
                        fileUploadUrl = storageChange.newValue;
                    }
                }
            }
        }
    });
    var lastSrcLength;
    var reportEventToSophia = function (action, document_root, event) {
        if (testGuid == null && testId == 0) {
            console.log ('Test GUID or ID not defined. Exiting...');
            return;
        }
        if (event == undefined) {
            console.log ('undefined event');
        }
        var docUrl = document_root.URL;
        var ts = new Date().getTime();
        var args = {
            type: "UI",
            timestamp: ts,
            url: docUrl,
            eventType: event.type,
            guid: testGuid,
            testId: testId
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

////        console.log("report to Sophia: " + action + " " + url + ": " + args);
        var data =  JSON.stringify(args);

        setTimeout(function() {
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
            testId: testId,
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


    var getTestGuid = function () {
        return testGuid;
    };

    var setTestGuid = function (guid) {
        testGuid = guid;
    }

    var getTestId = function () {
        return testId;
    };

    var setTestId = function (id) {
        testId = id;
    }

    var getDataUrl = function () {
        return dataUrl;
    };

    var setDataUrl = function (url) {
        dataUrl = url;
    }

    var getFileUploadUrl = function () {
        return fileUploadUrl;
    };

    var setFileUploadUrl = function (url) {
        fileUploadUrl = url;
    }

    var getBaseAppUrl = function () {
        return baseAppUrl;
    };

    var setBaseAppUrl = function (url) {
        baseAppUrl = url;
    }

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
        reportTestStartToSophia: reportTestStartToSophia,
        getTestGuid: getTestGuid,
        setTestGuid: setTestGuid,
        getTestId: getTestId,
        setTestId: setTestId,
        getDataUrl: getDataUrl,
        setDataUrl: setDataUrl,
        getFileUploadUrl: getFileUploadUrl,
        setFileUploadUrl: setFileUploadUrl,
        getBaseAppUrl: getBaseAppUrl,
        setBaseAppUrl: setBaseAppUrl
    };
})();
