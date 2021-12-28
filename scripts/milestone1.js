/**
 * Test script to run milestone 1 scripts. Call this script from the scripts/ directory.
 */

function readFile(fileName) {
    const fs = require('fs');
    return fs.readFileSync(fileName, 'utf8');
}

function readTestCaseDescription(testCaseFile) {
    var testCases = JSON.parse(readFile(testCaseFile));
    return testCases;
}


function run_slice(testCase) {

    const trimmer = require('./trimmer.js');
    const outputCode = trimmer.trim(testCase["inputFile"], testCase["lines"]);
    console.log(outputCode);
}

testCases = readTestCaseDescription("milestone1b_testCases.json");
testCases.forEach(run_slice);

