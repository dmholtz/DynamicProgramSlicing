function sliceMe() {
    var x = 8;
    var y = 9;
    var z = x++ - --y;
    x++;
    y--;
    x = z++ * y;
    --y;
    z++;
    var c;
    c = x-- * ++y * ++z;
    return x++; // slicing criterion (line 12)
}

sliceMe();