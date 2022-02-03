function sliceMe() {
    var list = [1, 2, 3, 4, 5];
    for (var el in list) {
        list[el]++;
    }
    return list;
}
sliceMe();