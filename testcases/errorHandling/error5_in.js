function sliceMe() {
    var x = 'a';
    try {
        var y = 1;
    } catch (error) {
        x = 'b';
        x += error;
    } finally {
        var z = 0;
    }
    return x; // slicing criterion
}

sliceMe();
// entire TryStatement is irrelevants