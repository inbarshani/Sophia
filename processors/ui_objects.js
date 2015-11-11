module.exports = {
    getData: function(obj) {
        obj.type = "UI_Objects";
        obj.high_priority_index = '';
        obj.description = '';
        obj.indexable_content = JSON.stringify(obj.objects).replace(/(\r\n|\n|\r|#|\t)/gm,'');
        obj.objects = null;

        return obj;
    },

    extractDataFromIDOL: function(idol_document, formatted_result, includeHash, isExpendedData) {
        //console.log('idol_document ui_objects: '+require('util').inspect(idol_document, {depth:4}));

        formatted_result.caption = 'UI Objects';        
        if(isExpendedData)
        {
            formatted_result.objects = JSON.parse(idol_document['DRECONTENT'][0]);
        }
        //console.log('formatted_result ui_objects: '+require('util').inspect(formatted_result, {depth:4}));
        return formatted_result;
    }
};
