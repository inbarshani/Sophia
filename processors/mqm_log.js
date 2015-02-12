module.exports = {
	getData: function (obj) {
		var d = new Date(Date.parse(obj.alm_date[0] + ' ' + obj.alm_date[1] + ' ' + obj.alm_date[2]));
        d.setFullYear(new Date().getFullYear());
        obj.timestamp = d.getTime();
        return obj;
	}
};
