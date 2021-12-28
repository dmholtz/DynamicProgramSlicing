#!/bin/bash

while getopts s:a: flag; do
    case "${flag}" in
    a) analysis=${OPTARG} ;;
    s) script=${OPTARG} ;;
    esac
done

if [ -z "$analysis" ]; then
    analysis="../scripts/variable_writes.js"
fi

if [ -z "$script" ]; then
    script="../testcases/milestone1/test1.js"
fi

echo "script: $script"
echo "analysis: $analysis"

#node ../../jalangi2/src/js/commands/jalangi.js --inlineIID --inlineSource --analysis $analysis $script
node ../../jalangi2/src/js/commands/jalangi.js --analysis ../../jalangi2/src/js/runtime/SMemory.js --inlineSource --analysis $analysis $script
#node ../../jalangi2/src/js/commands/jalangi.js --analysis ../../jalangi2/src/js/runtime/SMemory.js --analysis ../../jalangi2/src/js/sample_analyses/pldi16/TraceAll.js --inlineSource --analysis $analysis $script >tracefile.txt
