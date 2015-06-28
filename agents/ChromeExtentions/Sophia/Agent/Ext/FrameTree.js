function FrameTree(page) {
	this._logger = new LoggerUtil("Ext.FrameTree");
	this.page = page;
}

FrameTree.prototype = {
    _logger: null,
    page: null,
    hasFrames: function () {
        return ext.dispatcher.getNumberOfClients(this.page.getTabId()) > 1;
    },
    _buildTree: function (rtidsToExclude, resultCallback) {
        rtidsToExclude = Array.isArray(rtidsToExclude) ? rtidsToExclude : [rtidsToExclude];

        if (this.page._contentID < 0) {
            this._logger.debug("_buildTree: no Page, returning the empty tree");
            resultCallback({ id: null, children: [] });
            return;
        }
        var msg = new Msg('buildLayoutTree', this.page.getID(), { exclude: rtidsToExclude });
        this.page._DispatchToOurContent(msg, function (resMsg) {
            resultCallback(resMsg._data);
        });
    },
    traverse: function (nodeFunc, shouldStopTraversalPredicate, thisObj, resCallback) {
        this._logger.trace("traverse started");
        this.traverseExcluding(nodeFunc, shouldStopTraversalPredicate, thisObj, [], resCallback);
    },
    traverseExcluding: function (nodeFunc, shouldStopTraversalPredicate, thisObj, rtidsToExclude, resCallback) {
        thisObj = thisObj || window;

        this._logger.trace("traverseExcluding started");
        this._buildTree(rtidsToExclude, function (frameTree) {
            this._logger.trace("traverse build tree: \n" + JSON.stringify(frameTree));
            this._traverseTree(frameTree, nodeFunc, shouldStopTraversalPredicate, [], thisObj, resCallback);
        }.bind(this));
    },
    _traverseTree: function (node, nodeFunc, shouldStopTraversalPredicate, path, thisObj, resultCallback) {
        nodeFunc.call(thisObj, node, path, function (result) {
            if (shouldStopTraversalPredicate.call(thisObj, result)) {
                resultCallback(result);
                return;
            }

            var children = node.children.reverse(); // Creating a new array. Reversing so that we can Pop() elements in order, from first to last.
            var i = -1;

            // Helper function which traverses on the children in order - from first to last
            var callOnChild = function () {
                i++;
                if (children.length === 0) {
                    resultCallback(result);
                    return;
                }

                var child = children.pop();
                if (child.id === null) {
                    callOnChild(); // skip uninjectable frames
                    return;
                }

                this._traverseTree(child, nodeFunc, shouldStopTraversalPredicate, path.concat(i), thisObj, function (result) {
                    if (shouldStopTraversalPredicate.call(thisObj, result)) {
                        resultCallback(result);
                        return;
                    }

                    callOnChild();
                });
            }.bind(this);

            callOnChild();
        }.bind(this));
    }
};
