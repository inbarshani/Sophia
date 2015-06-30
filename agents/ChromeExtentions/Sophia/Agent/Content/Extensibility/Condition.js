function ConditionsExpress(conditionInfo) {
    this._logger = new LoggerUtil("WebExt.Control.ConditionsExpress");
    this._conditions = [];
    this._init(conditionInfo);
}

ConditionsExpress.prototype = {
    CONST_LOGIC_AND: 0,
    CONST_LOGIC_OR: 1,

    _logicType: this.CONST_LOGIC_AND,

    _init: function (conditionInfo) {

        if (!Util.isNullOrUndefined(conditionInfo._logic) && conditionInfo._logic.toLowerCase() === "or") {
            this._logicType = this.CONST_LOGIC_OR;
        }
        if (!Util.isNullOrUndefined(conditionInfo.Condition)) {
            var conditionList = [];
            conditionList=conditionList.concat(conditionInfo.Condition);
            conditionList.forEach(function (item) {
                this._parseSubCondition(item);
            },this);
        }
        if (!Util.isNullOrUndefined(conditionInfo.Conditions)) {
            var conditionsList = [];
            conditionsList=conditionsList.concat(conditionInfo.Conditions);
            conditionsList.forEach(function (item) {
                this._parseSubConditions(item);
            },this);
        }
    },

    _parseSubCondition: function (conditionInfo) {
        var condition = new Condition(conditionInfo);
        if (condition.isValid()) {
            this._conditions.push(condition);
        }
    },

    _parseSubConditions: function (conditionsInfo) {
        var conditionExpress = new ConditionsExpress(conditionsInfo);
        if (conditionExpress.isValid()) {
            this._conditions.push(conditionExpress);
        }
    },

    isValid: function () {
        return this._conditions.length > 0;
    },

    eval: function (element) {
        if (!this.isValid() || Util.isNullOrUndefined(this._conditions) || this._conditions.length === 0)
            return false;

        var result = false;
        if (this._logicType === this.CONST_LOGIC_OR) {
            result = this._conditions.some(function (item) {
                return item.eval(element) === true;
            });
        }
        else {
            result = this._conditions.every(function (item) {
                return item.eval(element) === true;
            });
        }
        return result;
    }
};

function Condition(conditionInfo) {
    this._logger = new LoggerUtil("WebExt.Control.Conditions");
    this._propName = "";
    this._trimExpectedValue = true;
    this._expectedValue = "";
    this._isRegExp = false;
    this._isNegative = false;
    this._init(conditionInfo);
}

Condition.prototype = {

    _init: function (conditionInfo) {
        if (!Util.isNullOrUndefined(conditionInfo._prop_name)) {
            this._propName = conditionInfo._prop_name;
        }
        if (!Util.isNullOrUndefined(conditionInfo._trim) && (conditionInfo._trim.toLowerCase() === "false" || conditionInfo._trim === "0")) {
            this._trimExpectedValue = false;
        }
        if (!Util.isNullOrUndefined(conditionInfo._expected_value)) {
            if (this._trimExpectedValue) this._expectedValue = conditionInfo._expected_value.trim().toLowerCase();
            else this._expectedValue = conditionInfo._expected_value.toLowerCase();
        }
        if (!Util.isNullOrUndefined(conditionInfo._is_reg_exp) && (conditionInfo._is_reg_exp.toLowerCase() === "true" || conditionInfo._is_reg_exp === "1")) {
            this._isRegExp = true;
        }
        if (!Util.isNullOrUndefined(conditionInfo._equal) && (conditionInfo._equal.toLowerCase() === "false" || conditionInfo._equal === "0")) {
            this._isNegative = true;
        }

    },

    isValid: function () {
        return (this._propName.length > 0 && this._expectedValue.length > 0);
    },

    eval: function (element) {
        if (!this.isValid()) return false;
        var result = this._matchHtmlElemProp(element, this._propName, this._expectedValue, this._isRegExp, this._trimExpectedValue);
        return this._isNegative ? !result : result;

    },

    _matchHtmlElemProp: function (element, propName, expectedValue, isRegExp, trimBeforeCompare) {

        var _expectValueMeanTrue = function (value) {
            return (value === "true" || value === "1" || value === "yes" || value === "valid");
        };

        var _expectValueMeanFalse = function (value) {
            return (value === "false" || value === "0" || value === "no" || value === "null");
        };

        var propVal = element[propName]||element.getAttribute(propName);

        if (Util.isNullOrUndefined(propVal)) {
            return _expectValueMeanFalse(expectedValue);
        }
        if (typeof (propVal) === "string") {
            if (trimBeforeCompare) propVal = propVal.trim().toLowerCase();
            if (isRegExp) {
                var regExpress = new RegExp(expectedValue, "i");
                var isMatched = regExpress.test(propVal);
                return isMatched;
            }
            return propVal === expectedValue;
        }
        if (typeof (propVal) === "boolean") {
            if (propVal) return _expectValueMeanTrue(expectedValue);
            else return _expectValueMeanFalse(expectedValue);
        }

        if (typeof (propVal) === "number") {
            var expectNumber = Number(expectedValue);
            return expectNumber === propVal;
        }

        return _expectValueMeanTrue(expectedValue);
    }
};
