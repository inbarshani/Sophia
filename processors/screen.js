module.exports = {
	getData: function (obj) {
        obj.high_priority_index = '';
        obj.indexable_content = obj.text; // TBD: OCR the screen?
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		return formatted_result;		
	}
};
