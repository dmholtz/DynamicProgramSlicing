function sliceMe() {
    var sum = 0;
    try {
        throw Error();
    } catch (error) {
    }
    return sum; // slicing criterion;
}

sliceMe();
// empty error