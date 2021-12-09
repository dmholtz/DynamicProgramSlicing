function sliceMe() {
    var x = 5;
    if (x < 10) {
        console.log("if-branch taken")
        x += 1;
    }
    else {
        console.log("else-branch taken");
        x -= 1;
    }
}
sliceMe();
// if-consequence-block: [1,2,3,4,6,7,8,9,10,11,12]
// else-alternate-block: [1,2,3,4,5,6,7,8,10,11,12]
// remove-else: [1,2,3,4,5,6,11,12]
