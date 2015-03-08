(function () {
   
    if (window.__eumRumService) return;
    var lastSrcLength;
    var reportToSophia = function (action, document_root, event) {
        if (event == undefined) {
            console.log ('undefined event');
        }
        var url = "http://16.60.229.73:8080/data/";
        var docUrl = document_root.URL;
        var ts = new Date().getTime();
        var args = {
            type: "UI",
            timestamp: ts,
            url: docUrl,
            eventType: event.type
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
                url: "http://16.60.229.73:8080/data/",
                type: 'POST',
                data: data,
                dataType: 'json',
                success: function (doc) {
////                    console.log("data posted: " + doc);
                }
              });

        }, 50);

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
        reportToSophia: reportToSophia,
    };
})();
