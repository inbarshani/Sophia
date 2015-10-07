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

	extractDataFromIDOL: function(idol_document, formatted_result,isExpendedData){
		formatted_result.caption = idol_document['MESSAGE'][0];
        if(isExpendedData)
        {
            formatted_result.date = idol_document['DREDATE'][0];
            formatted_result.timestamp = idol_document['TIMESTAMP'][0];
            //  formatted_result.phash = JSON.parse(decodeURIComponent(idol_document['PHASH'][0]));
            //    formatted_result.action = idol_document['ACTION'][0];
            //   formatted_result.status = idol_document['STATUS'][0];
        }
		return formatted_result;		
	}
};

/*
timestamp: 03/Sep/2015:09:00:11 (3/9/2015)
*/