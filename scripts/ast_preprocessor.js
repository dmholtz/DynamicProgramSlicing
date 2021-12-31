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
        const breakContinueTriggers = getBreakContinueTriggers(ast, controlFlowDependencies);

        const astInfo = {
            switchCaseMapping: switchCaseMapping,
            controlFlowDependencies: controlFlowDependencies,
            breakContinueTriggers: breakContinueTriggers
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

        const firstLineOfNode = function (node) {
            return node.loc.start.line;;
        }

        const lastLineOfNode = function (node) {
            return node.loc.end.line;;
        }

        /**
         * List of control flow dependencies. Each dependency is denoted with a list [a,b],
         * where b is control flow dependent upon a.
         */
        let controlFlowDependencies = new Set();

        /**
         * 
         */
        let dependentNodeStack = [];

        let expectedBreakStatements = 0;

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                const lineNumber = firstLineOfNode(node);

                if (dependentNodeStack.at(-1)) {
                    let topElement = Array.isArray(dependentNodeStack.at(-1)) ? dependentNodeStack.at(-1) : [dependentNodeStack.at(-1)];
                    if (!topElement.includes(lineNumber) && node.type !== 'SwitchCase') {
                        for (let dependentLineNumber of topElement) {
                            const controlFlowDependency = {}; controlFlowDependency[dependentLineNumber] = lineNumber;
                            controlFlowDependencies.add(JSON.stringify(controlFlowDependency));
                        }
                    }
                }

                if (node.type === 'IfStatement'
                    || node.type === 'ForStatement'
                    || node.type === 'WhileStatement'
                    || node.type === 'SwitchStatement') {
                    dependentNodeStack.push(lineNumber);
                } else if (node.type === 'DoWhileStatement') {
                    dependentNodeStack.push(lastLineOfNode(node))
                } else if (node.type === 'SwitchCase') {
                    if (!Array.isArray(dependentNodeStack.at(-1))) {
                        dependentNodeStack.push([lineNumber]);
                    }
                    else {
                        dependentNodeStack.at(-1).push(lineNumber);
                    }
                    let topElement = Array.isArray(dependentNodeStack.at(-2)) ? dependentNodeStack.at(-2) : [dependentNodeStack.at(-2)];
                    if (!topElement.includes(lineNumber)) {
                        for (let dependentLineNumber of topElement) {
                            const controlFlowDependency = {}; controlFlowDependency[dependentLineNumber] = lineNumber;
                            controlFlowDependencies.add(JSON.stringify(controlFlowDependency));
                        }
                    }
                } else if (node.type === 'BreakStatement' && Array.isArray(dependentNodeStack.at(-1))) {
                    dependentNodeStack.pop();
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
                    if (Array.isArray(dependentNodeStack.at(-1))) {
                        dependentNodeStack.pop();
                    }
                    dependentNodeStack.pop(); // SwitchStatement
                } else if (node.type === 'SwitchCase') {
                    // explicit: do nothing
                }
            }
        }

        // using estraverse.replace, the AST is traversed and nodes are removed as specified in the visitor object.
        estraverse.traverse(ast, visitor);

        const copy = [...controlFlowDependencies];
        controlFlowDependencies = {};

        for (let jsonDependency of copy) {
            const dependency = JSON.parse(jsonDependency);
            for (let dependent in dependency) {
                if (!controlFlowDependencies[dependent]) {
                    controlFlowDependencies[dependent] = [dependency[dependent]]
                }
                else {
                    controlFlowDependencies[dependent].push(dependency[dependent])
                }
            }
        }
        return controlFlowDependencies;
    }

    function getBreakContinueTriggers(ast, controlFlowDependencies) {

        const estraverse = require('estraverse');

        const firstLineOfNode = function (node) {
            return node.loc.start.line;;
        }

        const breakContinueTriggers = {};

        const addTrigger = function (lineNumber) {
            for (trigger in controlFlowDependencies) {
                const dependentLines = controlFlowDependencies[trigger];
                if (dependentLines.includes(lineNumber)) {
                    if (!breakContinueTriggers[trigger]) {
                        breakContinueTriggers[trigger] = [lineNumber];
                    }
                    else {
                        breakContinueTriggers[trigger].push(lineNumber);
                    }
                }
            }
        }

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                const lineNumber = firstLineOfNode(node);
                if (node.type === 'BreakStatement' || node.type === 'ContinueStatement') {
                    addTrigger(lineNumber);
                }

            },
            leave: (node, _) => {
            }
        }

        // using estraverse.replace, the AST is traversed and nodes are removed as specified in the visitor object.
        estraverse.traverse(ast, visitor);

        return breakContinueTriggers;
    }

    exports.process = process;
    return exports;

}(exports));


