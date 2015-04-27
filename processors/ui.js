module.exports = {
	getData: function (obj) {
        obj.indexable_content = obj.url + ' ' + obj.eventType+' ' + obj.tagName + 
        	' ' + obj.elementId +' ' + obj.value+ '\r\n' + obj.src;
        return obj;
	}
};
