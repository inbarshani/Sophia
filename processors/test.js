module.exports = {
	getData: function (obj) {
        obj.high_priority_index = obj.description;
        obj.indexable_content = obj.description + ' ' + obj.action;
        return obj;
	},

	extractDataFromIDOL: function(idol_document, formatted_result, includeHash, isExpendedData){
        console.log('idol_document obj: '+require('util').inspect(idol_document, {depth:4}));
        formatted_result.name = idol_document['DRETITLE'][0];
		formatted_result.caption = idol_document['DESCRIPTION'][0];
		if (includeHash && idol_document['HASH'])
        	formatted_result.hash = idol_document['HASH'][0];
        if(isExpendedData)
        {
            formatted_result.date = idol_document['DREDATE'][0];
            formatted_result.timestamp = idol_document['TIMESTAMP'][0];
            formatted_result.action = idol_document['ACTION'][0];
        }
		return formatted_result;		
	}
};
/*
 idol_document obj: { DREREFERENCE: [ '155045' ],
 DREDATE: [ '2015-09-09' ],
 DRETITLE: [ 'Post several comments for test' ],
 SOPHIATYPE: [ 'Test' ],
 TIMESTAMP: [ '1441799828892' ],
 ACTION: [ 'start' ],
 DESCRIPTION: [ 'Post several comments for test' ],
 TESTID: [ '5296abb7-59cd-420a-8c9e-28ee0221ff57' ],
 DRECONTENT: [ 'Post several comments for test start\r\n' ],
 DREDBNAME: [ 'Sophia' ] }
 */