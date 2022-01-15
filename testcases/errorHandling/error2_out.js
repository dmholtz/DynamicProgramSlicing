function sliceMe() {
    var x = 0;
    try {
        x = 1;
        throw Error();
    } catch (error) {
    } finally {
        x++;
    }
    return x;
}
sliceMe();