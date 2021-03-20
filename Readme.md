A tiny functional parser combinator library for TypeScript.

# Install

`npm install @fmma-npm/parser`

# Example

``` typescript
import { Parser } from '@fmma-npm/parser';

const numberParser = Parser.sat(/^\d+/).map(x => Number(x));
const whitespaceParser = Parser.sat(/^\s+/);

const threeNumbers = Parser.do(
    whitespaceParser.optional(),
    numberParser,
    whitespaceParser,
    numberParser,
    whitespaceParser,
    numberParser,
    whitespaceParser.optional()
).map(([_1, first, _2, second, _3, third, _4]) => ({ first, second, third }));

console.log(numberParser.run('123')); // Prints [123, 3]
console.log(threeNumbers.run(' 10 20   30 ')); // Prints [{ first: 10, second: 20, third: 30}, 12]
```