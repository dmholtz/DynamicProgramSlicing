function sliceMe() {
    var list = [1, 2, 3, 4, 5];
    var sum = 0;
    for (var el in list) {
        sum += list[el];
        list[el]++;
    }
    return list; // slicing criterion
}

sliceMe();
// for-in loop