(function () {

    // output artifacts
    let missingDeclarations = new Set();    // set of variable declarations for AST postprocessing
    const keepLines = new Set();            // set of line numbers that are included in the slice

    // intermediate artifacts
    let history = [];   // tracks the sequence of executed lines in the input program
    let gen = {};       // contains all gen sets: gen[s] is the gen-set for statement s
    let kill = {};      // contains all kill sets: kill[s] is the kill-set for statement s
    const branchingPoints = new Set();  // a set of line numbers, were the control flow splits

    /**
     * Load init parameters
     * Object value parameters are loaded from the *_astInfo_.json file.
     */
    const slicingCriterion = Number(J$.initParams.slicingCriterion);
    const astInfoFile = J$.initParams.astInfoFile;

    const fs = require('fs');
    let astInfo = fs.readFileSync(astInfoFile, { encoding: 'utf-8' });
    astInfo = JSON.parse(astInfo);

    // maps line numbers of switch-statements to a list of its cases' line numbers
    const switchCaseMapping = astInfo.switchCaseMapping;
    // maps line numbers of branching points to a list of their control flow dependent successors
    const controlFlowDependencies = astInfo.controlFlowDependencies;
    // maps line numbers of branching points to a list of break or continue statements
    const breakContinueTriggers = astInfo.breakContinueTriggers;
    // maps line numbers of throw statements to a range of the catch clause {start: lineNr, end: lineNr}
    const throwCatchMapping = astInfo.throwCatchMapping;

    const invertSwitchCaseMapping = function (switchCaseMapping) {
        const inverse = {};
        for (const switchLine in switchCaseMapping) {
            for (const caseline of switchCaseMapping[switchLine]) {
                inverse[caseline] = Number(switchLine);
            }
        }
        return inverse;
    }

    // maps line numbers of case-statements to their parent switch-statements
    const caseSwitchMapping = invertSwitchCaseMapping(switchCaseMapping);

    /**
     * Return the line number for a iid and undefined if the iid does not exist.
     */
    const singleLineNumberFromIid = function (iid) {
        locationArray = J$.iids[iid];
        if (locationArray) {
            return locationArray[0];
        } else {
            return undefined;
        }
    }

    // Shadow Memory: Returns the frame's id given a name (e.g of a function or variable)
    const frameIdFromName = function (name) {
        const sobj = J$.smemory.getShadowFrame(name);
        const frameId = J$.smemory.getIDFromShadowObjectOrFrame(sobj);
        return frameId;
    }

    // Shadow Memory: Returns the shadow id of a value (e.g of an JS object)
    const shadowIdFromValue = function (value) {
        const sobj = J$.smemory.getShadowObjectOfObject(value);
        const shadowId = J$.smemory.getIDFromShadowObjectOrFrame(sobj);
        return shadowId;
    }

    const composeVarId = function (frameId, name) {
        return frameId + "." + name;
    }

    // Creates a key-value tuple as an object and returns the stringified version of it
    const makeJsonTuple = function (key, value) {
        const tuple = {};
        tuple[key] = value;
        return JSON.stringify(tuple);
    }

    /* Create primitive tuples for a name (or id) */

    const DEF = function (name) {
        return makeJsonTuple("def", name);
    }

    const DEC = function (name) {
        return makeJsonTuple("dec", name);
    }

    const ALLOC = function (name) {
        return makeJsonTuple("alloc", name);
    }

    const P_DEF = function (name) {
        return makeJsonTuple("p-def", name);
    }

    const INVOKE = function (name) {
        return makeJsonTuple("invoke", name);
    }

    const ENTER = function (name) {
        return makeJsonTuple("enter", name);
    }

    // Adds a line to history unless it is not already on top of the history stack
    const addToHistory = function (lineNumber) {
        if (history.slice(-1)[0] != lineNumber) {
            history.push(lineNumber);
        }
    }

    // Given a stringified DEC-tuple, extract the variable name from it and add it to missing declarations
    const handleMissingDeclaration = function (tuple) {
        const tupleObj = JSON.parse(tuple);
        if (tupleObj.dec) {
            const regex = /.*\./;
            const missingName = tupleObj.dec.replace(regex, "");
            missingDeclarations.add(missingName);
        }
    }

    /**
     * There is now callback in Jalangi2 for reaching a certain line. As a remedy
     * this function is called on every other callback to check whether the slicing
     * criterion is reached.
     * 
     * Reaching the slicing criterion requires entering the function and its activation
     * frame. Thus (enter, activationFrameId) is added to gen(s)
     */
    const slicingCriterionCallback = function (lineNumber) {
        if (lineNumber === slicingCriterion) {
            const frameId = frameIdFromName('this'); // activation frame id of the slicing criterion

            // update the gen-set
            if (!gen[lineNumber]) {
                // gen(s) does not exist yet
                gen[lineNumber] = new Set();
            } // now, gen(s) exists
            gen[lineNumber].add(ENTER(frameId));
        }
    }

    /**
     * If the value of the returned object is a non-primitive (i.e. an object), 
     * then all of its properties are implicitly used. Moreover, this holds
     * recursively: If the object is a composed object (e.g. a list or a nested
     * object), all list values or nested object properties are implicitly used.
     * 
     * In that cases, the the implicit P-DEF tuples (i.e. property definitions)
     * are added to the gen(s) set.
     * 
     * @param {*} lineNumber line number, where 'value' is accessed
     * @param {*} value value whose properties might implicitly be used
     * 
     * @requires typeof gen[lineNumber] === Set
     */
    const handleImplicitPropertyUsesRecursively = function (lineNumber, value) {
        if (typeof value === 'object' && value !== null) {
            // first, add ALLOC tuple for object
            const shadowId = shadowIdFromValue(value);
            gen[lineNumber].add(ALLOC(shadowId));

            // for-in loops over all enumerable properties -> works for both arrays and objects
            for (let property in value) {
                const fieldId = composeVarId(shadowId, property);
                gen[lineNumber].add(P_DEF(fieldId)).add(ALLOC(shadowId));

                const childValue = value[property];
                handleImplicitPropertyUsesRecursively(lineNumber, childValue);
            }
        }
    }

    // computes set1 SET_MINUS set2
    const setMinus = function (set1, set2) {
        return new Set([...set1].filter(e => !set2.has(e)));
    }

    // computes set1 UNION set2
    const setUnion = function (set1, set2) {
        return new Set([...set1, ...set2]);
    }

    /**
     * Computes the dataflow equations. As a result, both the keepLines set and the set
     * of missing declarations are computed.
     * 
     * This function should be called after having successfully executed the input program,
     * i.e. it should be called within the 'endExecution' callback
     */
    const simpleAnalysis = function () {
        let s = undefined;          // current line (statement) number
        let stack = [...history];   // deep copy of the history

        /* Trivial: Ignore all lines after the slicing criterion. Therefore, line numbers are
         * popped from the stack, until the slicing criterion is reached. In case the slicing
         * criterion is reached several times, we stop at the last occurence.
         */
        while (stack.length > 0 && s !== slicingCriterion) {
            s = stack.pop();
        }
        keepLines.add(slicingCriterion);

        /**
         * Initialize the required actions object. 
         * RqEntry[s] / RqExit[s] is a set of (primitive, name) tuples, 
         * e.g. {(DEC, x), (DEF, x)}
         */
        RqEntry = {};
        RqExit = {};

        // Compute the boundary conditions of RqEntry[slicingCriterion]
        RqEntry = {}; RqEntry[slicingCriterion] = gen[slicingCriterion];
        RqExit = {}; RqExit[slicingCriterion] = new Set();

        // Propagate the RqEntry backwards until the start of the program (i.e. history) is reached
        let previousLine = s;       // previous line from a backward execution perspective
        while (stack.length > 0) {
            s = stack.pop();        // current line (statement) number
            RqExit[s] = RqEntry[previousLine]; // backward analysis

            // create empty gen(s) and kill(s) sets in case they do not exist
            kill[s] = !kill[s] ? new Set() : kill[s];
            gen[s] = !gen[s] ? new Set() : gen[s];

            // true, iff an element of kill(s) exists in RqExit(s)
            let killsRequired = false;

            // loop over all tuples in the kill set to check if the kill any required statement
            for (const tuple of kill[s]) {
                if (RqExit[s].has(tuple)) {
                    /**
                     * Line numbers of declarations cannot be tracked with the declare callback.
                     * In case of a (DEC, 123.xyz) tuple, the variable name xyz is extracted and
                     * saved to a list of missing declarations.
                     */
                    handleMissingDeclaration(tuple);
                    killsRequired = true;
                }
            }

            // true iff s is branching point and any upon s control flow dependent line number is alread included in the slice
            let isRelevantBranchingPoint = false;
            const controlFlowDependentLines = controlFlowDependencies[s];
            if (controlFlowDependentLines) {
                // loop over all control flow dependent lines of the branching point s
                for (let node of controlFlowDependentLines) {
                    if (keepLines.has(node)) {
                        isRelevantBranchingPoint = true;
                        break;
                    }
                }
            }

            const isThrowStatement = throwCatchMapping[s] !== undefined;

            // if any criterion is met, the dataflow equations of s must be propagated and s is then included in the slice
            if (killsRequired || isRelevantBranchingPoint || isThrowStatement) {
                // statement (line) s is included in the slice
                const difference = setMinus(RqExit[s], kill[s]);
                RqEntry[s] = setUnion(difference, gen[s]);
                keepLines.add(s);
            }
            else {
                // statement (line) s is not included in the slice
                RqEntry[s] = RqExit[s];
            }
            previousLine = s;
        }
        console.log("RqEntry ", RqEntry);
        return [...keepLines].sort((a, b) => a - b);
    }

    J$.analysis = {

        declare: function (iid, name, val, isArgument, argumentIndex, isCatchParam) {
            const lineNumber = singleLineNumberFromIid(iid);
            const frameId = frameIdFromName(name);
            const varId = composeVarId(frameId, name);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            // update the kill-set
            if (!kill[lineNumber]) {
                // gen(s) does not exist yet
                kill[lineNumber] = new Set();
            } // now, gen(s) exists
            kill[lineNumber].add(DEC(varId));

            /**
             * This callback is thrown at the beginning of the scope, even if local variables are
             * declared later on. Thus, the the line number of the declaration cannot be obtained
             * using this callback and we save the name of the variable separately. By traversing
             * the AST, the declarations need to be included manually.
             */
        },

        write: function (iid, name, val, oldValue) {
            const lineNumber = singleLineNumberFromIid(iid);
            const frameId = frameIdFromName(name);
            const varId = composeVarId(frameId, name);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            // update the gen-set
            if (!gen[lineNumber]) {
                // gen(s) does not exist yet
                gen[lineNumber] = new Set();
            } // now, gen(s) exists
            gen[lineNumber].add(DEC(varId));

            // update the kill-set
            if (!kill[lineNumber]) {
                // gen(s) does not exist yet
                kill[lineNumber] = new Set();
            } // now, gen(s) exists
            kill[lineNumber].add(DEF(varId));
        },

        read: function (iid, name, val, isGlobal, isScriptLocal) {
            const lineNumber = singleLineNumberFromIid(iid);
            const frameId = frameIdFromName(name);
            const varId = composeVarId(frameId, name);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            // update the gen-set
            if (!gen[lineNumber]) {
                // gen(s) does not exist yet
                gen[lineNumber] = new Set();
            } // now, gen(s) exists
            gen[lineNumber].add(DEF(varId)).add(DEC(varId));
        },

        /**
         * This callback is called after the creation of a literal. A literal can be a function literal, 
         * an object literal, an array literal, a number, a string, a boolean, a regular expression, null, 
         * NaN, Infinity, or undefined.
         * 
         * Remark:
         *  - The post increment operator (i.e. ++) calls this callback with an undefined iid and a value
         *    of 1.
         *  - Such callbacks will be ignored.
         * 
         * @param {*} iid 
         * @param {*} val 
         * @param {*} hasGetterSetter 
         */
        literal: function (iid, val, hasGetterSetter) {
            const lineNumber = singleLineNumberFromIid(iid);
            if (lineNumber) {
                addToHistory(lineNumber);
                slicingCriterionCallback(lineNumber);

                if (typeof val === "object" && val !== null) {
                    const shadowId = shadowIdFromValue(val);

                    // update the kill-set
                    if (!kill[lineNumber]) {
                        // gen(s) does not exist yet
                        kill[lineNumber] = new Set();
                    } // now, gen(s) exists
                    kill[lineNumber].add(ALLOC(shadowId));

                    // kill all property-defs
                    for (property in val) {
                        const fieldId = composeVarId(shadowId, property)
                        kill[lineNumber].add(P_DEF(fieldId));
                    }
                }
                // constant literals will not affect gen(s) or kill(s)
            }
        },

        putField: function (iid, base, offset, val, isComputed, isOpAssign) {
            const lineNumber = singleLineNumberFromIid(iid);
            const shadowId = shadowIdFromValue(base);
            const fieldId = composeVarId(shadowId, offset);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            // update the kill-set
            if (!kill[lineNumber]) {
                // gen(s) does not exist yet
                kill[lineNumber] = new Set();
            } // now, gen(s) exists
            kill[lineNumber].add(P_DEF(fieldId));

            // update the gen-set
            if (!gen[lineNumber]) {
                // gen(s) does not exist yet
                gen[lineNumber] = new Set();
            } // now, gen(s) exists
            gen[lineNumber].add(ALLOC(shadowId));
        },

        getField: function (iid, base, offset, val, isComputed, isOpAssign, isMethodCall) {
            const lineNumber = singleLineNumberFromIid(iid);
            const shadowId = shadowIdFromValue(base);
            const fieldId = composeVarId(shadowId, offset);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            if (typeof base === 'object') {
                // update the gen-set
                if (!gen[lineNumber]) {
                    // gen(s) does not exist yet
                    gen[lineNumber] = new Set();
                } // now, gen(s) exists
                gen[lineNumber].add(P_DEF(fieldId)).add(ALLOC(shadowId));
            }
            // getField callbacks on strings will not affect gen(s) or kill(s) as strings are primitives
        },

        invokeFunPre: function (iid, f, base, args, isConstructor, isMethod, functionIid, functionSid) {
            const lineNumber = singleLineNumberFromIid(iid);
            const shadowId = shadowIdFromValue(f); // shadow object of the function object
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            // update the kill-set
            if (!kill[lineNumber]) {
                // gen(s) does not exist yet
                kill[lineNumber] = new Set();
            } // now, gen(s) exists
            kill[lineNumber].add(INVOKE(shadowId));
        },

        functionEnter: function (iid, f, dis, args) {
            const lineNumber = singleLineNumberFromIid(iid);
            const shadowId = shadowIdFromValue(f); // shadow object ID of the function object
            const frameId = frameIdFromName('this'); // activation frame id of this function's activation frame
            addToHistory(lineNumber);

            // update the gen-set
            if (!gen[lineNumber]) {
                // gen(s) does not exist yet
                gen[lineNumber] = new Set();
            } // now, gen(s) exists
            gen[lineNumber].add(INVOKE(shadowId));

            // update the kill-set
            if (!kill[lineNumber]) {
                // gen(s) does not exist yet
                kill[lineNumber] = new Set();
            } // now, gen(s) exists
            kill[lineNumber].add(ENTER(frameId));
        },

        /**
         * This callback is called before a value is returned from a function using the return keyword.
         * 
         * The line number is added to the history and the slicingCriterion callback is executed.
         * Moreover, implicit object property uses are detected and handeled.
         */
        _return: function (iid, val) {
            const lineNumber = singleLineNumberFromIid(iid);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            // Ensure, that a gen(s) exists
            if (!gen[lineNumber]) {
                // gen(s) does not exist yet
                gen[lineNumber] = new Set();
            } // now, gen(s) exists

            handleImplicitPropertyUsesRecursively(lineNumber, val);
        },

        /**
         * This callback is called before a value is returned from a function using the return keyword.
         * 
         * Handles implicit property use in case the throw statement is the slicing criterion
         */
        _throw: function (iid, val) {
            const lineNumber = singleLineNumberFromIid(iid);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            // Ensure, that a gen(s) exists
            if (!gen[lineNumber]) {
                // gen(s) does not exist yet
                gen[lineNumber] = new Set();
            } // now, gen(s) exists

            // If the throw statement is the slicing criterion, treat it the same way as a ReturnStatement
            if (lineNumber === slicingCriterion) {
                handleImplicitPropertyUsesRecursively(lineNumber, val);
            } // else: let the normal dataflow analysis handle implicit property uses otherwise

            // Ensure, that at least an empty catch is included in the slice once the ThrowStatement has been executed
            keepLines.add(throwCatchMapping[lineNumber].catchStart);
        },

        /**
         * This callback is called after a condition check before branching. Branching can happen 
         * in various statements including if-then-else, switch-case, while, for, ||, &&, ?:.
         * 
         * Switch-case:
         * - This callback is only thrown for the 'case' nodes. However, this prevents the analysis
         *   from tracking data-dependencies of the switch-statement's discriminant node
         * - As a remedy, the analysis relies on a AST preprocessing which maps SwitchCase-nodes to
         *   their parent nodes, i.e. SwitchStatement-nodes
         * 1) If a case node is reached and the test condition is false, no branchingPoint is set.
         * 2) If a case node is reached and the test condition is true, then both the line of the
         *    SwitchCase-node and the line of the SwitchStatement node are set as branching points.
         * - As a result, the SwitchStatement discriminant node will be considered if at least one of
         *   the cases is true. Otherwise, the entire SwitchStatement node will be excluded.
         * - All the mappings are based on line numbers of the discriminant node and the 'case' nodes.
         * @param {*} iid 
         * @param {*} val 
         */
        conditional: function (iid, val) {
            const lineNumber = singleLineNumberFromIid(iid);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);

            if (caseSwitchMapping && caseSwitchMapping[lineNumber] !== undefined) {
                const caseLine = lineNumber; // just an alias for readability
                if (val) {
                    // test-condition is true, consequent node will be executed
                    const switchLine = Number(caseSwitchMapping[caseLine]);
                    branchingPoints.add(switchLine);
                    branchingPoints.add(caseLine);
                    if (breakContinueTriggers[caseLine]) {
                        const breakContinueLines = breakContinueTriggers[lineNumber]
                        for (let bc of breakContinueLines) {
                            keepLines.add(bc);
                        }
                    }
                }
            } else {
                // any other branching construct (e.g. if, while, for, ?:, ...)
                branchingPoints.add(lineNumber);
                if (breakContinueTriggers[lineNumber]) {
                    const breakContinueLines = breakContinueTriggers[lineNumber];
                    for (let bc of breakContinueLines) {
                        keepLines.add(bc);
                    }
                }
            }
        },

        /**
         * This callback is called when an execution terminates in node.js.  In a browser
         * environment, the callback is called if ChainedAnalyses.js or ChainedAnalysesNoCheck.js
         * is used and Alt-Shift-T is pressed.
         *
         * @returns {undefined} - Any return value is ignored
         */
        endExecution: function () {
            console.log("INIT-PARAMS ", J$.initParams)
            console.log("GEN ", gen);
            console.log("KILL ", kill);
            console.log("HISTORY ", history);
            const locs = simpleAnalysis();
            console.log(`The slice contains the following LOCs: ${locs}`);
            console.log("MISSING DECLARATIONS: ", missingDeclarations);

            // save the results to a file if a filepath is specified in the initParams
            if (J$.initParams.analyisOutFile) {
                const fs = require('fs');
                const analyisOutput = {
                    locs: locs,
                    missingDeclarations: [...missingDeclarations]
                }
                fs.writeFileSync(J$.initParams.analyisOutFile, JSON.stringify(analyisOutput))
            }
        }
    };

}());

