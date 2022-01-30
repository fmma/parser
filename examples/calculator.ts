import { P, ParseResult } from '../lib/parser-combinators';

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
