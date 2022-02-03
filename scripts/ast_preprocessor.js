/**
 * Program Analysis 2021/2022 course project
 * 
 * (C) by dmholtz
 */

(function clone(exports) {

    /**
     * Returns the first line number of an AST node.
     * Top-level function for AST processing.
     */
    const firstLineOfNode = function (node) {
        return node.loc.start.line;;
    }

    /**
     * Returns the last line number of an AST node.
     * Top-level function for AST processing.
     */
    const lastLineOfNode = function (node) {
        return node.loc.end.line;;
    }

    /**
     * Reads a source file and processes the AST of the contained JS program.
     * This is the entry point of this node module.
     * @param {} inputFile path of the source to be analyzed
     * @returns astInfo object
     */
    function process(inputFile) {
        console.log('Called process for JavaScript file ' + inputFile);

        const ast = parseFile(inputFile);

        // object, that maps lines of SwitchStatments to their associated SwitchCase nodes
        const switchCaseMapping = gatherSwitchStatements(ast);
        // object, that maps lines of branching points to a list of their control flow dependet lines
        const controlFlowDependencies = getControlFlowDependencies(ast);
        // object, that maps lines of branching points to a list of their control flow dependent break / continue statements
        const breakContinueTriggers = getBreakContinueTriggers(ast, controlFlowDependencies);
        // object, that maps lines of throw statements to the associated catch-block, denoted by an object { catchStart: #lineNr, catchEnd: #lineNr }
        const throwCatchMapping = getThrowCatchMapping(ast);

        // assemble the results into a single object
        const astInfo = {
            switchCaseMapping: switchCaseMapping,
            controlFlowDependencies: controlFlowDependencies,
            breakContinueTriggers: breakContinueTriggers,
            throwCatchMapping: throwCatchMapping,
        };
        return astInfo;
    }

    function parseFile(filePath) {
        const acorn = require('acorn');   // AST parsing
        const acornOptions = { locations: true, ecmaVersion: 5 } // 'locations' provides line numbers, ecmaVersion according to project requirements

        const fs = require('fs');
        const source = fs.readFileSync(filePath).toString();

        const ast = acorn.parse(source, acornOptions);
        return ast
    }

    /**
     * Traverses the AST and generates a mapping from SwitchStatement to a
     * list of its SwitchCaseStatements
     * 
     * Both SwitchStatement and SwitchCaseStatement are indexed by their line
     * numbers.
     * 
     * @param {object} ast 
     * @returns 
     */
    function gatherSwitchStatements(ast) {

        const estraverse = require('estraverse');

        // maps line numbers of switch-statements to a list of its cases' line numbers
        const switchCaseMapping = {};
        let parentSwitchStatementNodes = [];

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                if (node.type === 'SwitchStatement') {
                    parentSwitchStatementNodes.push(firstLineOfNode(node))
                } else if (node.type === 'SwitchCase') {
                    const switchLine = parentSwitchStatementNodes.slice(-1)[0];
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

        // using estraverse.traverse the AST is traversed and the information is accumulated
        estraverse.traverse(ast, visitor);
        return switchCaseMapping;
    }

    /**
     * Computes control flow dependencies of a JS program.
     * Therefore, branching points are mapped to a list of their control dependent child nodes
     * 
     * Remark:
     * - detects the switch-case fallthrough by modelling that one line of code might be 
     *   controlflow dependent upon multiple branching points
     */
    function getControlFlowDependencies(ast) {

        const estraverse = require('estraverse');

        /**
         * List of control flow dependencies. Each dependency is denoted with a list [a,b],
         * where b is control flow dependent upon a.
         */
        let controlFlowDependencies = new Set();

        // history of nested branching points
        let dependentNodeStack = [];

        // detect when the switch-case fallthrough is stopped by a break
        let expectedBreakStatements = 0;

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                const lineNumber = firstLineOfNode(node);

                if (dependentNodeStack.slice(-1)[0]) {
                    let topElement = Array.isArray(dependentNodeStack.slice(-1)[0]) ? dependentNodeStack.slice(-1)[0] : [dependentNodeStack.slice(-1)[0]];
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
                    if (!Array.isArray(dependentNodeStack.slice(-1)[0])) {
                        dependentNodeStack.push([lineNumber]);
                    }
                    else {
                        dependentNodeStack.slice(-1)[0].push(lineNumber);
                    }
                    let topElement = Array.isArray(dependentNodeStack.slice(-2)[0]) ? dependentNodeStack.slice(-2)[0] : [dependentNodeStack.slice(-2)[0]];
                    if (!topElement.includes(lineNumber)) {
                        for (let dependentLineNumber of topElement) {
                            const controlFlowDependency = {}; controlFlowDependency[dependentLineNumber] = lineNumber;
                            controlFlowDependencies.add(JSON.stringify(controlFlowDependency));
                        }
                    }
                } else if (node.type === 'BreakStatement' && Array.isArray(dependentNodeStack.slice(-1)[0])) {
                    dependentNodeStack.pop();
                }

                if (expectedBreakStatements > 1 && node.type !== 'SwitchCase') {
                    for (let i = 2; i <= expectedBreakStatements; i++) {
                        if (!dependentNodeStack.includes(lineNumber)) {
                            const dependentLineNumber = dependentNodeStack.slice(-2)[0];
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
                    if (Array.isArray(dependentNodeStack.slice(-1)[0])) {
                        dependentNodeStack.pop();
                    }
                    dependentNodeStack.pop(); // SwitchStatement
                } else if (node.type === 'SwitchCase') {
                    // explicit: do nothing
                }
            }
        }

        // using estraverse.traverse the AST is traversed and the information is accumulated
        estraverse.traverse(ast, visitor);

        const copy = [...controlFlowDependencies];
        controlFlowDependencies = {};

        // inverse the mapping for later usage
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

    /**
     * Computes for every branching points a list of control flow dependent
     * Break or Continue Statments.
     * 
     * Remark:
     * - Computation relies on correctly computed controlFlowDependencies
     */
    function getBreakContinueTriggers(ast, controlFlowDependencies) {

        const estraverse = require('estraverse');

        const breakContinueTriggers = {};

        // Detects break / continue triggers using the control flow dependencies
        const addTrigger = function (breakContinueLine) {
            for (trigger in controlFlowDependencies) {
                const dependentLines = controlFlowDependencies[trigger];
                if (dependentLines.includes(breakContinueLine)) {
                    if (!breakContinueTriggers[trigger]) {
                        breakContinueTriggers[trigger] = [breakContinueLine];
                    }
                    else {
                        breakContinueTriggers[trigger].push(breakContinueLine);
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

        // using estraverse.traverse the AST is traversed and the information is accumulated
        estraverse.traverse(ast, visitor);

        return breakContinueTriggers;
    }

    /**
     * Links the throw statements to their associated catch-block
     */
    function getThrowCatchMapping(ast) {

        const estraverse = require('estraverse');

        const throwCatchMapping = {};
        const stack = []; // contains objects of the form { catchStart: Number, catchEnd: Number, throwLines: [] }

        // define traverse rules
        let visitor = {
            enter: (node, _) => {
                if (node.type === 'TryStatement') {
                    stack.push({ catchStart: undefined, catchEnd: undefined, throwLines: [] });
                } else if (node.type === 'CatchClause') {
                    const mapping = stack.slice(-1)[0];
                    mapping.catchStart = firstLineOfNode(node);
                    mapping.catchEnd = lastLineOfNode(node);
                } else if (node.type === 'ThrowStatement') {
                    const mapping = stack.slice(-1)[0];
                    mapping.throwLines.push(firstLineOfNode(node));
                }
            },
            leave: (node, _) => {
                if (node.type === 'TryStatement') {
                    // remove the mapping from the stack
                    const mapping = stack.pop();
                    // invert the mapping in case a catch block exists
                    if (mapping.catchStart !== undefined) {
                        for (let throwLine of mapping.throwLines) {
                            throwCatchMapping[throwLine] = {
                                catchStart: mapping.catchStart,
                                catchEnd: mapping.catchEnd
                            };
                        }
                    }
                }
            }
        }

        // using estraverse.traverse the AST is traversed and the information is accumulated
        estraverse.traverse(ast, visitor);

        return throwCatchMapping;
    }

    exports.process = process;
    return exports;

}(exports));


