(function () {
    let missingDeclarations = new Set();
    let history = [];

    let gen = {};
    let kill = {};

    const keepLines = new Set();
    const branchingPoints = new Set();

    /**
     * Load init parameters
     * Object value parameters are loaded from the astInfo file.
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

    const lineNumberRangeFromIid = function (iid) {
        locationArray = J$.iids[iid];
        return { startLine: locationArray[0], endLine: locationArray[2] };
    }

    /**
     * Return the line number for a iid and undefined if the iid does not exist.
     * @param {*} iid 
     * @returns 
     */
    const singleLineNumberFromIid = function (iid) {
        locationArray = J$.iids[iid];
        if (locationArray) {
            return locationArray[0];
        } else {
            return undefined;
        }
    }

    const frameIdFromName = function (name) {
        const sobj = J$.smemory.getShadowFrame(name);
        const frameId = J$.smemory.getIDFromShadowObjectOrFrame(sobj);
        return frameId;
    }

    const shadowIdFromValue = function (value) {
        const sobj = J$.smemory.getShadowObjectOfObject(value);
        const shadowId = J$.smemory.getIDFromShadowObjectOrFrame(sobj);
        return shadowId;
    }

    const composeVarId = function (frameId, name) {
        return frameId + "." + name;
    }

    const makeJsonTuple = function (key, value) {
        const tuple = {};
        tuple[key] = value;
        return JSON.stringify(tuple);
    }

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

    const addToHistory = function (lineNumber) {
        if (history.at(-1) != lineNumber) {
            history.push(lineNumber);
        }
    }

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

    const simpleAnalysis = function () {
        let line = undefined;
        let stack = [...history];
        while (stack.length > 0 && line !== slicingCriterion) {
            line = stack.pop();
        }
        keepLines.add(slicingCriterion);
        RqEntry = {}; RqEntry[slicingCriterion] = gen[slicingCriterion];
        RqExit = {}; RqExit[slicingCriterion] = new Set();
        while (stack.length > 0) {
            const s = stack.pop(); // s: current statement
            RqExit[s] = RqEntry[line];

            // create empty gen(s) and kill(s) sets in case they do not exist
            kill[s] = !kill[s] ? new Set() : kill[s];
            gen[s] = !gen[s] ? new Set() : gen[s];

            // check, if an element of kill(s) exists in RqExit(s)
            let exists = false;

            for (const tuple of kill[s]) {
                if (RqExit[s].has(tuple)) {
                    /**
                     * Line numbers of declarations cannot be tracked with the declare callback.
                     * In case of a (DEC, 123.xyz) tuple, the variable name xyz is extracted and
                     * saved to a list of missing declarations.
                     */
                    handleMissingDeclaration(tuple);
                    exists = true;
                }
            }

            let isRelevantBranchingPoint = false;
            const controlFlowDependentNodes = controlFlowDependencies[s];
            if (controlFlowDependentNodes) {
                for (let node of controlFlowDependentNodes) {
                    if (keepLines.has(node)) {
                        isRelevantBranchingPoint = true;
                        break;
                    }
                }
            }

            if (exists || isRelevantBranchingPoint) {
                // statement (line) is included in the slice
                const difference = new Set([...RqExit[s]].filter(e => !kill[s].has(e)));
                RqEntry[s] = new Set([...difference, ...gen[s]]);
                keepLines.add(s);
            }
            else {
                // statement (line) is not included in the slice
                RqEntry[s] = RqExit[s];
            }
            line = s;
        }
        //console.log(RqExit);
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

        _return: function (iid, val) {
            const lineNumber = singleLineNumberFromIid(iid);
            addToHistory(lineNumber);
            slicingCriterionCallback(lineNumber);
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
                }
            } else {
                // any other branching construct (e.g. if, while, for, ?:, ...)
                branchingPoints.add(lineNumber);
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

