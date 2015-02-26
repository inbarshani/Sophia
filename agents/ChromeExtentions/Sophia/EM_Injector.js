/**
 * Created with IntelliJ IDEA.
 * User: Aviad Israeli
 * Date: 10/12/14
 */

EMLog('d', 'inj', 'LOADING SCRIPT, URL: ' + window.location.href);

//self calling function with guard to not call twice
(function () {
    if(window.location.href==='about:blank'){
        EMLog('d', 'g', 'Current URL is about:blank. Not instrumenting ');
        return;
    }
    EMLog('d', 'inj', "Notify loaded status: __eumReportNotifyLoaded: " + window.__eumReportNotifyLoaded + " __eumReportNotifyLoadedUrl: " + window.__eumReportNotifyLoadedUrl + " hpwebview: " + window.hpwebview);
    if (!window.__eumReportNotifyLoaded && window.__eumNotifyLoaded) {
        EMLog('d', 'inj','Notify loaded did not report yet. Calling it again!');
        window.__eumNotifyLoaded();
    }
    EMLog('d', 'inj', "### Loading EM_Injector");
    if (window.__EMInjector) {
        EMLog('d', 'inj','Injector not Loaded, already exists, Instrumentation exists ');
        return;
    }
    window.__EMInjector = true;

    window.__eumNotifyLoaded = function () {
        try {
            //This is only a safety fuse incase onPageFinished is not fired by the webview
            EMLog('d', 'inj','Notify loaded was called: document.URL: ' + document.URL);
            if (!document.URL || document.URL === "" || document.URL === "about:blank") {
                EMLog('d', 'inj','Can not notify loaded, document url is empty: ' + document.URL);
            } else {
                var docUrl = document.URL;
                EMLog('d', 'inj','Report Notify loaded url: ' + docUrl);
                var ts = new Date().getTime();
                var args = {
                    message: {
                        url: docUrl
                    },
                    type: "UI",
                    timestamp: ts
                }
                window.__eumRumService.jsBridge('notifyLoaded', args);
                window.__eumReportNotifyLoaded = true;
                window.__eumReportNotifyLoadedUrl = document.URL;
            }
        } catch (e) {
            EMLog('d', 'inj','Failed to notify loaded: ' + e.toString());
        }
    };
    window.__eumNotifyLoaded();

    EMLog('d', 'inj',' Doing EM Instrumentation ');
})();
