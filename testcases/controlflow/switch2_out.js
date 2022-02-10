function sliceMe() {
    var x = 1;
    var y = 0;
    var z = 1;
    switch (x) {
        case 1:
            while (true) {
                y++;
                if (y >= 2) {
                    break;
                }
            }
            switch (y) {
                case 2:
                    z--;
                case 4:
                    z /= 2;
                    break;
            }
        case 4:
            break;
    }
    return z;
}

sliceMe();
// nested switch