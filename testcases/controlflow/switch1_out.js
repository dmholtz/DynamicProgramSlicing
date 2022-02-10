function sliceMe() {
    var x = 4;
    var y = 0;
    switch (x) {
        case 4:
            y++;
        case 5:
            y--;
        case 6:
            y *= 3;
        case 7:
            break;
    }
    return y;
}

sliceMe();