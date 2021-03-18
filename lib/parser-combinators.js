"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
var _cache = {};
var Parser = /** @class */ (function () {
    function Parser(run) {
        this.run = function (cs) {
            return run(cs);
        };
    }
    Parser.pure = function (x) {
        var _a;
        return (_a = _cache[JSON.stringify(x)]) !== null && _a !== void 0 ? _a : (_cache[JSON.stringify(x)] = new Parser(function (_) { return [x, 0]; }));
    };
    Parser.sat = function (regex) {
        var _a;
        return (_a = _cache[String(regex)]) !== null && _a !== void 0 ? _a : (_cache[String(regex)] = new Parser(function (cs) {
            var r = regex.exec(cs);
            if ((r === null || r === void 0 ? void 0 : r.index) == 0) {
                return [r[0], r[0].length];
            }
            return undefined;
        }));
    };
    Parser.prototype.seek = function (n) {
        var _this = this;
        return new Parser(function (cs) {
            var r = _this.run(cs);
            if (r == null)
                return undefined;
            return [r[0], r[1] + n];
        });
    };
    Parser.empty = function () {
        var _a;
        return (_a = _cache['empty']) !== null && _a !== void 0 ? _a : (_cache['empty'] = new Parser(function (_) { return undefined; }));
    };
    Parser.do = function () {
        var ps = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ps[_i] = arguments[_i];
        }
        return new Parser(function (cs) {
            var ret = [[], 0];
            for (var _i = 0, ps_1 = ps; _i < ps_1.length; _i++) {
                var p = ps_1[_i];
                var r = p.run(cs.substring(ret[1]));
                if (r == null)
                    return undefined;
                ret[0].push(r[0]);
                ret[1] += r[1];
            }
            return ret;
        });
    };
    Parser.prototype.map = function (f) {
        var _this = this;
        return new Parser(function (cs) {
            var r = _this.run(cs);
            if (r == null)
                return r;
            var x = r[0], i = r[1];
            return [f(x), i];
        });
    };
    Parser.prototype.bind = function (f) {
        var _this = this;
        return new Parser(function (cs) {
            var r0 = _this.run(cs);
            if (r0 == null)
                return r0;
            var x = r0[0], i0 = r0[1];
            var r1 = f(x).run(cs.substring(i0));
            if (r1 == null)
                return r1;
            var y = r1[0], i1 = r1[1];
            return [y, i0 + i1];
        });
    };
    Parser.prototype.pre = function (p) {
        return this.bind(function (_) { return p; });
    };
    Parser.prototype.post = function (p) {
        return this.bind(function (x) { return p.map(function (_) { return x; }); });
    };
    Parser.prototype.choice = function (p2) {
        var _this = this;
        return new Parser(function (cs) { var _a; return (_a = _this.run(cs)) !== null && _a !== void 0 ? _a : p2.run(cs); });
    };
    Parser.prototype.optional = function () {
        return this.disjointChoice(Parser.pure(undefined));
    };
    Parser.prototype.disjointChoice = function (p2) {
        var _this = this;
        return new Parser(function (cs) {
            var r = _this.run(cs);
            if (r == null)
                return p2.run(cs);
            return r;
        });
    };
    Parser.prototype.many = function () {
        var _this = this;
        return new Parser(function (cs) {
            var ret = [[], 0];
            while (true) {
                var r = _this.run(cs.substring(ret[1]));
                if (r == null)
                    break;
                ret[0].push(r[0]);
                ret[1] += r[1];
            }
            return ret;
        });
    };
    Parser.prototype.many1 = function () {
        var _this = this;
        return this.bind(function (x) { return _this.many().map(function (xs) { return __spreadArray([x], xs); }); });
    };
    Parser.prototype.sepby = function (psep) {
        return this.sepby1(psep).choice(Parser.pure([]));
    };
    Parser.prototype.sepby1_ = function (psep) {
        var _this = this;
        return this.bind(function (x) {
            return psep.bind(function (sep) { return _this.map(function (x) { return [sep, x]; }); })
                .many()
                .map(function (xs) { return [x, xs]; });
        });
    };
    Parser.prototype.sepby1 = function (psep) {
        var _this = this;
        return this.bind(function (x) {
            return psep.bind(function (_) { return _this; })
                .many()
                .map(function (xs) { return __spreadArray([x], xs); });
        });
    };
    Parser.choices = function () {
        var ps = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ps[_i] = arguments[_i];
        }
        return ps.reduce(function (p1, p2) { return p1.choice(p2); });
    };
    Parser.prototype.fatal = function (error) {
        var _this = this;
        return new Parser(function (cs) {
            var r = _this.run(cs);
            if (r == null) {
                error.message += ": Unexpected:\n>>> " + cs;
                throw error;
            }
            return r;
        });
    };
    return Parser;
}());
exports.Parser = Parser;
