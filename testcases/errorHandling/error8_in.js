function sliceMe() {
    var x = { a: 1 };
    var y = {};
    var z = {};
    z.z = 1;
    try {
        y.a = x.a + 1;
        z.a = x.a + y.a;
        x.b = 4;
        throw [x, y]; // slicing criterion
    } catch (error) {
        x.a = 0;
    }
    return x;
}

sliceMe();
// ThrowStatement is slicing criterion