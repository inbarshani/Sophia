(function () {

    var dataUrl = null;
    var testGuid = null;
   
    if (window.__eumRumService) return;

    chrome.storage.local.get('dataUrl', function (result) {
        window.__eumRumService.dataUrl = result.dataUrl;
    });

    chrome.storage.local.get('testGuid', function (result) {
        window.__eumRumService.testGuid = result.testGuid;
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        for (key in changes) {
            if (namespace == "local" && key == "testGuid") {
                var storageChange = changes[key];
                if (storageChange.newValue == window.__eumRumService.testGuid) {
                    return;
                } else {
                    window.__eumRumService.testGuid = storageChange.newValue;
                }
            }
            else if (namespace == "local" && key == "dataUrl") {
                var storageChange = changes[key];
                if (storageChange.newValue == window.__eumRumService.dataUrl) {
                    return;
                } else {
                    window.__eumRumService.dataUrl = storageChange.newValue;
                }
            }
        }
    });
    var lastSrcLength;
    var reportEventToSophia = function (action, document_root, event) {
        var dataUrl = window.__eumRumService.dataUrl;
        var testGuid = window.__eumRumService.testGuid;

        if (testGuid == null) {
            console.log ('Test GUID not defined. Exiting...');
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
            guid: testGuid
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
            console.log('Reporting to Sophia, dataUrl: '+dataUrl);
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
        dataUrl: dataUrl,
        testGuid: testGuid
    };
})();
