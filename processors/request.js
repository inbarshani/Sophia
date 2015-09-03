var dateTime = require('../dateTime');

module.exports = {
	getData: function (obj) {
		var d = dateTime.getDateFromFormat(obj.timestamp, 'dd/MMM/yyyy:hh:mm:ss');;
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

/*
timestamp: 03/Sep/2015:09:00:11 (3/9/2015)
*/