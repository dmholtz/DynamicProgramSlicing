function sliceMe() {
    var x = 1;
    var y = 0;
    var z = 1;
    switch (x) {
        case 0:
            y++;
        case 1:
            while (true) {
                y++;
                if (y >= 2) {
                    break;
                }
            }
            switch (y) {
                case 0:
                    z++;
                    break;
                case 1:
                    z *= 3;
                case 2:
                    z--;
                case 4:
                    z /= 2;
                    break;
            }
        case 2:
            y *= 2;
        case 3:
        case 4:
            break;
        case 5:
            z++;
    }
    return z;
}

sliceMe();
// nested switch