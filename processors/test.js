module.exports = {
	getData: function (obj) {
        obj.indexable_content = obj.description;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		formatted_result.caption = idol_document['DESCRPTION'][0];
		return formatted_result;		
	}
};
