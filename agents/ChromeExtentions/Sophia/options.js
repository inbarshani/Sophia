window.addEventListener("load", function() {
    var baseAppUrl, dataUrl;
    chrome.storage.local.get('baseAppUrl', function (result) {
        baseAppUrl = result.baseAppUrl;
        var appUrlText = document.getElementById("appUrl");
        if (baseAppUrl == undefined) {
            baseAppUrl = "localhost";
        }
        appUrlText.value = baseAppUrl;
    });
    chrome.storage.local.get('dataUrl', function (result) {
        dataUrl = result.dataUrl;
        var dataUrlText = document.getElementById("dataUrl");
        if (dataUrl == undefined) {
            dataUrl = "localhost:8080/data";
        }
        dataUrlText.value = dataUrl;
    });
    document.getElementById("saveButton").addEventListener("click",function() {
        var appUrlText = document.getElementById("appUrl");
        var dataUrlText = document.getElementById("dataUrl");
        chrome.storage.local.set({'baseAppUrl': appUrlText.value}, function() {
          console.log('App URL Settings saved');
        });
        chrome.storage.local.set({'dataUrl': dataUrlText.value}, function() {
          console.log('Data URL Settings saved');
        });
    });
});
