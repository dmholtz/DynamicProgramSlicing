function sliceMe(x) {
    for (var i = 0; i < 10; i++) {
        console.log(x);
    }
    while (x > 0)
        while (x > 4) {
            x--;
            continue;
        }
    do
        x++;
    while (x < 10);
}
sliceMe();
// for-loop: [1,2,3,4,14]
// while-loop: [1,5,6,7,10,11,12,13,14]