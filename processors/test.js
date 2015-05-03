module.exports = {
	getData: function (obj) {
        obj.indexable_content = obj.description;
        return obj;
	}
};
