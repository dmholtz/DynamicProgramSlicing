function sliceMe() {
    var x = 1;
    for (var i = 1; i < 10; i++) {
        if (false) {
            if (true) {
                break;
            }
        } else {
            x = 1;
        }
    }
    return x; // slicing criterion
}

sliceMe();
// unreachable break