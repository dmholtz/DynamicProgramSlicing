# Acorn

Create a AST of a JavaScript program:
`node_modules/acorn/bin/acorn tutorial/simple.js`

# JavaScript Syntax

An overview over all syntax elements: `https://github.com/estree/estree/blob/master/es5.md#node-objects`

# Jalangi

## Options

- `--inlineSource`: source code is included and made available at `J$.iids.code`
- `--inlineIID`: a mapping from iid to an array `[beginLineNumber, beginColumnNumber, endLineNumber, endColumnNumber]` is provided via `J$.iids[myIID]`

## IIDs

- `iid`: static instruction id of the callback
- `J$.iids`: an object which provides a mapping from iid to line numbers and more attributes:
