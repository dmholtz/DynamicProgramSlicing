function sliceMe() {
    var x;
    var y = 9;
    var z;
    var c;
    x = 1;
    y = 2;
    z = x + y;
    c = x + y;
    c *= 4;
    return x + z; // slicing criterion (line 11)
}

sliceMe();