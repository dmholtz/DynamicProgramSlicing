function sliceMe() {
    var x = { a: 1 };
    x.b = 2;
    delete x.a;
    var result;
    if (!x.a) {
        result = x.b;
    }
    return result;
}

sliceMe();
// delete-operator