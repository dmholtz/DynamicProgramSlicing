#!/bin/bash

analysis="../scripts/dataflow_analysis.js"
script="../testcases/milestone2/a2_in.js"
slicingCriterion="slicingCriterion:8"

echo "script: $script"
echo "analysis: $analysis"

node ../../jalangi2/src/js/commands/jalangi.js --analysis ../../jalangi2/src/js/runtime/SMemory.js --inlineSource --inlineIID --analysis $analysis --initParam slicingCriterion $script
