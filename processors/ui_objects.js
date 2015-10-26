module.exports = {
    getData: function(obj) {
        obj.type = "UI_Objects";
        obj.high_priority_index = '';
        obj.description = '';
        obj.indexable_content = JSON.stringify(obj.objects);
        obj.objects = null;

        return obj;
    },

    extractDataFromIDOL: function(idol_document, formatted_result, includeHash, isExpendedData) {
        //console.log('idol_document ui_objects: '+require('util').inspect(idol_document, {depth:4}));

        formatted_result.caption = 'UI Objects';        
        if(isExpendedData)
        {
            formatted_result.objects = JSON.parse(idol_document['DRECONTENT'][0]);
            // TODO: go over objects and fill array from idol_document['DRECONTENT'][0]
            /*
            formatted_result.logical_name = idol_document['DRETITLE'][0];
            formatted_result.rect = idol_document['RECT'][0];
            formatted_result.micclass = idol_document['MICCLASS'][0];
            formatted_result.visible = idol_document['VISIBLE'][0];
            formatted_result.font_family = idol_document['FONT_FAMILY'][0];
            formatted_result.color = idol_document['COLOR'][0];
            formatted_result.background = idol_document['BACKGROUND'][0];
            formatted_result.font_size = idol_document['FONT_SIZE'][0];
            */
        }
        console.log('formatted_result ui_objects: '+require('util').inspect(formatted_result, {depth:4}));
        return formatted_result;
    }
};
