function sliceMe() {
    var x = 'a';
    try {
        var y = 1;
    } catch (error) {
        x = 'b';
        x += error;
    } finally {
        x += 'c';
    }
    return x; // slicing criterion
}

sliceMe();
// only finally is relevant