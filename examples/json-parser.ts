import { P, Parser } from '../lib/parser-combinators';

export type JSON = number | boolean | null | string | JSON[] | { [key: string]: JSON };

const json_ = (src: string) => json(src);
const json: Parser<JSON> = P.choices(
    P.keyword('true', true),
    P.keyword('false', false),
    P.keyword('null', null),
    P.jsNumber,
    P.doubleQuotedString,
    P.tuple(P.doubleQuotedString.trailing(':'), json_)
        .separate(',')
        .surround('{', '}')
        .transform(Object.fromEntries),
    json_
        .separate(',')
        .surround('[', ']')
).trailing(P.whitespace);


console.log(json_('123.32'))
console.log(json_('[1,2,3]'))
console.log(json_('{"foo": 123, "bar": "hello"}'))
console.log(json_('[1, true, null, "hello", {"foo": [1,2,3], "bar": {}}]'))


// @ts-ignore
var fs = require('fs');
// @ts-ignore
var performance = require('perf_hooks');

const txt: string = fs.readFileSync('./examples/sample.json').toString();
console.time('json-parser') 
const result1 = json_(txt);
console.timeEnd('json-parser') 
console.time('JSON.parse') 
const result2 = JSON.parse(txt);
console.timeEnd('JSON.parse') 
console.log('json-parser and JSON.parse gives same result', JSON.stringify(result1?.v) === JSON.stringify(result2));
