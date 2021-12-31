function sliceMe() {
    var x = 0;
    var y = 1;
    var z = 2;
    var a = 3;
    x = x > 0 ? y : z;
    y = y < 0 ? x : z;
    z = z < 0 ? 1 + 2 : x * y;
    a = a < 0 ? 0 : x++;
    return x; // slicing criterion
}
sliceMe();