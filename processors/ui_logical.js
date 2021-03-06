module.exports = {
    getData: function(obj) {
        obj.type = "UI";
        obj.high_priority_index = obj.uiObject["logical name"] + ' ' + obj.eventName;
        if (obj.eventType)
        	obj.high_priority_index += ' ' + obj.eventType;
        if (obj.eventValue)
        	obj.high_priority_index += ' ' + obj.eventValue;

        obj.description = obj.high_priority_index;

        var props = obj.uiObject.properties;
        var smart_props = obj.uiObject["smart identification properties"];
        obj.indexable_content = JSON.stringify(props) + ' ' + JSON.stringify(smart_props);

        return obj;
    },

    extractDataFromIDOL: function(idol_document, formatted_result, includeHash, isExpendedData) {
        //console.log('idol_document obj: '+require('util').inspect(idol_document, {depth:4}));

        formatted_result.caption = idol_document['DRETITLE'][0];
        if (includeHash && idol_document['HASH'])
            formatted_result.hash = idol_document['HASH'][0];
        if(isExpendedData)
        {
            formatted_result.date = idol_document['DREDATE'][0];
            formatted_result.timestamp = idol_document['TIMESTAMP'][0];
            formatted_result.eventName = idol_document['EVENTNAME'][0];
            formatted_result.content = idol_document['DRECONTENT'][0];
        }
        return formatted_result;
    }
};
/*
{
    "type": "UI_Logical",
    "timestamp": 1435650021388,
    "testID": "95ac0e89-76e2-4d22-a8ed-4acd44d0d35f",
    "uiObject": {
        "logical name": "Login",
        "properties": {
            "html tag": "BUTTON",
            "micclass": "WebButton",
            "name": "Login",
            "type": "submit",
            "_xpath": "//TR/TD/BUTTON[normalize-space()=\"Login\"]"
        },
        "smart identification properties": {
            "html tag": "BUTTON",
            "micclass": "WebButton",
            "name": "Login",
            "type": "submit",
            "html id": "",
            "value": "Login",
            "class": "btn btn-primary pull-right",
            "visible": true
        }
    },
    "eventName": "click"
}
*/