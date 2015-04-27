module.exports = {
	getData: function (obj) {
		var d = new Date(Date.parse(obj.timestamp));
        obj.timestamp = d.getTime();
        obj.indexable_content = obj.message + ' ' + obj.host;
        return obj;
	}
};
