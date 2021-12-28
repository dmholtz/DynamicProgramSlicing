#!/bin/bash

analysis="../scripts/shadow_memory_analysis.js"
script="../testcases/milestone2/test4.js"

echo "script: $script"
echo "analysis: $analysis"

node ../../jalangi2/src/js/commands/jalangi.js --analysis ../../jalangi2/src/js/runtime/SMemory.js --inlineSource --inlineIID --analysis $analysis $script
