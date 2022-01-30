A tiny functional parser combinator library for TypeScript.

# Install

`npm install @fmma-npm/parser`

# Examples

``` typescript
import { P } from '@fmma-npm/parser';

const numberParser = P.int;

const threeNumbers = P.object({
    first: numberParser,
    second: numberParser,
    third: numberParser
});

console.log(numberParser('123')); // { value: 123, read: 3 }
console.log(threeNumbers(' 10 20   30 ')); // Prints { value: { first: 10, second: 20, third: 30 }, read: 11 }
```

## JSON parser
``` typescript
import { Parser, P } from '@fmma-npm/parser';

export type JSON = number | boolean | null | string | JSON[] | { [key: string]: JSON };

const json: Parser<JSON> = P.choices(
    P.keyword('true', true),
    P.keyword('false', false),
    P.keyword('null', null),
    P.jsNumber,
    P.doubleQuotedString,
    P.tuple(P.doubleQuotedString.trailing(':'), src => json(src))
        .separate(',')
        .surround('{', '}')
        .transform(Object.fromEntries),
    ((src: string) => json(src))
        .separate(',')
        .surround('[', ']')
).trailing(P.whitespace);
```

## Calculator
``` typescript
import { P, ParseResult } from '../lib/parser-combinators';

export const expr = (src: string): ParseResult<number> => binop(src);

const constant = P.choices(P.keyword('pi', Math.PI), P.keyword('e', Math.E));

const unop = P.tuple(
    P.choices(
        P.keyword('sin', Math.sin), 
        P.keyword('cos', Math.cos), 
        P.keyword('log', Math.log), 
        P.keyword('sqrt', Math.sqrt)
    ),
    expr.surround('(', ')')
).transform(([f, x]) => f(x));

const atom = P.choices(P.jsNumber, constant, unop, expr.surround('(', ')'));

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

console.log(expr('2 + (3 * 2 - 10) / 2'));

console.log(expr('sqrt(16) * cos(pi) + 4'));

console.log(expr('e ^ pi ^ 0.5 - e ^ sqrt(pi)'));
```

## Lambda calculus parser
``` typescript
import { P, ParseResult, Parser } from '@fmma-npm/parser';

type Expr = string | ['app', Expr, Expr] | ['lam', string, Expr];

export const expr = (src: string): ParseResult<Expr> => expr0(src);

const variable = P.regExp(/\s*[a-z]/).transform(x => x[0].trimStart());

const atom = P.choices(variable, expr.surround('(', ')'));

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

console.log(JSON.stringify(expr('f => (x => x x) (x => f (x x))'), null, 2))
console.log(JSON.stringify(expr('(x => y => y (z => x x y z)) (x => y => y (z => x x y z))'), null, 2))

```