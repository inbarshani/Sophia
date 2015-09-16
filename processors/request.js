var dateTime = require('../lib/dateTime');

module.exports = {
	getData: function (obj) {
		var isUTC = true;
		var d = dateTime.getDateFromFormat(obj.timestamp, 'dd/MMM/yyyy:HH:mm:ss.SSS', isUTC);
        obj.timestamp = d.getTime();
        obj.high_priority_index = obj.message;
        obj.indexable_content = obj.message + ' ' + obj.host;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		formatted_result.caption = idol_document['MESSAGE'][0];
		return formatted_result;		
	}
};

/*
timestamp: 03/Sep/2015:09:00:11 (3/9/2015)
*/