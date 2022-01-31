function sliceMe() {
    var x = 0;
    try {
        throw Error();
    } catch (error) {
    }
    return x;
}

sliceMe();
// limitation: cannot remove try-catch once an error is thrown