import { P, ParseResult, Parser } from '../lib/parser-combinators';

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
