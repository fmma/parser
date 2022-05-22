export type Parser<T> = (src: string) => ParseResult<T>;
export type ParseResult<T> = { v: T, r: number } | null;

export type MapParserType<T> = { [P in keyof T]: Parser<T[P]> };

declare global {
    interface Function {
        optional<T>(this: Parser<T>): Parser<T | undefined>
        transform<T, U>(this: Parser<T>, f: (x: T) => U): Parser<U>
        separate<T>(this: Parser<T>, pSep: string, nonEmpty?: boolean, allowTrailing?: boolean): Parser<T[]>
        separate<T, T2>(this: Parser<T>, pSep: Parser<T2>, nonEmpty?: boolean, allowTrailing?: boolean): Parser<{ e: T[], s: T2[] }>
        many<T>(this: Parser<T>, nonEmpty?: boolean): Parser<T[]>
        trailing<T, T1>(this: Parser<T>, p0: Parser<T1> | string): Parser<T>
        leading<T, T1>(this: Parser<T>, p0: Parser<T1>): Parser<T1>
        surround<T>(this: Parser<T>, p0: string, p1: string): Parser<T>
        surround<T, T1, T2>(this: Parser<T>, p0: Parser<T1>, p1: Parser<T2>): Parser<T>
        token<T>(this: Parser<T>): Parser<T>
        reduce<T>(this: Parser<T>, op: Parser<(a: T, b: T) => T>): Parser<T>
        reduceRight<T>(this: Parser<T>, op: Parser<(a: T, b: T) => T>): Parser<T>
        endOfSource<T>(this: Parser<T>): Parser<T>
    }
}

Function.prototype.transform = function <T, U>(this: Parser<T>, f: (x: T) => U) { return P.transform(this, f); }
Function.prototype.optional = function <T>(this: Parser<T>) { return P.optional(this); }
Function.prototype.separate = separate;
Function.prototype.many = function <T>(this: Parser<T>, nonEmpty?: boolean) { return P.many(this, nonEmpty); }
Function.prototype.trailing = trailing;
Function.prototype.leading = function <T, T1>(this: Parser<T>, p0: Parser<T1>) { return P.leading(this, p0); }
Function.prototype.surround = surround;
Function.prototype.token = function <T>(this: Parser<T>) { return P.token(this); }
Function.prototype.reduce = function <T>(this: Parser<T>, op: Parser<(a: T, b: T) => T>): Parser<T> {
    return this.separate(op, true).transform(x => {
        function f(a: T, b: T, i: number) {
            return x.s[i - 1](a, b);
        }
        return x.e.reduce(f);
    });
}
Function.prototype.reduceRight = function <T>(this: Parser<T>, op: Parser<(a: T, b: T) => T>): Parser<T> {
    return this.separate(op, true).transform(x => {
        function f(a: T, b: T, i: number) {
            return x.s[i](b, a);
        }
        return x.e.reduceRight(f);
    });
}
Function.prototype.endOfSource = function <T>(this: Parser<T>): Parser<T> {
    return this.trailing(src => {
        if (src.trim() === '')
            return { v: undefined, r: src.length };
        return null;
    })
}

function trailing<T, T1>(this: Parser<T>, p0: Parser<T1> | string): Parser<T> {
    if (typeof p0 === 'string')
        return P.trailing(this, P.tokenString(p0));
    return P.trailing(this, p0);
}

function separate<T, T2>(this: Parser<T>, pSep: string, nonEmpty?: boolean, allowTrailing?: boolean): Parser<T[]>
function separate<T, T2>(this: Parser<T>, pSep: Parser<T2>, nonEmpty?: boolean, allowTrailing?: boolean): Parser<{ e: T[], s: T2[] }>
function separate(this: Parser<any>, pSep: Parser<any> | string, nonEmpty?: boolean, allowTrailing?: boolean): Parser<any> {
    if (typeof pSep === 'string')
        return P.separate(this, P.tokenString(pSep), nonEmpty, allowTrailing).transform(x => x.e);
    return P.separate(this, pSep, nonEmpty, allowTrailing);
}

function surround<T>(this: Parser<T>, p0: string, p1: string): Parser<T>;
function surround<T, T1, T2>(this: Parser<T>, p0: Parser<T1>, p1: Parser<T2>): Parser<T>;
function surround(this: Parser<any>, p0: Parser<any> | string, p1: Parser<any> | string): Parser<any> {
    p0 = typeof p0 === 'string' ? P.tokenString(p0) : p0;
    p1 = typeof p1 === 'string' ? P.tokenString(p1) : p1;
    return P.surround(p0, this, p1);
}

export class P {
    static regExp(re: RegExp): Parser<RegExpMatchArray | RegExpExecArray> {
        re =
            re.source.startsWith('^')
                ? re
                : new RegExp(`^${re.source}`, re.flags);
        return src => {
            const r = src.match(re);
            if (r?.index === 0) {
                return { v: r, r: r[0].length };
            }
            return null;
        }
    }

    static null<T>(): Parser<T> {
        return () => null;
    }

    static of<T>(value: T): Parser<T> {
        return () => ({ v: value, r: 0 });
    }

    static choices<T extends unknown[]>(...ps: MapParserType<T>): Parser<T[number]> {
        return src => {
            for (const p of ps) {
                const r = p(src);
                if (r != null)
                    return r;
            }
            return null;
        }
    }

    static choicesString<T extends string[]>(...ss: T): Parser<T[number]> {
        const ps = ss.map(P.tokenString);
        return P.choices(...ps);
    }

