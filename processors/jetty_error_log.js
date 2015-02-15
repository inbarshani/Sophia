module.exports = {
	getData: function (obj) {
		var logDate = new Date(obj.date);
		var currDate = new Date();
		if (logDate.getFullYear() > currDate.getFullYear()) {
	        logDate.setFullYear(currDate.getFullYear());
	        logDate.setMonth(currDate.getMonth());
	        logDate.setDate(currDate.getDate());
		}
        obj.timestamp = logDate.getTime();
        return obj;
	}
};
