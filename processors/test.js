module.exports = {
	getData: function (obj) {
		if (obj.guid == undefined)
		{
			obj.guid = obj.testID;
		}
        obj.indexable_content = obj.description;
        return obj;
	}
};
