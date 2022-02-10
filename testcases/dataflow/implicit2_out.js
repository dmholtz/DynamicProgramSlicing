function sliceMe() {
    var a, b, c;
    a = { x: 1 };
    a.y = a.x;
    b = a;
    b.z = 'z';
    c = { y: 'y' };
    c.z = 'z';
    return [a, b, c]; // slicing criterion
}

sliceMe();
// implicit property use