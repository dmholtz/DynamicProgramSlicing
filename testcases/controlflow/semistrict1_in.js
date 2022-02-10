function sliceMe() {
    var x = 1;
    var y = 0;
    if (true || x > 0) {
        y++;
    }
    return y;
}
sliceMe();

// semi-strict || or && operator