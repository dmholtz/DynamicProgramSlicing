function sliceMe() {
    var x = 0;
    try {
        x++;
        throw 0;
    } catch (error) {
    }
    return x; // slicing criterion
}

sliceMe();
// throw a constant
// assume, that throw with empty catch handles are not simplified