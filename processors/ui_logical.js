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

    extractDataFromIDOL: function(idol_document, formatted_result) {
        formatted_result.caption = idol_document['DESCRIPTION'][0];
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