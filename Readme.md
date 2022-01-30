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

## Tiny JSON parser
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