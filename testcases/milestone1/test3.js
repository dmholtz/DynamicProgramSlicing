function sliceMe(x) {
    switch (x) {
        case 0:
        case 1:
            break;
        case 2:
            break;
        case 1 + 2:
            break;
        default:
            break;
    }
}
sliceMe();
// switch-break-1: [1,2,3,4,6,7,8,9,10,11,12,13,14]
// switch-break-2: [1,2,3,4,12,13,14]
