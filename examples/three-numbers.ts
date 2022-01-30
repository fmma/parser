import { P } from '../lib/parser-combinators';

const numberParser = P.int;

const threeNumbers = P.object({
    first: numberParser,
    second: numberParser,
    third: numberParser
});

console.log(numberParser('123')); // { value: 123, read: 3 }
console.log(threeNumbers(' 10 20   30 ')); // Prints { value: { first: 10, second: 20, third: 30 }, read: 11 }
