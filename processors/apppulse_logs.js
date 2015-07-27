module.exports = {
	getData: function (obj) {
		var logDate = new Date(obj.date);
        obj.timestamp = logDate.getTime();
        obj.high_priority_index = obj.message;
        obj.indexable_content = obj.line + ' ' + obj.level + ' ' + obj.message;

        obj.indexable_content = obj.message;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		formatted_result.caption = idol_document['MESSAGE'][0];
		return formatted_result;		
	}
};
