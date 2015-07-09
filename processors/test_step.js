module.exports = {
	getData: function (obj) {
        obj.high_priority_index = obj.description;
        obj.indexable_content = obj.description + ' ' + obj.action;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		//console.log('idol_document obj: '+require('util').inspect(idol_document, {depth:4}));
		formatted_result.caption = idol_document['DESCRIPTION'][0] + '\n';
		if (idol_document['STATUS'])
			formatted_result.caption += 'Status: ' + idol_document['STATUS'][0];
		else
			formatted_result.caption += 'Action: ' + idol_document['ACTION'][0];

		return formatted_result;		
	}
};
