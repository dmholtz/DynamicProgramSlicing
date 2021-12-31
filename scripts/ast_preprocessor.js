/**
 * Program Analysis 2021/2022 course project
 * 
 * (C) by dmholtz
 */

(function clone(exports) {

    function process(inputFile) {
        console.log('Called process for JavaScript file ' + inputFile);

        const ast = parseFile(inputFile);

        const switchCaseMapping = gatherSwitchStatements(ast);
        const controlFlowDependencies = getControlFlowDependencies(ast);

        const astInfo = {
            switchCaseMapping: switchCaseMapping,
            controlFlowDependencies: controlFlowDependencies
        };
        return astInfo;
    }

    function parseFile(filePath) {
        const acorn = require('acorn');   // AST parsing
        let acornOptions = { locations: true, ecmaVersion: 5 } // 'locations' provides line numbers, ecmaVersion according to project requirements

        const fs = require('fs');          // filesystem
        let source = fs.readFileSync(filePath).toString();

        let ast = acorn.parse(source, acornOptions);
        return ast
    }

    function gatherSwitchStatements(ast) {

        const estraverse = require('estraverse');

        // maps line numbers of switch-statements to a list of its cases' line numbers
        const switchCaseMapping = {};
        let parentSwitchStatementNodes = [];

        const firstLineOfNode = function (node) {
            return node.loc.start.line;;
        }

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                if (node.type === 'SwitchStatement') {
                    parentSwitchStatementNodes.push(firstLineOfNode(node))
                } else if (node.type === 'SwitchCase') {
                    const switchLine = parentSwitchStatementNodes.at(-1);
                    const caseLine = firstLineOfNode(node);
                    if (!switchCaseMapping[switchLine]) {
                        switchCaseMapping[switchLine] = [];
                    } // now, at least an empty least exists
                    switchCaseMapping[switchLine].push(caseLine);
                }
                // ignore any other types of nodes
            },
            leave: (node, _) => {
                if (node.type === 'SwitchStatement') {
                    parentSwitchStatementNodes.pop()
                }
            }
        }

        // using estraverse.replace, the AST is traversed and nodes are removed as specified in the visitor object.
        estraverse.traverse(ast, visitor);
        return switchCaseMapping;
    }

    function getControlFlowDependencies(ast) {

        const estraverse = require('estraverse');

        // list of control flow dependencies, where each dependency is denoted with a list 

        /**
         * List of control flow dependencies. Each dependency is denoted with a list [a,b],
         * where b is control flow dependent upon a.
         */
        let controlFlowDependencies = new Set();
        let dependentNodeStack = [];

        let expectedBreakStatements = 0;

        const firstLineOfNode = function (node) {
            return node.loc.start.line;;
        }

        const lastLineOfNode = function (node) {
            return node.loc.end.line;;
        }

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                const lineNumber = firstLineOfNode(node);
                if (dependentNodeStack.at(-1) && !dependentNodeStack.includes(lineNumber)) {
                    //if (dependentNodeStack.at(-1) && dependentNodeStack.at(-1) !== lineNumber) {
                    const dependentLineNumber = dependentNodeStack.at(-1);
                    const controlFlowDependency = {}; controlFlowDependency[dependentLineNumber] = lineNumber;
                    controlFlowDependencies.add(JSON.stringify(controlFlowDependency));
                }
                if (node.type === 'IfStatement'
                    || node.type === 'ForStatement'
                    || node.type === 'WhileStatement'
                    || node.type === 'SwitchStatement') {
                    dependentNodeStack.push(lineNumber);
                } else if (node.type === 'DoWhileStatement') {
                    dependentNodeStack.push(lastLineOfNode(node))
                } else if (node.type === 'SwitchCase') {
                    dependentNodeStack.push(lineNumber);
                    expectedBreakStatements++;
                } else if (node.type === 'BreakStatement') {
                    while (expectedBreakStatements > 0) {
                        dependentNodeStack.pop();
                        expectedBreakStatements--;
                    }
                }

                if (expectedBreakStatements > 1 && node.type !== 'SwitchCase') {
                    for (let i = 2; i <= expectedBreakStatements; i++) {
                        if (!dependentNodeStack.includes(lineNumber)) {
                            const dependentLineNumber = dependentNodeStack.at(-i);
                            const controlFlowDependency = {}; controlFlowDependency[dependentLineNumber] = lineNumber;
                            //controlFlowDependencies.add(JSON.stringify(controlFlowDependency));
                        }

                    }
                }
            },
            leave: (node, _) => {
                if (node.type === 'IfStatement'
                    || node.type === 'ForStatement'
                    || node.type === 'WhileStatement'
                    || node.type === 'DoWhileStatement') {
                    dependentNodeStack.pop();
                } else if (node.type === 'SwitchStatement') {
                    while (expectedBreakStatements > 0) {
                        dependentNodeStack.pop();
                        expectedBreakStatements--;
                    }
                    dependentNodeStack.pop(); // SwitchStatement
                } else if (node.type === 'SwitchCase') {
                    // explicit: do nothing
                }
            }
        }

        // using estraverse.replace, the AST is traversed and nodes are removed as specified in the visitor object.
        estraverse.traverse(ast, visitor);

        controlFlowDependencies = [...controlFlowDependencies];
        for (let i in controlFlowDependencies) {
            controlFlowDependencies[i] = JSON.parse(controlFlowDependencies[i]);
        }
        return controlFlowDependencies;
    }

    exports.process = process;
    return exports;

}(exports));


