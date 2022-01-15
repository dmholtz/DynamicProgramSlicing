function sliceMe() {
    var x = { a: 1 };
    try {
        x.a--;
        x.b = 2;
        throw x;
    } catch (error) {
        error.a++;
        error.c = 3;
    }
    return x.c; // slicing criterion
}

sliceMe();
// catch parameter is relevant