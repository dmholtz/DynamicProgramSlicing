function sliceMe() {
    var x;
    var y;
    var z;
    var c;
    x = 1;
    y = 2;
    z = x + y;
    c = x + z;
    z = 5 - x;
    y = x - 4;
    c = c * y * z;
    z *= x;
    x = 1;
    return x + z; // slicing criterion (line 15)
}

sliceMe();