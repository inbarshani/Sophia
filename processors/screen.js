module.exports = {
	getData: function (obj) {
        obj.indexable_content = ''; // TBD: OCR the screen?
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		return formatted_result;		
	}
};
