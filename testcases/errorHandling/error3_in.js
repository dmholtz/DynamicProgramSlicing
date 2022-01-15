function sliceMe() {
    var x = 0;
    try {
        x = 1;
        var y = 2;
    } catch (error) {
        x = 1;
    } finally {
        x++;
    }
    return x; // slicing criterion
}

sliceMe();
// try + finally relevant, catch is irrelevant