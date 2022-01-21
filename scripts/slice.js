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

        const instrumentedCodeFile = inFile.replace(".js", "_jalangi_.js");
        const astInfoFile = inFile.replace('.js', '_astInfo_.json');
        const analyisOutFile = inFile.replace(".js", "_analysis_out_.json");

        // before running the dynamic analysis, delete all previous artifacts
        const fs = require('fs');

        const deleteFile = function (fileName) {
            try {
                fs.unlinkSync(fileName);
            } catch (err) { }
        }

        deleteFile(instrumentedCodeFile);
        deleteFile(astInfoFile);
        deleteFile(analyisOutFile);
        deleteFile(outFile);

        // Load script to be analyzed
        const inCode = fs.readFileSync(inFile, 'utf-8');

        // Instrument the code using Jalangi and save the output
        const { instrumentString } = require('jalangi2/src/js/utils/api.js');
        const instrumentOptions = {
            inlineSourceMap: true,
            inlineSource: true
        }
        const instrumentResult = instrumentString(inCode, instrumentOptions);
        fs.writeFileSync(instrumentedCodeFile, instrumentResult.code);

        // Run the AST preprocessing
        const astPreprocessor = require('./ast_preprocessor.js');
        const astInfo = astPreprocessor.process(inFile);
        fs.writeFileSync(astInfoFile, JSON.stringify(astInfo), { encoding: 'utf-8' });

        // Analyze the instrumented code using Jalangi
        const { analyze } = require('jalangi2/src/js/utils/api.js');
        const sMemoryPath = require.resolve('jalangi2/src/js/runtime/SMemory.js');
        const analysisFile = 'dataflow_analysis.js';
        const analyses = [
            sMemoryPath,
            analysisFile
        ];
        const initParams = {
            slicingCriterion: lineNb,
            analyisOutFile: analyisOutFile,
            astInfoFile: astInfoFile
        }

        const analysisPromise = analyze(instrumentedCodeFile, analyses, initParams);

        // Load the analysis result
        successfulResolve = function (_) {
            console.log(`Analysis ${analysisFile} has run successfully.`)
            //console.log(_) // debugging

            let analysisResult = fs.readFileSync(analyisOutFile, { encoding: 'utf-8' });
            analysisResult = JSON.parse(analysisResult);

            // Using the result, generate a slice and pretty-print the code
            const trimmer = require('./trimmer.js');
            const outputCode = trimmer.trim(inFile,
                analysisResult.locs,
                analysisResult.missingDeclarations);

            fs.writeFileSync(outFile, outputCode, { encoding: 'utf-8' });
        }

        analysisPromise.then(successfulResolve, value => console.log("failed", value));
    }

    const args = parser.parse_args();
    slice(args.inFile, args.outFile, args.lineNb);

})();