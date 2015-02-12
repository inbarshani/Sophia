module.exports = {
	getData: function (obj) {
		var d = new Date(Date.parse(obj.timestamp);
        obj.timestamp = d.getTime();
        return obj;
	}
};
