// ------------------------------------------------------------------
// Utility functions for parsing in getDateFromFormat()
// ------------------------------------------------------------------
function _isInteger(val) {
    var digits = "1234567890";
    for (var i = 0; i < val.length; i++) {
        if (digits.indexOf(val.charAt(i)) == -1) {
            return false;
        }
    }
    return true;
}

function _getInt(str, i, minlength, maxlength) {
    for (var x = maxlength; x >= minlength; x--) {
        var token = str.substring(i, i + x);
        if (token.length < minlength) {
            return null;
        }
        if (_isInteger(token)) {
            return token;
        }
    }
    return null;
}


var dateTime = {
    MONTH_NAMES: [
        'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ],
    DAY_NAMES: [
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
    ],
    LZ: function(x) {
        return (x < 0 || x > 9 ? "" : "0") + x
    },
    // ------------------------------------------------------------------
    // getDateFromFormat( date_string , format_string, isUTC )
    //
    // This function takes a date string and a format string. It matches
    // If the date string matches the format string, it returns the 
    // getTime() of the date. If it does not match, it returns 0.
    // isUTC default is false;
    // ------------------------------------------------------------------
    getDateFromFormat: function(val, format, isUTC) {
        if (undefined===isUTC)
            isUTC = false;
        val = val + "";
        format = format + "";
        var i_val = 0;
        var i_format = 0;
        var c = "";
        var token = "";
        var token2 = "";
        var x, y;
        var now = new Date();
        var year = now.getYear();
        var month = now.getMonth() + 1;
        var date = 1;
        var hh = 0;
        var mm = 0;
        var ss = 0;
        var ms = 0;
        var ampm = "";

        while (i_format < format.length) {
            // Get next token from format string
            c = format.charAt(i_format);
            token = "";
            while ((format.charAt(i_format) == c) && (i_format < format.length)) {
                token += format.charAt(i_format++);
            }
            // Extract contents of value based on format token
            if (token == "yyyy" || token == "yy" || token == "y") {
                if (token == "yyyy") {
                    x = 4;
                    y = 4;
                }
                if (token == "yy") {
                    x = 2;
                    y = 2;
                }
                if (token == "y") {
                    x = 2;
                    y = 4;
                }
                year = _getInt(val, i_val, x, y);
                //console.log('Year: ' + year);
                if (year == null) {
                    return 0;
                }
                i_val += year.length;
                if (year.length == 2) {
                    if (year > 70) {
                        year = 1900 + (year - 0);
                    } else {
                        year = 2000 + (year - 0);
                    }
                }
            } else if (token == "MMM" || token == "NNN") {
                month = 0;
                for (var i = 0; i < this.MONTH_NAMES.length; i++) {
                    var month_name = this.MONTH_NAMES[i];
                    if (val.substring(i_val, i_val + month_name.length).toLowerCase() == month_name.toLowerCase()) {
                        if (token == "MMM" || (token == "NNN" && i > 11)) {
                            month = i + 1;
                            if (month > 12) {
                                month -= 12;
                            }
                            i_val += month_name.length;
                            break;
                        }
                    }
                }
                //console.log('Month: ' + month);
                if ((month < 1) || (month > 12)) {
                    return 0;
                }
            } else if (token == "EE" || token == "E") {
                for (var i = 0; i < this.DAY_NAMES.length; i++) {
                    var day_name = DAY_NAMES[i];
                    if (val.substring(i_val, i_val + day_name.length).toLowerCase() == day_name.toLowerCase()) {
                        i_val += day_name.length;
                        break;
                    }
                }
            } else if (token == "MM" || token == "M") {
                month = _getInt(val, i_val, token.length, 2);
                //console.log('month: ' + month);
                if (month == null || (month < 1) || (month > 12)) {
                    return 0;
                }
                i_val += month.length;
            } else if (token == "dd" || token == "d") {
                date = _getInt(val, i_val, token.length, 2);
                //console.log('date: ' + date);
                if (date == null || (date < 1) || (date > 31)) {
                    return 0;
                }
                i_val += date.length;
            } else if (token == "hh" || token == "h") {
                hh = _getInt(val, i_val, token.length, 2);
                //console.log('hh: ' + hh);
                if (hh == null || (hh < 1) || (hh > 12)) {
                    return 0;
                }
                i_val += hh.length;
            } else if (token == "HH" || token == "H") {
                hh = _getInt(val, i_val, token.length, 2);
                //console.log('HH: ' + hh);
                if (hh == null || (hh < 0) || (hh > 23)) {
                    return 0;
                }
                i_val += hh.length;
            } else if (token == "KK" || token == "K") {
                hh = _getInt(val, i_val, token.length, 2);
                if (hh == null || (hh < 0) || (hh > 11)) {
                    return 0;
                }
                i_val += hh.length;
            } else if (token == "kk" || token == "k") {
                hh = _getInt(val, i_val, token.length, 2);
                if (hh == null || (hh < 1) || (hh > 24)) {
                    return 0;
                }
                i_val += hh.length;
                hh--;
            } else if (token == "mm" || token == "m") {
                mm = _getInt(val, i_val, token.length, 2);
                //console.log('mm: ' + mm);
                if (mm == null || (mm < 0) || (mm > 59)) {
                    return 0;
                }
                i_val += mm.length;
            } else if (token == "ss" || token == "s") {
                ss = _getInt(val, i_val, token.length, 2);
                //console.log('ss: ' + ss);
                if (ss == null || (ss < 0) || (ss > 59)) {
                    return 0;
                }
                i_val += ss.length;
            } else if (token == "SSS" || token == "sss") {
                ms = _getInt(val, i_val, token.length, 3);
                //console.log('ms: ' + ms);
                if (ms == null || (ms < 0) || (ms > 999)) {
                    return 0;
                }
                i_val += ms.length;
            } else if (token == "a") {
                if (val.substring(i_val, i_val + 2).toLowerCase() == "am") {
                    ampm = "AM";
                } else if (val.substring(i_val, i_val + 2).toLowerCase() == "pm") {
                    ampm = "PM";
                } else {
                    return 0;
                }
                i_val += 2;
            } else {
                if (val.substring(i_val, i_val + token.length) != token) {
                    return 0;
                } else {
                    i_val += token.length;
                }
            }
        }
        // If there are any trailing characters left in the value, it doesn't match
        if (i_val != val.length) {
            return 0;
        }
        // Is date valid for month?
        if (month == 2) {
            // Check for leap year
            if (((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)) { // leap year
                if (date > 29) {
                    return 0;
                }
            } else {
                if (date > 28) {
                    return 0;
                }
            }
        }
        if ((month == 4) || (month == 6) || (month == 9) || (month == 11)) {
            if (date > 30) {
                return 0;
            }
        }
        // Correct hours value
        if (hh < 12 && ampm == "PM") {
            hh = hh - 0 + 12;
        } else if (hh > 11 && ampm == "AM") {
            hh -= 12;
        }
        if (isUTC)
            return new Date(Date.UTC(year, month - 1, date, hh, mm, ss, ms));
        else
            return new Date(year, month - 1, date, hh, mm, ss, ms);
    }
};
module.exports = dateTime;