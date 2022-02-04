function sliceMe() {
    var sum = 0;
    var func = function (a, b) {
        return a + b;
    }
    var x = 1;
    var y = 2;
    sum = func(x, y);
    return sum;
}
sliceMe();