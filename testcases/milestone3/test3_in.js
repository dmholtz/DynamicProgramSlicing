function sliceMe() {
    var re = /(\w+)\s(\w+)/;
    var re1 = new RegExp("(\w+)\s(\w+)");
    var re2 = /(\w+)/;
    var name = "firstName lastName";

    var swapped = name.replace(re, "$2, $1");
    var firstName = name.replace(re2, "$1");
    var lastName = name.replace(re1, "$2");

    var char1 = swapped[0];
    var char2 = swapped.charAt(1);
    var pos = swapped.lastIndexOf("N");
    swapped.lastIndexOf("rstN");
    var concat = char1 + char2;
    concat = concat.toUpperCase();
    concat.toLowerCase();
    var split = lastName.slice(2, pos);

    return split + concat;
}
sliceMe();

// Test RegExp literal and string operations