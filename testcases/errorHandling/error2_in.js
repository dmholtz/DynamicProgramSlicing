function sliceMe() {
    var x = 0;
    try {
        x = 1;
        throw Error();
    } catch (error) {
        var y = 1;
    } finally {
        x++;
    }
    return x; // slicing criterion
}

sliceMe();
// try + empty catch only + finally relevant