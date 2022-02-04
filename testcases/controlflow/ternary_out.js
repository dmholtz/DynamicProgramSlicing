function sliceMe() {
    var x = 0;
    var z = 2;
    var a = 3;
    x = x > 0 ? y : z;
    a = a < 0 ? 0 : x++;
    return x;
}
sliceMe();