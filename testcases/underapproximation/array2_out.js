function sliceMe() {
    var x = { a: 1 };
    var b = [];
    b.push(x);
    return b[0].a;
}

sliceMe();
// delete-operator