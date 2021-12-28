(function () {

    const { ArgumentParser } = require("argparse");
    const parser = new ArgumentParser({
        description: "Slices the given file using the specified criteria"
    });
    parser.add_argument(
        "--inFile", { help: "JavaScript file to be sliced", required: true });
    parser.add_argument(
        "--lineNb", { help: "Line number to be used as slicing criteria", required: true });
    parser.add_argument(
        "--outFile", { help: "Sliced and formated output file", required: true });

    function slice(inFile, outFile, lineNb) {

        console.log("running slice.js for arguments: " + inFile, outFile, lineNb);

        // Load script to be analyzed
        const fs = require('fs');
        const inCode = fs.readFileSync(inFile, 'utf-8');

        // Instrument the code using Jalangi and save the output
        const { instrumentString } = require('jalangi2/src/js/utils/api.js');
        const instrumentOptions = {
            inlineSourceMap: true,
            inlineSource: true
        }
        const instrumentResult = instrumentString(inCode, instrumentOptions);
        const instrumentedCodeFile = inFile.replace(".js", "_jalangi_.js");
        fs.writeFileSync(instrumentedCodeFile, instrumentResult.code);

        // Analyze the instrumented code using Jalangi
        const { analyze } = require('jalangi2/src/js/utils/api.js');
        const sMemoryPath = require.resolve('jalangi2/src/js/runtime/SMemory.js');
        const analysisFile = 'dataflow_analysis.js';
        const analyses = [
            sMemoryPath,
            analysisFile
        ];
        const analyisOutFile = inFile.replace(".js", "_analysis_out_.json");
        const initParams = {
            slicingCriterion: lineNb,
            analyisOutFile: analyisOutFile
        }
        const analysisPromise = analyze(instrumentedCodeFile, analyses, initParams);

        // Load the analysis result
        successfulResolve = function (result) {
            console.log(`Analysis ${analysisFile} has run successfully.`)

            let analysisResult = fs.readFileSync(analyisOutFile, { encoding: 'utf-8' });
            analysisResult = JSON.parse(analysisResult);
            console.log(analysisResult);

            console.log("success");//, result);
            //console.log("success ", result);
        }
        analysisPromise.then(successfulResolve, value => console.log("failed", value));


        // Using the result, generate a slice and pretty-print the code
    }

    const args = parser.parse_args();
    slice(args.inFile, args.outFile, args.lineNb);

})();