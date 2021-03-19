const _cache: Record<string, Parser<any>> = {};

type ParserParam<T> = T extends Parser<infer U> ? U : T;
type ParserTupleParams<T> = { [P in keyof T]: ParserParam<T[P]> };

export class Parser<A> {
    run: (cs: string) => [A, number] | undefined;
    constructor(run: (cs: string) => [A, number] | undefined) {
        this.run = cs => {
            return run(cs);
        };
    }

    static pure<A>(x: A): Parser<A> {
        return _cache[JSON.stringify(x)] ?? (_cache[JSON.stringify(x)] = new Parser(_ => [x, 0]));
    }

    static sat(regex: RegExp): Parser<string> {
        return _cache[String(regex)] ?? (_cache[String(regex)] = new Parser(cs => {
            const r = regex.exec(cs);
            if (r?.index == 0) {
                return [r[0], r[0].length];
            }
            return undefined;
        }));
    }

    seek(n: number) {
        return new Parser(cs => {
            const r = this.run(cs);
            if (r == null)
                return undefined;
            return [r[0], r[1] + n];
        })
    }

    static empty<A>(): Parser<A> {
        return _cache['empty'] ?? (_cache['empty'] = new Parser(_ => undefined));
    }

    static do<T extends Parser<any>[]>(...ps: T): Parser<ParserTupleParams<T>> {
        return new Parser(cs => {
            let ret = [[], 0] as [any[], number];
            for (let p of ps) {
                const r = p.run(cs.substring(ret[1]));
                if (r == null)
                    return undefined;
                ret[0].push(r[0]);
                ret[1] += r[1];
            }
            return ret as any;
        })
    }

    map<A, B>(this: Parser<A>, f: (x: A) => B): Parser<B> {
        return new Parser(cs => {
            const r = this.run(cs);
            if (r == null)
                return r;
            const [x, i] = r;
            return [f(x), i];
        });
    }

    bind<B>(f: (x: A) => Parser<B>): Parser<B> {
        return new Parser(cs => {
            const r0 = this.run(cs);
            if (r0 == null)
                return r0;
            const [x, i0] = r0;
            const r1 = f(x).run(cs.substring(i0));
            if (r1 == null)
                return r1;
            const [y, i1] = r1;
            return [y, i0 + i1];
        });
    }

    pre<B>(p: Parser<B>): Parser<B> {
        return this.bind(_ => p);
    }

    post<B>(p: Parser<B>): Parser<A> {
        return this.bind(x => p.map(_ => x));
    }

    choice(p2: Parser<A>): Parser<A> {
        return new Parser(cs => this.run(cs) ?? p2.run(cs));
    }

    optional(): Parser<A | undefined> {
        return this.disjointChoice(Parser.pure(undefined));
    }

    disjointChoice<B>(p2: Parser<B>): Parser<A | B> {
        return new Parser(cs => {
            const r = this.run(cs);
            if (r == null)
                return p2.run(cs);
            return r as [A | B, number];
        });
    }

    many(): Parser<A[]> {
        return new Parser(cs => {
            const ret = [[], 0] as [A[], number];
            while (true) {
                const r = this.run(cs.substring(ret[1]));
                if (r == null)
                    break;
                ret[0].push(r[0]);
                ret[1] += r[1];
            }
            return ret;
        });
    }

    many1(): Parser<A[]> {
        return this.bind(x => this.many().map(xs => [x, ...xs]));
    }

    sepby<B>(psep: Parser<B>): Parser<A[]> {
        return this.sepby1(psep).choice(Parser.pure([]));
    }

    sepby1_<B>(psep: Parser<B>): Parser<[A, [B, A][]]> {
        return this.bind(x =>
            psep.bind(sep => this.map(x => [sep, x] as [B, A]))
                .many()
                .map(xs => [x, xs]));
    }

    sepby1<B>(psep: Parser<B>): Parser<A[]> {
        return this.bind(x =>
            psep.bind(_ => this)
                .many()
                .map(xs => [x, ...xs]));
    }

    static choices<A>(...ps: Parser<A>[]): Parser<A> {
        return ps.reduce((p1, p2) => p1.choice(p2));
    }

    hook(callback: (success: boolean, result: A | undefined, parsedText: string, remainingText: string) => void): Parser<A> {
        return new Parser(cs => {
            const r = this.run(cs);
            const i = r?.[1] ?? 0;
            callback(r != null, r?.[0], cs.substring(0, i), cs.substring(i));
            return r;
        });
    }
}
