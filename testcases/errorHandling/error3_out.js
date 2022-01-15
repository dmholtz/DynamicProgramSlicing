function sliceMe() {
    var x = 0;
    try {
        x = 1;
    } finally {
        x++;
    }
    return x;
}
sliceMe();