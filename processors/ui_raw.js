module.exports = {
	getData: function (obj) {
		if (obj.eventType == 'DOMSubtreeModified')
		{
			obj.type = 'UI_Change';
        	obj.high_priority_index = ''; // only has low priority content
	        obj.indexable_content = obj.url + '\r\n' + obj.src;
		}
		else if (obj.eventType == 'focusout')
		{
			obj.type = 'UI_Transition';
        	obj.high_priority_index = obj.eventType; 
	        obj.indexable_content = obj.tagName + ' ' + obj.eventType;
			if (obj.elementId) 
				obj.indexable_content = obj.indexable_content + ' ' + obj.elementId;
			if (obj.value)
			{
				obj.indexable_content = obj.indexable_content + ' ' + obj.value;
				obj.high_priority_index = obj.high_priority_index + ' ' + obj.value;
			}
		}
		else if (obj.eventType == 'log')
		{
			obj.type = 'UI_Log';
        	obj.high_priority_index = obj.value; 
	        obj.indexable_content = '';
		}
		else
		{
			obj.type = 'UI_Event';
        	obj.high_priority_index = obj.eventType; 
	        obj.indexable_content = obj.tagName + ' ' + obj.eventType;
			if (obj.elementId) 
				obj.indexable_content = obj.indexable_content + ' ' + obj.elementId;
			if (obj.value) 
			{
				obj.indexable_content = obj.indexable_content + ' ' + obj.value;
				obj.high_priority_index = obj.high_priority_index + ' ' + obj.value;
			}
		}
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result, isExpendedData){
		if (formatted_result.type == 'UI_Change'){
			formatted_result.caption = 'UI change in '+idol_document['URL'][0];
            if(isExpendedData)
            {
                formatted_result.date = idol_document['DREDATE'][0];
                formatted_result.timestamp = idol_document['TIMESTAMP'][0];
            }
		}
		else if (formatted_result.type == 'UI_Transition'){
			formatted_result.caption = 'UI transition for elemnt '+idol_document['ELEMENTID']+ 
				' in '+idol_document['URL'][0];
            if(isExpendedData)
            {
                formatted_result.date = idol_document['DREDATE'][0];
                formatted_result.timestamp = idol_document['TIMESTAMP'][0];
            }
		}
		else if (formatted_result.type == 'UI_Log'){
			formatted_result.caption = 'UI log: '+idol_document['DRETITLE']+ 
				' in '+idol_document['URL'][0];
            if(isExpendedData)
            {
                formatted_result.date = idol_document['DREDATE'][0];
                formatted_result.timestamp = idol_document['TIMESTAMP'][0];
            }
		}
		else { // UI_Event
			formatted_result.caption = idol_document['EVENTTYPE']+' on '+ idol_document['TAGNAME']+
				' in '+idol_document['URL'][0];
            if(isExpendedData)
            {
                formatted_result.date = idol_document['DREDATE'][0];
                formatted_result.timestamp = idol_document['TIMESTAMP'][0];
            }
		}
		return formatted_result;
	}
};
