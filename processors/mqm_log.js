module.exports = {
	getData: function (obj) {
		var d = new Date(Date.parse(obj.alm_date));
        d.setFullYear(new Date().getFullYear());
        obj.timestamp = d.getTime();
        return obj;
	}
};
