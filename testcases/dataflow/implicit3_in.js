function sliceMe() {
    var a, b, c, d, e, f;
    d = { d: 'd' };
    e = { e: 'e' };
    c = { c: d };
    b = { b1: c, b2: e };
    a = { a: b };
    f = { f: a };
    return a; // slicing criterion
}

sliceMe();
// implicit property use