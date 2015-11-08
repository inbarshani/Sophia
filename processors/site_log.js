module.exports = {
	getData: function (obj) {
	var d = new Date(obj.timestamp);
        obj.timestamp = d.getTime();
        obj.high_priority_index = obj.message;
        // currently, data is unparsed, just save raw data
        /*obj.indexable_content = obj.level + ' ' + obj.username + ' ' + obj.alm_date + ' ' +
        	obj.db_date + ' ' + obj.err_type + ' ' + obj.message;*/
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result, isExpendedData){
		formatted_result.caption = idol_document['MESSAGE'][0];
		return formatted_result;		
	}
};

/*
{
                        "type": "%{type}",
                        "db_date":"%{db_date}", 
                        "alm_date":"%{alm_date}", 
                        "thread": "%{thread}", 
                        "username": "%{username}", 
                        "level": "%{level}",
                        "err_type": "%{err_type}",
                        "message": "%{error}"
                
                }

*/