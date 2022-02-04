function sliceMe() {
    var a = { x: 1 };
    var b = a;
    b.x = 2;
    return a.x; // slicing criterion (line 5)
}

sliceMe();