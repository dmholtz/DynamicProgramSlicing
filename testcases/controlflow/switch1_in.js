function sliceMe() {
    var x = 4;
    var y = 0;
    switch (x) {
        case 0:
            y++;
        case 1:
            y--;
            break;
        case 2:
            y *= 2;
        case 3:
        case 4:
            y++;
        case 5:
            y--;
        case 6:
            y *= 3;
        case 7:
            break;
        default:
            x++;
            break;
    }
    return y;
}

sliceMe();
// fall-through in switch statements