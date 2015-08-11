module.exports = {
	getData: function (obj) {
        obj.high_priority_index = obj.description;
        obj.indexable_content = obj.description + ' ' + obj.action;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result, includeHash){
		formatted_result.name = idol_document['DRETITLE'][0];
		formatted_result.caption = idol_document['DESCRIPTION'][0];
		if (includeHash && idol_document['HASH'])
        	formatted_result.hash = idol_document['HASH'][0];
		return formatted_result;		
	}
};
