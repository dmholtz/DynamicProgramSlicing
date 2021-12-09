/**
 * Program Analysis 2021/2022 course project
 * 
 * (C) by dmholtz
 */

(function clone(exports) {

    /**
     * Trims a JavaScript file to a specified selection of lines of code.
     * 
     * Therefore, the AST is manipulated and then the output is pretty printed.
     * 
     * @param {String} inputFile specifies the path to the input file, which is trimmed
     * @param {Array} keepLines array of line numbers, which are kept in the output file
     * 
     * @see Milestone 1
     */
    function trim(inputFile, keepLines) {
        console.log('Called trimmer.trim: keep lines '
            + keepLines + ' in JavaScript file ' + inputFile);

        let ast = parseFile(inputFile);
        let trimmedAst = manipulateAst(ast, keepLines);

        let outputCode = prettyPrint(trimmedAst);
        console.log(outputCode)
    }

    function parseFile(filePath) {
        const acorn = require('acorn');   // AST parsing
        let acornOptions = { locations: true, ecmaVersion: 5 } // 'locations' provides line numbers, ecmaVersion according to project requirements

        const fs = require('fs');          // filesystem
        let source = fs.readFileSync(filePath).toString();

        let ast = acorn.parse(source, acornOptions);
        return ast
    }

    function manipulateAst(ast, keepLines) {

        const estraverse = require('estraverse');

        // a node is kept iff there is a line number in keepLines, which lies between the node's start- and end line
        let isNodeContained = function (node) {
            let isContained = false;
            let startLine = node.loc.start.line;
            let endLine = node.loc.end.line;

            for (let line of keepLines) {
                if (startLine <= line && line <= endLine) {
                    isContained = true;
                    break;
                }
            }
            return isContained;
        };

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                if (!isNodeContained(node)) {
                    return estraverse.VisitorOption.Remove;
                }
            },
            leave: (node, _) => { } // for completeness / documentation
        }

        // using estraverse.replace, the AST is traversed and nodes are removed as specified in the visitor object.
        let trimmedAst = estraverse.replace(ast, visitor);
        return trimmedAst;
    }

    function prettyPrint(ast) {
        // generate source code from the AST using escodegen
        let escodegen = require("escodegen");
        return escodegen.generate(ast);
    }

    exports.trim = trim;
    return exports;

}(exports));


