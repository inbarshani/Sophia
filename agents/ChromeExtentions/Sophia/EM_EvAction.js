(function () {
    EMLog('d', 'ev', "### Loading EM_EvAction");
    if (window.__EMEvAction) {
        EMLog('d', 'inj','EvAction not Loaded, already exists ');
        return;
    }
    window.__EMEvAction = true;

    //var eV = eval;
    window._evFunc = eval;
})();