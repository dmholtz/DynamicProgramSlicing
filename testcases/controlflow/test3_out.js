function sliceMe() {
    var x;
    for (var i = 0; i < 3; i++) {
        if (i == 0) {
            x = 2;
        } else {
            x++;
        }
    }
    return x; // slicing criterions
}
sliceMe();