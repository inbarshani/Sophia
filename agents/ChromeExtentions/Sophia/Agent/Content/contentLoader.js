LoggerUtil.prototype.init();


// Initialize the Global Context of the Content
var content = null;

// Initialize the Contents objects
(function initContent() {
    var url = window.location ? window.location.href : "";
    var logger = new LoggerUtil("ContentLoader");
	
	if (content) {
		logger.warn("initContent: Already initialized, url=" + url);
		return;
	}

    if (BrowserServices.executeOnLoad) {
        BrowserServices.executeOnLoad();
    }

	//There are few sites/framework that prefer to perform their layout on a blank page and in one piece for this reason
	//they initially set the body to be hidden and when they finish fetching data and performing the necessary layouts calculations
	//they change the style at once. During the time that body is hidden our plug-in is not initialized and hence we will fail during 
	//the Frame's initialization.
	//Solution: Wait until the body is displayed
	if (!document || !document.body || document.body.style.display === "none") {
	    logger.info("initContent: Initialization is going to be postponed due to body's style is hidden: " + url);

	    setTimeout(initContent, 500);
		return;
	}
   
	if (!ContentUtils.isInjectable(window, logger)) {
	    var iFrameId = "Unknown Id";
	    try { iFrameId = window.frameElement ? window.frameElement.id : ""; } catch (e) { }
	    logger.info("initContent: skip loading content for not injactable for url " + url + " - Frame Id: " + iFrameId);
	    return;
	}

	logger.info("initContent: loading content. For " + ((window.parent === window) ? "Page" : "Frame") + " , on " + url);

	content = {};

	//creates the DOM agent for injecting handlers at the DOM level
	content.domSubscriber = new DomRequestSubscriber();
	//creates the frame AO that will handle this content.
	content.kitsManager = new KitsManager();
	content.dispatcher = new ContentDispatcher();
	content.dispatcher.init();
	content.rtidManager = new ObjectRTIDManager();

	content.frame = new Frame();
	content.frame.init();
})();