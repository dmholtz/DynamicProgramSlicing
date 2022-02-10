function sliceMe() {
    var a = { x: 1 }
    var b = { y: 2 };
    var c;
    var list = [a, b, b, a];
    var i;
    i = list.lastIndexOf(a);
    list[i].x++;
    c = list[3];
    return c.x === b.x; // slicing criterion
}

sliceMe();
// implicit property use