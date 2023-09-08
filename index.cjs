module.exports = (async ()=>{ const exports = {};// deno-fmt-ignore-file
// deno-lint-ignore-file
// This code was bundled using `deno bundle` and it's not recommended to edit it manually

var ACTIONS;
(function(ACTIONS) {
    ACTIONS[ACTIONS["NONE"] = 0] = "NONE";
    ACTIONS[ACTIONS["CHOOSE"] = 1] = "CHOOSE";
    ACTIONS[ACTIONS["QUESTION"] = 2] = "QUESTION";
})(ACTIONS || (ACTIONS = {}));
const dividerChar = '-';
class Printer {
    silent = false;
    constructor(config){
        this.silent = config?.silent ?? false;
    }
    writeLine = (value, includeNewline)=>{
        if (!this.silent) {
            const e = new TextEncoder().encode(`${value}${includeNewline ? '\n' : ''}`);
            Deno.stdout.writeSync(Uint8Array.from(e));
        }
    };
    print = (value, includeNewline)=>{
        this.writeLine(value, includeNewline);
    };
    newline = ()=>{
        this.writeLine('\n', false);
    };
    divider = (length = 10)=>{
        let outStr = '';
        for(let i = 0; i < length; i++){
            outStr += dividerChar;
        }
        this.writeLine(outStr, true);
    };
}
class History {
    last = {
        argument: '',
        lastOptionClose: false,
        action: ACTIONS.NONE,
        includeNewline: false,
        privateInput: false
    };
    save = (argument, action, lastOptionClose, includeNewline, privateInput)=>{
        this.last = {
            argument,
            lastOptionClose: lastOptionClose ?? this.last.lastOptionClose,
            includeNewline: includeNewline ?? this.last.includeNewline,
            privateInput: privateInput ?? this.last.privateInput,
            action
        };
    };
    retrieve = ()=>{
        return this.last;
    };
}
function deferred() {
    let methods;
    let state = "pending";
    const promise = new Promise((resolve, reject)=>{
        methods = {
            async resolve (value) {
                await value;
                state = "fulfilled";
                resolve(value);
            },
            reject (reason) {
                state = "rejected";
                reject(reason);
            }
        };
    });
    Object.defineProperty(promise, "state", {
        get: ()=>state
    });
    return Object.assign(promise, methods);
}
class MuxAsyncIterator {
    #iteratorCount = 0;
    #yields = [];
    #throws = [];
    #signal = deferred();
    add(iterable) {
        ++this.#iteratorCount;
        this.#callIteratorNext(iterable[Symbol.asyncIterator]());
    }
    async #callIteratorNext(iterator) {
        try {
            const { value, done } = await iterator.next();
            if (done) {
                --this.#iteratorCount;
            } else {
                this.#yields.push({
                    iterator,
                    value
                });
            }
        } catch (e) {
            this.#throws.push(e);
        }
        this.#signal.resolve();
    }
    async *iterate() {
        while(this.#iteratorCount > 0){
            await this.#signal;
            for(let i = 0; i < this.#yields.length; i++){
                const { iterator, value } = this.#yields[i];
                yield value;
                this.#callIteratorNext(iterator);
            }
            if (this.#throws.length) {
                for (const e of this.#throws){
                    throw e;
                }
                this.#throws.length = 0;
            }
            this.#yields.length = 0;
            this.#signal = deferred();
        }
    }
    [Symbol.asyncIterator]() {
        return this.iterate();
    }
}
class InputLoop {
    buf = new Uint8Array(1024);
    done = false;
    out = new Printer();
    history = new History();
    constructor(args){
        this.out = new Printer(args);
    }
    coerceChoice = (value)=>{
        if (typeof value === 'number') {
            return String(value);
        }
        return value;
    };
    cleanInput = (value)=>{
        return value?.replace('\n', '').replace('\r', '') ?? '';
    };
    repeat = (value)=>{
        const retrievedHistory = this.history.retrieve();
        if (retrievedHistory.action) {
            if (retrievedHistory.action === ACTIONS.CHOOSE) {
                return this.choose(retrievedHistory.argument, retrievedHistory.lastOptionClose, retrievedHistory.privateInput, value);
            }
            if (retrievedHistory.action === ACTIONS.QUESTION) {
                return this.question(retrievedHistory.argument, retrievedHistory.includeNewline, retrievedHistory.privateInput, value);
            }
        }
    };
    read = async (privateInput)=>{
        if (privateInput) {
            const result = await this.readPrivate();
            this.out.newline();
            return result;
        }
        return new Promise(async (resolve, reject)=>{
            const n = await Deno.stdin.read(this.buf);
            if (n) {
                resolve(this.cleanInput(new TextDecoder().decode(this.buf.subarray(0, n))));
            } else {
                reject();
            }
        });
    };
    readPrivate = async ()=>{
        Deno.setRaw?.(Deno.stdin.rid, true);
        const p = deferred();
        let input = '';
        let n = await Deno.stdin.read(this.buf);
        while(n){
            const text = new TextDecoder().decode(this.buf.subarray(0, n));
            if (text.includes('\n') || text.includes('\r')) {
                Deno.setRaw?.(Deno.stdin.rid, false);
                p.resolve(input);
                break;
            }
            if (text.includes('\u0003') || text.includes('\u0004')) {
                Deno.setRaw?.(Deno.stdin.rid, false);
                p.resolve('');
                Deno.exit();
            }
            input += text;
            n = await Deno.stdin.read(this.buf);
        }
        return p;
    };
    wait = async (question, includeNewline)=>{
        this.out.print(question ?? 'Press any key to continue...', includeNewline ?? true);
        Deno.setRaw?.(Deno.stdin.rid, true);
        const p = deferred();
        let n = await Deno.stdin.read(this.buf);
        if (n) {
            Deno.setRaw?.(Deno.stdin.rid, false);
            p.resolve(true);
        } else {
            p.resolve(false);
        }
        return p;
    };
    choose = async (options, lastOptionClose, privateInput, choice)=>{
        this.out.newline();
        this.out.divider(30);
        options.forEach((option, index)=>{
            this.out.print(`${index}: ${option}`, true);
        });
        this.out.divider(30);
        let result;
        if (choice !== undefined) {
            result = this.cleanInput(this.coerceChoice(choice));
        } else {
            result = await this.read(privateInput ?? false);
        }
        this.history.save(options, ACTIONS.CHOOSE, lastOptionClose ?? false, undefined, privateInput ?? false);
        if (lastOptionClose && result === String(options.length - 1)) {
            this.close();
        }
        return options.map((_option, index)=>{
            if (result === String(index)) {
                return true;
            }
            return false;
        });
    };
    question = async (question, includeNewline, privateInput, value)=>{
        this.out.print(question, includeNewline ?? true);
        this.history.save(question, ACTIONS.QUESTION, undefined, includeNewline ?? true, privateInput ?? false);
        if (value) {
            return this.cleanInput(this.coerceChoice(value));
        }
        const result = await this.read(privateInput ?? false);
        return result;
    };
    close = ()=>{
        this.done = true;
    };
}
const FONTS = {
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    DIM: '\x1b[2m',
    ITALIC: '\x1b[3m',
    UNDERLINED: '\x1b[4m',
    BLINK: '\x1b[5m',
    REVERSE: '\x1b[7m',
    HIDDEN: '\x1b[8m',
    STRIKETHROUGH: '\x1b[9m'
};
const FOREGROUND = {};
const BACKGROUND = {};
const Colors = [
    'BLACK',
    'RED',
    'GREEN',
    'YELLOW',
    'BLUE',
    'MAGENTA',
    'CYAN',
    'WHITE'
];
for (const color of Colors){
    FOREGROUND[color] = `\x1b[${30 + Colors.indexOf(color)}m`;
    BACKGROUND[color] = `\x1b[${40 + Colors.indexOf(color)}m`;
    const brightColor = color === 'BLACK' ? 'GRAY' : `BRIGHT_${color}`;
    FOREGROUND[brightColor] = `\x1b[${90 + Colors.indexOf(color)}m`;
    BACKGROUND[brightColor] = `\x1b[${100 + Colors.indexOf(color)}m`;
}
function ValidateColor(color) {
    return /^\x1b\[[0-9;]*m$/.test(color);
}
function colorize(text, color, end = FONTS.RESET) {
    if (typeof text !== 'string') throw new Error('Invalid text');
    if (!ValidateColor(color)) throw new Error('Invalid color');
    if (!ValidateColor(end)) throw new Error('Invalid end color');
    if (text.includes(FONTS.RESET)) {
        const parts = text.split(FONTS.RESET);
        return parts.map((part)=>colorize(part, color, end)).join(FONTS.RESET);
    }
    return `${color}${text}${end}`;
}
const ValidRGB = (n)=>n >= 0 && n <= 255;
function validateRGB(red, green, blue) {
    if (Array.isArray(red)) return validateRGB(...red);
    red = parseInt(red);
    if (!ValidRGB(red)) throw new Error('Invalid red value');
    green = parseInt(green);
    if (!ValidRGB(green)) throw new Error('Invalid green value');
    blue = parseInt(blue);
    if (!ValidRGB(blue)) throw new Error('Invalid blue value');
    return [
        red,
        green,
        blue
    ];
}
function rgb(red, green, blue) {
    const [r, g, b] = validateRGB(red, green, blue);
    return `\x1b[38;2;${r};${g};${b}m`;
}
rgb.background = function(red, green, blue) {
    const [r, g, b] = validateRGB(red, green, blue);
    return `\x1b[48;2;${r};${g};${b}m`;
};
function rgba(red, green, blue, alpha) {
    const [r, g, b] = validateRGB(red, green, blue);
    if (alpha < 0 || alpha > 1) throw new Error('Invalid alpha value');
    return `\x1b[38;2;${r};${g};${b};${alpha}m`;
}
rgba.background = function(red, green, blue, alpha) {
    const [r, g, b] = validateRGB(red, green, blue);
    if (alpha < 0 || alpha > 1) throw new Error('Invalid alpha value');
    return `\x1b[48;2;${r};${g};${b};${alpha}m`;
};
const DenoSymbol = Symbol.for('Deno.customInspect');
const NodeSymbol = Symbol.for('nodejs.util.inspect.custom');
class Inspecteable {
    toConsoleColor = FOREGROUND.MAGENTA;
    toConsole() {
        return colorize(this.toString(), this.toConsoleColor);
    }
    [DenoSymbol]() {
        return this.toConsole();
    }
    [NodeSymbol]() {
        return this.toConsole();
    }
}
const PRECISION = 14;
const MIDDLE_PRECISION = Math.round(14 / 2);
const EPSILON = Number(`1e-${14}`);
function roundDecimals(value, decimals = 0) {
    if (typeof value !== 'number') throw new Error('Invalid value');
    if (typeof decimals !== 'number') throw new Error('Invalid decimals');
    const multiplier = Math.pow(10, decimals);
    const round = Math.round(value * multiplier);
    return round / multiplier;
}
function ConvertToFraction(number, tolerance = 1e-6) {
    let numerator = 1;
    let denominator = 1;
    while(Math.abs(number - Math.round(number)) > tolerance){
        number *= 10;
        numerator *= 10;
    }
    denominator = numerator;
    numerator = Math.round(number);
    const gcd = GreatestCommonDivisor(numerator, denominator);
    numerator /= gcd;
    denominator /= gcd;
    return `${numerator}/${denominator}`;
}
function GreatestCommonDivisor(a, b) {
    if (b === 0) {
        return a;
    }
    return GreatestCommonDivisor(b, a % b);
}
function useConsts(val) {
    if (val % Math.PI === 0) return `${val / Math.PI === 1 ? '' : val / Math.PI}π`;
    if (val % Math.E === 0) return `${val / Math.E === 1 ? '' : val / Math.E}e`;
    if (val % (Math.PI * Math.E) === 0) return `${val / (Math.PI * Math.E) === 1 ? '' : val / (Math.PI * Math.E)}πe`;
    return `${val}`;
}
let _Symbol_iterator = Symbol.iterator;
class ComplexNumber extends Inspecteable {
    real;
    imaginary;
    toConsoleColor;
    constructor(real = 0, imaginary = 0){
        super();
        this.real = real;
        this.imaginary = imaginary;
        this.toConsoleColor = FOREGROUND.YELLOW;
        this[_Symbol_iterator] = function*() {
            yield this.real;
            yield this.imaginary;
        };
        this.toJSON = this.toString;
    }
    toFraction() {
        const real = ConvertToFraction(this.real);
        const imaginary = ConvertToFraction(this.imaginary);
        if (this.imaginary === 0) return real;
        else if (this.real === 0) return `(${imaginary})i`;
        else return `${real} + (${imaginary})i`;
    }
    [_Symbol_iterator];
    valueOf() {
        if (this.imaginary === 0) return this.real;
        else return this.toString();
    }
    toJSON;
    toString() {
        const parts = [
            '0',
            '+',
            '0i'
        ];
        if (this.real !== 0) parts[0] = useConsts(this.real);
        else parts[0] = parts[1] = '';
        if (this.imaginary === 0) {
            parts[1] = parts[2] = '';
        } else if (Math.abs(this.imaginary) === 1) parts[2] = 'i';
        else parts[2] = `${useConsts(Math.abs(this.imaginary))}i`;
        if (this.imaginary < 0) parts[1] = '-';
        return parts.join('') || '0';
    }
    [Symbol.hasInstance](instance) {
        if (typeof instance !== 'object') return false;
        if (instance === null) return false;
        if (!('real' in instance)) return false;
        if (!('imaginary' in instance)) return false;
        return true;
    }
    static NaN;
    static Infinity;
    static NegativeInfinity;
    static Zero;
    static One;
    static Two;
    static E;
    static Pi;
    static I;
    static One_Two;
    static from(value, imaginary = 0) {
        if (value instanceof ComplexNumber) return ComplexNumber.from(value.real, value.imaginary);
        if (typeof value !== 'number') throw new Error('Invalid value');
        if (typeof imaginary !== 'number') throw new Error('Invalid imaginary');
        if (Math.abs(value) < EPSILON) value = 0;
        if (Math.abs(imaginary) < EPSILON) imaginary = 0;
        const a = Number(value.toPrecision(14));
        const b = Number(value.toPrecision(MIDDLE_PRECISION));
        if (a === b) value = roundDecimals(value, PRECISION - 2);
        const c = parseFloat(imaginary.toPrecision(14));
        const d = parseFloat(imaginary.toPrecision(MIDDLE_PRECISION));
        if (c === d) imaginary = roundDecimals(imaginary, PRECISION - 2);
        if (!ComplexNumber.NaN) ComplexNumber.NaN = new ComplexNumber(NaN);
        if (!ComplexNumber.Infinity) ComplexNumber.Infinity = new ComplexNumber(Infinity);
        if (!ComplexNumber.NegativeInfinity) ComplexNumber.NegativeInfinity = new ComplexNumber(-Infinity);
        if (!ComplexNumber.Zero) ComplexNumber.Zero = new ComplexNumber(0);
        if (!ComplexNumber.One) ComplexNumber.One = new ComplexNumber(1);
        if (!ComplexNumber.Two) ComplexNumber.Two = new ComplexNumber(2);
        if (!ComplexNumber.E) ComplexNumber.E = new ComplexNumber(Math.E);
        if (!ComplexNumber.Pi) ComplexNumber.Pi = new ComplexNumber(Math.PI);
        if (!ComplexNumber.I) ComplexNumber.I = new ComplexNumber(0, 1);
        if (!ComplexNumber.One_Two) ComplexNumber.One_Two = new ComplexNumber(1 / 2);
        if (ComplexNumber.isNaN(value) || ComplexNumber.isNaN(imaginary)) return ComplexNumber.NaN;
        if (value === Infinity) return ComplexNumber.Infinity;
        if (value === -Infinity) return ComplexNumber.NegativeInfinity;
        if (imaginary === Infinity) return ComplexNumber.Infinity;
        if (imaginary === -Infinity) return ComplexNumber.NegativeInfinity;
        if (value === 0 && imaginary === 0) return ComplexNumber.Zero;
        if (value === 1 && imaginary === 0) return ComplexNumber.One;
        if (value === 2 && imaginary === 0) return ComplexNumber.Two;
        if (value === Math.E && imaginary === 0) return ComplexNumber.E;
        if (value === Math.PI && imaginary === 0) return ComplexNumber.Pi;
        if (value === 0 && imaginary === 1) return ComplexNumber.I;
        if (value === 1 / 2 && imaginary === 0) return ComplexNumber.One_Two;
        return new ComplexNumber(value, imaginary);
    }
    static isNaN(value) {
        return value !== 0 && !value;
    }
}
function ValidType(value, callback) {
    if (callback(value)) return value;
    throw new TypeError(`${value} is not a valid type`);
}
const PI = Math.PI;
const EULER = Math.E;
const I = ComplexNumber.from(0, 1);
class Angle extends Inspecteable {
    value;
    toConsoleColor;
    constructor(value = 0){
        super();
        this.value = value;
        this.toConsoleColor = FOREGROUND.BLUE;
    }
}
function formatRadians(value) {
    const PI_RAD = value / PI;
    if (+PI_RAD === 1) return 'π';
    else if (+PI_RAD === -1) return '-π';
    else if (+PI_RAD === 0) return '';
    if (+PI_RAD < 1 && +PI_RAD > 0) return 'π/' + 1 / PI_RAD;
    else if (+PI_RAD > -1 && +PI_RAD < 0) return '-π/' + 1 / PI_RAD;
    const [__int, dec] = value.toString().split('.');
    if (dec) {
        const fraction = formatRadians(+`0.${dec}` * PI);
        `${__int}π + ${fraction.startsWith('-') ? `(${fraction})` : fraction}`;
    }
    return `${value}π`;
}
class Radians extends Angle {
    static from(ang) {
        if (ang instanceof Radians) return ang;
        if (ang instanceof Degrees) return new Radians(ang.value * (PI / 180));
        throw new TypeError(`${ang} is not a valid angle`);
    }
    toString() {
        const v = formatRadians(this.value);
        return `${v}rad`;
    }
}
class Degrees extends Angle {
    static from(ang) {
        if (ang instanceof Degrees) return ang;
        if (ang instanceof Radians) return new Degrees(ang.value * (180 / PI));
        throw new TypeError(`${ang} is not a valid angle`);
    }
    toString() {
        return `${this.value}°`;
    }
}
var AngleType;
function isRealNumber(value) {
    return typeof value === 'number';
}
function isComplexNumber(value) {
    return value instanceof ComplexNumber;
}
function isLikeNumber(value) {
    return isRealNumber(value) || isComplexNumber(value);
}
function validLikeNumber(value) {
    ValidType(value, isLikeNumber);
}
function absolute(x) {
    validLikeNumber(x);
    if (typeof x === 'number') return Math.abs(x);
    const c2 = x.real * x.real + x.imaginary * x.imaginary;
    const c = Math.sqrt(c2);
    return c;
}
function add(x, y) {
    validLikeNumber(x);
    validLikeNumber(y);
    if (typeof x === 'number') if (typeof y === 'number') return ComplexNumber.from(x + y);
    else return ComplexNumber.from(x + y.real, y.imaginary);
    else if (typeof y === 'number') return ComplexNumber.from(x.real + y, x.imaginary);
    else return ComplexNumber.from(x.real + y.real, x.imaginary + y.imaginary);
}
function subtract(x, y) {
    validLikeNumber(x);
    validLikeNumber(y);
    if (typeof x === 'number') if (typeof y === 'number') return ComplexNumber.from(x - y);
    else return ComplexNumber.from(x - y.real, -y.imaginary);
    else if (typeof y === 'number') return ComplexNumber.from(x.real - y, x.imaginary);
    else return ComplexNumber.from(x.real - y.real, x.imaginary - y.imaginary);
}
function multiply(x, y) {
    validLikeNumber(x);
    validLikeNumber(y);
    if (typeof x === 'number') if (typeof y === 'number') return ComplexNumber.from(x * y);
    else return ComplexNumber.from(x * y.real, x * y.imaginary);
    else if (typeof y === 'number') return ComplexNumber.from(x.real * y, x.imaginary * y);
    else return ComplexNumber.from(x.real * y.real - x.imaginary * y.imaginary, x.real * y.imaginary + x.imaginary * y.real);
}
function divide(x, y) {
    validLikeNumber(x);
    validLikeNumber(y);
    if (typeof x === 'number') x = ComplexNumber.from(x);
    if (typeof y === 'number') y = ComplexNumber.from(y);
    const denominator = y.real * y.real + y.imaginary * y.imaginary;
    const real = (x.real * y.real + x.imaginary * y.imaginary) / denominator;
    const imaginary = (x.imaginary * y.real - x.real * y.imaginary) / denominator;
    return ComplexNumber.from(real, imaginary);
}
function modulo(x, y) {
    validLikeNumber(x);
    validLikeNumber(y);
    const quotient = divide(x, y);
    const quotientFloor = floor(quotient);
    return subtract(x, multiply(quotientFloor, y));
}
(function(AngleType) {
    AngleType["degrees"] = "degrees";
    AngleType["radians"] = "radians";
})(AngleType || (AngleType = {}));
class Polar extends Inspecteable {
    magnitude;
    angle;
    constructor(magnitude, angle){
        super();
        this.magnitude = magnitude;
        this.angle = angle;
    }
    toComplexNumber() {
        const theta = Radians.from(this.angle);
        const real = this.magnitude * Math.cos(theta.value);
        const imaginary = this.magnitude * Math.sin(theta.value);
        return ComplexNumber.from(real, imaginary);
    }
    static from(value) {
        validLikeNumber(value);
        const [real, imaginary] = ComplexNumber.from(value);
        const magnitude = absolute(value);
        const alpha = Math.atan2(imaginary, real);
        const angle = new Radians(alpha);
        return new Polar(magnitude, angle);
    }
    toString() {
        return `${this.magnitude} ${this.angle}`;
    }
    static toComplexNumber(magnitude, angle, type = 'radians') {
        const theta = angle instanceof Angle ? Radians.from(angle) : new Radians(type === 'radians' ? angle : Math.PI * angle / 180);
        const real = magnitude * Math.cos(theta.value);
        const imaginary = magnitude * Math.sin(theta.value);
        return ComplexNumber.from(real, imaginary);
    }
}
function power(base, exponent = 2) {
    validLikeNumber(base);
    validLikeNumber(exponent);
    const polarBase = Polar.from(base);
    const r = polarBase.magnitude;
    const theta = Radians.from(polarBase.angle);
    const [c, d] = ComplexNumber.from(exponent);
    const lnr = Math.log(r);
    const clnr = c * lnr;
    const ctheta = c * theta.value;
    const dlnr = d * lnr;
    const dtheta = d * theta.value;
    const yRe = ctheta + dlnr;
    const yIm = dtheta - clnr;
    const y = new ComplexNumber(yRe, yIm);
    const cosY = cos(y);
    const sinY = sin(y);
    const isinY = multiply(I, sinY);
    return add(cosY, isinY);
}
function square(x, y = 2) {
    validLikeNumber(x);
    validLikeNumber(y);
    return power(x, divide(1, y));
}
square.multidata = function square(base, index = 2) {
    validLikeNumber(base);
    validLikeNumber(index);
    const maxData = 100;
    const data = [];
    const polarBase = Polar.from(base);
    const r = polarBase.magnitude;
    const θ = Radians.from(polarBase.angle);
    const r_n = power(r, divide(1, index));
    for(let k = 0; k < maxData; k++){
        const angle = divide(θ.value + 2 * PI * k, index);
        const cosY = cos(angle);
        const sinY = sin(angle);
        const isinY = multiply(I, sinY);
        const cos_isin = add(cosY, isinY);
        const value = multiply(r_n, cos_isin);
        const exists = data.some((v)=>equals(v, value));
        if (exists) break;
        data.push(value);
    }
    return data;
};
function sin(x) {
    validLikeNumber(x);
    if (typeof x === 'number') return ComplexNumber.from(Math.sin(x));
    const real = Math.sin(x.real) * Math.cosh(x.imaginary);
    const imaginary = Math.cos(x.real) * Math.sinh(x.imaginary);
    return ComplexNumber.from(real, imaginary);
}
function cos(x) {
    validLikeNumber(x);
    if (typeof x === 'number') return ComplexNumber.from(Math.cos(x));
    const real = Math.cos(x.real) * Math.cosh(x.imaginary);
    const imaginary = -Math.sin(x.real) * Math.sinh(x.imaginary);
    return ComplexNumber.from(real, imaginary);
}
function equals(x, y) {
    if (typeof x === 'number' && typeof y === 'number') return x === y;
    if (typeof x === 'number' && y instanceof ComplexNumber) return x === y.real && y.imaginary === 0;
    if (x instanceof ComplexNumber && typeof y === 'number') return x.real === y && x.imaginary === 0;
    if (x instanceof ComplexNumber && y instanceof ComplexNumber) return x.real === y.real && x.imaginary === y.imaginary;
    return false;
}
function floor(x) {
    validLikeNumber(x);
    if (typeof x === 'number') return ComplexNumber.from(Math.floor(x));
    const real = Math.floor(x.real);
    const imaginary = Math.floor(x.imaginary);
    return ComplexNumber.from(real, imaginary);
}
class InvalidTokenError extends Error {
    constructor(message){
        super(message);
        this.name = 'InvalidTokenError';
    }
}
function tokenize(source, options) {
    const tokens = [];
    const lines = source.split(/\r?\n/);
    for(let row = 0; row < lines.length; row++){
        const line = lines[row];
        for(let col = 0; col < line.length; col++){
            const __char = line[col];
            const token = options.find((option)=>{
                if (typeof option[0] === 'string') return option[0] === __char;
                if (option[0] instanceof RegExp) return option[0].test(__char);
            });
            if (token) {
                const v = token[1];
                if (typeof v === 'function') {
                    const [t, i] = v(__char, {
                        col,
                        row
                    }, line);
                    if (t) tokens.push(t);
                    col += i;
                    continue;
                }
                tokens.push({
                    type: v,
                    value: __char,
                    col,
                    row
                });
            } else throw new InvalidTokenError(`Invalid token ${__char}`);
        }
    }
    return tokens;
}
function skip() {
    return [
        null,
        0
    ];
}
function exec(a, b, fn) {
    if (Array.isArray(a) && Array.isArray(b)) {
        const results = [];
        for(let i = 0; i < a.length; i++)for(let j = 0; j < b.length; j++)results.push(fn(a[i], b[j]));
        return results;
    }
    if (Array.isArray(a)) {
        const results = [];
        for(let i = 0; i < a.length; i++)results.push(fn(a[i], b));
        return results;
    }
    if (Array.isArray(b)) {
        const results = [];
        for(let i = 0; i < b.length; i++)results.push(fn(a, b[i]));
        return results;
    }
    return fn(a, b);
}
const List = {
    concat (array, compare, ...lists) {
        for(let i = 0; i < lists.length; i++)List.push(array, compare, ...lists[i]);
        return array;
    },
    push (array, compare, ...lists) {
        for(let i = 0; i < lists.length; i++){
            const element = lists[i];
            if (!array.find((x)=>compare(x, element))) array.push(element);
        }
        return array;
    },
    toConcat (array, compare, ...lists) {
        const result = [
            ...array
        ];
        List.concat(result, compare, ...lists);
        return result;
    },
    toPush (array, compare, ...lists) {
        const result = [
            ...array
        ];
        List.push(result, compare, ...lists);
        return result;
    }
};
class ParseComplexError extends Error {
    constructor(message){
        super(message);
        this.name = 'ParseComplexError';
    }
}
var TokenType;
(function(TokenType) {
    TokenType["Number"] = "Number";
    TokenType["Operator"] = "Operator";
    TokenType["OpenParen"] = "OpenParen";
    TokenType["CloseParen"] = "CloseParen";
    TokenType["OpenBracket"] = "OpenBracket";
    TokenType["CloseBracket"] = "CloseBracket";
    TokenType["OpenBrace"] = "OpenBrace";
    TokenType["CloseBrace"] = "CloseBrace";
    TokenType["Constant"] = "Constant";
    TokenType["Variable"] = "Variable";
})(TokenType || (TokenType = {}));
const TokenizeOptions = [
    [
        '(',
        'OpenParen'
    ],
    [
        ')',
        'CloseParen'
    ],
    [
        '[',
        'OpenBracket'
    ],
    [
        ']',
        'CloseBracket'
    ],
    [
        '{',
        'OpenBrace'
    ],
    [
        '}',
        'CloseBrace'
    ],
    [
        /\+|\-|\*|\/|\^/,
        'Operator'
    ],
    [
        /i|e|π/,
        'Constant'
    ],
    [
        /[0-9]/,
        function(_, { col, row }, line) {
            let number = '';
            let nchar = _;
            let i = col;
            while(nchar.match(/[0-9]/) || nchar === '.'){
                if (nchar === '.' && number.includes('.')) throw new InvalidTokenError('Invalid number double decimal');
                number += nchar;
                nchar = line[++i] || '';
            }
            return [
                {
                    type: 'Number',
                    value: number,
                    col,
                    row
                },
                i - col - 1
            ];
        }
    ],
    [
        /\s/,
        skip
    ],
    [
        /[a-z]/i,
        'Variable'
    ]
];
function isMultiplication(token) {
    if (token.type === 'OpenBracket') return true;
    if (token.type === 'OpenParen') return true;
    if (token.type === 'OpenBrace') return true;
    if (token.type === 'Constant') return true;
    if (token.type === 'Variable') return true;
    if (token.type === 'Number') return true;
    return false;
}
class Parser {
    tokens;
    constructor(source){
        this.tokens = tokenize(source, TokenizeOptions);
    }
    at() {
        return this.tokens[0];
    }
    eat() {
        return this.tokens.shift();
    }
    next() {
        return this.tokens[1];
    }
    parseVariable() {
        const variable = this.eat();
        if (variable?.type === 'Variable') return {
            type: 'variable',
            value: 1,
            name: variable.value
        };
        throw new ParseComplexError('Invalid variable');
    }
    parseConstant() {
        const constant = this.eat();
        if (constant?.value === 'i' || constant?.value === 'e' || constant?.value === 'π') return {
            type: 'constant',
            name: constant.value
        };
        throw new ParseComplexError('Invalid constant');
    }
    parseValue() {
        if (this.at().type === 'OpenParen') {
            this.eat();
            const left = this.parseExpression();
            if (this.at() && this.at().type === 'CloseParen') {
                this.eat();
                return left;
            }
        }
        if (this.at().type === 'OpenBracket') {
            this.eat();
            const left = this.parseExpression();
            if (this.at() && this.at().type === 'CloseBracket') {
                this.eat();
                return left;
            }
        }
        if (this.at().type === 'OpenBrace') {
            this.eat();
            const left = this.parseExpression();
            if (this.at() && this.at().type === 'CloseBrace') {
                this.eat();
                return left;
            }
        }
        if (this.at().type === 'Constant') {
            return this.parseConstant();
        }
        if (this.at().type === 'Variable') {
            return this.parseVariable();
        }
        if (this.at().type === 'Number') {
            const number = this.eat();
            return {
                type: 'number',
                value: new ComplexNumber(parseFloat(number?.value || '0'))
            };
        }
        if (this.at().type === 'Operator' && this.at().value === '-') {
            this.eat();
            const right = this.parseValue();
            return {
                type: 'operator',
                value: '-',
                left: {
                    type: 'number',
                    value: ComplexNumber.from(0)
                },
                right
            };
        }
        throw new ParseComplexError('Invalid value');
    }
    powerValue() {
        const left = this.power();
        if (this.at() && isMultiplication(this.at())) {
            const right = this.multiplication();
            return {
                type: 'operator',
                value: '*',
                left,
                right
            };
        }
        return left;
    }
    power() {
        const left = this.parseValue();
        if (this.at() && this.at().type === 'Operator' && this.at().value === '^') {
            this.eat();
            const right = this.powerValue();
            return {
                type: 'operator',
                value: '^',
                left,
                right
            };
        }
        return left;
    }
    multiplication() {
        const left = this.power();
        if (this.at() && this.at().type === 'Operator' && (this.at().value === '*' || this.at().value === '/')) {
            const operator = this.eat();
            const right = this.power();
            return {
                type: 'operator',
                value: operator.value,
                left,
                right
            };
        }
        if (this.at() && isMultiplication(this.at())) {
            const right = this.multiplication();
            return {
                type: 'operator',
                value: '*',
                left,
                right
            };
        }
        return left;
    }
    addition() {
        const left = this.multiplication();
        if (this.at() && this.at().type === 'Operator' && (this.at().value === '+' || this.at().value === '-')) {
            const operator = this.eat();
            const right = this.multiplication();
            return {
                type: 'operator',
                value: operator.value,
                left,
                right
            };
        }
        return left;
    }
    parseExpression() {
        const left = this.addition();
        if (this.at() && (this.at().type === 'Variable' || this.at().type === 'Constant' || this.at().type === 'Number' || this.at().type === 'OpenParen' || this.at().type === 'OpenBracket' || this.at().type === 'OpenBrace')) {
            return {
                type: 'operator',
                value: '*',
                left,
                right: this.parseExpression()
            };
        }
        return left;
    }
    parse() {
        return this.parseExpression();
    }
    static evaluate(parse, scope) {
        if (parse.type === 'number') return ComplexNumber.from(parse.value);
        if (parse.type === 'operator') {
            const left = Parser.evaluate(parse.left, scope);
            const right = Parser.evaluate(parse.right, scope);
            switch(parse.value){
                case '+':
                    return exec(left, right, add);
                case '-':
                    return exec(left, right, subtract);
                case '*':
                    return exec(left, right, multiply);
                case '/':
                    return exec(left, right, divide);
                case '^':
                    return exec(left, right, power);
            }
        }
        if (parse.type === 'variable') {
            if (scope[parse.name]) return ComplexNumber.from(scope[parse.name]);
            throw new ParseComplexError(`Variable ${parse.name} not found`);
        }
        if (parse.type === 'constant') {
            if (parse.name === 'i') return I;
            if (parse.name === 'e') return EULER;
            if (parse.name === 'π') return PI;
            throw new ParseComplexError(`Constant ${parse.name} not found`);
        }
        if (parse.type === 'list') {
            const results = [];
            for (const value of parse.value)results.push(value);
            return results;
        }
        throw new ParseComplexError('Invalid parse');
    }
    static simplify(parse, scope) {
        if (parse.type === 'variable' && scope[parse.name]) return {
            type: 'number',
            value: multiply(parse.value, scope[parse.name])
        };
        if (parse.type !== 'operator') return parse;
        const operator = parse.value;
        const left = Parser.simplify(parse.left, scope);
        const right = Parser.simplify(parse.right, scope);
        if (operator === '/') return divide_var(left, right, scope);
        if (operator === '*') return multiply_var(left, right, scope);
        if (operator === '+') return add_var(left, right, scope);
        if (operator === '-') return subtract_var(left, right, scope);
        if (operator === '^') return power_var(left, right, scope);
        return {
            type: 'operator',
            value: operator,
            left,
            right
        };
    }
}
function eval_complex(value, scope) {
    const parse = new Parser(value).parse();
    return Parser.evaluate(parse, scope);
}
function divide_var(_left, _right, scope) {
    const left = Parser.simplify(_left, scope);
    const right = Parser.simplify(_right, scope);
    if (left.type === 'number' && right.type === 'number') return {
        type: 'number',
        value: divide(left.value, right.value)
    };
    if (left.type === 'variable' && right.type === 'variable') {
        if (left.name === right.name) return {
            type: 'number',
            value: ComplexNumber.from(divide(left.value, right.value))
        };
        const value = divide(left.value, right.value);
        return {
            type: 'operator',
            value: '*',
            left: {
                type: 'number',
                value
            },
            right: {
                type: 'operator',
                value: '/',
                left: {
                    type: 'variable',
                    value: 1,
                    name: left.name
                },
                right: {
                    type: 'variable',
                    value: 1,
                    name: right.name
                }
            }
        };
    }
    if (left.type === 'variable') {
        if (right.type === 'number') {
            return {
                type: 'variable',
                value: divide(left.value, right.value),
                name: left.name
            };
        }
    }
    if (left.type === 'operator' && right.type !== 'operator') {
        if (left.value === '+') {
            return add_var(divide_var(left.left, right, scope), divide_var(left.right, right, scope), scope);
        }
        if (left.value === '-') {
            return subtract_var(divide_var(left.left, right, scope), divide_var(left.right, right, scope), scope);
        }
    }
    return {
        type: 'operator',
        value: '/',
        left,
        right
    };
}
function multiply_var(_left, _right, scope) {
    const left = Parser.simplify(_left, scope);
    const right = Parser.simplify(_right, scope);
    if (left.type === 'number' && right.type === 'number') return {
        type: 'number',
        value: multiply(left.value, right.value)
    };
    if (left.type === 'number' && equals(left.value, 1)) return right;
    if (right.type === 'number' && equals(right.value, 1)) return left;
    if (left.type === 'number' && equals(left.value, 0)) return {
        type: 'number',
        value: 0
    };
    if (right.type === 'number' && equals(right.value, 0)) return {
        type: 'number',
        value: 0
    };
    if (left.type === 'variable' && right.type === 'variable') {
        if (left.name === right.name) {
            return multiply_var({
                type: 'number',
                value: multiply(left.value, right.value)
            }, {
                type: 'operator',
                value: '^',
                left: {
                    type: 'variable',
                    value: 1,
                    name: left.name
                },
                right: {
                    type: 'number',
                    value: 2
                }
            }, scope);
        }
        return multiply_var({
            type: 'number',
            value: multiply(left.value, right.value)
        }, {
            type: 'operator',
            value: '*',
            left: {
                type: 'variable',
                value: 1,
                name: left.name
            },
            right: {
                type: 'variable',
                value: 1,
                name: right.name
            }
        }, scope);
    }
    if (left.type === 'variable') {
        if (right.type === 'number') return {
            type: 'variable',
            value: multiply(left.value, right.value),
            name: left.name
        };
    }
    if (right.type === 'variable') {
        if (left.type === 'number') {
            return {
                type: 'variable',
                value: multiply(left.value, right.value),
                name: right.name
            };
        }
    }
    if (left.type === 'operator' && right.type !== 'operator') {
        if (left.value === '+') return add_var(multiply_var(left.left, right, scope), multiply_var(left.right, right, scope), scope);
        if (left.value === '-') return subtract_var(multiply_var(left.left, right, scope), multiply_var(left.right, right, scope), scope);
        if (left.value === '/') return divide_var(multiply_var(left.left, right, scope), multiply_var(left.right, right, scope), scope);
        if (left.value === '*') return multiply_var(multiply_var(left.left, right, scope), multiply_var(left.right, right, scope), scope);
    }
    if (left.type !== 'operator' && right.type === 'operator') {
        if (right.value === '+') return add_var(multiply_var(left, right.left, scope), multiply_var(left, right.right, scope), scope);
        if (right.value === '-') return subtract_var(multiply_var(left, right.left, scope), multiply_var(left, right.right, scope), scope);
        if (right.value === '/') return divide_var(multiply_var(left, right.left, scope), multiply_var(left, right.right, scope), scope);
        if (right.value === '*') return multiply_var(multiply_var(left, right.left, scope), multiply_var(left, right.right, scope), scope);
    }
    return {
        type: 'operator',
        value: '*',
        left,
        right
    };
}
function add_var(_left, _right, scope) {
    const left = Parser.simplify(_left, scope);
    const right = Parser.simplify(_right, scope);
    if (left.type === 'number' && right.type === 'number') return {
        type: 'number',
        value: add(left.value, right.value)
    };
    if (left.type === 'variable' || right.type === 'variable') return {
        type: 'operator',
        value: '+',
        left,
        right
    };
    if (left.type === 'operator' && right.type !== 'operator') {
        if (left.value === '+') {
            return add_var(left.left, add_var(left.right, right, scope), scope);
        }
        if (left.value === '-') {
            return subtract_var(left.left, add_var(left.right, right, scope), scope);
        }
    }
    if (left.type !== 'operator' && right.type === 'operator') {
        if (right.value === '+') {
            return add_var(add_var(left, right.left, scope), right.right, scope);
        }
        if (right.value === '-') {
            return subtract_var(add_var(left, right.left, scope), right.right, scope);
        }
    }
    return {
        type: 'operator',
        value: '+',
        left,
        right
    };
}
function subtract_var(_left, _right, scope) {
    const left = Parser.simplify(_left, scope);
    const right = Parser.simplify(_right, scope);
    if (left.type === 'number' && right.type === 'number') return {
        type: 'number',
        value: subtract(left.value, right.value)
    };
    if (left.type === 'variable' || right.type === 'variable') return {
        type: 'operator',
        value: '*',
        left,
        right
    };
    if (left.type === 'operator' && right.type !== 'operator') {
        if (left.value === '+') {
            return add_var(left.left, subtract_var(left.right, right, scope), scope);
        }
        if (left.value === '-') {
            return subtract_var(left.left, subtract_var(left.right, right, scope), scope);
        }
    }
    if (left.type !== 'operator' && right.type === 'operator') {
        if (right.value === '+') {
            return add_var(subtract_var(left, right.left, scope), right.right, scope);
        }
        if (right.value === '-') {
            return subtract_var(subtract_var(left, right.left, scope), right.right, scope);
        }
    }
    return {
        type: 'operator',
        value: '-',
        left,
        right
    };
}
function power_var(_left, _right, scope) {
    const left = Parser.simplify(_left, scope);
    const right = Parser.simplify(_right, scope);
    if (right.type === 'number' && equals(right.value, 0)) return {
        type: 'number',
        value: 1
    };
    if (right.type === 'number' && equals(right.value, 1)) return left;
    if (left.type === 'number' && right.type === 'number') return {
        type: 'number',
        value: power(left.value, right.value)
    };
    if (left.type === 'operator') {
        if (left.value === '*') {
            return multiply_var(power_var(left.left, right, scope), power_var(left.right, right, scope), scope);
        }
        if (left.value === '/') {
            return divide_var(power_var(left.left, right, scope), power_var(left.right, right, scope), scope);
        }
        if (left.value === '^') {
            return power_var(left.left, multiply_var(left.right, right, scope), scope);
        }
    }
    return {
        type: 'operator',
        value: '^',
        left,
        right
    };
}
var BLOCK_TYPE;
(function(BLOCK_TYPE) {
    BLOCK_TYPE["FUNCTION_DECLARATION"] = 'FunctionDeclaration';
    BLOCK_TYPE["IF_STATEMENT"] = 'IfStatement';
    BLOCK_TYPE["ELSE_STATEMENT"] = 'ElseStatement';
    BLOCK_TYPE["WHILE_STATEMENT"] = 'WhileStatement';
    BLOCK_TYPE["CLASS_DECLARATION"] = 'ClassDeclaration';
    BLOCK_TYPE["PROGRAM"] = 'Program';
    BLOCK_TYPE["TRY"] = 'Try';
    BLOCK_TYPE["CATCH"] = 'Catch';
    BLOCK_TYPE["FINALLY"] = 'Finally';
})(BLOCK_TYPE || (BLOCK_TYPE = {}));
var STATEMENTS_TYPE;
(function(STATEMENTS_TYPE) {
    STATEMENTS_TYPE["VAR_DECLARATION"] = 'VarDeclaration';
    STATEMENTS_TYPE["RETURN_STATEMENT"] = 'ReturnStatement';
    STATEMENTS_TYPE["BREAK_STATEMENT"] = 'BreakStatement';
    STATEMENTS_TYPE["CONTINUE_STATEMENT"] = 'ContinueStatement';
})(STATEMENTS_TYPE || (STATEMENTS_TYPE = {}));
var EXPRESSIONS_TYPE;
(function(EXPRESSIONS_TYPE) {
    EXPRESSIONS_TYPE["ASSIGNMENT_EXPR"] = 'AssignmentExpr';
    EXPRESSIONS_TYPE["MEMBER_EXPR"] = 'MemberExpr';
    EXPRESSIONS_TYPE["BINARY_EXPR"] = 'BinaryExpr';
    EXPRESSIONS_TYPE["CALL_EXPR"] = 'CallExpr';
    EXPRESSIONS_TYPE["UNARY_EXPR"] = 'UnaryExpr';
})(EXPRESSIONS_TYPE || (EXPRESSIONS_TYPE = {}));
var LITERALS_TYPE;
(function(LITERALS_TYPE) {
    LITERALS_TYPE["PROPERTY"] = 'Property';
    LITERALS_TYPE["OBJECT_LITERAL"] = 'ObjectLiteral';
    LITERALS_TYPE["ARRAY_LITERAL"] = 'ArrayLiteral';
    LITERALS_TYPE["NUMERIC_LITERAL"] = 'NumericLiteral';
    LITERALS_TYPE["STRING_LITERAL"] = 'StringLiteral';
    LITERALS_TYPE["ITERABLE_LITERAL"] = 'IterableLiteral';
    LITERALS_TYPE["IDENTIFIER"] = 'Identifier';
    LITERALS_TYPE["PROPERTY_IDENTIFIER"] = 'PropertyIdentifier';
    LITERALS_TYPE["CLASS_PROPERTY"] = 'ClassProperty';
    LITERALS_TYPE["PROPERTY_COMPUTED"] = 'PropertyComputed';
})(LITERALS_TYPE || (LITERALS_TYPE = {}));
var ErrorType;
(function(ErrorType) {
    ErrorType["TokenizerError"] = "TokenizerError";
    ErrorType["ParserError"] = "ParserError";
})(ErrorType || (ErrorType = {}));
var ClassPropertyExtra;
(function(ClassPropertyExtra) {
    ClassPropertyExtra["Static"] = 'static';
})(ClassPropertyExtra || (ClassPropertyExtra = {}));
var TokenType1;
(function(TokenType) {
    TokenType["Number"] = "Number";
    TokenType["String"] = "String";
    TokenType["Identifier"] = "Identifier";
    TokenType["Equals"] = "Equals";
    TokenType["Negate"] = "Negate";
    TokenType["And"] = "And";
    TokenType["Or"] = "Or";
    TokenType["OpenParen"] = "OpenParen";
    TokenType["CloseParen"] = "CloseParen";
    TokenType["BinaryOperator"] = "BinaryOperator";
    TokenType["Semicolon"] = "Semicolon";
    TokenType["Comma"] = "Comma";
    TokenType["Dot"] = "Dot";
    TokenType["Colon"] = "Colon";
    TokenType["OpenBrace"] = "OpenBrace";
    TokenType["CloseBrace"] = "CloseBrace";
    TokenType["OpenBracket"] = "OpenBracket";
    TokenType["CloseBracket"] = "CloseBracket";
    TokenType["OpenAngle"] = "OpenAngle";
    TokenType["CloseAngle"] = "CloseAngle";
    TokenType["Backslash"] = "Backslash";
    TokenType["EOF"] = "EOF";
    TokenType["Error"] = "Error";
    TokenType["Definir"] = 'Def';
    TokenType["Const"] = "Const";
    TokenType["Funcion"] = 'Fn';
    TokenType["Si"] = "Si";
    TokenType["Entonces"] = 'Ent';
    TokenType["Retorna"] = 'Ret';
    TokenType["Mientras"] = 'Mien';
    TokenType["Romper"] = 'Rom';
    TokenType["Continuar"] = 'Cont';
    TokenType["Clase"] = "Clase";
    TokenType["Estatico"] = 'Est';
    TokenType["Extiende"] = "Extiende";
    TokenType["Intentar"] = "Intentar";
    TokenType["Capturar"] = "Capturar";
    TokenType["Finalmente"] = "Finalmente";
})(TokenType1 || (TokenType1 = {}));
const KEYWORDS = {
    def: 'Def',
    const: 'Const',
    fn: 'Fn',
    si: 'Si',
    ent: 'Ent',
    ret: 'Ret',
    mien: 'Mien',
    rom: 'Rom',
    cont: 'Cont',
    clase: 'Clase',
    est: 'Est',
    extiende: 'Extiende',
    intentar: 'Intentar',
    capturar: 'Capturar',
    finalmente: "Finalmente"
};
function isAlpha(src = '') {
    return src.match(/[a-z_$0-9]/i) != null;
}
function isConst(str) {
    if (str === 'i') return true;
    if (str === 'e') return true;
    if (str === 'π') return true;
    return false;
}
function isInt(str, bool = true) {
    const c = str.charCodeAt(0);
    const bounds = [
        '0'.charCodeAt(0),
        '9'.charCodeAt(0)
    ];
    const isNumber = c >= bounds[0] && c <= bounds[1];
    const isDot = bool && str == '.';
    return isNumber || isDot || isConst(str);
}
const toString = function(quote, { col, row }, line) {
    const src = line.split('').slice(col);
    let str = '';
    src.shift();
    while(src.length > 0 && src[0] != quote){
        if (src[0] == '\\') {
            src.shift();
            const next = src.shift();
            if (next == 'n') str += '\n';
            else if (next == 't') str += '\t';
            else if (next == 'r') str += '\r';
            else if (next == 'b') str += '\b';
            else if (next == 'f') str += '\f';
            else if (next == 'v') str += '\v';
            else if (next == '0') str += '\0';
            else if (next == 'x') {
                src.shift();
                const n1 = src.shift();
                const n2 = src.shift();
                const hex = `${n1}${n2}`;
                if (!n1 || !n2) return [
                    {
                        type: 'Error',
                        value: `Se esperaba un numero hexadecimal`,
                        col,
                        row
                    },
                    2
                ];
                str += String.fromCharCode(parseInt(hex, 16));
            } else if (next == 'u') {
                src.shift();
                const n1 = src.shift();
                const n2 = src.shift();
                const n3 = src.shift();
                const n4 = src.shift();
                const hex = `${n1}${n2}${n3}${n4}`;
                if (!n1 || !n2 || !n3 || !n4) return [
                    {
                        type: 'Error',
                        value: `Se esperaba un numero hexadecimal`,
                        col,
                        row
                    },
                    4
                ];
                str += String.fromCharCode(parseInt(hex, 16));
            } else if (next == 'U') {
                src.shift();
                const n1 = src.shift();
                const n2 = src.shift();
                const n3 = src.shift();
                const n4 = src.shift();
                const n5 = src.shift();
                const n6 = src.shift();
                const n7 = src.shift();
                const n8 = src.shift();
                const hex = `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}`;
                if (!n1 || !n2 || !n3 || !n4 || !n5 || !n6 || !n7 || !n8) return [
                    {
                        type: 'Error',
                        value: `Se esperaba un numero hexadecimal`,
                        col,
                        row
                    },
                    8
                ];
                str += String.fromCharCode(parseInt(hex, 16));
            } else if (next == '\\') str += '\\';
            else if (next == '"') str += '"';
            else if (next == "'") str += "'";
        } else str += src.shift();
    }
    src.shift();
    return [
        {
            type: 'String',
            value: str,
            col,
            row
        },
        str.length + 1
    ];
};
function tokenize1(sourceCode, file = 'iniciar.agal') {
    const tokens = tokenize(sourceCode, [
        [
            /[\n\r\t\s]/,
            skip
        ],
        [
            '(',
            'OpenParen'
        ],
        [
            ')',
            'CloseParen'
        ],
        [
            '{',
            'OpenBrace'
        ],
        [
            '}',
            'CloseBrace'
        ],
        [
            '[',
            'OpenBracket'
        ],
        [
            ']',
            'CloseBracket'
        ],
        [
            '<',
            'OpenAngle'
        ],
        [
            '>',
            'CloseAngle'
        ],
        [
            '+',
            'BinaryOperator'
        ],
        [
            '-',
            'BinaryOperator'
        ],
        [
            '*',
            'BinaryOperator'
        ],
        [
            '/',
            'BinaryOperator'
        ],
        [
            '%',
            'BinaryOperator'
        ],
        [
            '^',
            'BinaryOperator'
        ],
        [
            '=',
            'Equals'
        ],
        [
            '!',
            'Negate'
        ],
        [
            '&',
            'And'
        ],
        [
            '|',
            'Or'
        ],
        [
            ';',
            'Semicolon'
        ],
        [
            ':',
            'Colon'
        ],
        [
            ',',
            'Comma'
        ],
        [
            '.',
            'Dot'
        ],
        [
            '\\',
            'Backslash'
        ],
        [
            '"',
            toString
        ],
        [
            "'",
            toString
        ],
        [
            /[0-9]/,
            function(__char, { col, row }, line) {
                let value = __char;
                let i = col;
                while(isInt(line[++i] || '')){
                    if (line[i] == '.' && value.includes('.')) return [
                        {
                            type: 'Error',
                            value: `Un numero no puede tener mas de un punto decimal`,
                            col,
                            row
                        },
                        1
                    ];
                    if (line[i] == '.' && (value.includes('π') || value.includes('e') || value.includes('i'))) return [
                        {
                            type: 'Error',
                            value: `Una constante no puede tener un punto decimal`,
                            col,
                            row
                        },
                        1
                    ];
                    value += line[i];
                }
                return [
                    {
                        type: 'Number',
                        value,
                        col,
                        row
                    },
                    value.length - 1
                ];
            }
        ],
        [
            /[$_a-z]/i,
            function(__char, { col, row }, line) {
                let value = __char;
                let i = col;
                while(isAlpha(line[++i])){
                    value += line[i];
                }
                const reserved = KEYWORDS[value];
                if (typeof reserved === 'string') return [
                    {
                        type: reserved,
                        value,
                        col,
                        row
                    },
                    value.length - 1
                ];
                else return [
                    {
                        type: 'Identifier',
                        value,
                        col,
                        row
                    },
                    value.length - 1
                ];
            }
        ]
    ]);
    const error = tokens.find((token)=>token.type == 'Error');
    if (error) {
        tokens.length = 0;
        tokens.push(error);
    }
    tokens.push({
        type: 'EOF',
        value: '',
        col: null,
        row: null,
        file
    });
    tokens.forEach((token)=>{
        token.file = file;
        token.col++;
        token.row++;
    });
    return tokens;
}
const mathOperators = '+-*/%^';
class Parser1 {
    tokens = null;
    not_eof() {
        if (this.tokens.length == 0) return false;
        return this.tokens[0].type != TokenType1.EOF;
    }
    at() {
        return this.tokens[0] ?? {
            type: TokenType1.Error,
            value: 'No se encontro ningun token.',
            col: 0,
            row: 0,
            file: ''
        };
    }
    eat() {
        const prev = this.at();
        this.tokens.shift();
        return prev;
    }
    expect(type, err) {
        const prev = this.tokens.shift();
        if (!prev) return {
            type: TokenType1.Error,
            value: err,
            col: 0,
            row: 0,
            file: '<indeterminado>'
        };
        if (prev.type != type) return {
            ...prev,
            type: TokenType1.Error,
            value: err
        };
        return prev;
    }
    sourceCode = '';
    produceAST(sourceCode, isFunction = false, file) {
        this.sourceCode = sourceCode;
        this.tokens = tokenize1(sourceCode, file);
        const program = {
            kind: BLOCK_TYPE.PROGRAM,
            body: [],
            file: file ?? '',
            row: 0,
            col: 0
        };
        const functions = [];
        const code = [];
        while(this.not_eof()){
            const data = this.parse_stmt(isFunction);
            if (data) {
                if (data.kind === 'Error') {
                    program.body.push(data);
                    return program;
                } else if (data.kind === BLOCK_TYPE.FUNCTION_DECLARATION) functions.push(data);
                else code.push(data);
            }
        }
        program.body = [
            ...functions,
            ...code
        ];
        return program;
    }
    getTo(aCol, aRow, bCol, bRow) {
        const code = this.sourceCode.split('\n');
        const lines = aRow == bRow ? [
            code[aRow - 1]
        ] : code.slice(aRow - 1, bRow);
        lines[0] = lines[0].slice(aCol - 1);
        lines[lines.length - 1] = lines[lines.length - 1].slice(0, bCol);
        return lines.join('\n');
    }
    makeError(token, type) {
        const data = {
            kind: 'Error',
            col: token.col,
            row: token.row,
            file: token.file,
            message: token.value,
            type
        };
        return data;
    }
    parse_stmt(isFunction = false, isLoop = false, isClassDecl = false) {
        const token = this.at();
        switch(token.type){
            case TokenType1.Error:
                return this.makeError(this.eat(), ErrorType.TokenizerError);
            case TokenType1.Definir:
            case TokenType1.Const:
                return this.parse_var_decl();
            case TokenType1.Funcion:
                return this.parse_func_decl();
            case TokenType1.Si:
                return this.parse_if_stmt(isFunction, isLoop);
            case TokenType1.Entonces:
                return this.makeError({
                    ...this.eat(),
                    value: `No puede usar "${TokenType1.Entonces.toLowerCase()}" sin un "${TokenType1.Si.toLowerCase()}"`
                }, ErrorType.ParserError);
            case TokenType1.Retorna:
                if (!isFunction) return this.makeError({
                    ...this.eat(),
                    value: `No puedes usar "${TokenType1.Retorna.toLowerCase()}" fuera de una función`
                }, ErrorType.ParserError);
                return this.parse_return_stmt();
            case TokenType1.Mientras:
                return this.parse_while_stmt();
            case TokenType1.Romper:
                this.eat();
                if (!isLoop) return this.makeError({
                    ...token,
                    value: `No puedes usar "${TokenType1.Romper.toLowerCase()}" fuera de un ciclo`
                }, ErrorType.ParserError);
                return {
                    kind: 'BreakStatement',
                    col: token.col,
                    row: token.row
                };
            case TokenType1.Continuar:
                this.eat();
                if (!isLoop) return this.makeError({
                    ...token,
                    value: `No puedes usar "${TokenType1.Continuar.toLowerCase()}" fuera de un ciclo`
                }, ErrorType.ParserError);
                return {
                    kind: 'ContinueStatement',
                    col: token.col,
                    row: token.row
                };
            case TokenType1.Clase:
                if (isClassDecl) return this.makeError({
                    ...this.eat(),
                    value: `No puedes declarar una clase dentro de otra`
                }, ErrorType.ParserError);
                return this.parse_class_decl();
            case TokenType1.Identifier:
                if (isClassDecl) return this.parse_class_prop();
                else return this.parse_expr();
            case TokenType1.Estatico:
                this.eat();
                if (!isClassDecl) return this.makeError({
                    ...token,
                    value: `No puedes usar "${TokenType1.Estatico.toLowerCase()}" fuera de una clase`
                }, ErrorType.ParserError);
                return this.parse_class_prop(ClassPropertyExtra.Static);
            case TokenType1.Semicolon:
                while(this.not_eof() && this.at().type === TokenType1.Semicolon){
                    this.eat();
                }
                return this.parse_stmt(...arguments);
            case TokenType1.Intentar:
                return this.parse_try_stmt(isFunction, isLoop, isClassDecl);
            case TokenType1.Capturar:
                return this.makeError({
                    ...this.eat(),
                    value: `No puede usar "${TokenType1.Capturar.toLowerCase()}" sin un "${TokenType1.Intentar.toLowerCase()}"`
                }, ErrorType.ParserError);
            default:
                return this.parse_expr();
        }
    }
    parse_finally_stmt(isFN, isLoop) {
        let _;
        const { col, row, file, type } = this.at();
        if (type !== TokenType1.Finalmente) return;
        _ = this.expect(TokenType1.Finalmente, `No se encontró la palabra clave "${TokenType1.Finalmente.toLowerCase()}""`);
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const body = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            body.push(this.parse_stmt(isFN, isLoop));
        }
        _ = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const Finally = {
            kind: BLOCK_TYPE.FINALLY,
            body,
            col,
            row,
            file
        };
        return Finally;
    }
    parse_catch_stmt(isFN, isLoop, strict = false) {
        let _;
        const { type, col, row, file } = this.at();
        if (type === TokenType1.Capturar) {
            _ = this.expect(TokenType1.Capturar, `No se encontró la palabra clave "${TokenType1.Capturar.toLowerCase()}""`);
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            _ = this.expect(TokenType1.OpenParen, 'No se encontró "("');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            const error = this.expect(TokenType1.Identifier, 'No se encontro el identificador del error');
            if (error.type === TokenType1.Error) return this.makeError(error, ErrorType.ParserError);
            const errorName = error.value;
            _ = this.expect(TokenType1.CloseParen, 'No se encontró ")"');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            const body = [];
            while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
                body.push(this.parse_stmt(isFN, isLoop));
            }
            _ = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            const next = this.parse_catch_stmt(isFN, isLoop);
            if (next && next.kind === TokenType1.Error) return next;
            const Catch = {
                kind: BLOCK_TYPE.CATCH,
                errorName,
                body,
                next,
                col,
                row,
                file
            };
            return Catch;
        }
        if (strict) return this.makeError({
            ...this.at(),
            type: TokenType1.Error,
            value: `No se encontró "${TokenType1.Capturar.toLowerCase()}"`
        }, ErrorType.ParserError);
    }
    parse_try_stmt(isFN, isLoop, isClass) {
        const token = this.expect(TokenType1.Intentar, `No se encontró la palabra clave "${TokenType1.Intentar.toLowerCase()}""`);
        if (token.type == TokenType1.Error) return this.makeError(token, ErrorType.ParserError);
        const { col, row, file } = token;
        let _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const tryBody = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            tryBody.push(this.parse_stmt(isFN, isLoop, isClass));
        }
        _ = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const _catch = this.parse_catch_stmt(isFN, isLoop, true);
        if (_catch.kind === TokenType1.Error) return _catch;
        const _finally = this.parse_finally_stmt(isFN, isLoop);
        if (_finally && _finally.kind === TokenType1.Error) return _finally;
        return {
            kind: BLOCK_TYPE.TRY,
            body: tryBody,
            catch: _catch,
            finally: _finally,
            col,
            row,
            file
        };
    }
    parse_iterable() {
        const { col, row, file } = this.eat();
        let _ = this.expect(TokenType1.Dot, `No se encontró el token "${TokenType1.Dot.toLowerCase()}"`);
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        _ = this.expect(TokenType1.Dot, `No se encontró el token "${TokenType1.Dot.toLowerCase()}"`);
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador');
        if (data.type === TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
        const name = data.value;
        return {
            kind: LITERALS_TYPE.ITERABLE_LITERAL,
            identifier: name,
            col,
            row,
            file
        };
    }
    parse_if_stmt(isFunction = false, isLoop = false) {
        const token = this.expect(TokenType1.Si, `No se encontró "${TokenType1.Si.toLowerCase()}"`);
        if (token.type == TokenType1.Error) return this.makeError(token, ErrorType.ParserError);
        let _ = this.expect(TokenType1.OpenParen, 'No se encontró "("');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const condition = this.parse_expr();
        _ = this.expect(TokenType1.CloseParen, 'No se encontró ")"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const ifStmt = {
            kind: BLOCK_TYPE.IF_STATEMENT,
            condition,
            body: [],
            col: token.col,
            row: token.row,
            else: {
                kind: BLOCK_TYPE.ELSE_STATEMENT,
                body: [],
                col: 0,
                row: 0,
                file: token.file
            },
            file: token.file
        };
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            ifStmt.body.push(this.parse_stmt(isFunction, isLoop));
        }
        _ = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        if (this.at().type == TokenType1.Entonces) {
            const elseToken = this.eat();
            ifStmt.else.col = elseToken.col;
            ifStmt.else.row = elseToken.row;
            if (this.at().type == TokenType1.Si) {
                ifStmt.else.body.push(this.parse_if_stmt(isFunction, isLoop));
            } else {
                _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
                if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
                while(this.not_eof() && this.at().type != TokenType1.CloseBrace)ifStmt.else.body.push(this.parse_stmt(isFunction, isLoop));
                _ = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
                if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            }
        }
        return ifStmt;
    }
    parse_return_stmt() {
        const _ = this.expect(TokenType1.Retorna, `No se encontró la palabra clave "${TokenType1.Retorna.toLowerCase()}""`);
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const { col, row, file } = _;
        const value = this.parse_expr();
        return {
            kind: STATEMENTS_TYPE.RETURN_STATEMENT,
            value,
            col,
            row,
            file
        };
    }
    parse_func_decl(isVar = false) {
        let _ = this.expect(TokenType1.Funcion, `No se encontro la palabra clave "${TokenType1.Funcion.toLowerCase()}"`);
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const { col, row, file } = _;
        const nextToken = this.at();
        let name = '';
        if (nextToken.type == TokenType1.Identifier) {
            const data = this.eat();
            if (!isVar) name = data.value;
        } else if (!isVar) return this.makeError({
            ...nextToken,
            value: `No se encontró el identificador`
        }, ErrorType.ParserError);
        _ = this.expect(TokenType1.OpenParen, 'No se encontró "("');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const args = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseParen){
            const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador del argumento');
            if (data.type == TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
            args.push(data.value);
            if (this.at().type == TokenType1.Comma) this.eat();
        }
        _ = this.expect(TokenType1.CloseParen, 'No se encontró ")"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const body = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            const data = this.parse_stmt(true);
            if (data.kind === 'Error') return data;
            body.push(data);
        }
        const endToken = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (endToken.type == TokenType1.Error) return this.makeError(endToken, ErrorType.ParserError);
        return {
            kind: BLOCK_TYPE.FUNCTION_DECLARATION,
            identifier: name,
            params: args,
            body,
            string: this.getTo(col, row, endToken.col, endToken.row),
            col,
            row,
            file
        };
    }
    parse_class_decl() {
        let _ = this.expect(TokenType1.Clase, `No se encontró la palabra clave "${TokenType1.Clase.toLowerCase()}"`);
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const { col, row, file } = _;
        const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador');
        if (data.type === TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
        const name = data.value;
        let extend;
        if (this.at().type == TokenType1.Extiende) {
            this.eat();
            const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador de la extencion');
            if (data.type === TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
            extend = data.value;
        }
        _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const body = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            body.push(this.parse_stmt(false, false, true));
        }
        const endToken = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (endToken.type == TokenType1.Error) return this.makeError(endToken, ErrorType.ParserError);
        return {
            kind: BLOCK_TYPE.CLASS_DECLARATION,
            identifier: name,
            body,
            string: this.getTo(col, row, endToken.col, endToken.row),
            extend,
            col,
            row,
            file
        };
    }
    parse_class_prop(extra) {
        const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador');
        if (data.type === TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
        const name = data.value;
        const prev = this.eat();
        if (prev.type === TokenType1.OpenParen) {
            const args = [];
            while(this.not_eof() && this.at().type != TokenType1.CloseParen){
                const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador');
                if (data.type == TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
                args.push(data.value);
                if (this.at().type == TokenType1.Comma) this.eat();
            }
            let _ = this.expect(TokenType1.CloseParen, 'No se encontró ")"');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            const body = [];
            while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
                body.push(this.parse_stmt(true));
            }
            _ = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            return {
                kind: LITERALS_TYPE.CLASS_PROPERTY,
                identifier: name,
                value: {
                    kind: BLOCK_TYPE.FUNCTION_DECLARATION,
                    identifier: '',
                    params: args,
                    body,
                    col: prev.col,
                    row: prev.row,
                    file: prev.file
                },
                extra,
                col: prev.col,
                row: prev.row,
                file: prev.file
            };
        }
        if (prev.type === TokenType1.Equals) {
            const value = this.parse_expr();
            return {
                kind: LITERALS_TYPE.CLASS_PROPERTY,
                identifier: name,
                value,
                extra,
                col: prev.col,
                row: prev.row,
                file: prev.file
            };
        }
        return this.makeError({
            ...prev,
            value: 'No se encontró el valor de la propiedad'
        }, ErrorType.ParserError);
    }
    parse_while_stmt() {
        let _ = this.expect(TokenType1.Mientras, `No se encontro la palabra clave "${TokenType1.Mientras.toLowerCase()}"`);
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const { col, row, file } = _;
        _ = this.expect(TokenType1.OpenParen, 'No se encontró "("');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const condition = this.parse_expr();
        _ = this.expect(TokenType1.CloseParen, 'No se encontró ")"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        _ = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const body = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            body.push(this.parse_stmt(false, true));
        }
        _ = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        return {
            kind: BLOCK_TYPE.WHILE_STATEMENT,
            condition,
            body,
            col,
            row,
            file
        };
    }
    parse_var_decl() {
        const { col, row, file } = this.at();
        const isConstant = this.eat().type == TokenType1.Const;
        const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador');
        if (data.type === TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
        const name = data.value;
        if (this.at().type == TokenType1.Equals) {
            this.eat();
            return {
                kind: STATEMENTS_TYPE.VAR_DECLARATION,
                constant: isConstant,
                identifier: name,
                value: this.parse_expr(),
                col,
                row,
                file
            };
        }
        if (isConstant) return this.makeError({
            ...this.at(),
            value: 'Constantes deben tener un valor inical'
        }, ErrorType.ParserError);
        return {
            kind: STATEMENTS_TYPE.VAR_DECLARATION,
            constant: isConstant,
            identifier: name,
            value: undefined,
            col,
            row,
            file
        };
    }
    parse_expr() {
        const data = this.parse_assignment_expr();
        return data;
    }
    parse_assignment_expr(operator = '', left = this.parse_object_expr()) {
        if (left.kind === 'Error') return left;
        const { col, row, file } = this.at();
        if (this.at().type == TokenType1.Equals) {
            this.eat();
            operator += '=';
            if (this.at().type == TokenType1.Equals) {
                this.eat();
                operator += '=';
            }
            if (this.at().type == TokenType1.Equals) {
                this.eat();
                operator += '=';
            }
            if (operator.length >= 2) {
                const right = this.parse_object_expr();
                if (right.kind === 'Error') return right;
                return {
                    kind: EXPRESSIONS_TYPE.BINARY_EXPR,
                    left,
                    operator,
                    right,
                    col,
                    row,
                    file
                };
            }
            return {
                kind: EXPRESSIONS_TYPE.ASSIGNMENT_EXPR,
                assignee: left,
                value: this.parse_expr(),
                col,
                row,
                file
            };
        }
        if (this.at().type == TokenType1.Negate) {
            this.eat();
            return this.parse_assignment_expr('!', left);
        }
        if (this.at().type == TokenType1.Or) {
            this.eat();
            return {
                kind: EXPRESSIONS_TYPE.BINARY_EXPR,
                left,
                operator: '|',
                right: this.parse_object_expr(),
                col,
                row,
                file
            };
        }
        if (this.at().type == TokenType1.And) {
            this.eat();
            return {
                kind: EXPRESSIONS_TYPE.BINARY_EXPR,
                left,
                operator: '&',
                right: this.parse_object_expr(),
                col,
                row,
                file
            };
        }
        if (this.at().type == TokenType1.OpenAngle) return this.parse_assignment_expr(this.eat().value, left);
        if (this.at().type == TokenType1.CloseAngle) return this.parse_assignment_expr(this.eat().value, left);
        if (mathOperators.includes(this.at().value)) return this.parse_assignment_expr(this.eat().value, left);
        if (operator) {
            return {
                kind: EXPRESSIONS_TYPE.BINARY_EXPR,
                left,
                operator,
                right: this.parse_object_expr(),
                col,
                row,
                file
            };
        }
        return left;
    }
    parse_object_expr() {
        if (this.at().type != TokenType1.OpenBrace) return this.parse_array_expr();
        const { col, row, file } = this.eat();
        const properties = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            let _ = this.at();
            if (this.at().type == TokenType1.Dot) {
                properties.push(this.parse_iterable());
                if (this.at().type == TokenType1.Comma) this.eat();
                else if (this.at().type != TokenType1.CloseBrace) return this.makeError({
                    ...this.at(),
                    value: 'No se encontró coma en la propiedad del objeto'
                }, ErrorType.ParserError);
                continue;
            } else if (this.at().type == TokenType1.String) _ = this.eat();
            else if (this.at().type == TokenType1.OpenBracket) {
                this.eat();
                _ = this.at();
            } else _ = this.expect(TokenType1.Identifier, 'No se puede usar un valor que no sea un identificador como clave de objeto');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            const { value: key, col, row, file } = _;
            if (this.at().type == TokenType1.Comma) {
                this.eat();
                properties.push({
                    key,
                    kind: LITERALS_TYPE.PROPERTY,
                    col,
                    row,
                    file
                });
                continue;
            } else if (this.at().type == TokenType1.CloseBrace) {
                properties.push({
                    key,
                    kind: LITERALS_TYPE.PROPERTY,
                    col,
                    row,
                    file
                });
                continue;
            }
            _ = this.expect(TokenType1.Colon, 'No se encontró dos puntos en la propiedad del objeto');
            if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            const value = this.parse_expr();
            properties.push({
                key,
                value,
                kind: LITERALS_TYPE.PROPERTY,
                col,
                row,
                file
            });
            if (this.at().type != TokenType1.CloseBrace) {
                _ = this.expect(TokenType1.Comma, 'No se encontró coma en la propiedad del objeto');
                if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            }
        }
        const _ = this.expect(TokenType1.CloseBrace, 'No se encontró llave de cierre');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        return {
            kind: 'ObjectLiteral',
            properties,
            col,
            row,
            file
        };
    }
    parse_array_expr() {
        if (this.at().type != TokenType1.OpenBracket) return this.parse_additive_expr();
        const { col, row, file } = this.eat();
        const properties = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBracket){
            const key = properties.length.toString();
            const value = this.parse_expr();
            if (value.kind === LITERALS_TYPE.ITERABLE_LITERAL) properties.push(value);
            else properties.push({
                key,
                value,
                kind: LITERALS_TYPE.PROPERTY,
                col,
                row,
                file
            });
            if (this.at().type != TokenType1.CloseBracket) {
                const _ = this.expect(TokenType1.Comma, 'No se encontró coma en la lista');
                if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            }
        }
        const _ = this.expect(TokenType1.CloseBracket, 'No se encontró llave de cierre');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        return {
            kind: 'ArrayLiteral',
            properties,
            col,
            row,
            file
        };
    }
    parse_additive_expr() {
        let left = this.parse_multiplicative_expr();
        while(this.at().value == '+' || this.at().value == '-'){
            if (left.kind === 'Error') return left;
            const operator = this.eat().value;
            const right = this.parse_multiplicative_expr();
            left = {
                kind: EXPRESSIONS_TYPE.BINARY_EXPR,
                left,
                right,
                operator,
                col: left.col,
                row: left.row,
                file: left.file
            };
        }
        return left;
    }
    parse_member_expr(object = this.parse_primary_expr()) {
        const { col, row, file } = this.at();
        while(this.at().type == TokenType1.Dot || this.at().type == TokenType1.OpenBracket){
            const operator = this.eat();
            let property;
            let computed;
            if (operator.type == TokenType1.Dot) {
                property = this.parse_primary_expr();
                computed = false;
                if (property.kind != LITERALS_TYPE.IDENTIFIER) return this.makeError({
                    ...operator,
                    value: 'No se puede acceder a una propiedad que no sea un identificador'
                }, ErrorType.ParserError);
                property.kind = LITERALS_TYPE.PROPERTY_IDENTIFIER;
            } else {
                property = this.parse_expr();
                computed = true;
                const _ = this.expect(TokenType1.CloseBracket, 'No se encontró corchete de cierre');
                if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
            }
            object = {
                kind: 'MemberExpr',
                object,
                property,
                computed,
                col,
                row,
                file
            };
        }
        return object;
    }
    parse_arguments_list() {
        const args = [
            this.parse_expr()
        ];
        while(this.not_eof() && this.at().type == TokenType1.Comma && this.eat()){
            args.push(this.parse_expr());
        }
        return args;
    }
    parse_args() {
        let _ = this.expect(TokenType1.OpenParen, 'No se encontró paréntesis de apertura');
        if (_.type == TokenType1.Error) return [
            this.makeError(_, ErrorType.ParserError)
        ];
        const args = this.at().type == TokenType1.CloseParen ? [] : this.parse_arguments_list();
        _ = this.expect(TokenType1.CloseParen, 'No se encontró paréntesis de cierre');
        if (_.type == TokenType1.Error) return [
            this.makeError(_, ErrorType.ParserError)
        ];
        return args;
    }
    parse_call_expr(callee) {
        let call_expr = {
            kind: 'CallExpr',
            callee,
            args: this.parse_args(),
            col: callee.col,
            row: callee.row,
            file: callee.file
        };
        if (this.at().type == TokenType1.OpenParen || this.at().type == TokenType1.Dot) call_expr = this.parse_call_member_expr(call_expr);
        return call_expr;
    }
    parse_call_member_expr(object) {
        const member = this.parse_member_expr(object);
        if (this.at().type == TokenType1.OpenParen) return this.parse_call_expr(member);
        return member;
    }
    parse_multiplicative_expr() {
        let left = this.parse_sqrt_expr();
        while(this.at().value == '*' || this.at().value == '/' || this.at().value == '%'){
            if (left.kind === 'Error') return left;
            const operator = this.eat().value;
            const right = this.parse_sqrt_expr();
            left = {
                kind: EXPRESSIONS_TYPE.BINARY_EXPR,
                left,
                right,
                operator,
                col: left.col,
                row: left.row,
                file: left.file
            };
        }
        return left;
    }
    parse_sqrt_expr() {
        let left = this.parse_call_member_expr();
        while(this.at().value == '^'){
            if (left.kind === 'Error') return left;
            const operator = this.eat().value;
            const right = this.parse_call_member_expr();
            left = {
                kind: EXPRESSIONS_TYPE.BINARY_EXPR,
                left,
                right,
                operator,
                col: left.col,
                row: left.row,
                file: left.file
            };
        }
        return left;
    }
    parse_primary_expr() {
        const tk = this.at();
        switch(tk.type){
            case TokenType1.Identifier:
                return {
                    kind: LITERALS_TYPE.IDENTIFIER,
                    symbol: this.eat().value,
                    col: tk.col,
                    row: tk.row,
                    file: tk.file
                };
            case TokenType1.Number:
                {
                    const value_ = eval_complex(this.eat().value, {});
                    return {
                        kind: LITERALS_TYPE.NUMERIC_LITERAL,
                        value: value_,
                        col: tk.col,
                        row: tk.row,
                        file: tk.file
                    };
                }
            case TokenType1.EOF:
            case TokenType1.String:
                return {
                    kind: LITERALS_TYPE.STRING_LITERAL,
                    value: this.eat().value,
                    col: tk.col,
                    row: tk.row,
                    file: tk.file
                };
            case TokenType1.OpenParen:
                {
                    this.eat();
                    const value = this.parse_expr();
                    const _ = this.expect(TokenType1.CloseParen, 'No se encontró el paréntesis de cierre');
                    if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
                    return value;
                }
            case TokenType1.Funcion:
                return this.parse_func_decl();
            case TokenType1.Mientras:
                return this.parse_while_stmt();
            case TokenType1.BinaryOperator:
                if (this.at().value == '-' || this.at().value == '+') {
                    const data = this.eat();
                    const { col, row, file } = data;
                    let operator = data.value;
                    if (this.at().value === operator) {
                        this.eat();
                        operator += operator;
                    }
                    return {
                        kind: EXPRESSIONS_TYPE.UNARY_EXPR,
                        value: this.parse_primary_expr(),
                        operator,
                        col,
                        row,
                        file
                    };
                }
                break;
            case TokenType1.Error:
                return this.makeError(this.eat(), ErrorType.TokenizerError);
            case TokenType1.Dot:
                return this.parse_iterable();
        }
        this.eat();
        return this.makeError({
            ...tk,
            value: `Un token inesperado "${tk.type}"`
        }, ErrorType.TokenizerError);
    }
}
const mod = {
    Parser: Parser1,
    tokenize: tokenize1
};
function lessThan(left, right) {
    if (typeof left == 'number') if (typeof right == 'number') return left < right;
    else return left < right.real || left == right.real && right.imaginary < 0;
    else if (typeof right == 'number') return left.real < right;
    else return left.real < right.real || left.real == right.real && left.imaginary < right.imaginary;
}
function lessThanOrEqual(left, right) {
    return equals(left, right) || lessThan(left, right);
}
function binary_numeric(_stack, left, operator, right) {
    switch(operator){
        case '+':
            return add(left, right);
        case '-':
            return subtract(left, right);
        case '*':
            return multiply(left, right);
        case '/':
            return divide(left, right);
        case '%':
            return modulo(left, right);
        case '^':
            return power(left, right);
        case '':
            return modulo(left, right);
        case '==':
            return equals(left, right);
        case '!=':
            return !equals(left, right);
        case '<':
            return lessThan(left, right);
        case '<=':
            return lessThanOrEqual(left, right);
        case '>':
            return lessThan(right, left);
        case '>=':
            return lessThanOrEqual(right, left);
        case '&&':
            return binary_numeric(_stack, left, '!=', 0) && binary_numeric(_stack, right, '!=', 0);
        case '||':
            return binary_numeric(_stack, left, '!=', 0) || binary_numeric(_stack, right, '!=', 0);
    }
    return 0;
}
function parsePrimitive(_stack, value) {
    if (typeof value === 'string') return StringGetter(value);
    if (isLikeNumber(value)) return NumberGetter(value);
    if (typeof value === 'boolean') return BooleanGetter(value);
    if (value === null) return __default;
}
class Properties {
    #data = {};
    father;
    constructor(father){
        this.father = father;
    }
    get data() {
        if (this.father) return {
            ...this.father.data,
            ...this.#data
        };
        return this.#data;
    }
    is(ins) {
        if (ins === this) return true;
        if (ins.father) return this.is(ins.father);
        return false;
    }
    get(name) {
        let data = null;
        if (!data && this.#data[name] && this.#data[name] instanceof Runtime) data = this.#data[name];
        if (!data && this.father) data = this.father.get(name);
        return data || null;
    }
    set(name, value) {
        this.#data[name] = value;
        return value;
    }
    has(name) {
        return Boolean(this.data[name]);
    }
    deepKeys() {
        return Object.keys(this.data);
    }
    keys() {
        return Object.keys(this.#data);
    }
    static root;
    static getRoot() {
        if (!Properties.root) Properties.root = new Properties();
        return Properties.root;
    }
}
const RootProperties = Properties.getRoot();
const defaultStack = {
    value: null,
    next: null
};
class Runtime extends Inspecteable {
    #props;
    constructor(){
        super();
        this.#props = new Properties(this.type.loadProperties());
    }
    instanceof(type) {
        return this.#props.is(type);
    }
    async _set(name, value) {
        const data = await Promise.resolve(value);
        this.#props.set(name, data);
        return data;
    }
    async _get(name) {
        const data = await Promise.resolve(this.#props.get(name));
        if (data) return data;
        return await this.type.getProperty(name, this);
    }
    setSync(name, value) {
        return this.#props.set(name, value);
    }
    getSync(name) {
        return this.#props.get(name);
    }
    async get(name, _stack = defaultStack) {
        return await this._get(name) || __default;
    }
    async set(name, _stack, value) {
        return await this._set(name, value);
    }
    has(name) {
        return Promise.resolve(this.#props.has(name));
    }
    deepKeys() {
        return this.#props.deepKeys();
    }
    keysSync() {
        return this.#props.keys();
    }
    keys() {
        return Promise.resolve(this.#props.keys());
    }
    async call(name, stack, ..._args) {
        return new AgalTypeError(`'${name}' no es una función válida.`, stack).throw();
    }
    _aCadena() {
        return Promise.resolve('[valor en tiempo de ejecución]');
    }
    async aCadena() {
        const strfn = await this._get('aCadena');
        const strdef = await RootProperties.get('aCadena');
        if (!strfn || strfn === strdef) return this._aCadena();
        return await (await strfn.call('aCadena', defaultStack, this)).aCadena();
    }
    _aBuleano() {
        return Promise.resolve(true);
    }
    async aBuleano() {
        const strfn = await this._get('aBuleano');
        const strdef = await RootProperties.get('aBuleano');
        if (!strfn || strfn === strdef) return this._aBuleano();
        return await (await strfn.call('aBuleano', defaultStack, this)).aBuleano();
    }
    _aNumero() {
        return Promise.resolve(0);
    }
    async aNumero() {
        const strfn = await this._get('aNumero');
        const strdef = await RootProperties.get('aNumero');
        if (!strfn || strfn === strdef) return this._aNumero();
        return await (await strfn.call('aNumero', defaultStack, this)).aNumero();
    }
    _aIterable() {
        return Promise.resolve([]);
    }
    async aIterable() {
        const strfn = await this._get('aIterable');
        const strdef = await RootProperties.get('aIterable');
        if (!strfn || strfn === strdef) return this._aIterable();
        return await (await strfn.call('aIterable', defaultStack, this)).aIterable();
    }
    async _aConsola() {
        return colorize(await this.aCadena(), FOREGROUND.MAGENTA);
    }
    async aConsola() {
        const strfn = await this._get('aConsola');
        const strdef = await RootProperties.get('aConsola');
        if (!strfn || strfn === strdef) return this._aConsola();
        return await (await strfn.call('aConsola', defaultStack, this)).aCadena();
    }
    _aConsolaEn() {
        return this.aConsola();
    }
    async aConsolaEn() {
        const strfn = await this._get('aConsolaEn');
        const strdef = await RootProperties.get('aConsolaEn');
        if (!strfn || strfn === strdef) return this._aConsolaEn();
        return await (await strfn.call('aConsolaEn', defaultStack, this)).aCadena();
    }
    get type() {
        return this.constructor;
    }
    setProperties(properties) {
        this.#props = properties;
        return this;
    }
    static loadProperties() {
        return RootProperties;
    }
    static async getProperty(name, _este) {
        if (name === 'aBuleano') return await RootProperties.set('aBuleano', new AgalFunction(async (_, __, este)=>BooleanGetter(await este._aBuleano())).setName('aBuleano', defaultStack));
        if (name === 'aNumero') return await RootProperties.set('aNumero', new AgalFunction(async (_, __, este)=>NumberGetter(await este._aNumero())).setName('aNumero', defaultStack));
        if (name === 'aIterable') return await RootProperties.set('aIterable', new AgalFunction(async (_, __, este)=>AgalArray.from(await este._aIterable())).setName('aIterable', defaultStack));
        if (name === 'aCadena') return await RootProperties.set('aCadena', new AgalFunction(async (_, __, este)=>StringGetter(await este._aCadena())).setName('aCadena', defaultStack));
        if (name === 'aConsola') return await RootProperties.set('aConsola', new AgalFunction(async (_, __, este)=>StringGetter(await este._aConsola())).setName('aConsola', defaultStack));
        if (name === 'aConsolaEn') return await RootProperties.set('aConsolaEn', new AgalFunction(async (_, __, este)=>StringGetter(await este._aConsolaEn())).setName('aConsolaEn', defaultStack));
        return null;
    }
    toString() {
        return `[${this.type.name}]`;
    }
}
const defaultDeclaration = {
    col: 0,
    row: 0,
    body: [],
    identifier: '',
    kind: BLOCK_TYPE.FUNCTION_DECLARATION,
    params: [],
    string: '',
    file: ''
};
class Environment {
    parent;
    variables;
    constants;
    keywords;
    constructor(parentENV){
        this.parent = parentENV;
        this.variables = new Map();
        this.constants = new Set();
        this.keywords = new Set();
    }
    isKeyword(name) {
        if (this.keywords.has(name)) return true;
        if (!this.parent) return false;
        return this.parent.isKeyword(name);
    }
    declareVar(name, stack, value, data) {
        if (!name) return new AgalReferenceError(`No se puede declara una variable sin nombre`, stack).throw();
        if (this.isKeyword(name)) return new AgalReferenceError(`Variable '${name}' es una palabra reservada y no puede ser declarara`, stack).throw();
        else if (this.variables.has(name)) return new AgalReferenceError(`Variable '${name}' ya ha sido declarada`, stack).throw();
        if (data.constant) this.constants.add(name);
        if (data.keyword) this.keywords.add(name);
        this.variables.set(name, value);
        return value;
    }
    assignVar(name, stack, value, data) {
        const env = this.resolve(name, data);
        if (!env.variables.has(name)) return new AgalReferenceError(`Variable '${name}' no ha sido declarada`, stack).throw();
        if (env.isKeyword(name)) return new AgalReferenceError(`Variable '${name}' es una palabra reservada y no puede ser modificada`, stack).throw();
        else if (env.constants.has(name)) return new AgalReferenceError(`Variable '${name}' es una constante y no puede ser modificada`, stack).throw();
        env.variables.set(name, value);
        return value;
    }
    lookupVar(name, stack = defaultStack, data = {
        col: 0,
        row: 0
    }) {
        const env = this.resolve(name, data);
        return env.variables.get(name) || new AgalReferenceError(`Variable '${name}' no ha sido declarada`, stack).throw();
    }
    resolve(name, data) {
        if (this.variables.has(name)) return this;
        if (this.parent) return this.parent.resolve(name, data);
        return this;
    }
    toObject() {
        const obj = {};
        if (this.parent) {
            const parentObj = this.parent.toObject();
            for (const [key, value] of Object.entries(parentObj)){
                obj[key] = value;
            }
        }
        for (const [key, value] of this.variables){
            obj[key] = value;
        }
        return obj;
    }
}
const defaultEnv = new Environment();
let use = false;
const fnProperties = new Properties(Runtime.loadProperties());
class AgalFunction extends Runtime {
    native = null;
    name = '';
    vars = new Map();
    decl = defaultDeclaration;
    env = defaultEnv;
    constructor(name, decl, env){
        super();
        if (typeof name === 'function') {
            this.native = name;
            name = this.native.name;
        }
        this.setName(name || '', defaultStack);
        if (decl) this.decl = decl;
        if (env) this.env = env;
    }
    async call(name, stack, este, ..._args) {
        if (this.native) return await this.native(name, stack, este, ..._args) || AgalVoid;
        const env = new Environment(this.env);
        this.vars.forEach((value, key)=>env.declareVar(key, stack, value, this.decl));
        env.declareVar('este', stack, este, {
            keyword: true,
            col: this.decl.col,
            row: this.decl.row
        });
        const rest = [];
        this.decl.params.forEach((param, i)=>{
            const value = _args[i];
            if (rest.length > 0) return rest.push(value);
            if (typeof param === 'object' && param !== null) {
                env.declareVar(param.identifier, stack, value, this.decl);
                return rest.push(value);
            }
            env.declareVar(param, stack, value, this.decl);
        });
        return evaluate(this.decl.body, env, stack) || AgalVoid;
    }
    setVar(name, value) {
        this.vars.set(name, value);
        return this;
    }
    _aCadena() {
        return Promise.resolve(this.decl.string || `fn ${this.name}() { <código nativo> }`);
    }
    async _aConsola() {
        const name = await this.get('nombre');
        return colorize(`[Función ${name || '<anónima>'}]`, FOREGROUND.CYAN);
    }
    setName(name, _stack) {
        this.name = name || this.name;
        this.setSync('nombre', StringGetter(this.name));
        return this;
    }
    static loadProperties() {
        if (!use) {
            use = true;
            AgalFunction.default = AgalFunction.from(async ()=>{});
            fnProperties.set('ejecutar', new AgalFunction(async function(name, stack, _este, ...args) {
                const este = args.shift();
                if (!este) return new AgalReferenceError("No se ha pasado el objeto 'este'", defaultStack).throw();
                return await _este.call(name, stack, este, ...args);
            }).setName('Funcion().ejecutar', defaultStack));
        }
        return fnProperties;
    }
    static from(fn) {
        return new AgalFunction(fn);
    }
    static default;
    toConsole() {
        const name = this.getSync('nombre')?.toString();
        return colorize(`[Agal Función ${name || '<anónima>'}]`, FOREGROUND.CYAN);
    }
}
const ArrayProperties = new Properties(Runtime.loadProperties());
class AgalArray extends Runtime {
    async _aCadena() {
        const endKey = await this.length;
        const list = [];
        for(let i = 0; i < endKey && i < 100; i++){
            list.push(await this._get(`${i}`) ? await (await this.get(`${i}`)).aConsolaEn() : colorize('<vacio>', FOREGROUND.GRAY));
        }
        return `[${list.join(', ')}]`;
    }
    async _aConsola() {
        return await this.aCadena();
    }
    async _aConsolaEn() {
        return await colorize('[Lista]', FOREGROUND.CYAN);
    }
    async _aNumero() {
        return await this.length;
    }
    async _aIterable() {
        const length = await this.length;
        const list = [];
        for(let i = 0; i < length; i++)list.push(await this.get(`${i}`));
        return list;
    }
    get length() {
        const length = this.keysSync().map((k)=>parseInt(k) ?? -1).reduce((a, b)=>Math.max(a, b), -1);
        return length + 1;
    }
    static from(list) {
        const l = new AgalArray();
        for(let i = 0; i < list.length; i++)l.setSync(`${i}`, parseRuntime(defaultStack, list[i]));
        return l;
    }
    static loadProperties() {
        return ArrayProperties;
    }
    static async getProperty(name, este) {
        const maxIndex = (await este.keys()).map((k)=>parseInt(k) ?? -1).reduce((a, b)=>Math.max(a, b), -1);
        const length = maxIndex + 1;
        if (name === 'largo') return NumberGetter(length);
        if (name === 'agregar') return await ArrayProperties.set('agregar', new AgalFunction((_name, _stack, este, ...args)=>{
            for(let i = 0; i < args.length; i++)este.setSync(`${length + i}`, args[i]);
            return Promise.resolve(este);
        }).setName('Lista().agregar', defaultStack));
        return super.getProperty(name, este);
    }
    toConsole() {
        return colorize(`[Agal ${this.type.name}]`, FOREGROUND.CYAN);
    }
}
const props = new Properties(Runtime.loadProperties());
class AgalObject extends Runtime {
    static from(obj, stack) {
        const o = new AgalObject();
        Object.keys(obj).forEach((key)=>{
            o.set(key, stack, parseRuntime(defaultStack, obj[key]));
        });
        return o;
    }
    async _aConsola() {
        let ref = false;
        let obj = '{';
        const keys = await this.keys();
        if (keys.length === 0) return obj + '}';
        obj += '\n';
        for (let key of keys){
            if (key.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*$/) === null) key = Deno.inspect(key);
            const value = await this.get(key, defaultStack);
            if (value === this) ref = true;
            const valueStr = value === this ? colorize('<ref>', FOREGROUND.CYAN) : await value.aConsolaEn();
            obj += `  ${key}: ${valueStr},\n`;
        }
        obj += '}';
        if (ref) obj = colorize('<ref> ', FOREGROUND.CYAN) + obj;
        return obj;
    }
    _aConsolaEn() {
        return Promise.resolve(colorize('[Objeto]', FOREGROUND.CYAN));
    }
    static loadProperties() {
        return props;
    }
    toConsole() {
        const keys = this.keysSync();
        if (keys.length === 0) return '{}';
        let obj = '{\n';
        for (let key of keys){
            if (key.match(/^[a-zA-Z$_][a-zA-Z0-9$_]*$/) === null) key = Deno.inspect(key);
            const value = this.getSync(key);
            const valueSTR = value === this ? '<ref>' : value instanceof AgalObject ? colorize('[Agal Objeto]', FOREGROUND.CYAN) : value.toConsole();
            obj += `  ${key}: ${valueSTR.split('\n').join('\n  ')},\n`;
        }
        return colorize('[Agal Objeto ' + colorize(obj.slice(0, -2) + '\n}', FOREGROUND.WHITE) + ']', FOREGROUND.CYAN);
    }
}
const parseComplex = function parseComplex(stack, value) {
    if (value instanceof Runtime) return value;
    if (typeof value === 'function') return AgalFunction.from(value);
    if (Array.isArray(value)) return AgalArray.from(value);
    if (typeof value === 'object') return AgalObject.from(value, stack);
};
class Primitive extends Runtime {
    value;
    async set(name, stack, _value) {
        const error = new AgalTypeError(`No se puede asignar la propiedad '${name}' de ${this}`, stack).throw();
        return error;
    }
    _aCadena() {
        return Promise.resolve(`${this}`);
    }
    async _aConsola() {
        return colorize(await this.aCadena(), FOREGROUND.YELLOW);
    }
    toString() {
        return `${this.value}`;
    }
    toConsole() {
        return this.constructor.name + ' ' + colorize(`${this}`, FOREGROUND.YELLOW);
    }
}
class AgalNull extends Primitive {
    value = null;
    async get(name, stack) {
        const error = new AgalTypeError(`No se puede leer la propiedad '${name}' de ${this}`, stack).throw();
        return error;
    }
    toString() {
        return 'nulo';
    }
}
const __default = new AgalNull();
const parseRuntime = function parseRuntime(stack, value) {
    const primitive = parsePrimitive(stack, value);
    if (primitive) return primitive;
    const complex = parseComplex(stack, value);
    if (complex) return complex;
    return __default;
};
async function evaluate(astNode, env, Stack) {
    if (!astNode) return __default;
    if (Array.isArray(astNode)) {
        let result = null;
        for (const node of astNode){
            result = await evaluate(node, env, {
                value: node,
                next: Stack
            });
            if (node.kind === 'ReturnStatement') return result;
            if (result instanceof AgalError) return result;
        }
        return result ? result : AgalVoid;
    }
    const stack = astNode === Stack.value ? Stack : {
        value: astNode,
        next: Stack
    };
    switch(astNode.kind){
        case 'VarDeclaration':
            return await variable(astNode, env, stack);
        case 'FunctionDeclaration':
            return await _function(astNode, env, stack);
        case 'ClassDeclaration':
            return await _class(astNode, env, stack);
        case 'ClassProperty':
            return await classProperty(astNode, env, stack);
        case 'Program':
            return await program(astNode, env, stack);
        case 'ReturnStatement':
            return await _return(astNode, env, stack);
        case 'IfStatement':
            return await _if(astNode, env, stack);
        case 'ElseStatement':
            return await _else(astNode, env, stack);
        case 'WhileStatement':
            return await _while(astNode, env, stack);
        case 'Try':
            return await _try(astNode, env, stack);
        case 'AssignmentExpr':
            return await assignment(astNode, env, stack);
        case 'MemberExpr':
            return await member(astNode, env, stack);
        case 'CallExpr':
            return await call(astNode, env, stack);
        case 'BinaryExpr':
            return parseRuntime(stack, await binary(astNode, env, stack));
        case 'Identifier':
            return await identifier(astNode, env, stack);
        case 'StringLiteral':
            return await string(astNode, env, stack);
        case 'NumericLiteral':
            return await number(astNode, env, stack);
        case 'ArrayLiteral':
            return await array(astNode, env, stack);
        case 'ObjectLiteral':
            return await object(astNode, env, stack);
        case 'Error':
            return await error(astNode, env, stack);
    }
    throw new Error(`Cannot evaluate ${astNode.kind}`);
}
function resolveArgs(args) {
    return args.map((arg)=>resolveName(arg)).join(', ');
}
const memoData = new Map();
const memoData1 = new Map();
const memoData2 = new Map();
function identifier(identifier, env, stack) {
    const val = env.lookupVar(identifier.symbol, stack, identifier);
    if (!val) return new AgalReferenceError(`Variable '${identifier.symbol}' no ha sido declarada`, stack).throw();
    return val;
}
async function variable(varDecl, env, stack) {
    const value = varDecl.value ? await evaluate(varDecl.value, env, stack) : null;
    const data = {
        col: varDecl.col,
        row: varDecl.row,
        constant: varDecl.constant
    };
    return env.declareVar(varDecl.identifier, stack, parseRuntime(stack, value), data);
}
function contitionToBool(data) {
    if (data instanceof Primitive) {
        return data.value;
    }
    return true;
}
function getName(exp) {
    if (!exp) return '';
    if (exp.kind === 'Identifier') return exp.symbol;
    if (exp.kind === 'AssignmentExpr') return getName(exp.assignee);
    return '';
}
async function assignment(assignment, env, stack) {
    const { assignee, value } = assignment;
    const val = await evaluate(value, env, stack);
    if (val instanceof AgalError && val.throwed) return val;
    if (!assignee) return val;
    if (assignee.kind === 'MemberExpr') {
        const obj = await evaluate(assignee.object, env, stack);
        if (obj instanceof AgalError && obj.throwed) return obj;
        if (assignee.property.kind === 'PropertyIdentifier') return await obj.set(assignee.property.symbol, stack, val);
        const key = await evaluate(assignee.property, env, stack);
        if (key instanceof AgalError && key.throwed) return key;
        obj.set(await key.aCadena(), stack, val);
        return val;
    }
    const name = getName(assignee);
    if (!name) return new AgalSyntaxError(`Nombre de variable invalido`, stack).throw();
    return env.assignVar(name, stack, val, assignment);
}
async function call(call, env, stack) {
    const fn = await evaluate(call.callee, env, stack);
    if (fn instanceof AgalError && fn.throwed) return fn;
    const este = call.callee.kind === 'MemberExpr' ? await evaluate(call.callee.object, env, stack) : fn;
    if (este instanceof AgalError && este.throwed) return este;
    if (fn === null) new AgalReferenceError('"nulo" no es una función', stack).throw();
    const args = [];
    for (const arg of call.args){
        const data = await evaluate(arg, env, stack);
        if (data instanceof AgalError && data.throwed) return data;
        args.push(data);
    }
    return await fn.call(fn.name || 'nulo', stack, este, ...args);
}
async function member(member, env, stack) {
    const { object, property } = member;
    const obj = await evaluate(object, env, stack);
    if (obj instanceof AgalError && obj.throwed) return obj;
    if (property.kind === 'PropertyIdentifier') return await obj.get(property.symbol, stack);
    const propEvaluated = await evaluate(property, env, stack);
    if (propEvaluated instanceof AgalError && propEvaluated.throwed) return propEvaluated;
    const prop = await propEvaluated.aCadena();
    const result = await obj.get(prop, stack);
    return result;
}
async function binary(bin, env, stack) {
    const { left, operator, right } = bin;
    const leftVal = await evaluate(left, env, stack);
    if (leftVal instanceof AgalError && leftVal.throwed) return leftVal;
    const rightVal = await evaluate(right, env, stack);
    if (rightVal instanceof AgalError && rightVal.throwed) return rightVal;
    if (leftVal instanceof AgalNumber && rightVal instanceof AgalNumber) return binary_numeric(stack, leftVal.value, operator, rightVal.value);
    if (leftVal instanceof AgalString || rightVal instanceof AgalString) return binary_string(stack, await leftVal.aCadena(), operator, await rightVal.aCadena());
    if (operator == '==') return leftVal == rightVal;
    if (operator == '!=') return leftVal != rightVal;
}
function string_string(left, operator, right) {
    switch(operator){
        case '==':
            return left == right;
        case '!=':
            return left != right;
        case '+':
            return left + right;
        case '-':
            return left.replace(right, '');
    }
    return false;
}
const InstanceDefault = new Runtime();
const AgalVoid = new AgalNull();
AgalVoid.toString = ()=>'nada';
function resolveName(expr) {
    if (!expr) return '';
    switch(expr.kind){
        case 'Identifier':
        case 'PropertyIdentifier':
            return expr.symbol;
        case 'MemberExpr':
            return `${resolveName(expr.object)}.${resolveName(expr.property)}`;
        case 'CallExpr':
            return `${resolveName(expr.callee)}(${resolveArgs(expr.args)})`;
        case 'ArrayLiteral':
            return `[Lista]`;
        case 'ObjectLiteral':
            return `{Objeto}`;
        case 'IterableLiteral':
            return `...${expr.identifier}`;
        case 'NumericLiteral':
            return expr.value + '';
        case 'StringLiteral':
            return Deno.inspect(expr.value);
        default:
            return '';
    }
}
function parseStmt(stmt) {
    const location = `${colorize(stmt.file, FOREGROUND.CYAN)}:${colorize(stmt.row + '', FOREGROUND.YELLOW)}:${colorize(stmt.col + '', FOREGROUND.YELLOW)}`;
    switch(stmt.kind){
        case BLOCK_TYPE.FUNCTION_DECLARATION:
            return `Funcion '${stmt.identifier}' en ${location}`;
        case BLOCK_TYPE.ELSE_STATEMENT:
            return `Entonces en ${location}`;
        case BLOCK_TYPE.IF_STATEMENT:
            return `Si en ${location}`;
        case BLOCK_TYPE.WHILE_STATEMENT:
            return `Mientras en ${location}`;
        case BLOCK_TYPE.TRY:
            return `Intentar en ${location}`;
        case BLOCK_TYPE.CLASS_DECLARATION:
            return `Clase '${stmt.identifier}' en ${location}`;
        case EXPRESSIONS_TYPE.ASSIGNMENT_EXPR:
            return `Assignation en ${location}`;
        case EXPRESSIONS_TYPE.BINARY_EXPR:
            return `Operacion binaria en ${location}`;
        case EXPRESSIONS_TYPE.CALL_EXPR:
            return `Llamada a '${resolveName(stmt.callee)}' en ${location}`;
        case EXPRESSIONS_TYPE.MEMBER_EXPR:
            return `Miembro '${resolveName(stmt)}' en ${location}`;
        case LITERALS_TYPE.ARRAY_LITERAL:
            return `Lista en ${location}`;
        case LITERALS_TYPE.CLASS_PROPERTY:
            return `Propiedad de clase '${stmt.identifier}' en ${location}`;
        case LITERALS_TYPE.IDENTIFIER:
            return `Identificador '${stmt.symbol}' en ${location}`;
        case LITERALS_TYPE.ITERABLE_LITERAL:
            return `Iterable en ${location}`;
        case LITERALS_TYPE.NUMERIC_LITERAL:
            return `Numero '${stmt.value}' en ${location}`;
        case LITERALS_TYPE.OBJECT_LITERAL:
            return `Objeto en ${location}`;
        case LITERALS_TYPE.PROPERTY_IDENTIFIER:
            return `Propiedad '${stmt.symbol}' en ${location}`;
        case LITERALS_TYPE.STRING_LITERAL:
            return `Cadena '${stmt.value}' en ${location}`;
        case STATEMENTS_TYPE.VAR_DECLARATION:
            return `Declaracion de variable '${stmt.identifier}' en ${location}`;
        case STATEMENTS_TYPE.RETURN_STATEMENT:
            return `Retornar en ${location}`;
        case STATEMENTS_TYPE.BREAK_STATEMENT:
            return `Romper en ${location}`;
        case STATEMENTS_TYPE.CONTINUE_STATEMENT:
            return `Continuar en ${location}`;
        default:
            return `En ${location}`;
    }
}
function parseStack(stack) {
    const data = [];
    data.push(stack.value ? parseStmt(stack.value) : '');
    while(stack.next){
        stack = stack.next;
        data.push(stack.value ? parseStmt(stack.value) : '');
    }
    return '\n' + data.filter((item, index)=>item && data.indexOf(item) === index).join('\n');
}
const props1 = new Properties(Runtime.loadProperties());
const StringProperties = new Properties(Primitive.loadProperties());
class AgalString extends Primitive {
    value;
    constructor(value){
        super();
        this.value = value;
    }
    toString() {
        return this.value;
    }
    _aBuleano() {
        return Promise.resolve(this.value.length > 0);
    }
    _aNumero() {
        return Promise.resolve(this.value.length);
    }
    _aIterable() {
        return Promise.resolve(this.value.split('').map((__char)=>StringGetter(__char)));
    }
    _aConsola() {
        return Promise.resolve(this.value);
    }
    _aConsolaEn() {
        return Promise.resolve(Deno.inspect(this.value));
    }
    static loadProperties() {
        return StringProperties;
    }
    static async getProperty(name, este) {
        if (name === 'largo') return NumberGetter(este.value.length);
        if (name === 'mayusculas') return StringGetter(este.value.toUpperCase());
        if (name === 'minusculas') return StringGetter(este.value.toLowerCase());
        if (name === 'invertido') return StringGetter(este.value.split('').reverse().join(''));
        if (name === 'separar') return await StringProperties.set('separar', AgalFunction.from(async (_name, stack, _este, spliter)=>{
            if (spliter instanceof AgalString) {
                const splited = este.value.split(spliter.value);
                return parseRuntime(stack, splited);
            } else return new AgalTypeError('El separador debe ser una cadena', stack).throw();
        }).setName('Cadena().separar', defaultStack));
        if (/^[0-9]+$/.test(name)) return StringGetter(este.value[parseInt(name)]);
        return await super.getProperty(name, este);
    }
}
function StringGetter(string) {
    if (memoData1.has(string)) {
        return memoData1.get(string);
    }
    const agaString = new AgalString(string);
    memoData1.set(string, agaString);
    return agaString;
}
class AgalError extends Runtime {
    name;
    message;
    throwed;
    pila;
    constructor(name = 'Error', message, stack){
        super();
        this.name = name;
        this.message = message;
        this.throwed = false;
        this._set('nombre', StringGetter(name));
        this._set('mensaje', StringGetter(message));
        this.pila = parseStack(stack);
        this._set('pila', StringGetter(this.pila.replace(/\x1b[\[][0-9:]*m/g, '')));
    }
    throw() {
        this.throwed = true;
        return this;
    }
    async _aCadena() {
        const nombreRuntime = await this.get('nombre');
        const mensajeRuntime = await this.get('mensaje');
        const nombre = nombreRuntime instanceof AgalNull ? this.name : await nombreRuntime.aCadena();
        const mensaje = mensajeRuntime instanceof AgalNull ? this.message : await mensajeRuntime.aCadena();
        return `${nombre}: ${mensaje}`;
    }
    async _aConsola() {
        const data = await this._aConsolaEn();
        return `${data}${this.pila.replaceAll('\n', '\n  ')}`;
    }
    async _aConsolaEn() {
        const nombreRuntime = await this.get('nombre');
        const mensajeRuntime = await this.get('mensaje');
        const nombre = nombreRuntime instanceof AgalNull ? this.name : await nombreRuntime.aCadena();
        const mensaje = mensajeRuntime instanceof AgalNull ? this.message : await mensajeRuntime.aCadena();
        return `${colorize(nombre, FOREGROUND.RED)}: ${mensaje}`;
    }
    static loadProperties() {
        return props1;
    }
    toString() {
        return `${this.name}: ${this.message} ${this.pila}`;
    }
}
const propsType = new Properties(AgalError.loadProperties());
class AgalTypeError extends AgalError {
    constructor(message, stack){
        super('ErrorTipo', message, stack);
    }
    static loadProperties() {
        return propsType;
    }
}
const propsRef = new Properties(AgalError.loadProperties());
class AgalReferenceError extends AgalError {
    constructor(message, stack){
        super('ErrorReferencia', message, stack);
    }
    static loadProperties() {
        return propsRef;
    }
}
const propsSyn = new Properties(AgalError.loadProperties());
class AgalSyntaxError extends AgalError {
    constructor(message, stack){
        super('ErrorSintaxis', message, stack);
    }
    static loadProperties() {
        return propsSyn;
    }
}
const propsToken = new Properties(AgalError.loadProperties());
class AgalTokenizeError extends AgalError {
    constructor(message, stack){
        super('ErrorTokenizar', message, stack);
    }
    static loadProperties() {
        return propsToken;
    }
}
const props2 = new Properties(Primitive.loadProperties());
class AgalBoolean extends Primitive {
    value = false;
    async get(name, stack) {
        const error = new AgalTypeError(`No se puede leer la propiedad '${name}' de ${this}`, stack).throw();
        return error;
    }
    toString() {
        return this.value ? 'cierto' : 'falso';
    }
    _aNumero() {
        return Promise.resolve(this.value ? 1 : 0);
    }
    _aBuleano() {
        return Promise.resolve(this.value);
    }
    static loadProperties() {
        return props2;
    }
}
function BooleanGetter(__boolean) {
    if (memoData.has(__boolean)) {
        return memoData.get(__boolean);
    }
    const booleanRuntime = new AgalBoolean();
    booleanRuntime.value = __boolean;
    memoData.set(__boolean, booleanRuntime);
    return booleanRuntime;
}
const props3 = new Properties(Primitive.loadProperties());
class AgalNumber extends Primitive {
    value;
    constructor(value){
        super();
        this.value = value;
    }
    async call(_name, stack, _este, other) {
        if (other instanceof AgalNumber) return NumberGetter(multiply(this.value, other.value));
        return new AgalTypeError(`No se puede multiplicar un número con '${await other.aCadena()}'`, stack).throw();
    }
    static loadProperties() {
        return props3;
    }
    _aNumero() {
        return Promise.resolve(this.value);
    }
    _aBuleano() {
        return Promise.resolve(!!this.value);
    }
    _aIterable() {
        if (typeof this.value === 'number') return Promise.resolve([
            NumberGetter(this.value),
            NumberGetter(0)
        ]);
        return Promise.resolve([
            ...this.value
        ].map(NumberGetter));
    }
}
function NumberGetter(number) {
    const name = number.toString(36);
    if (memoData2.has(name)) return memoData2.get(name);
    const agaNumber = new AgalNumber(number);
    memoData2.set(name, agaNumber);
    return agaNumber;
}
function string(str, _env, _stack) {
    return StringGetter(str.value);
}
function number(num, _env, _stack) {
    return NumberGetter(num.value);
}
async function array(arr, env, stack) {
    const list = new AgalArray();
    let i = 0;
    for (const prop of arr.properties){
        if (prop.kind === LITERALS_TYPE.PROPERTY) {
            const data = await evaluate(prop.value, env, stack);
            if (data instanceof AgalError && data.throwed) return data;
            const key = isNaN(+prop.key) ? prop.key : i + '';
            list.set(key, stack, data);
            i++;
            continue;
        }
        const data = env.lookupVar(prop.identifier, stack, prop);
        if (data instanceof AgalError && data.throwed) return data;
        const iter = await data.aIterable();
        if (!Array.isArray(iter)) return new AgalTypeError(`Variable '${prop.identifier}' no es iterable`, stack).throw();
        for(let e = 0; e < iter.length; e++){
            const element = iter[e];
            list.set(i + '', stack, element);
        }
    }
    return list;
}
async function object(obj, env, stack) {
    const dic = new AgalObject();
    for (const prop of obj.properties){
        if (prop.kind === LITERALS_TYPE.PROPERTY) {
            const data = prop.value ? await evaluate(prop.value, env, stack) : env.lookupVar(prop.key, stack, prop);
            if (data instanceof AgalError && data.throwed) return data;
            dic.set(prop.key, stack, data);
            continue;
        }
        if (prop.kind === LITERALS_TYPE.PROPERTY_COMPUTED) {
            const key = await (await evaluate(prop.key, env, stack)).aCadena();
            const data = await evaluate(prop.value, env, stack);
            if (data instanceof AgalError && data.throwed) return data;
            dic.set(key, stack, data);
            continue;
        }
        const data = env.lookupVar(prop.identifier, stack, prop);
        if (data instanceof AgalError && data.throwed) return data;
        const keys = await data.keys();
        for (const key of keys){
            const val = await data.get(key, stack);
            if (val instanceof AgalError && val.throwed) return val;
            dic.set(key, stack, val);
        }
    }
    return dic;
}
function error(err, _env, stack) {
    const error = err.type === ErrorType.TokenizerError ? new AgalTokenizeError(err.message, stack) : err.type === ErrorType.ParserError ? new AgalSyntaxError(err.message, stack) : new AgalError('Error', err.message, stack);
    return error.throw();
}
async function _function(funcDecl, env, stack) {
    const { identifier, col, row } = funcDecl;
    const func = new AgalFunction(identifier, funcDecl, env);
    return identifier ? env.declareVar(identifier, stack, func, {
        col,
        row,
        constant: true
    }) : func;
}
async function _class(classDecl, env, stack) {
    const { identifier, col, row } = classDecl;
    const func = await AgalClass.from(classDecl, env);
    if (func instanceof AgalError) return func;
    return env.declareVar(identifier, stack, func, {
        col,
        row,
        constant: true
    });
}
function classProperty(classprp, env, stack) {
    return evaluate(classprp.value, env, stack);
}
async function program(program, env, stack) {
    const data = await evaluate(program.body, env, stack);
    if (data instanceof AgalError && data.throwed) return data;
    return env.lookupVar('modulo', stack, {
        col: 0,
        row: 0
    });
}
async function _return(returnStmt, env, stack) {
    const data = returnStmt.value ? await evaluate(returnStmt.value, env, stack) : __default;
    return data;
}
async function _if(ifStmt, env, stack) {
    const { condition, body, else: _else } = ifStmt;
    const data = await evaluate(condition, env, stack);
    if (data instanceof AgalError && data.throwed) return data;
    if (contitionToBool(data)) return await evaluate(body, env, stack);
    if (_else) return await evaluate(_else, env, stack);
    return AgalVoid;
}
async function _else(elseStmt, env, stack) {
    return await evaluate(elseStmt.body, env, stack);
}
async function _while(whileStmt, env, stack) {
    const { condition, body } = whileStmt;
    let data = await evaluate(condition, env, stack);
    while(contitionToBool(data)){
        if (data instanceof AgalError && data.throwed) return data;
        for (const stmt of body){
            switch(stmt.kind){
                case 'BreakStatement':
                    data = AgalVoid;
                case 'ContinueStatement':
                    break;
            }
            const v = await evaluate(stmt, env, stack);
            if (v instanceof AgalError && v.throwed) return v;
        }
        data = await evaluate(condition, env, stack);
    }
    return data;
}
async function _catch(nextStmt, env, stack, error) {
    error.throwed = false;
    const catchEnv = new Environment(env);
    const { body: catchBody, next, errorName } = nextStmt;
    catchEnv.declareVar(errorName, stack, error, nextStmt);
    let data = await evaluate(catchBody, catchEnv, stack);
    if (data instanceof AgalError && data.throwed && next) data = await _catch(next, env, stack, data);
    return data;
}
async function _try(_try, env, stack) {
    const { body: tryBody, catch: Catch, finally: Finally } = _try;
    let data = await evaluate(tryBody, new Environment(env), stack);
    if (data instanceof AgalError && data.throwed) data = await _catch(Catch, env, stack, data);
    if (data instanceof AgalError && data.throwed) return data;
    if (Finally) {
        const finallyEnv = new Environment(env);
        const { body: finallyBody } = Finally;
        data = await evaluate(finallyBody, finallyEnv, stack);
    }
    return data;
}
function string_number(left, operator, right) {
    switch(operator){
        case '+':
            return left + right;
        case '-':
            return left.slice(0, -right);
        case '*':
            return left.repeat(+right);
        case '/':
            return left.slice(0, Math.round(left.length / +right));
    }
    return false;
}
async function binary_string(stack, left, operator, right) {
    if (typeof right == 'string') return string_string(left, operator, right);
    if (isLikeNumber(right)) return string_number(left, operator, right);
    return new AgalTypeError(`'cadena ${operator} ${typeof right}' no es valido`, stack).throw();
}
InstanceDefault.makeInstance = ()=>new Properties(Runtime.loadProperties());
InstanceDefault.getConstructor = ()=>Promise.resolve(null);
class AgalClass extends Runtime {
    name;
    Runtime;
    #instance;
    #extends;
    isClass;
    decl;
    constructor(name, properties, extendsFrom, Runtime){
        super();
        this.name = name;
        this.Runtime = Runtime;
        this.isClass = true;
        this.decl = null;
        this.#extends = extendsFrom || InstanceDefault;
        this.#instance = this.#extends.makeInstance(Runtime);
        for(const key in properties){
            const { meta, value } = properties[key];
            let v = Promise.resolve(value);
            if (key === 'constructor') v.then((v)=>this.#instance.set(key, v)).then((v)=>this._set(key, v));
            else {
                const super_ = this.#instance.father ? new AgalObject().setProperties(this.#instance.father) : __default;
                v = v.then((v)=>v instanceof AgalFunction ? v.setVar('super', super_) : v);
                if (meta.includes(ClassPropertyExtra.Static)) v.then((v)=>this._set(key, v));
                else v.then((v)=>this.#instance.set(key, v));
            }
        }
        this._set('nombre', StringGetter(this.name));
    }
    async getConstructor() {
        const Extends = await this.#extends.getConstructor();
        const Instance = await this.#instance.get('constructor');
        if (Instance instanceof AgalFunction) Instance.setVar('super', Extends || __default);
        if (Instance) return Instance;
        if (Extends) return Extends;
        return null;
    }
    isInstance(val) {
        if (this.Runtime && val instanceof this.Runtime) return true;
        return val.instanceof(this.#instance);
    }
    get instance() {
        return this.#instance;
    }
    makeInstance(Runtime) {
        return new Properties(Runtime ? Runtime.loadProperties() : this.#instance);
    }
    async call(name, stack, _este, ..._args) {
        const constructor = await this.getConstructor();
        const Instance = new AgalObject().setProperties(this.makeInstance());
        if (constructor) {
            const res = await constructor.call(name, stack, Instance, ..._args);
            if (res !== AgalVoid) return res;
        }
        return Instance;
    }
    _aCadena() {
        return Promise.resolve(this.decl ? this.decl.string : `clase ${this.name}{ <código nativo> }`);
    }
    _aConsola() {
        const extendsIn = this.#extends === InstanceDefault ? '' : ` extiende ${this.#extends.name}`;
        return Promise.resolve(colorize(`[Clase ${this.name}${extendsIn}]`, FOREGROUND.CYAN));
    }
    static async from(decl, env) {
        const { body, identifier, extend } = decl;
        const properties = {};
        for (const method of body){
            const data = await evaluate(method.value, env, defaultStack);
            properties[method.identifier] = {
                meta: [
                    method.extra
                ],
                value: data
            };
            if (data instanceof AgalError) return data;
        }
        let extendsFrom;
        const extender = extend ? env.lookupVar(extend, defaultStack, decl) : undefined;
        if (extender instanceof AgalClass) extendsFrom = extender;
        else if (extender instanceof Runtime) return new AgalTypeError(`Solo se pueden extender clases`, defaultStack);
        const data = new AgalClass(identifier, properties, extendsFrom);
        data.decl = decl;
        return data;
    }
    toConsole() {
        const extendsIn = this.#extends === InstanceDefault ? '' : ` extiende ${this.#extends.name}`;
        return colorize(`[Agal Clase ${this.name}${extendsIn}]`, FOREGROUND.CYAN);
    }
}
const mod1 = {
    evaluate: evaluate
};
const data = [];
function writeln(str) {
    console.log(str);
    data.push(str + '\n');
}
async function __default1(setGlobal, _setKeyword) {
    const pintar = new AgalFunction(async (_name, _stack, _este, ...args)=>{
        const data = [];
        for (const arg of args)data.push(await arg.aConsola());
        writeln(data.join(' '));
    });
    setGlobal('pintar', pintar);
    const limpiar = new AgalFunction(async ()=>{
        console.clear();
        data.length = 0;
    });
    setGlobal('limpiar', limpiar);
    setGlobal('consola', AgalObject.from({
        limpiar,
        pintar,
        leer () {
            return StringGetter(data.join(''));
        }
    }, defaultStack));
}
async function __default2(setGlobal, _setKeyword, setLocal) {
    const MyError = new AgalClass('Error', {
        constructor: {
            meta: [],
            value: AgalFunction.from(async function(_name, stack, _este, mensaje) {
                if (!mensaje) return new AgalError('Error', `Error`, stack);
                if (mensaje instanceof AgalString) return new AgalError('Error', mensaje.value, stack);
                return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
            })
        }
    }, undefined, AgalError);
    setGlobal('Error', MyError, true);
    const MyErrorTipo = new AgalClass('ErrorTipo', {
        constructor: {
            meta: [],
            value: AgalFunction.from(async function(_name, stack, _este, mensaje) {
                if (!mensaje) return new AgalTypeError(`ErrorTipo`, stack);
                if (mensaje instanceof AgalString) return new AgalTypeError(mensaje.value, stack);
                return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
            })
        }
    }, MyError, AgalTypeError);
    setLocal('ErrorTipo', MyErrorTipo);
    const MyErrorReferencia = new AgalClass('ErrorReferencia', {
        constructor: {
            meta: [],
            value: AgalFunction.from(async function(_name, stack, _este, mensaje) {
                if (!mensaje) return new AgalReferenceError(`ErrorReferencia`, stack);
                if (mensaje instanceof AgalString) return new AgalReferenceError(mensaje.value, stack);
                return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
            })
        }
    }, MyError, AgalReferenceError);
    setLocal('ErrorReferencia', MyErrorReferencia);
    const MyErrorSintaxis = new AgalClass('ErrorSintaxis', {
        constructor: {
            meta: [],
            value: AgalFunction.from(async function(_name, stack, _este, mensaje) {
                if (!mensaje) return new AgalSyntaxError(`ErrorSintaxis`, stack);
                if (mensaje instanceof AgalString) return new AgalSyntaxError(mensaje.value, stack);
                return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
            })
        }
    }, MyError, AgalSyntaxError);
    setLocal('ErrorSintaxis', MyErrorSintaxis);
    const MyErrorTokenizar = new AgalClass('ErrorTokenizar', {
        constructor: {
            meta: [],
            value: AgalFunction.from(async function(_name, stack, _este, mensaje) {
                if (!mensaje) return new AgalTokenizeError(`ErrorTokenizar`, stack);
                if (mensaje instanceof AgalString) return new AgalTokenizeError(mensaje.value, stack);
                return new AgalTypeError(`Se esperaba una cadena`, stack).throw();
            })
        }
    }, MyError, AgalTokenizeError);
    setLocal('ErrorTokenizar', MyErrorTokenizar);
}
const Static = [
    ClassPropertyExtra.Static
];
async function __default3(setGlobal, _setKeyword) {
    const Buleano = new AgalClass('Buleano', {
        constructor: {
            meta: Static,
            value: AgalFunction.from(async function(_name, _stack, _este, arg) {
                return BooleanGetter(arg && await arg.aBuleano());
            }).setName('Buleano', defaultStack)
        }
    }, undefined, AgalBoolean);
    setGlobal('Buleano', Buleano, true);
    const Numero = new AgalClass('Numero', {
        constructor: {
            meta: Static,
            value: AgalFunction.from(async function(_name, _stack, _este, arg) {
                return NumberGetter(arg ? await arg.aNumero() : 0);
            }).setName('Numero', defaultStack)
        }
    }, undefined, AgalNumber);
    setGlobal('Numero', Numero, true);
    const Cadena = new AgalClass('Cadena', {
        constructor: {
            meta: Static,
            value: AgalFunction.from(async function(_name, _stack, _este, arg) {
                return StringGetter(arg ? await arg.aCadena() : '');
            }).setName('Cadena', defaultStack)
        }
    }, undefined, AgalString);
    setGlobal('Cadena', Cadena, true);
}
function tipoDe(value) {
    if (value instanceof AgalBoolean) return "buleano";
    if (value instanceof AgalNull) return "nulo";
    if (value instanceof AgalNumber) return "numero";
    if (value instanceof AgalString) return "cadena";
    return "indefinido";
}
class Libraries {
    _makers = new Map();
    _instances = new Map();
    set(name, value) {
        this._makers.set(name, value);
    }
    get(name) {
        if (!this._instances.has(name) && this._makers.has(name)) {
            this._instances.set(name, this._makers.get(name)());
        }
        return this._instances.get(name) || __default;
    }
    has(name) {
        return this._makers.has(name);
    }
}
const __default4 = new Libraries();
class AgalIntArray extends AgalArray {
    _set() {
        return Promise.resolve(new AgalReferenceError('No se puede modificar un "ListaEnteros"', defaultStack).throw());
    }
    async _aCadena() {
        const endKey = this.length;
        const list = [];
        for(let i = 0; i < endKey; i++){
            list.push(Number(await this._get(`${i}`) ? await (await this.get(`${i}`)).aCadena() : '0'));
        }
        return String.fromCharCode(...list);
    }
    async _aConsola() {
        const endKey = await this.length;
        const list = [];
        for(let i = 0; i < endKey && i < 100; i++){
            list.push(await this._get(`${i}`) ? await (await this.get(`${i}`)).aConsolaEn() : colorize('<vacio>', FOREGROUND.GRAY));
        }
        return `ListaEnteros [${list.join(', ')}]`;
    }
    _aConsolaEn() {
        return this._aConsola();
    }
    static from(list) {
        const l = new AgalIntArray();
        for(let i = 0; i < list.length; i++)l.setSync(`${i}`, NumberGetter(list[i]));
        return l;
    }
    [Symbol.iterator] = function*() {
        const endKey = this.length;
        for(let i = 0; i < endKey; i++){
            const data = this.getSync(`${i}`);
            if (data == null) yield 0;
            else yield Number(`${data.value}`) || 0;
        }
    };
}
function ListaEnteros() {
    return new AgalClass('ListaEnteros', {
        constructor: {
            meta: [],
            value: AgalFunction.from(async function(_name, _stack, _este, ...args) {
                const l = new AgalIntArray();
                for(let i = 0; i < args.length; i++){
                    if (!args[i]) continue;
                    if (args[i] instanceof AgalNumber) {
                        const data = Number(args[i].aCadena()) || 0;
                        l.setSync(`${i}`, NumberGetter(data));
                    }
                }
                return l;
            })
        },
        from: {
            meta: [],
            value: AgalFunction.from(async function(_name, stack, _este, cadena) {
                const l = new AgalIntArray();
                if (!cadena) return l;
                if (!(cadena instanceof AgalString)) {
                    return new AgalReferenceError('Se esperaba una cadena', stack).throw();
                }
                const data = await cadena.aCadena();
                for(let i = 0; i < data.length; i++){
                    l.setSync(`${i}`, NumberGetter(data.charCodeAt(i)));
                }
                return l;
            })
        }
    }, undefined, AgalIntArray);
}
function Permisos() {
    const obj = new AgalObject();
    obj.setSync('quitar', AgalFunction.from(async (_name, stack, _este, permiso, data)=>{
        if (permiso instanceof AgalString) {
            if (!data) permisos.delete(permiso.value);
            else if (data instanceof AgalString) permisos.delete(permiso.value, data.value);
            else return new AgalTypeError('Se esperaba una cadena en el dato', stack).throw();
        } else return new AgalTypeError('Se esperaba una cadena en el permiso', stack).throw();
    }));
    obj.setSync('pedir', AgalFunction.from(async (_name, stack, _este, permiso, data)=>{
        if (permiso instanceof AgalString) {
            if (!data) await permisos.get(permiso.value);
            else if (data instanceof AgalString) await permisos.get(permiso.value, data.value);
            else return new AgalTypeError('Se esperaba una cadena en el dato', stack).throw();
        } else return new AgalTypeError('Se esperaba una cadena en el permiso', stack).throw();
    }));
    return obj;
}
function FileFunctions(mod) {
    const leerArchivo = AgalFunction.from(async (_name, _stack, _este, archivo)=>{
        if (archivo instanceof AgalString) {
            const file = await permisos.get('LEER', archivo.value) ? await Deno.readFile(archivo.value).catch(()=>null) : null;
            if (file === null) return new AgalReferenceError(`No se pudo encontrar el archivo '${archivo.value}'`, _stack).throw();
            return AgalIntArray.from(file);
        } else return new AgalTypeError('El archivo debe ser una cadena', _stack).throw();
    }).setName('<internal>.sab.leerArchivo');
    mod.setSync('leerArchivo', leerArchivo);
    const crearArchivo = AgalFunction.from(async (_name, _stack, _este, archivo, datos)=>{
        if (archivo instanceof AgalString) {
            if (datos instanceof AgalIntArray) {
                const data = await permisos.get('CREAR', archivo.value) ? await Deno.writeFile(archivo.value, new Uint8Array(datos)).catch(()=>null) : false;
                if (data === null) return new AgalReferenceError(`No se pudo crear el archivo '${archivo.value}'`, _stack).throw();
                return datos;
            } else return new AgalTypeError('Los datos deben ser un ListaEnteros', _stack).throw();
        } else return new AgalTypeError('El archivo debe ser una cadena', _stack).throw();
    }).setName('<internal>.sab.crearArchivo');
    mod.setSync('crearArchivo', crearArchivo);
}
async function readDir(path) {
    const data = Deno.readDir(path);
    const files = [];
    for await (const file of data)files.push(file.name);
    return files;
}
function FolderFunctions(mod) {
    const leerCarpeta = AgalFunction.from(async (_name, _stack, _este, carpeta)=>{
        if (carpeta instanceof AgalString) {
            const data = await permisos.get('LEER', carpeta.value) ? await readDir(carpeta.value).catch(()=>null) : null;
            if (data === null) return new AgalReferenceError(`No se pudo leer la carpeta '${carpeta.value}'`, _stack).throw();
            return AgalIntArray.from(data);
        } else return new AgalTypeError('La carpeta debe ser una cadena', _stack).throw();
    }).setName('<internal>.sab.leerCarpeta');
    mod.setSync('leerCarpeta', leerCarpeta);
    const crearCarpeta = AgalFunction.from(async (_name, _stack, _este, carpeta)=>{
        if (carpeta instanceof AgalString) {
            const data = await permisos.get('CREAR', carpeta.value) ? await Deno.mkdir(carpeta.value).catch(()=>null) : false;
            if (data === null) return new AgalReferenceError(`No se pudo crear la carpeta '${carpeta.value}'`, _stack).throw();
            return AgalIntArray.from(data);
        } else return new AgalTypeError('La carpeta debe ser una cadena', _stack).throw();
    }).setName('<internal>.sab.crearCarpeta');
    mod.setSync('crearCarpeta', crearCarpeta);
}
function sab() {
    const mod = new AgalObject();
    FileFunctions(mod);
    FolderFunctions(mod);
    const borrar = AgalFunction.from(async (_name, _stack, _este, archivo)=>{
        if (archivo instanceof AgalString) {
            const data = await permisos.get('BORRAR', archivo.value) ? await Deno.remove(archivo.value).catch(()=>null) : false;
            if (data === null) return new AgalReferenceError(`No se pudo borrar '${archivo.value}'`, _stack).throw();
            return AgalIntArray.from(data);
        } else return new AgalTypeError('La ruta debe ser una cadena', _stack).throw();
    }).setName('<internal>.sab.borrar');
    mod.setSync('borrar', borrar);
    return mod;
}
__default4.set('ListaEnteros', ListaEnteros);
__default4.set('permisos', Permisos);
__default4.set('sab', sab);
const mod2 = {
    AgalIntArray: AgalIntArray,
    default: __default4
};
async function getModule(path) {
    const module = new AgalObject();
    const splitPath = path.split(/[\\\/]/g);
    await module.set('ruta', defaultStack, StringGetter(splitPath.slice(0, -1).join('/')));
    await module.set('archivo', defaultStack, StringGetter(splitPath.join('/')));
    await module.set('exporta', defaultStack, new AgalObject());
    await module.set('hijos', defaultStack, new AgalArray());
    await module.set('requiere', defaultStack, AgalFunction.from(async function requiere(_name, stack, _este, path) {
        if (path instanceof AgalString) return await makeRequire(module, path.value, stack);
        return new AgalTypeError('Se esperaba una cadena', stack).throw();
    }).setName('modulo.requiere', defaultStack));
    return module;
}
const cache = new Map();
const scope = new Environment();
const global = new AgalObject();
setKeyword('cierto', BooleanGetter(true));
setKeyword('falso', BooleanGetter(false));
setKeyword('nulo', __default);
setKeyword('este', global);
setKeyword('tipoDe', new AgalFunction(async (_name, stack, _este, data)=>{
    if (!data) return new AgalTypeError(`Se esperaba un valor y no se recibió ninguno.`, stack).throw();
    if (data instanceof Primitive) return StringGetter(tipoDe(data));
    if (data instanceof AgalObject) return StringGetter('objeto');
    if (data instanceof AgalFunction) return StringGetter('funcion');
    if (data instanceof AgalArray) return StringGetter('lista');
    if (data instanceof AgalError) return StringGetter('error');
    return StringGetter('desconocido');
}));
setKeyword('lanzar', new AgalFunction(async (_name, stack, _este, data)=>{
    if (!data) return new AgalTypeError(`Se esperaba un valor y no se recibió ninguno.`, stack).throw();
    if (data instanceof AgalError) return data.throw();
    return new AgalError('Lanzado', await data.aConsolaEn(), stack).throw();
}));
setKeyword('instanciaDe', new AgalFunction(async (_name, stack, _este, data, tipo)=>{
    if (!data) return new AgalTypeError(`Se esperaba un valor y no se recibió ninguno.`, stack).throw();
    if (!tipo) return new AgalTypeError(`Se esperaba un tipo y no se recibió ninguno.`, stack).throw();
    if (tipo instanceof AgalClass) return BooleanGetter(tipo.isInstance(data));
    return BooleanGetter(false);
}));
setGlobal('global', global, true);
setGlobal('esteGlobal', global, true);
function setGlobal(name, value, constant = false, keyword = false) {
    if (value instanceof AgalFunction) value.setName(`<agal>.${name}`, defaultStack);
    global.set(name, defaultStack, value);
    scope.declareVar(name, defaultStack, value, {
        col: 0,
        row: 0,
        constant,
        keyword
    });
}
function setKeyword(name, value) {
    if (value instanceof AgalFunction) value.setName(`<agal>.${name}`, defaultStack);
    scope.declareVar(name, defaultStack, value, {
        col: 0,
        row: 0,
        constant: true,
        keyword: true
    });
}
function setLocal(name, value) {
    scope.declareVar(name, defaultStack, value, {
        col: 0,
        row: 0,
        constant: true
    });
}
function getGlobalScope() {
    return scope;
}
async function getModuleScope(path) {
    const data = new Environment(getGlobalScope());
    const modulo = await getModule(path);
    const requiere = await modulo.get('requiere');
    data.declareVar('requiere', defaultStack, requiere, {
        col: 0,
        row: 0
    });
    data.declareVar('modulo', defaultStack, modulo, {
        col: 0,
        row: 0
    });
    return data;
}
async function agal(code, path = Deno.cwd() + '/inicio.agal', stack = defaultStack) {
    path = path.replace(/\\/g, '/');
    const parser = new Parser1();
    const program = parser.produceAST(code, false, path);
    const scope = await getModuleScope(path);
    const data = await evaluate(program, scope, stack);
    if (data instanceof AgalError) return data;
    return await data.get('exporta');
}
async function evalLine(line, lineIndex, scope, stack = defaultStack) {
    scope = scope ?? await getModuleScope(Deno.cwd() + '/inicio.agal');
    const parser = new Parser1();
    const program = parser.produceAST(line, false, `<linea:${lineIndex}>`);
    const runtime = await evaluate(program.body, scope, stack);
    return [
        runtime,
        scope,
        stack
    ];
}
async function AgalEval(code) {
    const parser = new Parser1();
    const program = parser.produceAST(code, false, '<nativo>');
    return await evaluate(program.body, getGlobalScope(), defaultStack);
}
async function __default5(setGlobal, _setKeyword, _setLocal) {
    setGlobal('salir', new AgalFunction(async ()=>Deno.exit(0)), true);
    setGlobal('analizar', new AgalFunction(async (_name, stack, _este, data)=>{
        if (data instanceof AgalString) {
            try {
                const number = eval_complex(data.value, {});
                if (Array.isArray(number)) return NumberGetter(number[0]);
                else return NumberGetter(number);
            } catch (_e) {
                return new AgalTypeError(`No se pudo analizar la cadena '${data.value}'`, stack).throw();
            }
        }
        return new AgalTypeError(`Se esperaba una cadena.`, stack).throw();
    }), true);
    setGlobal('eval', new AgalFunction(async (_name, stack, _este, data)=>{
        if (data instanceof AgalString) {
            return await AgalEval(data.value);
        }
        return new AgalTypeError(`Se esperaba una cadena.`, stack).throw();
    }));
    await __default1(setGlobal, _setKeyword);
}
const Static1 = [
    ClassPropertyExtra.Static
];
function __default6(setGlobal, _setKeyword) {
    const Lista = new AgalClass('Lista', {
        constructor: {
            meta: Static1,
            value: AgalFunction.from(function(_name, _stack, _este) {
                return Promise.resolve(new AgalArray());
            }).setName('Lista', defaultStack)
        },
        de: {
            meta: Static1,
            value: AgalFunction.from(function(_name, _stack, _este, ...args) {
                return Promise.resolve(AgalArray.from(args));
            }).setName('Lista.de', defaultStack)
        }
    }, undefined, AgalArray);
    setGlobal('Lista', Lista, true);
    const Funcion = new AgalClass('Funcion', {
        constructor: {
            meta: Static1,
            value: AgalFunction.from(async function(_name, _stack, _este, ...argums) {
                const [code, ...args] = argums.reverse();
                if (!code) return new AgalTypeError('No se ha especificado el codigo de la funcion', _stack).throw();
                const validCode = code instanceof AgalString;
                if (!validCode) return new AgalTypeError('El codigo de la funcion debe ser un texto', _stack).throw();
                const validArgs = args.every((arg)=>arg instanceof AgalString);
                if (!validArgs) return new AgalTypeError('Los argumentos de la funcion deben ser textos', _stack).throw();
                return AgalEval(`fn funcion(${args.join(',')}){ ${code} }`);
            }).setName('Funcion', defaultStack)
        }
    }, undefined, AgalFunction);
    setGlobal('Funcion', Funcion, true);
    const Objeto = new AgalClass('Objeto', {
        llaves: {
            meta: Static1,
            value: AgalFunction.from(async function(_name, _stack, _este, obj) {
                const keys = await obj.keys();
                return parseRuntime(defaultStack, keys);
            }).setName('Objeto.llaves', defaultStack)
        }
    }, undefined, AgalClass);
    setGlobal('Objeto', Objeto, true);
}
async function __default7(setGlobal, _setKeyword, _setLocal) {
    await __default6(setGlobal, _setKeyword);
    await __default3(setGlobal, _setKeyword);
    await __default2(setGlobal, _setKeyword, _setLocal);
}
await __default7(setGlobal, setKeyword, setLocal);
await __default5(setGlobal, setKeyword, setLocal);
const mod3 = await async function() {
    return {
        default: getGlobalScope
    };
}();
function resolve(path) {
    const pathArray = path.split(/[\\|\/]/).filter(Boolean);
    const PATH = [];
    for(let i = 0; i < pathArray.length; i++){
        const part = pathArray[i];
        if (part === '..') {
            PATH.pop();
        } else if (part !== '.') {
            PATH.push(part);
        }
    }
    return PATH.join('/');
}
async function makeRequire(modulo, pathFile, stack) {
    if (__default4.has(pathFile)) return __default4.get(pathFile);
    const ruta = await (await modulo.get('ruta')).aCadena();
    const folder = ((ruta || Deno.cwd()) + '/').replace(/\\/g, '/').replace(/[\/]{1,}/g, '/');
    const path = resolve(new URL(pathFile, folder).href);
    if (cache.has(path)) return cache.get(path);
    const file = await Deno.readTextFile(path).catch(()=>null);
    if (file === null) return new AgalReferenceError(`No se pudo encontrar el archivo '${pathFile}' en '${path}'`, stack).throw();
    const code = await agal(file, path, stack);
    cache.set(path, code);
    const hijos = await modulo.get('hijos');
    const hijos_agregar = await hijos.get('agregar');
    await hijos_agregar.call('agregar', stack, hijos, AgalObject.from({
        nombre: pathFile,
        ruta: path
    }, stack));
    return code;
}
const mod4 = {
    AgalArray: AgalArray,
    AgalaClass: AgalClass,
    AgalFunction: AgalFunction,
    AgalObject: AgalObject,
    parse: parseRuntime
};
const mod5 = {
    AgalReferenceError: AgalReferenceError,
    AgalSyntaxError: AgalSyntaxError,
    AgalTokenizeError: AgalTokenizeError,
    AgalTypeError: AgalTypeError,
    AgalError: AgalError,
    Properties: Properties
};
const mod6 = {
    AgalBooleanGetter: BooleanGetter,
    AgalBoolean: AgalBoolean,
    AgalNullValue: __default,
    AgalNull: AgalNull,
    AgalVoidValue: AgalVoid,
    AgalNumberGetter: NumberGetter,
    AgalNumber: AgalNumber,
    AgalPrimitive: Primitive,
    AgalStringGetter: StringGetter,
    AgalString: AgalString,
    parse: parseRuntime
};
const mod7 = {
    parse: parseRuntime,
    AgalRuntime: Runtime,
    defaultStack: defaultStack,
    complex: mod4,
    internal: mod5,
    primitive: mod6
};
const mod8 = {
    agal: agal,
    evalLine: evalLine,
    getModule: getModule,
    getModuleScope: getModuleScope,
    AgalEval: AgalEval,
    Environment: Environment,
    global: mod3,
    libraries: mod2,
    interpreter: mod1,
    values: mod7
};
const input = new InputLoop();
const allPermissions = Symbol();
class PermissionManager {
    all = allPermissions;
    permissions = {};
    isActive(permission, data) {
        if (this.permissions[permission]) {
            if (typeof this.permissions[permission][data] === 'boolean') return this.permissions[permission][data];
            if (typeof this.permissions[permission][this.all] === 'boolean') return this.permissions[permission][this.all];
        }
        if (this.permissions['TODO']) {
            if (typeof this.permissions['TODO'][data] === 'boolean') return this.permissions['TODO'][data];
            if (typeof this.permissions['TODO'][this.all] === 'boolean') return this.permissions['TODO'][this.all];
        }
    }
    delete(permission, data = this.all) {
        if (this.permissions[permission]) {
            if (typeof this.permissions[permission][data] === 'boolean') delete this.permissions[permission][data];
        }
    }
    async get(permission, data = this.all) {
        const access = this.isActive(permission, data);
        if (typeof access === 'boolean') return access;
        console.log(`El programa quiere permisos para "${permission}" ${typeof data === 'string' ? `con "${data}"` : 'de forma general'}`);
        const answer = (await input.question(`  ¿Deseas permitirlo? [S/N/P] (S = si, N = No, P = Permitir todo) `, false)).toUpperCase().trim()[0];
        if (answer === 'S') {
            this.active(permission, data);
            return true;
        }
        if (answer === 'P') {
            this.active(permission);
            return true;
        }
        return false;
    }
    active(permission, data = this.all) {
        if (!this.permissions[permission]) this.permissions[permission] = {};
        this.permissions[permission][data] = true;
    }
    unactive(permission, data = this.all) {
        if (!this.permissions[permission]) this.permissions[permission] = {};
        this.permissions[permission][data] = false;
    }
}
globalThis.permisos = new PermissionManager();
exports.frontend = mod;
exports.runtime = mod8;
return exports
})()