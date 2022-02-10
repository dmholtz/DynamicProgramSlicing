function sliceMe() {
    var a = { x: 1 };
    a.y = a.x;
    var b = a;
    b.z = 'z';
    return a; // slicing criterion
}

sliceMe();
// implicit property use