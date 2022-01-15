function sliceMe() {
    var x = 'a';
    try {
    } finally {
        x += 'c';
    }
    return x;
}
sliceMe();