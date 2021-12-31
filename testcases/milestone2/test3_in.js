function sliceMe() {
    var a = { x: 0 };
    a = { x: 1 };
    a.y = a.x;
    return a.x; // slicing criterion (line 5)
}

sliceMe();