import { P, Parser } from '../lib/parser-combinators';

export type JSON
    = number
    | boolean
    | null
    | string
    | JSON[]
    | { [key: string]: JSON };

// Use an eta-expanded function to allow recursive parsers.
// Here, 'json' can be used in 'json0' below. Beware left-recursion!
const json: Parser<JSON> = src => json0(src);

const json0 = P.choices(
    P.keyword('true', true),
    P.keyword('false', false),
    P.keyword('null', null),
    P.jsNumber,
    P.doubleQuotedString,
    P.tuple(P.doubleQuotedString.trailing(':'), json)
        .separate(',')
        .surround('{', '}')
        .transform(Object.fromEntries),
    json
        .separate(',')
        .surround('[', ']')
);

export const jsonParser = json.endOfSource();

console.log(jsonParser('123.32'))
console.log(jsonParser('[1,2,3]'))
console.log(jsonParser('{"foo": 123, "bar": "hello"}'))
console.log(jsonParser('[1, true, null, "hello", {"foo": [1,2,3], "bar": {}}]'))

// @ts-ignore
var fs = require('fs');
// @ts-ignore
var performance = require('perf_hooks');

const txt: string = fs.readFileSync('./examples/sample.json').toString();
console.time('json-parser')
let result1 = jsonParser(txt);
console.timeEnd('json-parser')
console.time('JSON.parse')
let result2 = JSON.parse(txt);
console.timeEnd('JSON.parse')
console.log('json-parser and JSON.parse gives same result', JSON.stringify(result1?.v) === JSON.stringify(result2));


console.time('JSON.parse')
let result3 = JSON.parse(txt);
console.timeEnd('JSON.parse')
console.time('json-parser')
let result4 = jsonParser(txt);
console.timeEnd('json-parser')
console.log('json-parser and JSON.parse gives same result', JSON.stringify(result3) === JSON.stringify(result4?.v));
