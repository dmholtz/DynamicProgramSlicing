function sliceMe() {
    var x = { a: 1 };
    try {
        throw x;
    } catch (error) {
        error.c = 3;
    }
    return x.c;
}
sliceMe();