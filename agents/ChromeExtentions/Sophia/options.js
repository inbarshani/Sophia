window.addEventListener("load", function() {
    var baseUrl;
    chrome.storage.local.get('baseUrl', function (result) {
        baseUrl = result.baseUrl;
        var urlText = document.getElementById("url");
        if (baseUrl == undefined) {
            baseUrl = "localhost";
        }
        urlText.value = baseUrl;
    });
    document.getElementById("saveButton").addEventListener("click",function() {
        var urlText = document.getElementById("url");
        chrome.storage.local.set({'baseUrl': urlText.value}, function() {
          console.log('Settings saved');
        });
    });
});
