function sliceMe() {
    var x = 0;
    try {
        x = 1;
        throw Error();
    } catch (error) {
        x++;
    } finally {
        x++;
    }
    return x;
}
sliceMe();