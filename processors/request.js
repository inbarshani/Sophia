module.exports = {
	getData: function (obj) {
		var d = new Date(Date.parse(obj.timestamp));
        obj.timestamp = d.getTime();
        obj.high_priority_index = obj.message.substring(obj.message.indexOf(']'));
        obj.indexable_content = obj.message + ' ' + obj.host;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		formatted_result.caption = idol_document['MESSAGE'][0];
		return formatted_result;		
	}
};
