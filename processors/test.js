module.exports = {
	getData: function (obj) {
		if (obj.guid == undefined)
		{
			obj.guid = obj.testID;
		}
        return obj;
	}
};
