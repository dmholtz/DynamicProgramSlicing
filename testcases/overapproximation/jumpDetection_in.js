function sliceMe() {
    var sum = 0;
    for (var i = 0; i < 10; i++) {
        sum += i;
        if (i == 9) {
            break; // has no effect
        }
        continue; // has no effect
    }
    return sum; // slicing criterion
}
sliceMe();