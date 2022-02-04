function sliceMe() {
    var sum = 0;
    for (var i = 0; i < 10; i++) {
        sum += i;
        if (false) {
        } else {
            continue;
        }
    }
    return sum;
}
sliceMe();