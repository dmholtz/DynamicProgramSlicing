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
     * @param {string} inputFile specifies the path to the input file, which is trimmed
     * @param {Array} keepLines array of line numbers, which are kept in the output file
     * @param {Array | undefined} list of declared variable names
     * 
     * @see Milestone 1
     */
    function trim(inputFile, keepLines, missingDeclarations) {
        console.log('Called trimmer.trim: keep lines '
            + keepLines + ' in JavaScript file ' + inputFile);

        let ast = parseFile(inputFile);
        let trimmedAst = manipulateAst(ast, keepLines, missingDeclarations);

        let outputCode = prettyPrint(trimmedAst);
        return outputCode;
    }

    function parseFile(filePath) {
        const acorn = require('acorn');   // AST parsing
        let acornOptions = { locations: true, ecmaVersion: 5 } // 'locations' provides line numbers, ecmaVersion according to project requirements

        const fs = require('fs');          // filesystem
        let source = fs.readFileSync(filePath).toString();

        let ast = acorn.parse(source, acornOptions);
        return ast
    }

    function manipulateAst(ast, keepLines, missingDeclarations) {

        const estraverse = require('estraverse');

        // a node is kept if there is a line number in keepLines, which lies between the node's start- and end line
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

        // keep declaration nodes that are part of missing declarations
        const mightBeMissingDeclaration = function (node) {
            if (node.type === 'VariableDeclaration') {
                // assume all declarations to be missingDeclarations until leave-callback is fired with an empty declarations list
                return true;
            } else if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && missingDeclarations.includes(node.id.name)) {
                return true;
            } else if (node.type === 'Identifier' && missingDeclarations.includes(node.name)) {
                return true;
            }
            return false;
        }

        // true iff the .declarations property of a VariableDeclaration node is an empty list
        const wasEmptyDecleration = function (node) {
            return node.type === 'VariableDeclaration' && node.declarations.length < 1
        }

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                if (!isNodeContained(node) && !mightBeMissingDeclaration(node)) {
                    return estraverse.VisitorOption.Remove;
                }
            },
            leave: (node, _) => {
                if (wasEmptyDecleration(node)) {
                    return estraverse.VisitorOption.Remove;
                }
            }
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


