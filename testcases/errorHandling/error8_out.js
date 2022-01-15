function sliceMe() {
    var x = { a: 1 };
    var y = {};
    try {
        y.a = x.a + 1;
        x.b = 4;
        throw [
            x,
            y
        ];
    } catch (error) {
    }
}
sliceMe();