module.exports = {
	getData: function (obj) {
        obj.text = obj.text.replace(/(\r\n|\n|\r|"|#|[^\x00-\x7F])/gm,' ');
        obj.high_priority_index = getLongWords(obj.text, 3).join(' ');
        obj.indexable_content = obj.text; 
        if (obj.phash) // prepare for storing the hash in IDOL
        	obj.phash = encodeURIComponent(JSON.stringify(obj.phash));
        //console.log('screen obj: '+require('util').inspect(obj, {depth:4}));
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result, resultsWithHash, isExpendedData){
        //console.log('idol_document obj: '+require('util').inspect(idol_document, {depth:4}));
		formatted_result.caption = 'screen capture';
		var keywords = idol_document['DRETITLE'][0];
		if (keywords && keywords.length > 0)
			formatted_result.caption += ' with keywords: '+keywords;
        if(isExpendedData)
        {
            formatted_result.date = idol_document['DREDATE'][0];
            formatted_result.timestamp = idol_document['TIMESTAMP'][0];
         //   formatted_result.action = idol_document['ACTION'][0];
         //   formatted_result.status = idol_document['STATUS'][0];
        }
        if (resultsWithHash)
        {
        	if (idol_document['PHASH'] && idol_document['PHASH'][0] &&
        		idol_document['PHASH'][0]!='undefined')
        	{
        		//console.log('phash: '+idol_document['PHASH'][0]);
        		//console.log('decoded phash: '+decodeURIComponent(idol_document['PHASH'][0]));
            	formatted_result.phash = JSON.parse(decodeURIComponent(idol_document['PHASH'][0]));
        	}
            else
            	formatted_result.phash = null;
        }
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
		//console.log('getLongWords word: '+word);
		if (word.length > minLength)
			good_words.push(word);
	});
	//console.log('getLongWords good_words length: '+good_words.length);
	return good_words;
}
/*
 DREDATE: [ '2015-09-09' ],

 DRETITLE: [ 'Set Group by field to  be  phase  for  test in bar chart(test 5604)' ],

 SOPHIATYPE: [ 'TestStep' ],

 TIMESTAMP: [ '1441794232396' ],

 ACTION: [ 'done' ],

 DESCRIPTION: [ 'Set Group by field to  be  phase  for  test in bar chart(test 5604)' ],

 TESTID: [ '22ad5c9a-8b66-4524-ada0-2f0ccd70ecb0' ],

 STATUS: [ 'passed' ],

 DRECONTENT: [ 'Set Group by field to  be  phase  for  test in bar chart(test 5604) done\r\n' ],

 DREDBNAME: [ 'Sophia' ],

 HASH: [ '' ] }

 */