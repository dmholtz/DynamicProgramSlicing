function sliceMe() {
    var x = 0;
    var y = 0;
    try {
        throw Error();
    } catch (error) {
    }
    try {
        y++;
    } catch (error) {
    }
    return x; // slicing criterion
}

sliceMe();
// limitation: cannot remove try-catch once an error is thrown