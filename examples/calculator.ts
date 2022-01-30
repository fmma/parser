import { P, ParseResult } from '../lib/parser-combinators';

export const expr = (src: string): ParseResult<number> => sum(src);

const constant = P.choices(P.keyword('pi', Math.PI), P.keyword('e', Math.E));

const unaryFunction = P.tuple(
    P.choices(
        P.keyword('sin', Math.sin), 
        P.keyword('cos', Math.cos), 
        P.keyword('log', Math.log), 
        P.keyword('sqrt', Math.sqrt)
        ),
    expr.surround('(', ')')
).transform(([f, x]) => f(x));

const atom = P.choices(P.jsNumber, constant, unaryFunction, expr.surround('(', ')'));

const exponentiation = atom
    .separate('^', true)
    .transform(x => x.reduceRight((a, b) => Math.pow(b, a)));

const product = exponentiation
    .separate(P.choicesString('*', '/'), true)
    .transform(reducer);

const sum = product
    .separate(P.choicesString('+', '-'), true)
    .transform(reducer);


function reducer(exprs: { e: number[]; s: ("+" | "-" | "*" | "/")[]; }): number {
    function f(a: number, b: number, i: number) {
        switch (exprs.s[i - 1]) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
        }
    }
    return exprs.e.reduce(f);
}

console.log(expr('2 + (3 * 2 - 10) / 2'));

console.log(expr('sqrt(16) * cos(pi)'));

console.log(expr('e ^ pi ^ 0.5 - e ^ sqrt(pi)'));
