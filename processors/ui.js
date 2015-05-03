module.exports = {
	getData: function (obj) {
		if (obj.eventType == 'DOMSubtreeModified')
		{
			obj.type = 'UI_Change';
	        obj.indexable_content = obj.url + '\r\n' + obj.src;
		}
		else
		{
	        obj.indexable_content = obj.tagName + ' ' + obj.eventType +
	        	' ' + obj.elementId +' ' + obj.value;
		}
        return obj;
	}
};
