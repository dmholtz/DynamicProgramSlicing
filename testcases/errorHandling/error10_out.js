function sliceMe() {
    var x = 0;
    try {
        x++;
        throw 0;
    } catch (error) {
    }
    return x;
}
sliceMe();