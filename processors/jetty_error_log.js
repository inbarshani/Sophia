module.exports = {
	getData: function (obj) {
		var logDate = new Date(obj.date);
		var currDate = new Date();
		if (logDate.getFullYear() > currDate.getFullYear()) {
	        logDate.setFullYear(currDate.getFullYear());
	        logDate.setMonth(currDate.getMonth());
	        logDate.setDate(currDate.getDate());
		}
        obj.timestamp = logDate.getTime();
        obj.indexable_content = obj.message;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		formatted_result.caption = idol_document['MESSAGE'][0];
		return formatted_result;		
	}
};
