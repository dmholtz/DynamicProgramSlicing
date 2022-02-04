function sliceMe() {
    var x = 1;
    for (var i = 1; i < 10; i++) {
        if (false) {
        } else {
            x = 1;
        }
    }
    return x;
}

sliceMe();
// unreachable break