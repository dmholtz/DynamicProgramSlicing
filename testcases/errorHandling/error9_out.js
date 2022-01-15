function sliceMe() {
    var x = 0;
    var y = 0;
    try {
        x++;
        throw new Error('error1');
    } catch (error1) {
        try {
            try {
                throw new Error('error2');
            } catch (error2) {
                x++;
            }
        } finally {
            y = 1;
            try {
                if (y) {
                    throw Error('error3');
                }
            } catch (error34) {
                y++;
            }
        }
    } finally {
        x += y;
    }
    return x + y;
}
sliceMe();