module.exports = {
	getData: function (obj) {
        obj.high_priority_index = obj.description;
        obj.indexable_content = obj.description + ' ' + obj.action;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result, includeHash, isExpendedData){
		//console.log('idol_document obj: '+require('util').inspect(idol_document, {depth:4}));
		formatted_result.caption = idol_document['DESCRIPTION'][0] + '\n';
        if(isExpendedData)
        {
            formatted_result.date = idol_document['DREDATE'][0];
            formatted_result.timestamp = idol_document['TIMESTAMP'][0];
            formatted_result.action = idol_document['ACTION'][0];
            formatted_result.status = idol_document['STATUS'][0];
        }
		if (idol_document['STATUS'])
			formatted_result.caption += 'Status: ' + idol_document['STATUS'][0];
		else
			formatted_result.caption += 'Action: ' + idol_document['ACTION'][0];
		if (includeHash && idol_document['HASH'])
        	formatted_result.hash = idol_document['HASH'][0];

		return formatted_result;		
	}
};
/* DREDATE: [ '2015-09-09' ],

 DRETITLE: [ 'Set Group by field to  be  phase  for  test in bar chart(test 5604)' ],

 SOPHIATYPE: [ 'TestStep' ],

 TIMESTAMP: [ '1441794232396' ],

 ACTION: [ 'done' ],

 DESCRIPTION: [ 'Set Group by field to  be  phase  for  test in bar chart(test 5604)' ],

 TESTID: [ '22ad5c9a-8b66-4524-ada0-2f0ccd70ecb0' ],

 STATUS: [ 'passed' ],

 DRECONTENT: [ 'Set Group by field to  be  phase  for  test in bar chart(test 5604) done\r\n' ],

 DREDBNAME: [ 'Sophia' ],
 HASH: [ '' ] }*/