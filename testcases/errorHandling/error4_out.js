function sliceMe() {
    var x = 0;
    try {
        throw Error('error occured');
    } catch (error) {
        x = 1;
    } finally {
        x++;
    }
    return x;
}
sliceMe();