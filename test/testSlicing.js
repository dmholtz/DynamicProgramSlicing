const assert = require('assert');
const fs = require('fs');
const escodegen = require('escodegen');
const { Parser } = require('acorn');
const levenshtein = require('fast-levenshtein');

function readFile(fileName) {
    return fs.readFileSync(fileName, 'utf8');
}

function reformatTestCode(codeString) {
    const program = Parser.parse(codeString,
        { ecmaVersion: 5, locations: true }
    )
    const program_string = escodegen.generate(program)
    return program_string
}

function compare(originalFile, predictedFile) {
    expectedSlice = reformatTestCode(readFile(originalFile));
    predictedSlice = reformatTestCode(readFile(predictedFile));

    return levenshtein.get(expectedSlice, predictedSlice);
}

function read_criteria_file(sourceFile) {
    var data = JSON.parse(readFile(sourceFile));
    return data;
}

function singleSlicingTest(testCase) {

    const trimPath = path => {
        return path.replace('../', '');
    }

    const extractName = testCase => {
        let name = testCase['inFile'];
        name = name.replace(/.*\//, '');
        return name.replace(/\.js/, '');
    }

    inputArgs = " --inFile " + testCase['inFile'] + " --outFile " + testCase['outFile'] + " --lineNb " + testCase['lineNb'];
    stmt = 'cd scripts; node slice.js' + inputArgs + "; cd ..";

    const execSync = require('child_process').execSync;
    const child = execSync(stmt);

    it(`correctly in test ${extractName(testCase)} `, function () {
        const levenshteinDistance = compare(trimPath(testCase['outFile']), trimPath(testCase['goldFile']));
        assert.equal(levenshteinDistance, 0, 'Levenshtein distance > 0');
    });
}

function runTestCaseList(testCases) {
    for (let testCase of testCases) {
        singleSlicingTest(testCase);
    }
}

describe('slice.js should be able to', function () {
    describe('slice examples from milestone 2', function () {
        testCases = read_criteria_file('scripts/testcases_milestone2.json');
        runTestCaseList(testCases);
    });
    describe('handle dataflow dependencies', function () {
        testCases = read_criteria_file('scripts/testcases_dataflow.json');
        runTestCaseList(testCases);
    });
    describe('slice examples from milestone 3', function () {
        testCases = read_criteria_file('scripts/testcases_milestone3.json');
        runTestCaseList(testCases);
    });
    describe('handle control flow dependencies', function () {
        testCases = read_criteria_file('scripts/testcases_controlflow.json');
        runTestCaseList(testCases);
    });
    describe('deal with error handling within functions', function () {
        testCases = read_criteria_file('scripts/errorHandling_testCases.json');
        runTestCaseList(testCases);
    });
    describe('deal with loops', function () {
        testCases = read_criteria_file('scripts/loop_testCases.json');
        runTestCaseList(testCases);
    });
    describe('slice examples from the second progress meeting', function () {
        testCases = read_criteria_file('scripts/testcases_progress2.json');
        runTestCaseList(testCases);
    });
    describe('slice examples from the third progress meeting', function () {
        testCases = read_criteria_file('scripts/testcases_progress3.json');
        runTestCaseList(testCases);
    });
});