module.exports = {
	getData: function (obj) {
		var d = new Date(Date.parse(obj.alm_date));
        d.setFullYear(new Date().getFullYear());
        obj.timestamp = d.getTime();
        obj.high_priority_index = obj.message;
        obj.indexable_content = obj.req_type + ' ' + obj.username + ' ' + obj.ip + ' ' +
        	obj.method + ' ' + obj.message;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result,isExpendedData){
		formatted_result.caption = idol_document['MESSAGE'][0];
		return formatted_result;		
	}
};
