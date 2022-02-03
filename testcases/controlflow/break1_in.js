function sliceMe() {
    var x = 1;
    for (var i = 1; i < 10; i++) {
        if (x === 120) {
            break;
        }
        x *= i;
    }
    return x;
}

sliceMe();