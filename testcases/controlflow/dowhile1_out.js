function sliceMe() {
    var x = {};
    var i = 0;
    do {
        if (i % 2 == 0) {
            x[i] = i;
        }
        i++;
    } while (i < 5)
    return x[0] + x[4];
}
sliceMe();