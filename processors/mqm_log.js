module.exports = {
	getData: function (obj) {
		var d = new Date(Date.parse(obj.alm_date));
        d.setFullYear(new Date().getFullYear());
        obj.timestamp = d.getTime();
        obj.indexable_content = obj.req_type + ' ' + obj.username + ' ' + obj.ip + ' ' +
        	obj.method + ' ' + obj.message;
        return obj;
	}
};
