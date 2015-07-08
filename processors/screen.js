module.exports = {
	getData: function (obj) {
        obj.high_priority_index = getLongWords(obj.text, 3).join(' ');
        obj.indexable_content = obj.text; // TBD: OCR the screen?
        //console.log('screen obj: '+require('util').inspect(obj, {depth:4}));
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result){
		formatted_result.caption = 'screen capture';
		return formatted_result;		
	}
};

function getLongWords(text, minLength)
{
	//console.log('getLongWords');
	var words = text.split(/\W/);
	//console.log('getLongWords words length: '+words.length);
	var good_words = [];
	words.forEach(function(word){
		console.log('getLongWords word: '+word);
		if (word.length > minLength)
			good_words.push(word);
	});
	//console.log('getLongWords good_words length: '+good_words.length);
	return good_words;
}
