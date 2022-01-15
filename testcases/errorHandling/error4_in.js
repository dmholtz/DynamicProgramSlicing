function sliceMe() {
    var x = 0;
    try {
        y = 1;
        throw Error('error occured');
    } catch (error) {
        x = 1;
    } finally {
        x++;
    }
    return x; // slicing criterion
}

sliceMe();
// catch + finally relevant