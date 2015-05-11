module.exports = {
	getData: function (obj) {
		if (obj.eventType == 'DOMSubtreeModified')
		{
			obj.type = 'UI_Change';
	        obj.indexable_content = obj.url + '\r\n' + obj.src;
		}
		else if (obj.eventType == 'focusout')
		{
			obj.type = 'UI_Transition';
	        obj.indexable_content = obj.tagName + ' ' + obj.eventType;
			if (obj.elementId) 
				obj.indexable_content = obj.indexable_content + ' ' + obj.elementId;
			if (obj.value) 
				obj.indexable_content = obj.indexable_content + ' ' + obj.value;
		}
		else
		{
	        obj.indexable_content = obj.tagName + ' ' + obj.eventType;
			if (obj.elementId) 
				obj.indexable_content = obj.indexable_content + ' ' + obj.elementId;
			if (obj.value) 
				obj.indexable_content = obj.indexable_content + ' ' + obj.value;
		}
        return obj;
	}
};