    static object<T extends Record<string | number | symbol, unknown>>(obj: MapParserType<T>): Parser<T> {
        return src => {
            const value: any = {};
            let read = 0;
            for (const [x, p] of Object.entries(obj)) {
                const r = p(src.substring(read));
                if (r == null)
                    return null;
                read += r.r;
                value[x] = r.v;
            }
            return { v: value, r: read };
        }
    }

    static tuple<T extends readonly unknown[]>(...obj: MapParserType<T>): Parser<T> {
        return src => {
            const n = obj.length;
            const v: any[] = new Array(n);
            let read = 0;
            for (let i = 0; i < n; ++i) {
                const p = obj[i];
                const r = p(src.substring(read));
                if (r == null)
                    return null;
                read += r.r;
                v[i] = r.v;
            }
            return { v: v as any, r: read };
        }
    }

    static transform<T, U>(p0: Parser<T>, f: (x: T) => U): Parser<U> {
        return src => {
            const r = p0(src);
            return r == null ? null : {
                v: f(r.v),
                r: r.r
            };
        }
    }

    static separate<T, T2>(pElt: Parser<T>, pSep: Parser<T2>, nonEmpty?: boolean, allowTrailing?: boolean): Parser<{ e: T[], s: T2[] }> {
        return src => {
            const res = pElt(src);

            if (res == null) {
                return nonEmpty
                    ? null
                    : { v: { e: [], s: [] }, r: 0 };
            }

            let r = res.r;
            const e = [res.v];
            const s: T2[] = [];

            while (true) {
                const rSep = pSep(src.substring(r));

                if (rSep == null)
                    break;

                s.push(rSep.v);
                r += rSep.r;

                const res = pElt(src.substring(r));

                if (res == null) {
                    if (allowTrailing)
                        break;
                    else
                        return null;
                }

                e.push(res.v);
                r += res.r;
            }
            return { v: { e, s }, r };
        }
    }

    static string<T extends string = string>(string: T): Parser<T> {
        return src => {
            if (src.startsWith(string)) {
                return {
                    v: string,
                    r: string.length
                };
            }
            return null;
        }
    }

    static many<T>(p0: Parser<T>, nonEmpty?: boolean): Parser<T[]> {
        return src => {
            const res = p0(src);

            if (res == null) {
                return nonEmpty
                    ? null
                    : { v: [], r: 0 };
            }

            let r = res.r;
            const v = [res.v];

            while (true) {
                const res = p0(src.substring(r));

                if (res == null) {
                    break;
                }

                v.push(res.v);
                r += res.r;
            }
            return { v: v, r };
        }
    }

    static optional<T>(p: Parser<T>): Parser<T | undefined> {
        return src => {
            const r = p(src);
            if (r == null)
                return { v: undefined, r: 0 };
            return r;
        }
    }

    static trailing<T, T1>(p: Parser<T>, p0: Parser<T1>): Parser<T> {
        return src => {
            const r = p(src);
            if (r == null) return null;
            const r0 = p0(src.substring(r.r));
            if (r0 == null) return null;
            return { v: r.v, r: r.r + r0.r };
        }
    }

    static leading<T, T1>(p: Parser<T>, p0: Parser<T1>): Parser<T1> {
        return src => {
            const r = p(src);
            if (r == null) return null;
            const r0 = p0(src.substring(r.r));
            if (r0 == null) return null;
            return { v: r0.v, r: r.r + r0.r };
        }
    }

    static surround<T, T1, T2>(p0: Parser<T1>, p: Parser<T>, p1: Parser<T2>): Parser<T> {
        return src => {
            const r0 = p0(src); if (r0 == null) return null;
            const r = p(src.substring(r0.r)); if (r == null) return null;
            const r1 = p1(src.substring(r0.r + r.r)); if (r1 == null) return null;
            return { v: r.v, r: r0.r + r.r + r1.r };
        }
    }

    static token<T>(p: Parser<T>): Parser<T> {
        return P.whitespace.leading(p);
    }

    static tokenString<T extends string = string>(s: T): Parser<T> {
        return src => {
            const i = src.search(/\S|$/);
            if (src.substring(i).startsWith(s)) {
                return {
                    v: s,
                    r: s.length + i
                };
            }
            return null;
        }
    }

    static keyword<T, S extends string = string>(kw: S): Parser<S>;
    static keyword<T, S extends string = string>(kw: S, v: T): Parser<T>;
    static keyword<T, S extends string = string>(kw: S, v?: T): Parser<T | S> {
        return src => {
            const i = src.search(/\S|$/);
            if (src.substring(i).startsWith(kw)) {
                return {
                    v: v ?? kw,
                    r: kw.length + i
                };
            }
            return null;
        }
    }

    static whitespace = P.transform(P.regExp(/\s*/), x => x[0]);
    static int = P.transform(P.regExp(/^\s*[1-9]\d*/), x => Number(x[0]));
    static jsNumber = P.transform(P.regExp(/^\s*-?(?=[1-9]|0(?!\d))\d+(\.\d+)?([eE][+-]?\d+)?/), x => +x[0]);
    static doubleQuotedString = P.transform(P.regExp(/^\s*"([^"\\]*|\\["\\bfnrt/]|\\u[0-9a-f]{4})*"/), x => {
        const i = x[0].indexOf('"')
        return x[0].slice(i + 1, -1);
    });
    static singleQuotedString = P.regExp(/^\s*'([^'\\]*|\\['\\bfnrt/]|\\u[0-9a-f]{4})*'/).transform(x => {
        const i = x[0].indexOf('\'')
        return x[0].slice(i + 1, -1);
    });
}
