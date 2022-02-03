function sliceMe() {
    var x;
    x = 0; // not in the slice
    for (var i = 0; i < 3; i++) {
        if (i !== 0) {
            x = 2;
        } else { // not in the slcie
            x++;
        }
    }
    return x; // slicing criterions
}

sliceMe();