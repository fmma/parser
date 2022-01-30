import { P } from '../lib/parser-combinators';

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
