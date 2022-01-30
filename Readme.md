A tiny functional parser combinator library for TypeScript and JavaScript.

# Install

`npm install @fmma-npm/parser`

# Examples

## Very simple parser - three 2-digit numbers
``` typescript
import { P } from '@fmma-npm/parser';

// A simple 2-digit number parser.
// Use P.regExp to create a simple regular expression based parser.
const twoDigits = P.regExp(/\d\d/)
    // Use .transform to convert the regExp result to a number.
    .transform(x => Number(x[0]))
    // Use .token to parse and ignore leading whitespace.
    .token();

// Use P.object or P.tuple to chain multiple parsers sequentially 
// from first to last. The order of members matter!
const threeNumbersParser = P.object({
    first: twoDigits,
    second: twoDigits,
    third: twoDigits.optional()
}).endOfSource(); // End of sources parses and ignores all remaining whitespace.


// Running a parser returns null if the parse failed, or an object with two 
// properties 'v' and 'r' on succes. 'v' holds the value and 'r' holds the 
// number of characters read.

// Prints{ v: 12, r: 2 }
console.log(twoDigits('12')); 

// Prints null
console.log(twoDigits('1'));

// Prints { v: 12, r: 2 }
console.log(twoDigits('123'));

// Prints null
console.log(twoDigits.endOfSource()('123'));

// Prints { v: { first: 10, second: 20, third: 30 }, r: 11 }
console.log(threeNumbersParser(' 10 20   30 ')); 

// Prints { v: { first: 10, second: 20, third: undefined }, r: 5 }
console.log(threeNumbersParser('10 20')); 


```

## JSON parser
``` typescript
import { Parser, P } from '@fmma-npm/parser';

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
```

## Calculator
``` typescript
import { P, ParseResult } from '@fmma-npm/parser';

const expr = (src: string): ParseResult<number> => binop(src);

const constant = P.choices(
    P.keyword('pi', Math.PI),
    P.keyword('e', Math.E)
);

const unop = P.tuple(
    P.choices(
        P.keyword('sin', Math.sin), 
        P.keyword('cos', Math.cos), 
        P.keyword('log', Math.log), 
        P.keyword('sqrt', Math.sqrt)
    ),
    expr.surround('(', ')')
).transform(([f, x]) => f(x));

const atom = P.choices(
    P.jsNumber,
    constant,
    unop,
    expr.surround('(', ')')
);

const binop = atom
    .reduceRight(P.keyword('^', Math.pow))
    .reduce(P.choices(
        P.keyword('*', (a: number, b: number) => a * b), 
        P.keyword('/', (a: number, b: number) => a / b)
    ))
    .reduce(P.choices(
        P.keyword('+', (a: number, b: number) => a + b), 
        P.keyword('-', (a: number, b: number) => a - b)
    ));

    
export const exprParser = expr.endOfSource();

console.log(exprParser('2 + (3 * 2 - 10) / 2')); // 0
console.log(exprParser('sqrt(16) * cos(pi) + 4')); // 0
console.log(exprParser('e ^ pi ^ 0.5 - e ^ sqrt(pi)')); // 0

```

## Lambda calculus parser
``` typescript
import { P, ParseResult, Parser } from '@fmma-npm/parser';

type Expr = string | ['app', Expr, Expr] | ['lam', string, Expr];

export const expr = (src: string): ParseResult<Expr> => expr0(src);

const variable = P.regExp(/\s*[a-z]/).transform(x => x[0].trimStart());

const atom = P.choices(
    variable, 
    expr.surround('(', ')')
);

const app = atom
    .many(true)
    .transform(x => x.reduce((a, b) => ['app', a, b]));

const lambda: Parser<Expr> =
    P.tuple(
        variable.trailing('=>'),
        expr
    )
    .transform(([x, e]) => ['lam', x, e]);

const expr0 = P.choices(lambda, app);

const lambdaExpressionParser = expr.endOfSource();

console.log(JSON.stringify(lambdaExpressionParser('f => (x => x x) (x => f (x x))'), null, 2));
console.log(JSON.stringify(lambdaExpressionParser('(x => y => y (z => x x y z)) (x => y => y (z => x x y z))'), null, 2));

```

# Performance

The example JSON parser is 6-10 times slower than JSON.parse.

This has been measured on node v14.16.0 on a 2MB JSON file with deep nesting (see examples/sample.json in git repo).
