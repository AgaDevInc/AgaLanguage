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
    STATEMENTS_TYPE["IMPORT_STATEMENT"] = 'ImportStatement';
    STATEMENTS_TYPE["EXPORT_STATEMENT"] = 'ExportStatement';
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
    LITERALS_TYPE["CLASS_PROPERTY"] = 'ClassProperty';
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
    TokenType["Exportar"] = "Exportar";
    TokenType["Importar"] = "Importar";
    TokenType["Como"] = "Como";
    TokenType["Con"] = "Con";
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
    finalmente: 'Finalmente',
    exportar: 'Exportar',
    importar: 'Importar',
    como: 'Como',
    con: 'Con'
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
    let strLength = 0;
    let str = '';
    src.shift();
    while(src.length > 0 && src[0] != quote){
        const v = src.shift();
        strLength++;
        if (v == '\\') {
            const next = src.shift();
            strLength++;
            if (next == 'n') str += '\n';
            else if (next == 't') str += '\t';
            else if (next == 'r') str += '\r';
            else if (next == 'b') str += '\b';
            else if (next == 'f') str += '\f';
            else if (next == 'v') str += '\v';
            else if (next == '0') str += '\0';
            else if (next == 'x') {
                const n1 = src.shift();
                strLength++;
                const n2 = src.shift();
                strLength++;
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
                const n1 = src.shift();
                strLength++;
                const n2 = src.shift();
                strLength++;
                const n3 = src.shift();
                strLength++;
                const n4 = src.shift();
                strLength++;
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
                const n1 = src.shift();
                strLength++;
                const n2 = src.shift();
                strLength++;
                const n3 = src.shift();
                strLength++;
                const n4 = src.shift();
                strLength++;
                const n5 = src.shift();
                strLength++;
                const n6 = src.shift();
                strLength++;
                const n7 = src.shift();
                strLength++;
                const n8 = src.shift();
                strLength++;
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
        } else str += v;
    }
    src.shift();
    strLength++;
    return [
        {
            type: 'String',
            value: str,
            col,
            row
        },
        strLength
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
                while(isInt(line[++i] || '') || line[i] == '$'){
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
        ],
        [
            '#',
            function(_char, { col }, line) {
                return [
                    null,
                    line.length - col
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
            const data = this.parse_stmt(isFunction, undefined, undefined, true);
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
    parse_stmt(isFunction = false, isLoop = false, isClassDecl = false, isGlobalScope = false) {
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
                while(this.not_eof() && this.at().type === TokenType1.Semicolon)this.eat();
                return null;
            case TokenType1.Intentar:
                return this.parse_try_stmt(isFunction, isLoop, isClassDecl);
            case TokenType1.Capturar:
            case TokenType1.Finalmente:
                return this.makeError({
                    ...this.eat(),
                    value: `No puede usar "${token.type.toLowerCase()}" sin un "${TokenType1.Intentar.toLowerCase()}"`
                }, ErrorType.ParserError);
            case TokenType1.Importar:
                if (isGlobalScope) return this.parse_import_stmt();
                return this.parse_import_var();
            case TokenType1.Exportar:
                if (isGlobalScope) return this.parse_export_stmt();
                return this.makeError({
                    ...this.eat(),
                    value: `No puede usar "${TokenType1.Exportar.toLowerCase()}" fuera del ambito global`
                }, ErrorType.ParserError);
            default:
                return this.parse_expr();
        }
    }
    parse_import_var() {
        const { col, row, file } = this.eat();
        const next = this.at();
        if (next.type !== TokenType1.OpenParen && next.type !== TokenType1.Dot) return this.makeError({
            ...next,
            value: 'importar solo se puede usar en un ambito global'
        }, ErrorType.ParserError);
        const importIdentifier = {
            type: TokenType1.Identifier,
            value: 'importar',
            col,
            row,
            file
        };
        this.tokens.unshift(importIdentifier);
        return this.parse_expr();
    }
    parse_import_stmt() {
        const { col, row, file } = this.eat();
        const data = this.expect(TokenType1.String, 'No se encontro la ruta del archivo');
        if (data.type === TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
        const path = data.value;
        const stmt = {
            kind: STATEMENTS_TYPE.IMPORT_STATEMENT,
            path,
            col,
            row,
            file
        };
        if (this.at().type === TokenType1.Como) {
            this.eat();
            const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador');
            if (data.type === TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
            stmt.as = data.value;
        }
        if (this.at().type === TokenType1.Con) {
            this.eat();
            const tk = this.at();
            const data = this.parse_object_expr();
            if (data.kind !== LITERALS_TYPE.OBJECT_LITERAL) return this.makeError({
                ...tk,
                value: 'Se esperaba un objeto'
            }, ErrorType.ParserError);
            stmt.with = data;
        }
        return stmt;
    }
    parse_export_stmt() {
        const { col, row, file } = this.eat();
        const data = this.parse_stmt();
        let identifier = '';
        switch(data.kind){
            case STATEMENTS_TYPE.VAR_DECLARATION:
                if (!data.value) return this.makeError({
                    ...this.at(),
                    value: 'Se esperaba una asignación'
                }, ErrorType.ParserError);
            case BLOCK_TYPE.FUNCTION_DECLARATION:
            case BLOCK_TYPE.CLASS_DECLARATION:
                identifier = data.identifier;
                break;
            case LITERALS_TYPE.OBJECT_LITERAL:
                identifier = '<exportable>';
                break;
        }
        if (this.at() && this.at().type === TokenType1.Como) {
            this.eat();
            const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador');
            if (data.type === TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
            identifier = data.value;
        }
        if (!identifier) return this.makeError({
            ...this.at(),
            value: 'Se esperaba un identificador'
        }, ErrorType.ParserError);
        const value = data.kind === STATEMENTS_TYPE.VAR_DECLARATION ? data.value : data;
        const stmt = {
            kind: STATEMENTS_TYPE.EXPORT_STATEMENT,
            value,
            identifier,
            col,
            row,
            file
        };
        return stmt;
    }
    parse_finally_stmt(isFN, isLoop) {
        const { col, row, file, type } = this.at();
        if (type !== TokenType1.Finalmente) return;
        const _ = this.expect(TokenType1.Finalmente, `No se encontró la palabra clave "${TokenType1.Finalmente.toLowerCase()}""`);
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const start = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (start.type == TokenType1.Error) return this.makeError(start, ErrorType.ParserError);
        const body = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            const data = this.parse_stmt(isFN, isLoop);
            data && body.push(data);
        }
        const end = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (end.type == TokenType1.Error) return this.makeError(end, ErrorType.ParserError);
        const Finally = {
            kind: BLOCK_TYPE.FINALLY,
            body,
            col,
            row,
            file,
            start,
            end
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
            const start = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
            if (start.type == TokenType1.Error) return this.makeError(start, ErrorType.ParserError);
            const body = [];
            while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
                const data = this.parse_stmt(isFN, isLoop);
                data && body.push(data);
            }
            const end = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
            if (end.type == TokenType1.Error) return this.makeError(end, ErrorType.ParserError);
            const next = this.parse_catch_stmt(isFN, isLoop);
            if (next && next.kind === TokenType1.Error) return next;
            const Catch = {
                kind: BLOCK_TYPE.CATCH,
                errorName,
                body,
                next,
                col,
                row,
                file,
                start,
                end
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
        const start = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (start.type == TokenType1.Error) return this.makeError(start, ErrorType.ParserError);
        const tryBody = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            const data = this.parse_stmt(isFN, isLoop, isClass);
            data && tryBody.push(data);
        }
        const end = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (end.type == TokenType1.Error) return this.makeError(end, ErrorType.ParserError);
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
            file,
            start,
            end
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
        const start = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (start.type == TokenType1.Error) return this.makeError(start, ErrorType.ParserError);
        const body = [];
        const Else = {
            kind: BLOCK_TYPE.ELSE_STATEMENT,
            body: [],
            col: 0,
            row: 0,
            file: token.file,
            start,
            end: {
                col: 0,
                row: 0
            }
        };
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            const data = this.parse_stmt(isFunction, isLoop);
            body.push(data);
        }
        const end = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (end.type == TokenType1.Error) return this.makeError(end, ErrorType.ParserError);
        if (this.at().type == TokenType1.Entonces) {
            const elseToken = this.eat();
            Else.col = elseToken.col;
            Else.row = elseToken.row;
            if (this.at().type == TokenType1.Si) {
                Else.body.push(this.parse_if_stmt(isFunction, isLoop));
            } else {
                const start = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
                if (start.type == TokenType1.Error) return this.makeError(start, ErrorType.ParserError);
                Else.start = start;
                while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
                    const data = this.parse_stmt(isFunction, isLoop);
                    data && Else.body.push(data);
                }
                const end = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
                if (end.type == TokenType1.Error) return this.makeError(end, ErrorType.ParserError);
                Else.end = end;
            }
        }
        const ifStmt = {
            kind: BLOCK_TYPE.IF_STATEMENT,
            condition,
            body,
            col: token.col,
            row: token.row,
            else: Else,
            file: token.file,
            start,
            end
        };
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
            if (this.at().type === TokenType1.Dot) {
                const data = this.parse_iterable();
                if (data.kind === 'Error') return data;
                args.push(data);
                if (this.at().type == TokenType1.Comma) this.eat();
                continue;
            }
            const data = this.expect(TokenType1.Identifier, 'No se encontro el identificador del argumento');
            if (data.type == TokenType1.Error) return this.makeError(data, ErrorType.ParserError);
            args.push(data.value);
            if (this.at().type == TokenType1.Comma) this.eat();
        }
        _ = this.expect(TokenType1.CloseParen, 'No se encontró ")"');
        if (_.type == TokenType1.Error) return this.makeError(_, ErrorType.ParserError);
        const start = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (start.type == TokenType1.Error) return this.makeError(start, ErrorType.ParserError);
        const body = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            const data = this.parse_stmt(true);
            if (data && data.kind === 'Error') return data;
            data && body.push(data);
        }
        const end = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (end.type == TokenType1.Error) return this.makeError(end, ErrorType.ParserError);
        return {
            kind: BLOCK_TYPE.FUNCTION_DECLARATION,
            identifier: name,
            params: args,
            body,
            string: this.getTo(col, row, end.col, end.row),
            col,
            row,
            file,
            start,
            end
        };
    }
    parse_class_decl() {
        const _ = this.expect(TokenType1.Clase, `No se encontró la palabra clave "${TokenType1.Clase.toLowerCase()}"`);
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
        const start = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (start.type == TokenType1.Error) return this.makeError(start, ErrorType.ParserError);
        const body = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            const data = this.parse_stmt(false, false, true);
            data && body.push(data);
        }
        const end = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (end.type == TokenType1.Error) return this.makeError(end, ErrorType.ParserError);
        return {
            kind: BLOCK_TYPE.CLASS_DECLARATION,
            identifier: name,
            body,
            string: this.getTo(col, row, end.col, end.row),
            extend,
            col,
            row,
            file,
            start,
            end
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
                if (this.at().type === TokenType1.Dot) {
                    const data = this.parse_iterable();
                    if (data.kind === 'Error') return data;
                    args.push(data);
                    if (this.at().type == TokenType1.Comma) this.eat();
                    continue;
                }
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
                const data = this.parse_stmt(true);
                data && body.push(data);
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
        const start = this.expect(TokenType1.OpenBrace, 'No se encontró "{"');
        if (start.type == TokenType1.Error) return this.makeError(start, ErrorType.ParserError);
        const body = [];
        while(this.not_eof() && this.at().type != TokenType1.CloseBrace){
            const data = this.parse_stmt(false, true);
            data && body.push(data);
        }
        const end = this.expect(TokenType1.CloseBrace, 'No se encontró "}"');
        if (end.type == TokenType1.Error) return this.makeError(end, ErrorType.ParserError);
        return {
            kind: BLOCK_TYPE.WHILE_STATEMENT,
            condition,
            body,
            col,
            row,
            file,
            start,
            end
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
                property = this.parse_primary_expr(true);
                computed = false;
                if (property.kind != LITERALS_TYPE.IDENTIFIER) return this.makeError({
                    ...operator,
                    value: 'No se puede acceder a una propiedad que no sea un identificador'
                }, ErrorType.ParserError);
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
    parse_primary_expr(isProp) {
        const tk = this.at();
        switch(tk.type){
            case TokenType1.Exportar:
            case TokenType1.Importar:
                if (!isProp) return this.makeError({
                    ...tk,
                    value: `${tk.type.toLowerCase()} no puede ser usado como expresión`
                }, ErrorType.ParserError);
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
                    this.eat();
                    const data = [
                        10,
                        '0'
                    ];
                    if (tk.value.includes('$')) {
                        const [base, value] = tk.value.split('$');
                        const __float = parseFloat(base);
                        const __int = parseInt(base);
                        if (__int !== __float || __int < 0) return this.makeError({
                            ...tk,
                            value: 'El número base debe ser un número entero real positivo'
                        }, ErrorType.ParserError);
                        if (2 > __int || __int > 36) return this.makeError({
                            ...tk,
                            value: 'El número base debe estar entre 2 y 36'
                        }, ErrorType.ParserError);
                        data[0] = __int;
                        data[1] = value;
                    }
                    const value_ = data[0] === 10 ? eval_complex(tk.value, {}) : parseInt(data[1], data[0]);
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
                return this.parse_func_decl(true);
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
                        value: this.parse_expr(),
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
            case TokenType1.Negate:
                this.eat();
                return {
                    kind: EXPRESSIONS_TYPE.UNARY_EXPR,
                    value: this.parse_expr(),
                    operator: tk.value,
                    col: tk.col,
                    row: tk.row,
                    file: tk.file
                };
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
class AgalRuntime {
    async call(stack, name, _self, ..._args) {
        return await new AgalTypeError(stack, `No se puede llamar a ${name}, no es una función.`).throw();
    }
    static free(data) {
        const class_ = data.constructor;
        if (class_.free === AgalRuntime.free) return;
        class_.free(data);
    }
}
class AgalPrimitive extends AgalRuntime {
    get(stack) {
        return new AgalTypeError(stack, `No se puede obtener una propiedad de un valor primitivo.`).throw();
    }
    set(stack, _key, _value) {
        return new AgalTypeError(stack, `No se puede asignar una propiedad a un valor primitivo.`).throw();
    }
    delete() {}
    has() {
        return false;
    }
    keys() {
        return [];
    }
    toString() {
        return `${this.value}`;
    }
}
const cache = new Map();
class AgalString extends AgalPrimitive {
    value;
    constructor(value){
        super();
        this.value = value;
    }
    static from(value) {
        if (cache.has(value)) return cache.get(value);
        const instance = new AgalString(value);
        cache.set(value, instance);
        return instance;
    }
    static free(data) {
        if (data instanceof AgalString) {
            cache.delete(data.value);
            return;
        }
        super.free(data);
    }
}
class AgalComplex extends AgalRuntime {
    #props = new Map();
    get(_stack, name) {
        return this.#props.get(name) ?? null;
    }
    set(_stack, name, value) {
        this.#props.set(name, value);
        return value;
    }
    delete(_stack, name) {
        this.#props.delete(name);
    }
    has(_stack, name) {
        return this.#props.has(name);
    }
    keys() {
        const keys = [];
        for (const key of this.#props.keys()){
            if (typeof key === 'string') keys.push(key);
        }
        return keys;
    }
    toString() {
        return `[${this.type}]`;
    }
}
class AgalError extends AgalComplex {
    stack;
    message;
    name;
    throwned;
    type;
    constructor(stack, message, name = 'Error'){
        super();
        this.stack = stack;
        this.message = message;
        this.name = name;
        this.throwned = false;
        this.type = `${name}: ${message}`;
        this.set(stack, 'mensaje', AgalString.from(message));
        this.set(stack, 'nombre', AgalString.from(name));
    }
    throw() {
        this.throwned = true;
        return this;
    }
    catch() {
        this.throwned = false;
        return this;
    }
    toString() {
        return `${this.name}: ${this.message}`;
    }
}
class AgalTypeError extends AgalError {
    constructor(stack, message){
        super(stack, message, 'ErrorTipo');
    }
}
class AgalReferenceError extends AgalError {
    constructor(stack, message){
        super(stack, message, 'ErrorReferencia');
    }
}
class AgalTokenizeError extends AgalError {
    constructor(stack, message){
        super(stack, message, 'ErrorTokenizar');
    }
}
class AgalSyntaxError extends AgalError {
    constructor(stack, message){
        super(stack, message, 'ErrorSintaxis');
    }
}
class AgalUncatched extends AgalError {
    constructor(stack, message){
        super(stack, message, 'SinCapturar');
    }
}
class Enviroment {
    parent;
    childrens = [];
    variables = new Map();
    constants = new Set();
    keywords = new Set();
    constructor(parent){
        this.parent = parent;
    }
    createChild() {
        const child = new Enviroment(this);
        this.childrens.push(child);
        return child;
    }
    deleteChild(child) {
        const index = this.childrens.indexOf(child);
        if (index === -1) return false;
        this.childrens.splice(index, 1);
        return true;
    }
    isKeyword(name) {
        return Boolean(this.keywords.has(name) || this.parent?.isKeyword(name));
    }
    set(name, stack, value, data) {
        if (!name) return new AgalReferenceError(stack, 'No se puede declarar una variable sin nombre').throw();
        if (this.isKeyword(name) && !data.keyword) return new AgalReferenceError(stack, `Variable '${name}' es una palabra reservada y no puede ser declarara`).throw();
        else if (this.variables.has(name)) return new AgalReferenceError(stack, `Variable '${name}' ya ha sido declarada`).throw();
        if (data.constant) this.constants.add(name);
        if (data.keyword) this.keywords.add(name);
        this.variables.set(name, value);
        return value;
    }
    edit(name, stack, value, data) {
        const env = this.resolve(name, data);
        if (!env.variables.has(name)) return new AgalReferenceError(stack, `Variable '${name}' no ha sido declarada`).throw();
        if (env.isKeyword(name)) return new AgalReferenceError(stack, `Variable '${name}' es una palabra reservada y no puede ser modificada`).throw();
        else if (env.constants.has(name)) return new AgalReferenceError(stack, `Variable '${name}' es una constante y no puede ser modificada`).throw();
        env.variables.set(name, value);
        return value;
    }
    get(name, stack, data) {
        const env = this.resolve(name, data);
        if (!env.variables.has(name)) return new AgalReferenceError(stack, `Variable '${name}' no ha sido declarada`).throw();
        return env.variables.get(name);
    }
    resolve(name, data) {
        if (this.variables.has(name)) return this;
        if (this.parent) return this.parent.resolve(name, data);
        return this;
    }
    clear() {
        this.variables.clear();
        this.constants.clear();
        this.keywords.clear();
    }
    toObject() {
        const obj = this.parent?.toObject() ?? {};
        for (const [key, value] of this.variables){
            obj[key] = value;
        }
        return obj;
    }
}
const cache1 = new Map();
class AgalBoolean extends AgalPrimitive {
    value;
    constructor(value){
        super();
        this.value = value;
    }
    static from(value) {
        if (cache1.has(value)) return cache1.get(value);
        const instance = new AgalBoolean(value);
        cache1.set(value, instance);
        return instance;
    }
    toString() {
        return this.value ? 'cierto' : 'falso';
    }
}
class AgalNull extends AgalPrimitive {
    value;
    constructor(){
        super();
    }
    static getVoid() {
        if (AgalNull.void) return AgalNull.void;
        AgalNull.void = new AgalNull();
        return AgalNull.void;
    }
    static from(isVoid) {
        if (isVoid) return AgalNull.getVoid();
        if (AgalNull.instance) return AgalNull.instance;
        AgalNull.instance = new AgalNull();
        return AgalNull.instance;
    }
    static instance = null;
    static void = null;
    toString() {
        if (this === AgalNull.getVoid()) return 'vacio';
        return 'nulo';
    }
}
const cache2 = new Map();
class AgalNumber extends AgalPrimitive {
    value;
    constructor(value){
        super();
        this.value = value;
    }
    get real() {
        if (typeof this.value === 'number') return this.value;
        return this.value.real;
    }
    get imaginary() {
        if (typeof this.value === 'number') return 0;
        return this.value.imaginary;
    }
    static from(value) {
        const name = value.toString();
        if (name.includes('NaN')) {
            if (cache2.has('NaN')) return cache2.get('NaN');
            const instance = new AgalNumber(value);
            cache2.set('NaN', instance);
            return instance;
        }
        if (cache2.has(name)) return cache2.get(name);
        const instance = new AgalNumber(value);
        cache2.set(name, instance);
        return instance;
    }
    static free(data) {
        if (data instanceof AgalNumber) {
            cache2.delete(data.value.toString());
            return;
        }
        super.free(data);
    }
}
function typeOf(type) {
    if (type instanceof AgalBoolean) return 'buleano';
    if (type instanceof AgalNull) {
        if (type === AgalNull.getVoid()) return 'vacio';
        return 'nulo';
    }
    if (type instanceof AgalNumber) return 'numero';
    if (type instanceof AgalString) return 'cadena';
    return 'desconocido';
}
const defaultStack = {
    value: null,
    next: null
};
const mod1 = {
    defaultStack: defaultStack
};
function parse(data) {
    if (data instanceof AgalPrimitive) return data;
    if (typeof data === "number" || data instanceof ComplexNumber) return AgalNumber.from(data);
    if (typeof data === "boolean") return AgalBoolean.from(data);
    if (typeof data === "string") return AgalString.from(data);
    return AgalNull.from();
}
const mod2 = {
    AgalBoolean: AgalBoolean,
    AgalNull: AgalNull,
    AgalNumber: AgalNumber,
    AgalString: AgalString,
    default: AgalPrimitive,
    parse: parse,
    typeOf: typeOf
};
class AgalDictionary extends AgalComplex {
    type = 'Diccionario';
    static from(value) {
        const res = new AgalDictionary();
        for(const key in value){
            res.set(defaultStack, key, __default(value[key]));
        }
        return res;
    }
}
async function interpreter(node, env, stack) {
    if (!node) return AgalNull.from(true);
    if (Array.isArray(node)) {
        let result = null;
        for (const Node of node){
            const Stack = Node === stack?.value ? stack : {
                value: Node,
                next: stack
            };
            result = await interpreter(Node, env, Stack);
            if (Node.kind === 'ReturnStatement') return result;
            if (result instanceof AgalError) return result;
        }
        return AgalNull.from(true);
    }
    const Stack = node === stack?.value ? stack : {
        value: node,
        next: stack
    };
    switch(node.kind){
        case 'Error':
            {
                if (node.type === ErrorType.ParserError) return new AgalSyntaxError(Stack, node.message).throw();
                if (node.type === ErrorType.TokenizerError) return new AgalTokenizeError(Stack, node.message).throw();
                return new AgalError(Stack, node.message).throw();
            }
        case LITERALS_TYPE.STRING_LITERAL:
            return mod4.string(node, env, Stack);
        case LITERALS_TYPE.NUMERIC_LITERAL:
            return mod4.numeric(node, env, Stack);
        case LITERALS_TYPE.IDENTIFIER:
            return mod4.identifier(node, env, Stack);
        case LITERALS_TYPE.ITERABLE_LITERAL:
            return await mod4.iterable(node, env, Stack);
        case LITERALS_TYPE.OBJECT_LITERAL:
            return await mod4.dictionary(node, env, Stack);
        case LITERALS_TYPE.ARRAY_LITERAL:
            return await mod4.list(node, env, Stack);
        case STATEMENTS_TYPE.EXPORT_STATEMENT:
            return await mod5._export(node, env, Stack);
        case STATEMENTS_TYPE.IMPORT_STATEMENT:
            return await mod5._import(node, env, Stack);
        case STATEMENTS_TYPE.RETURN_STATEMENT:
            return await mod5._return(node, env, Stack);
        case STATEMENTS_TYPE.VAR_DECLARATION:
            return await mod6.variable(node, env, Stack);
        case BLOCK_TYPE.PROGRAM:
            return await program(node, env, Stack);
        case BLOCK_TYPE.FUNCTION_DECLARATION:
            return mod6._function(node, env, Stack);
        case BLOCK_TYPE.CLASS_DECLARATION:
            return mod6._class(node, env, Stack);
        case BLOCK_TYPE.IF_STATEMENT:
            return await mod5._if(node, env, Stack);
        case BLOCK_TYPE.TRY:
            return await mod5._try(node, env, Stack);
        case BLOCK_TYPE.WHILE_STATEMENT:
            return await mod5._while(node, env, Stack);
        case EXPRESSIONS_TYPE.ASSIGNMENT_EXPR:
            return await mod7.assignment(node, env, Stack);
        case EXPRESSIONS_TYPE.MEMBER_EXPR:
            return await mod7.member(node, env, Stack);
        case EXPRESSIONS_TYPE.BINARY_EXPR:
            return await mod7.binary(node, env, Stack);
        case EXPRESSIONS_TYPE.CALL_EXPR:
            return await mod7.call(node, env, Stack);
        case EXPRESSIONS_TYPE.UNARY_EXPR:
            return await mod7.unary(node, env, Stack);
        default:
            return AgalNull.from();
    }
}
class AgalFunction extends AgalComplex {
    stmt;
    #native;
    constructor(stack, name, config){
        super();
        if (typeof config === 'function') {
            this.#native = config;
        } else {
            this.stmt = config;
        }
        this.set(stack, 'nombre', AgalString.from(name));
    }
    set type(value) {}
    get type() {
        return `Función ${this.get(defaultStack, 'nombre')?.toString() ?? '<anonima>'}`;
    }
    async call(stack, name, self, ...args) {
        if (this.#native) {
            return await this.#native(stack, name, self, ...args);
        }
        if (this.stmt) {
            const { env, stmt } = this.stmt;
            if (stmt.body.length === 0) return null;
            const newEnv = env.createChild();
            newEnv.set('este', stack, self, stmt);
            for(let i = 0; i < stmt.params.length; i++){
                const param = stmt.params[i];
                if (typeof param === 'string') {
                    newEnv.set(param, stack, args.shift() ?? AgalNull.from(), stmt);
                } else {
                    newEnv.set(param.identifier, stack, args.shift() ?? AgalNull.from(), stmt);
                }
            }
            const result = await interpreter(stmt.body, newEnv, stack);
            if (result !== AgalNull.from(true)) return result;
        }
        return null;
    }
    static from(config) {
        return new AgalFunction(defaultStack, config.name || '<anonima>', config);
    }
}
function parseComplex(data) {
    if (data instanceof AgalComplex) return data;
    if (typeof data === 'function') return new AgalFunction(defaultStack, data.name || '<anonima>', data);
    if (Array.isArray(data)) return AgalList.from(data);
    return AgalDictionary.from(data);
}
const unparse = (data)=>parseComplex(data) || parse(data);
function string(node, _env, _stack) {
    return AgalString.from(node.value);
}
function isNativeConfig(config) {
    return '__constructor__' in config && typeof config.__constructor__ === 'function' && 'isInstance' in config && typeof config.isInstance === 'function';
}
class AgalInstance extends AgalComplex {
    props;
    type;
    #loaded;
    constructor(stack, props, parent){
        super();
        this.props = props;
        this.#loaded = false;
        if (!parent) this.#loaded = true;
        const constructor = props.get('__constructor__');
        if (constructor === parent) this.#loaded = true;
        else {
            const call = constructor?.call;
            if (call) constructor.call = (stack, name, self, ...args)=>{
                this.#loaded = true;
                return call.call(constructor, stack, name, self, ...args);
            };
        }
        this.type = `Objeto ${constructor?.get(stack, 'nombre')?.toString() ?? '<anonimo>'}`;
    }
    _set(stack, key, value) {
        return super.set(stack, key, value);
    }
    set(stack, key, value) {
        if (!this.#loaded) return new AgalReferenceError(stack, 'No se puede modificar un objeto antes de que se cargue').throw();
        return this._set(stack, key, value);
    }
    get(stack, key) {
        return super.get(stack, key) || this.props.get(key) || null;
    }
}
class AgalClass extends AgalComplex {
    name;
    #native;
    #stmt;
    #isLoaded;
    #props;
    parent;
    constructor(name, config){
        super();
        this.name = name;
        this.#isLoaded = false;
        this.#props = new Map();
        if (isNativeConfig(config)) {
            this.#native = config;
            this.parent = config.parent;
        } else {
            this.#stmt = config;
        }
    }
    get type() {
        if (this.parent) return `Clase ${this.name} extiende ${this.parent.name}`;
        return `Clase ${this.get(defaultStack, 'nombre')?.toString() ?? this.name}`;
    }
    async load(stack) {
        if (this.#isLoaded) return null;
        if (this.#native) this.set(stack, 'nombre', AgalString.from(this.name));
        if (!this.#stmt) return null;
        const { stmt, env } = this.#stmt;
        const envClass = env.createChild();
        this.set(stack, 'nombre', AgalString.from(stmt.identifier || this.name));
        if (stmt.extend) {
            const parent = envClass.get(stmt.extend, stack, stmt);
            if (parent instanceof AgalError) return parent;
            if (!(parent instanceof AgalClass)) return new AgalReferenceError(stack, 'Solo se pueden extender clases');
            envClass.set('super', stack, parent, stmt);
            this.parent = parent;
        }
        for (const prop of stmt.body){
            if (!prop) continue;
            const name = prop.identifier;
            if (!name) continue;
            if (!prop.value) continue;
            const value = await interpreter(prop.value, envClass, stack);
            if (prop.extra === ClassPropertyExtra.Static) {
                if (this.has(stack, name)) return new AgalReferenceError(stack, 'No se pueden declarar dos propiedades estaticas con el mismo nombre');
                this.set(stack, name, value);
            } else {
                if (this.#props.has(name)) return new AgalReferenceError(stack, 'No se pueden declarar dos propiedades con el mismo nombre');
                this.#props.set(name, value);
            }
        }
        this.#props.set('__constructor__', this);
        this.#isLoaded = true;
        return null;
    }
    async call(stack, name, self, ...args) {
        if (this.#native) {
            return await this.#native.__constructor__(stack, name, self, ...args);
        }
        if (this.#stmt) {
            const data = await this.load(stack);
            if (data) return data;
            return new AgalInstance(stack, this.#props, this.parent);
        }
        return null;
    }
    isInstance(value) {
        if (this.#native && this.#native.isInstance(value)) return true;
        const __constructor__ = value.get(defaultStack, '__constructor__');
        if (!__constructor__) return false;
        if (__constructor__ === this) return true;
        if (__constructor__.parent === this) return true;
        return false;
    }
}
class AgalList extends AgalComplex {
    type = 'Lista';
    get length() {
        const keys = this.keys();
        return keys.reduce((acc, key)=>{
            const n = Number(key);
            if (isNaN(n)) return acc;
            return Math.max(acc, n + 1);
        }, 0);
    }
    get(_stack, name) {
        if (name === 'largo') return AgalNumber.from(this.length);
        return super.get(_stack, name);
    }
    set(_stack, name, value) {
        if (name === 'largo') {
            if (value instanceof AgalNumber) {
                const x = Number(value.value);
                if (isNaN(x)) return new AgalTypeError(_stack, `El largo de una lista debe ser un número real. (${x})`).throw();
                if (x.toString().includes('.')) return new AgalTypeError(_stack, `El largo de una lista debe ser un número entero. (${x})`).throw();
                if (x < 0) return new AgalTypeError(_stack, `El largo de una lista debe ser positivo. (${x})`).throw();
                const length = this.length;
                if (x < length) for(let i = length; i > x; i--)this.delete(_stack, i.toString());
                else for(let i = length; i < x; i++)this.set(_stack, i.toString(), AgalNull.from(true));
            }
        }
        return super.set(_stack, name, value);
    }
    *[Symbol.iterator]() {
        for(let i = 0; i < this.length; i++)yield unparse(this.get(defaultStack, i.toString()));
    }
    static from(list) {
        const result = new AgalList();
        list.forEach((item, index)=>result.set(defaultStack, index.toString(), __default(item)));
        return result;
    }
}
function typeOf1(type) {
    if (type instanceof AgalClass) return 'clase';
    if (type instanceof AgalDictionary) return 'diccionario';
    if (type instanceof AgalError) return 'error';
    if (type instanceof AgalFunction) return 'funcion';
    if (type instanceof AgalList) return 'lista';
    if (type instanceof AgalComplex) return 'objeto';
    return 'desconocido';
}
const mod3 = {
    AgalClass: AgalClass,
    AgalInstance: AgalInstance,
    AgalDictionary: AgalDictionary,
    AgalError: AgalError,
    AgalReferenceError: AgalReferenceError,
    AgalTokenizeError: AgalTokenizeError,
    AgalTypeError: AgalTypeError,
    AgalUncatched: AgalUncatched,
    AgalSyntaxError: AgalSyntaxError,
    AgalFunction: AgalFunction,
    AgalList: AgalList,
    default: AgalComplex,
    parse: parseComplex,
    typeOf: typeOf1
};
function typeOf2(type) {
    if (type instanceof AgalComplex) return typeOf1(type);
    if (type instanceof AgalPrimitive) return typeOf(type);
    return 'desconocido';
}
async function AgalRuntimeToAgalBoolean(stack, value) {
    if (value instanceof AgalComplex) {
        const bool = value.get(stack, '__buleano__');
        if (bool instanceof AgalFunction) {
            const result = await bool.call(stack, '__buleano__', value);
            if (result instanceof AgalBoolean) return result;
        }
        return AgalBoolean.from(true);
    }
    if (value instanceof AgalPrimitive) {
        if (value instanceof AgalBoolean) return value;
        if (value instanceof AgalNumber) {
            if (value === AgalNumber.from(0)) return AgalBoolean.from(false);
            if (value === AgalNumber.from(NaN)) return AgalBoolean.from(false);
            return AgalBoolean.from(true);
        }
        return AgalBoolean.from(!!value.value);
    }
    return new AgalError(stack, `Se esperaba un Booleano pero se recibio un "${typeOf2(value || AgalNull.from())}"`).throw();
}
async function _export(node, env, stack) {
    const data = env.get('exportar', stack, node);
    if (data instanceof AgalError && data.throwned) return data;
    if (node.identifier === '<exportable>') {
        const value = await interpreter(node.value, env, stack);
        if (value instanceof AgalError) return value;
        if (value instanceof AgalDictionary) {
            const keys = value.keys();
            for (const key of keys){
                const original = data.get(stack, key);
                data.set(stack, key, value.get(stack, key) || original || AgalNull.from(true));
            }
        }
        return value;
    }
    const value = await interpreter(node.value, env, stack);
    if (value instanceof AgalError) return value;
    data.set(stack, node.identifier, value);
    return data;
}
function getName(exp) {
    if (!exp) return '';
    if (exp.kind === LITERALS_TYPE.IDENTIFIER) return exp.symbol;
    if (exp.kind === EXPRESSIONS_TYPE.ASSIGNMENT_EXPR) return getName(exp.assignee);
    return '';
}
async function variable(node, env, stack) {
    const value = await interpreter(node.value, env, stack);
    return env.set(node.identifier, stack, value, node);
}
async function program(node, env, stack) {
    const result = await interpreter(node.body, env, stack);
    if (result instanceof AgalError && result.throwned) return result;
    return env.get('modulo', stack, node);
}
function numeric(node, _env, _stack) {
    return AgalNumber.from(node.value);
}
function identifier(node, env, stack) {
    const value = env.get(node.symbol, stack, node);
    return value;
}
async function iterable(node, env, stack) {
    const value = env.get(node.identifier, stack, node);
    if (value instanceof AgalError && value.throwned) return value;
    return await AgalRuntimeToAgalIterable(stack, value);
}
function insertable(value) {
    if (value instanceof AgalNull) return AgalNull.from();
    return value;
}
async function list(node, env, stack) {
    const list = new AgalList();
    for (const element of node.properties){
        const i = list.length;
        if (!element) continue;
        if (element.kind === LITERALS_TYPE.PROPERTY) {
            if (!element.value) {
                list.set(stack, `${i}`, AgalNull.from(true));
                continue;
            }
            const v = await interpreter(element.value, env, stack);
            list.set(stack, `${i}`, insertable(v));
            continue;
        }
        if (element.kind === LITERALS_TYPE.ITERABLE_LITERAL) {
            const v = await iterable(element, env, stack);
            if (v instanceof AgalError) return v;
            const iterLength = v.length;
            for(let j = 0; j < iterLength; j++){
                const value = v.get(stack, `${j}`);
                list.set(stack, `${i + j}`, insertable(value) || AgalNull.from(true));
            }
        }
    }
    return list;
}
async function dictionary(node, env, stack) {
    const dict = new AgalDictionary();
    for (const element of node.properties){
        if (element.kind === LITERALS_TYPE.PROPERTY) {
            if (!element.value) {
                dict.set(stack, element.key, AgalNull.from(true));
                continue;
            }
            const v = await interpreter(element.value, env, stack);
            dict.set(stack, element.key, insertable(v));
        }
        if (element.kind === LITERALS_TYPE.ITERABLE_LITERAL) {
            const v = env.get(element.identifier, stack, element);
            if (v instanceof AgalError) return v;
            const keys = v.keys();
            for (const key of keys){
                const original = dict.get(stack, key);
                const value = v.get(stack, key);
                dict.set(stack, key, insertable(value) || original || AgalNull.from(true));
            }
        }
    }
    return dict;
}
const mod4 = {
    string: string,
    numeric: numeric,
    identifier: identifier,
    iterable: iterable,
    list: list,
    dictionary: dictionary
};
async function _import(node, env, stack) {
    const data = env.get('importar', stack, node);
    if (data instanceof AgalError && data.throwned) return data;
    const _with = await interpreter(node.with, env, stack);
    const value = await data.call(stack, 'importar', data, AgalString.from(node.path), _with) || AgalNull.from(true);
    if (value instanceof AgalError) return value.throw();
    if (node.as) env.set(node.as, stack, value, node);
    return value;
}
async function _return(node, env, stack) {
    if (!node.value) return AgalNull.from(true);
    return await interpreter(node.value, env, stack);
}
async function _if(node, env, stack) {
    const condition = await interpreter(node.condition, env, stack);
    if (condition instanceof AgalError && condition.throwned) return condition;
    const bool = await AgalRuntimeToAgalBoolean(stack, condition);
    if (bool instanceof AgalError) return bool.throw();
    if (bool.value) {
        const ifEnv = env.createChild();
        const result = await interpreter(node.body, ifEnv, stack);
        env.deleteChild(ifEnv);
        return result;
    } else if (node.else) {
        const elseEnv = env.createChild();
        const result = await interpreter(node.else, elseEnv, stack);
        env.deleteChild(elseEnv);
        return result;
    }
    return AgalNull.from(true);
}
async function _try(node, env, stack) {
    const tryEnv = env.createChild();
    const body = await interpreter(node.body, tryEnv, stack);
    env.deleteChild(tryEnv);
    if (body instanceof AgalError && body.throwned) {
        const catchEnv = env.createChild();
        catchEnv.set(node.catch.errorName, stack, body, node.catch);
        const catchBody = await interpreter(node.catch.body, catchEnv, stack);
        env.deleteChild(catchEnv);
        return catchBody;
    }
    if (node.finally) {
        const finallyEnv = env.createChild();
        const finallyBody = await interpreter(node.finally.body, finallyEnv, stack);
        env.deleteChild(finallyEnv);
        return finallyBody;
    }
    return body;
}
async function _while(node, env, stack) {
    const condition = await interpreter(node.condition, env, stack);
    if (condition instanceof AgalError && condition.throwned) return condition;
    let bool = await AgalRuntimeToAgalBoolean(stack, condition);
    if (bool instanceof AgalError) return bool.throw();
    const whileEnv = env.createChild();
    while(bool.value){
        const result = await interpreter(node.body, whileEnv, stack);
        if (result instanceof AgalError && result.throwned) {
            env.deleteChild(whileEnv);
            return result;
        }
        const condition = await interpreter(node.condition, env, stack);
        if (condition instanceof AgalError && condition.throwned) {
            env.deleteChild(whileEnv);
            return condition;
        }
        bool = await AgalRuntimeToAgalBoolean(stack, condition);
        if (bool instanceof AgalError) {
            env.deleteChild(whileEnv);
            return bool.throw();
        }
        whileEnv.clear();
    }
    env.deleteChild(whileEnv);
    return AgalNull.from(true);
}
const mod5 = {
    _export: _export,
    _import: _import,
    _return: _return,
    _if: _if,
    _try: _try,
    _while: _while
};
function _function(node, env, stack) {
    const name = node.identifier;
    const value = new AgalFunction(stack, name, {
        stmt: node,
        env
    });
    env.set(name, stack, value, node);
    return value;
}
function _class(node, env, stack) {
    const name = node.identifier;
    const value = new AgalClass(name, {
        stmt: node,
        env
    });
    env.set(name, stack, value, node);
    return value;
}
const mod6 = {
    variable: variable,
    _function: _function,
    _class: _class
};
async function assignment(node, env, stack) {
    const val = await interpreter(node.value, env, stack);
    if (val instanceof AgalError && val.throwned) return val;
    if (!node.assignee) return val;
    if (node.assignee.kind === EXPRESSIONS_TYPE.MEMBER_EXPR) {
        const obj = await interpreter(node.assignee.object, env, stack);
        if (obj instanceof AgalError && obj.throwned) return obj;
        if (node.assignee.property.kind === 'Identifier') return obj.set(stack, node.assignee.property.symbol, val);
        const preKey = await interpreter(node.assignee.property, env, stack);
        if (preKey instanceof AgalError && preKey.throwned) return preKey.throw();
        const key = await AgalRuntimeToAgalString(stack, preKey);
        if (key instanceof AgalError) return key.throw();
        obj.set(stack, key.value, val);
        return val;
    }
    const name = getName(node.assignee);
    if (!name) return new AgalSyntaxError(stack, `Nombre de variable invalido`).throw();
    return env.edit(name, stack, val, node);
}
async function call(call, env, stack) {
    const fn = await interpreter(call.callee, env, stack);
    if (fn instanceof AgalError && fn.throwned) return fn;
    const este = call.callee.kind === EXPRESSIONS_TYPE.MEMBER_EXPR ? await interpreter(call.callee.object, env, stack) : fn;
    const name = (call.callee.kind === EXPRESSIONS_TYPE.MEMBER_EXPR ? call.callee.property.kind === LITERALS_TYPE.IDENTIFIER ? call.callee.property.symbol : await interpreter(call.callee.property, env, stack) : fn instanceof AgalFunction ? fn.get(stack, 'nombre') : '') || '';
    if (este instanceof AgalError && este.throwned) return este;
    if (fn === null) new AgalReferenceError(stack, '"nulo" no es una función').throw();
    const args = [];
    for (const arg of call.args){
        const data = await interpreter(arg, env, stack);
        if (data instanceof AgalError && data.throwned) return data;
        args.push(data);
    }
    return await fn.call(stack, name.toString(), este, ...args) || AgalNull.from(true);
}
async function member(node, env, stack) {
    const obj = await interpreter(node.object, env, stack);
    if (obj instanceof AgalError && obj.throwned) return obj;
    if (node.property.kind === LITERALS_TYPE.IDENTIFIER) return obj.get(stack, node.property.symbol) || AgalNull.from(true);
    const preKey = await interpreter(node.property, env, stack);
    if (preKey instanceof AgalError && preKey.throwned) return preKey.throw();
    const key = await AgalRuntimeToAgalString(stack, preKey);
    if (key instanceof AgalError) return key.throw();
    return obj.get(stack, key.value) || AgalNull.from(true);
}
async function unary(node, env, stack) {
    const operator = node.operator;
    const val = await interpreter(node.value, env, stack);
    if (val instanceof AgalError && val.throwned) return val;
    return AgalRuntimeWithUnary(stack, val, operator);
}
async function binary(node, env, stack) {
    const operator = node.operator;
    const left = await interpreter(node.left, env, stack);
    if (left instanceof AgalError && left.throwned) return left;
    const right = await interpreter(node.right, env, stack);
    if (right instanceof AgalError && right.throwned) return right;
    return AgalRuntimeWithBinary(stack, left, operator, right);
}
const mod7 = {
    assignment: assignment,
    call: call,
    member: member,
    unary: unary,
    binary: binary
};
async function AgalRuntimeToAgalIterable(stack, value) {
    if (value instanceof AgalComplex) {
        if (value instanceof AgalList) return value;
        const iter = value.get(stack, '__iterable__');
        if (iter instanceof AgalFunction) {
            const result = await iter.call(stack, '__iterable__', value);
            if (result instanceof AgalList) return result;
        }
    }
    if (value instanceof AgalPrimitive) {
        if (value instanceof AgalString) return AgalList.from(value.value.split(''));
        if (value instanceof AgalNumber) return AgalList.from([
            value.real,
            value.imaginary
        ]);
    }
    return new AgalError(stack, `El valor no es iterable`).throw();
}
async function AgalRuntimeToAgalString(stack, value) {
    if (value instanceof AgalComplex) {
        const str = value.get(stack, '__cadena__');
        if (str instanceof AgalFunction) {
            const result = await str.call(stack, '__cadena__', value);
            if (result instanceof AgalString) return result;
            return new AgalError(stack, `Se esperaba un String pero se recibio un "${typeOf2(result || AgalNull.from(true))}"`).throw();
        }
        return AgalString.from(value?.toString());
    }
    return AgalString.from(value?.toString());
}
async function AgalRuntimeToAgalNumber(stack, value) {
    if (value instanceof AgalComplex) {
        const num = value.get(stack, '__numerico__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__numerico__', value);
            if (result instanceof AgalNumber) return result;
        }
        return AgalNumber.from(NaN);
    }
    if (value instanceof AgalPrimitive) {
        if (value instanceof AgalNumber) return value;
        if (value instanceof AgalBoolean) return AgalNumber.from(value.value ? 1 : 0);
        if (value instanceof AgalString) return AgalNumber.from(+value.value);
    }
    return new AgalError(stack, `Se esperaba un Numero pero se recibio un "${typeOf2(value || AgalNull.from(true))}"`).throw();
}
async function AgalRuntimeToConsoleIn(stack, value) {
    if (value instanceof AgalComplex) {
        const num = value.get(stack, '__consolaEn__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__consolaEn__', value);
            if (result instanceof AgalString) return result;
        }
        const data = await AgalRuntimeToAgalString(stack, value);
        if (data instanceof AgalError) return data.throw();
        return AgalString.from(colorize(data.value, FOREGROUND.CYAN));
    }
    if (value instanceof AgalPrimitive) {
        if (value instanceof AgalString) return AgalString.from(colorize(Deno.inspect(value.value), FOREGROUND.GREEN));
        if (value instanceof AgalNumber || value instanceof AgalBoolean) return AgalString.from(colorize(value.toString(), FOREGROUND.YELLOW));
        if (value instanceof AgalNull) return AgalString.from(colorize(value.toString(), FOREGROUND.BRIGHT_YELLOW));
    }
    return await AgalRuntimeToAgalString(stack, value);
}
function isValidKey(key) {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}
async function AgalRuntimeToConsole(stack, value) {
    if (value instanceof AgalComplex) {
        const num = value.get(stack, '__consola__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__consola__', value);
            if (result instanceof AgalString) return result;
        }
        if (value instanceof AgalClass || value instanceof AgalFunction) return AgalString.from(colorize(value.toString(), FOREGROUND.CYAN));
        if (value instanceof AgalList) {
            let data = '[';
            for(let i = 0; i < value.length; i++){
                if (i > 0) data += ', ';
                if (data.length > 50) {
                    data += `...${value.length - i} mas`;
                    break;
                }
                const item = value.get(stack, i.toString());
                if (item instanceof AgalError) return item.throw();
                const str = await AgalRuntimeToConsoleIn(stack, item);
                if (str instanceof AgalError) return str.throw();
                data += str.value;
            }
            data += ']';
            if (value.type.startsWith('Objeto')) data = value.type.split(' ')[1] + ' ' + data;
            return AgalString.from(data);
        }
        if (value instanceof AgalDictionary) {
            let data = '{';
            const keys = value.keys();
            for(let i = 0; i < keys.length; i++){
                if (i > 0) data += ', ';
                if (data.length > 50) {
                    data += `...${keys.length - i} mas`;
                    break;
                }
                const item = value.get(stack, keys[i]);
                if (item instanceof AgalError) return item.throw();
                const str = await AgalRuntimeToConsoleIn(stack, item);
                if (str instanceof AgalError) return str.throw();
                data += `${isValidKey(keys[i]) ? keys[i] : colorize(Deno.inspect(keys[i]), FOREGROUND.GREEN)}: ${str.value}`;
            }
            data += '}';
            if (value.type.startsWith('Objeto')) data = value.type.split(' ')[1] + data;
            return AgalString.from(data);
        }
        if (value instanceof AgalInstance) {
            const __constructor__ = value.get(stack, '__constructor__');
            if (__constructor__.parent) {
                const data = await AgalRuntimeToConsole(stack, __constructor__);
                if (data instanceof AgalError) return data.throw();
                return data;
            }
        }
        if (value instanceof AgalError) {
            const stack = StackToErrorString(value.stack);
            const type = colorize(value.name, FOREGROUND.RED);
            return AgalString.from(`${type}: ${value.message}\n${stack}`);
        }
    }
    if (value instanceof AgalString) return value;
    return await AgalRuntimeToConsoleIn(stack, value);
}
async function AgalRuntimeWithPositive(stack, value) {
    if (value instanceof AgalComplex) {
        const num = value.get(stack, '__positivo__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__positivo__', value);
            if (result instanceof AgalRuntime) return result;
        }
    }
    return await AgalRuntimeToAgalNumber(stack, value);
}
async function AgalRuntimeWithNegative(stack, value) {
    if (value instanceof AgalComplex) {
        const num = value.get(stack, '__negativo__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__negativo__', value);
            if (result instanceof AgalRuntime) return result;
        }
    }
    if (value instanceof AgalPrimitive) {
        const number = await AgalRuntimeToAgalNumber(stack, value);
        if (number instanceof AgalError) return number.throw();
        return AgalNumber.from(ComplexNumber.from(-number.real, -number.imaginary));
    }
    return new AgalError(stack, `Se esperaba un Numero pero se recibio un "${typeOf2(value || AgalNull.from(true))}"`).throw();
}
async function AgalRuntimeWithIncrement(stack, value) {
    if (value instanceof AgalComplex) {
        const num = value.get(stack, '__incremento__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__incremento__', value);
            if (result instanceof AgalRuntime) return result;
        }
    }
    const number = await AgalRuntimeToAgalNumber(stack, value);
    if (number instanceof AgalError) return number.throw();
    return AgalNumber.from(ComplexNumber.from(number.real + 1, number.imaginary));
}
async function AgalRuntimeWithDecrement(stack, value) {
    if (value instanceof AgalComplex) {
        const num = value.get(stack, '__decremento__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__decremento__', value);
            if (result instanceof AgalRuntime) return result;
        }
    }
    const number = await AgalRuntimeToAgalNumber(stack, value);
    if (number instanceof AgalError) return number.throw();
    return AgalNumber.from(ComplexNumber.from(number.real - 1, number.imaginary));
}
async function AgalRuntimeWithUnary(stack, value, operator) {
    if (operator === '+') return await AgalRuntimeWithPositive(stack, value);
    if (operator === '-') return await AgalRuntimeWithNegative(stack, value);
    if (operator === '!') {
        const bool = await AgalRuntimeToAgalBoolean(stack, value);
        if (bool instanceof AgalError) return bool.throw();
        return AgalBoolean.from(!bool.value);
    }
    if (operator === '++') return await AgalRuntimeWithIncrement(stack, value);
    if (operator === '--') return await AgalRuntimeWithDecrement(stack, value);
    return new AgalSyntaxError(stack, `Operador "${operator}" invalido`).throw();
}
async function AgalRuntimeWithAddition(stack, left, right) {
    if (left instanceof AgalComplex) {
        const num = left.get(stack, '__mas__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__mas__', left, right);
            if (result instanceof AgalRuntime) return result;
        }
    }
    if (left instanceof AgalPrimitive) {
        if (left instanceof AgalString) {
            const rightString = await AgalRuntimeToAgalString(stack, right);
            if (rightString instanceof AgalError) return rightString.throw();
            return AgalString.from(left.value + rightString.value);
        }
        const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
        if (leftNumber instanceof AgalError) return leftNumber.throw();
        const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
        if (rightNumber instanceof AgalError) return rightNumber.throw();
        return AgalNumber.from(add(leftNumber.value, rightNumber.value));
    }
}
async function AgalRuntimeWithSubtraction(stack, left, right) {
    if (left instanceof AgalComplex) {
        const num = left.get(stack, '__menos__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__menos__', left, right);
            if (result instanceof AgalRuntime) return result;
        }
    }
    if (left instanceof AgalPrimitive) {
        if (left instanceof AgalString) {
            const rightString = await AgalRuntimeToAgalString(stack, right);
            if (rightString instanceof AgalError) return rightString.throw();
            return AgalString.from(left.value.replace(rightString.value, ''));
        }
        const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
        if (leftNumber instanceof AgalError) return leftNumber.throw();
        const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
        if (rightNumber instanceof AgalError) return rightNumber.throw();
        return AgalNumber.from(subtract(leftNumber.value, rightNumber.value));
    }
}
async function AgalRuntimeWithMultiplication(stack, left, right) {
    if (left instanceof AgalComplex) {
        const num = left.get(stack, '__por__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__por__', left, right);
            if (result instanceof AgalRuntime) return result;
        }
    }
    if (left instanceof AgalPrimitive) {
        if (left instanceof AgalString) {
            const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
            if (rightNumber instanceof AgalError) return rightNumber.throw();
            return AgalString.from(left.value.repeat(rightNumber.real) || left.value);
        }
        const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
        if (leftNumber instanceof AgalError) return leftNumber.throw();
        const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
        if (rightNumber instanceof AgalError) return rightNumber.throw();
        return AgalNumber.from(multiply(leftNumber.value, rightNumber.value));
    }
}
async function AgalRuntimeWithDivision(stack, left, right) {
    if (left instanceof AgalComplex) {
        const num = left.get(stack, '__entre__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__entre__', left, right);
            if (result instanceof AgalRuntime) return result;
        }
    }
    if (left instanceof AgalPrimitive) {
        if (left instanceof AgalString) {
            const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
            if (rightNumber instanceof AgalError) return rightNumber.throw();
            const __int = parseInt(rightNumber.real.toString());
            let str = '';
            for(let i = 0; i < rightNumber.real; i++)if (i % __int == 0) str += left.value[i];
            return AgalString.from(str);
        }
        const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
        if (leftNumber instanceof AgalError) return leftNumber.throw();
        const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
        if (rightNumber instanceof AgalError) return rightNumber.throw();
        return AgalNumber.from(divide(leftNumber.value, rightNumber.value));
    }
}
async function AgalRuntimeWithModule(stack, left, right) {
    if (left instanceof AgalComplex) {
        const num = left.get(stack, '__modulo__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__modulo__', left, right);
            if (result instanceof AgalRuntime) return result;
        }
    }
    if (left instanceof AgalPrimitive) {
        if (left instanceof AgalString) {
            const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
            if (rightNumber instanceof AgalError) return rightNumber.throw();
            const __int = parseInt(rightNumber.real.toString());
            let str = '';
            for(let i = 0; i < rightNumber.real; i++)if (i % __int != 0) str += left.value[i];
            return AgalString.from(str);
        }
        const leftNumber = await AgalRuntimeToAgalNumber(stack, left);
        if (leftNumber instanceof AgalError) return leftNumber.throw();
        const rightNumber = await AgalRuntimeToAgalNumber(stack, right);
        if (rightNumber instanceof AgalError) return rightNumber.throw();
        return AgalNumber.from(modulo(leftNumber.value, rightNumber.value));
    }
}
async function AgalRuntimeWithAnd(stack, left, right) {
    const leftBoolean = await AgalRuntimeToAgalBoolean(stack, left);
    if (leftBoolean instanceof AgalError) return leftBoolean.throw();
    if (!leftBoolean.value) return left;
    const rightBoolean = await AgalRuntimeToAgalBoolean(stack, right);
    if (rightBoolean instanceof AgalError) return rightBoolean.throw();
    return right;
}
async function AgalRuntimeWithOr(stack, left, right) {
    const leftBoolean = await AgalRuntimeToAgalBoolean(stack, left);
    if (leftBoolean instanceof AgalError) return leftBoolean.throw();
    if (leftBoolean.value) return left;
    const rightBoolean = await AgalRuntimeToAgalBoolean(stack, right);
    if (rightBoolean instanceof AgalError) return rightBoolean.throw();
    return right;
}
async function AgalRuntimeWithEquals(stack, left, right) {
    if (left instanceof AgalComplex) {
        const num = left.get(stack, '__igual__');
        if (num instanceof AgalFunction) {
            const result = await num.call(stack, '__igual__', left, right);
            if (result instanceof AgalBoolean) return result;
            return new AgalTypeError(stack, `Se esperaba un Booleano pero se recibio un "${typeOf2(result || AgalNull.from(true))}"`).throw();
        }
    }
    return AgalBoolean.from(left === right);
}
async function AgalRuntimeWithBinary(stack, left, operator, right) {
    let result;
    if (operator === '+') result = await AgalRuntimeWithAddition(stack, left, right);
    if (operator === '-') result = await AgalRuntimeWithSubtraction(stack, left, right);
    if (operator === '*') result = await AgalRuntimeWithMultiplication(stack, left, right);
    if (operator === '/') result = await AgalRuntimeWithDivision(stack, left, right);
    if (operator === '%') result = await AgalRuntimeWithModule(stack, left, right);
    if (operator === '&') result = await AgalRuntimeWithAnd(stack, left, right);
    if (operator === '|') result = await AgalRuntimeWithOr(stack, left, right);
    if (operator === '==') result = await AgalRuntimeWithEquals(stack, left, right);
    if (operator === '!=') {
        const result = await AgalRuntimeWithEquals(stack, left, right);
        if (result instanceof AgalError) return result.throw();
        return AgalBoolean.from(!result.value);
    }
    if (result) return result;
    if (operator === '===') return AgalBoolean.from(left === right);
    if (operator === '!==') return AgalBoolean.from(left !== right);
    return new AgalSyntaxError(stack, `No se pudo realizar "${typeOf2(left)} ${operator} ${typeOf2(right)}"`).throw();
}
function StmtToString(stmt) {
    switch(stmt.kind){
        case STATEMENTS_TYPE.VAR_DECLARATION:
            {
                const keyword = stmt.constant ? 'const' : 'def';
                const name = stmt.identifier;
                const value = stmt.value && StmtToString(stmt.value);
                if (value) return `${keyword} ${name} = ${value}`;
                return `${keyword} ${name}`;
            }
        case STATEMENTS_TYPE.RETURN_STATEMENT:
            {
                const value = stmt.value && StmtToString(stmt.value);
                if (value) return `ret ${value}`;
                return `ret`;
            }
        case STATEMENTS_TYPE.BREAK_STATEMENT:
            return `rom`;
        case STATEMENTS_TYPE.CONTINUE_STATEMENT:
            return `cont`;
        case STATEMENTS_TYPE.IMPORT_STATEMENT:
            {
                const path = stmt.path;
                const name = stmt.as;
                const _with = stmt.with && StmtToString(stmt.with);
                let data = `importar "${path}"`;
                if (name) data += ` como ${name}`;
                if (_with) data += ` con ${_with}`;
                return data;
            }
        case STATEMENTS_TYPE.EXPORT_STATEMENT:
            {
                const name = stmt.identifier === '<exportable>' ? '' : stmt.identifier;
                const value = stmt.value && StmtToString(stmt.value);
                let data = `exportar ${value}`;
                if (name) data += ` como ${name}`;
                return data;
            }
        case LITERALS_TYPE.OBJECT_LITERAL:
            return '{...}';
        case LITERALS_TYPE.ARRAY_LITERAL:
            return '[...]';
        case LITERALS_TYPE.NUMERIC_LITERAL:
            return stmt.value.toString();
        case LITERALS_TYPE.STRING_LITERAL:
            return `${Deno.inspect(stmt.value)}`;
        case LITERALS_TYPE.ITERABLE_LITERAL:
            return `...${stmt.identifier}`;
        case LITERALS_TYPE.IDENTIFIER:
            return stmt.symbol;
        case BLOCK_TYPE.FUNCTION_DECLARATION:
            {
                const name = stmt.identifier;
                return `fn ${name}(...){ ... }`;
            }
        case BLOCK_TYPE.IF_STATEMENT:
            {
                const condition = StmtToString(stmt.condition);
                let data = `si (${condition}) { ... }`;
                if (stmt.else) data += ` ent { ... }`;
                return data;
            }
        case BLOCK_TYPE.WHILE_STATEMENT:
            return `mien (${StmtToString(stmt.condition)}) { ... }`;
        case BLOCK_TYPE.CLASS_DECLARATION:
            return `clase ${stmt.identifier} { ... }`;
        case BLOCK_TYPE.PROGRAM:
            return `programa { ... }`;
        case BLOCK_TYPE.TRY:
            {
                let data = `intentar { ... }`;
                if (stmt.catch) data += ` capturar { ... }`;
                if (stmt.finally) data += ` finalmente { ... }`;
                return data;
            }
        case EXPRESSIONS_TYPE.ASSIGNMENT_EXPR:
            {
                const name = StmtToString(stmt.assignee);
                const value = StmtToString(stmt.value);
                return `${name} = ${value}`;
            }
        case EXPRESSIONS_TYPE.MEMBER_EXPR:
            {
                const object = StmtToString(stmt.object);
                const property = StmtToString(stmt.property);
                if (stmt.computed) return `${object}[${property}]`;
                return `${object}.${property}`;
            }
        case EXPRESSIONS_TYPE.BINARY_EXPR:
            return `${StmtToString(stmt.left)} ${stmt.operator} ${StmtToString(stmt.right)}`;
        case EXPRESSIONS_TYPE.CALL_EXPR:
            return `${StmtToString(stmt.callee)}(...)`;
        case EXPRESSIONS_TYPE.UNARY_EXPR:
            return `${stmt.operator}${StmtToString(stmt.value)}`;
        default:
            return '';
    }
}
function StackToErrorString(stack) {
    let str = '\tEn ';
    if (stack.value === null) return '';
    if (stack.value.kind === BLOCK_TYPE.PROGRAM) return '';
    str += StmtToString(stack.value);
    return str + ` (${colorize(stack.value.file, FOREGROUND.CYAN)}:${colorize(stack.value.row + '', FOREGROUND.YELLOW)}:${colorize(stack.value.col + '', FOREGROUND.YELLOW)})\n` + StackToErrorString(stack.next);
}
const __default = (data)=>{
    if (data instanceof AgalRuntime) return data;
    if (typeof data === 'object' && data !== null) {
        return parseComplex(data);
    }
    return parse(data);
};
const mod8 = {
    default: interpreter
};
const mod9 = {
    AgalRuntimeToAgalBoolean: AgalRuntimeToAgalBoolean,
    AgalRuntimeToAgalIterable: AgalRuntimeToAgalIterable,
    AgalRuntimeToAgalString: AgalRuntimeToAgalString,
    AgalRuntimeToAgalNumber: AgalRuntimeToAgalNumber,
    AgalRuntimeToConsoleIn: AgalRuntimeToConsoleIn,
    AgalRuntimeToConsole: AgalRuntimeToConsole,
    AgalRuntimeWithPositive: AgalRuntimeWithPositive,
    AgalRuntimeWithNegative: AgalRuntimeWithNegative,
    AgalRuntimeWithIncrement: AgalRuntimeWithIncrement,
    AgalRuntimeWithDecrement: AgalRuntimeWithDecrement,
    AgalRuntimeWithUnary: AgalRuntimeWithUnary,
    AgalRuntimeWithAddition: AgalRuntimeWithAddition,
    AgalRuntimeWithSubtraction: AgalRuntimeWithSubtraction,
    AgalRuntimeWithMultiplication: AgalRuntimeWithMultiplication,
    AgalRuntimeWithDivision: AgalRuntimeWithDivision,
    AgalRuntimeWithModule: AgalRuntimeWithModule,
    AgalRuntimeWithAnd: AgalRuntimeWithAnd,
    AgalRuntimeWithOr: AgalRuntimeWithOr,
    AgalRuntimeWithEquals: AgalRuntimeWithEquals,
    AgalRuntimeWithBinary: AgalRuntimeWithBinary,
    StmtToString: StmtToString,
    StackToErrorString: StackToErrorString
};
const scope = new Enviroment();
const global = new AgalDictionary();
setKeyword('cierto', AgalBoolean.from(true));
setKeyword('falso', AgalBoolean.from(false));
setKeyword('nulo', AgalNull.from());
setKeyword('vacio', AgalNull.from(true));
setKeyword('este', global);
setKeyword('tipoDe', new AgalFunction(defaultStack, 'tipoDe', (stack, _name, _este, data)=>{
    if (!data) return new AgalTypeError(stack, `Se esperaba un valor y no se recibió ninguno.`).throw();
    return AgalString.from(typeOf(data));
}));
setKeyword('lanzar', new AgalFunction(defaultStack, 'lanzar', async (stack, _name, _este, data)=>{
    if (!data) return new AgalTypeError(stack, `Se esperaba un valor y no se recibió ninguno.`).throw();
    if (data instanceof AgalError) return data.throw();
    const string = await AgalRuntimeToConsole(stack, data);
    if (string instanceof AgalError) return string.throw();
    return new AgalUncatched(stack, string.value).throw();
}));
setKeyword('instanciaDe', new AgalFunction(defaultStack, 'instanciaDe', (stack, _name, _este, data, tipo)=>{
    if (!data) return new AgalTypeError(stack, `Se esperaba un valor y no se recibió ninguno.`).throw();
    if (!tipo) return new AgalTypeError(stack, `Se esperaba un tipo y no se recibió ninguno.`).throw();
    if (tipo instanceof AgalClass) return AgalBoolean.from(tipo.isInstance(data));
    return AgalBoolean.from(false);
}));
setGlobal('global', global, true);
setGlobal('esteGlobal', global, true);
function setGlobal(name, value, constant = false, keyword = false) {
    if (value instanceof AgalFunction) value.set(defaultStack, 'nombre', AgalString.from(`<agal>.${name}`));
    global.set(defaultStack, name, value);
    scope.set(name, defaultStack, value, {
        col: 0,
        row: 0,
        constant,
        keyword
    });
}
function setKeyword(name, value) {
    if (value instanceof AgalFunction) value.set(defaultStack, 'nombre', AgalString.from(`<agal>.${name}`));
    scope.set(name, defaultStack, value, {
        col: 0,
        row: 0,
        constant: true,
        keyword: true
    });
}
function getGlobalScope() {
    return scope;
}
const mod10 = {
    default: getGlobalScope
};
function __default1(register) {
    register.set('clases/Dicionario', ()=>{
        const Dicionario = new AgalClass('Dicionario', {
            __constructor__ (_stack, _name, _este) {
                return new AgalDictionary();
            },
            isInstance (value) {
                return value instanceof AgalDictionary;
            }
        });
        const Dicionario_llaves = AgalFunction.from((_stack, _name, _este, obj)=>__default(obj.keys()));
        Dicionario_llaves.set(defaultStack, 'nombre', AgalString.from('Dicionario.llaves'));
        Dicionario.set(defaultStack, 'llaves', Dicionario_llaves);
        const Dicionario_entradas = AgalFunction.from((stack, _name, _este, obj)=>__default(obj.keys().map((key)=>[
                    key,
                    obj.get(stack, key)
                ])));
        Dicionario_entradas.set(defaultStack, 'nombre', AgalString.from('Dicionario.entradas'));
        Dicionario.set(defaultStack, 'entradas', Dicionario_entradas);
        const Dicionario_valores = AgalFunction.from((stack, _name, _este, obj)=>__default(obj.keys().map((key)=>obj.get(stack, key))));
        Dicionario_valores.set(defaultStack, 'nombre', AgalString.from('Dicionario.valores'));
        Dicionario.set(defaultStack, 'valores', Dicionario_valores);
        const Dicionario_desdeEntradas = AgalFunction.from((stack, _name, _este, ...args)=>{
            const dict = new AgalDictionary();
            args.forEach((arg)=>{
                const key = arg.get(stack, '0')?.toString() || 'nulo';
                const value = arg.get(stack, '1') || AgalNull.from(true);
                dict.set(stack, key, value);
            });
            return dict;
        });
        Dicionario_desdeEntradas.set(defaultStack, 'nombre', AgalString.from('Dicionario.desdeEntradas'));
        Dicionario.set(defaultStack, 'desdeEntradas', Dicionario_desdeEntradas);
        return Dicionario;
    });
}
function __default2(register) {
    register.set('clases/Buleano', ()=>new AgalClass('Buleano', {
            __constructor__ (stack, _name, _este, data) {
                return AgalRuntimeToAgalBoolean(stack, data);
            },
            isInstance (value) {
                return value instanceof AgalBoolean;
            }
        }));
}
function __default3(register) {
    register.set('clases/Cadena', ()=>new AgalClass('Cadena', {
            __constructor__ (stack, _name, _este, data) {
                return AgalRuntimeToAgalString(stack, data);
            },
            isInstance (value) {
                return value instanceof AgalString;
            }
        }));
}
function __default4(register) {
    register.set("clases/Numero", ()=>new AgalClass("Numero", {
            __constructor__ (stack, _name, _este, data) {
                return AgalRuntimeToAgalNumber(stack, data);
            },
            isInstance (value) {
                return value instanceof AgalNumber;
            }
        }));
}
function __default5(register) {
    function registerError(name, type) {
        const errorName = `clases/${name ? 'Error/' + name : 'Error'}`;
        const data = ()=>new AgalClass('Error' + name, {
                __constructor__ (stack, _name, _este, mensaje) {
                    return new type(stack, mensaje.toString());
                },
                isInstance (value) {
                    return value instanceof type;
                }
            });
        register.set(errorName, data);
        return data;
    }
    const ErrorTipo = registerError('Tipo', AgalTypeError);
    const ErrorReferencia = registerError('Referencia', AgalReferenceError);
    const ErrorTokenizar = registerError('Tokenizar', AgalTokenizeError);
    const ErrorSintaxis = registerError('Sintaxis', AgalSyntaxError);
    const Error1 = ()=>new AgalClass('Error', {
            __constructor__ (stack, _name, _este, mensaje) {
                return new AgalError(stack, mensaje.toString());
            },
            isInstance (value) {
                return value instanceof AgalError;
            }
        });
    register.set('clases/Error/solo', Error1);
    register.set('clases/Error', ()=>{
        const _Error = Error1();
        _Error.set(defaultStack, 'ErrorTipo', ErrorTipo());
        _Error.set(defaultStack, 'ErrorReferencia', ErrorReferencia());
        _Error.set(defaultStack, 'ErrorTokenizar', ErrorTokenizar());
        _Error.set(defaultStack, 'ErrorSintaxis', ErrorSintaxis());
        return _Error;
    });
}
function __default6(register) {
    register.set('clases/Lista', ()=>{
        const Lista = new AgalClass('Lista', {
            __constructor__ (stack, _name, _este, length) {
                const list = new AgalList();
                list.set(stack, 'largo', length);
                return list;
            },
            isInstance (value) {
                return value instanceof AgalList;
            }
        });
        const Lista_de = AgalFunction.from((stack, _name, _este, ...args)=>{
            const list = new AgalList();
            args.forEach((arg, index)=>list.set(stack, index.toString(), arg));
            return list;
        });
        Lista_de.set(defaultStack, 'nombre', AgalString.from('Lista.de'));
        Lista.set(defaultStack, 'de', Lista_de);
        return Lista;
    });
}
class Libraries {
    _makers = new Map();
    _instances = new Map();
    set(name, value) {
        this._makers.set(name, value);
    }
    get(name) {
        if (!this._instances.has(name) && this._makers.has(name)) {
            const data = this._makers.get(name)();
            this._instances.set(name, data);
            Promise.resolve(data).then((data)=>this._instances.set(name, data));
        }
        return this._instances.get(name) || AgalNull.from(true);
    }
    has(name) {
        return this._makers.has(name);
    }
}
const __default7 = new Libraries();
class AgalIntArray extends AgalList {
    type = `Objeto ListaEnteros extiende Lista`;
    _set(name, value) {
        return super.set(defaultStack, name, value);
    }
    set(stack, _name, _value) {
        return new AgalReferenceError(stack, 'No se puede modificar un "ListaEnteros"').throw();
    }
    static from(list) {
        const l = new AgalIntArray();
        for(let i = 0; i < list.length; i++){
            l._set(`${i}`, AgalNumber.from(list[i]));
        }
        return l;
    }
    toString() {
        let str = '';
        for(let i = 0; i < this.length; i++){
            const n = this.get(defaultStack, i + '');
            str += String.fromCharCode(n.real);
        }
        return str;
    }
}
const __default8 = (register)=>register.set('ListaEnteros', function ListaEnteros() {
        const Lista = register.get('clases/Lista');
        const Class = new AgalClass('ListaEnteros', {
            async __constructor__ (stack, _name, _este, ...args) {
                const l = new AgalIntArray();
                for(let i = 0; i < args.length; i++){
                    const v = await AgalRuntimeToAgalNumber(stack, args[i]);
                    if (v instanceof AgalError) return v.throw();
                    const __int = parseInt(v.real.toString().replace('-', ''));
                    if (isNaN(__int)) {
                        return new AgalReferenceError(stack, 'Se esperaba un numero').throw();
                    }
                    if (AgalNumber.from(__int) !== v) return new AgalTypeError(stack, `Se esperaba un numero entero real positivo`).throw();
                    l._set(`${i}`, AgalNumber.from(__int));
                }
                return l;
            },
            isInstance (value) {
                return value instanceof AgalIntArray;
            },
            parent: Lista
        });
        const desde = AgalFunction.from(async function(stack, _name, _este, cadena) {
            const l = new AgalIntArray();
            if (!cadena) return l;
            if (!(cadena instanceof AgalString)) {
                return new AgalTypeError(stack, 'Se esperaba una cadena para convertir').throw();
            }
            const data = await AgalRuntimeToAgalString(stack, cadena);
            if (data instanceof AgalError) return data.throw();
            for(let i = 0; i < data.value.length; i++){
                l._set(`${i}`, AgalNumber.from(data.value.charCodeAt(i)));
            }
            return l;
        });
        desde.set(defaultStack, 'nombre', AgalString.from('ListaEnteros.desde'));
        Class.set(defaultStack, 'desde', desde);
        return Class;
    });
globalThis.AgalRequestCache ??= 'forzar-cache';
const defaultInt = new AgalIntArray();
const AgalResponseProperties = new Map();
class AgalResponse extends AgalComplex {
    type = 'Objeto Respuesta';
    body = defaultInt;
    constructor(){
        super();
        this._set('estatus', AgalNumber.from(200));
        this._set('cabeceras', new AgalDictionary());
        this._set('url', AgalString.from(''));
    }
    toString() {
        return `[Respuesta ${this.get(defaultStack, 'estatus')}]`;
    }
    _set(name, value) {
        return super.set(defaultStack, name, value);
    }
    set(stack, _name, _value) {
        return new AgalTypeError(stack, 'No se puede modificar una respuesta').throw();
    }
    static from(stack, data, options, url) {
        const res = new AgalResponse();
        res.body = AgalIntArray.from(data instanceof Uint8Array ? data : data.split('').map((c)=>c.charCodeAt(0)));
        if (options?.status && typeof options.status === 'number') res._set('estatus', AgalNumber.from(options.status));
        if (options?.headers && typeof options.headers === 'object') {
            const headers = res.get(stack, 'cabeceras');
            Object.entries(options.headers).forEach(([key, value])=>{
                headers.set(stack, key, AgalString.from(value));
            });
        }
        if (url && typeof url === 'string') res._set('url', AgalString.from(url));
        return res;
    }
    get(stack, name) {
        if (name === 'json' || name === 'texto' || name === 'cuerpo') return AgalResponse.getProperty(name, this);
        return super.get(stack, name);
    }
    static getProperty(name, este) {
        if (name === 'json') {
            !AgalResponseProperties.has(name) && AgalResponseProperties.set('json', AgalFunction.from(async function json(stack, _name, _este) {
                const cuerpo = este.body;
                if (!(cuerpo instanceof AgalIntArray)) return new AgalTypeError(stack, 'Cuerpo invalido').throw();
                const data = await AgalRuntimeToAgalString(stack, cuerpo);
                if (data instanceof AgalError) return data.throw();
                try {
                    return __default(JSON.parse(data.value));
                } catch (_e) {
                    return new AgalTypeError(stack, 'El cuerpo no se pudo leer como json');
                }
            }));
        }
        if (name === 'texto') {
            !AgalResponseProperties.has(name) && AgalResponseProperties.set('texto', AgalFunction.from(async function texto(stack) {
                const cuerpo = este.body;
                if (!(cuerpo instanceof AgalIntArray)) return new AgalTypeError(stack, 'Cuerpo invalido').throw();
                const data = await AgalRuntimeToAgalString(stack, cuerpo);
                if (data instanceof AgalError) return data.throw();
                return AgalString.from(data.value);
            }));
        }
        if (name === 'cuerpo') {
            !AgalResponseProperties.has(name) && AgalResponseProperties.set('cuerpo', AgalFunction.from(async function cuerpo(_stack, _name, _este) {
                return este.body;
            }));
        }
        return AgalResponseProperties.get(name) ?? este;
    }
    toResponse() {
        const body = this.body;
        if (!(body instanceof AgalIntArray)) throw new Error('Cuerpo invalido');
        const data = new Uint8Array(body);
        const cabeceras = this.get(defaultStack, 'cabeceras');
        const headers = Object.fromEntries(cabeceras.keys().map((key)=>{
            const value = cabeceras.get(defaultStack, key);
            if (!(value instanceof AgalString)) throw new Error('Cabecera invalida');
            return [
                key,
                value.value
            ];
        }));
        const estatus = this.get(defaultStack, 'estatus');
        if (!(estatus instanceof AgalNumber)) throw new Error('Cuerpo invalido');
        return new Response(data, {
            status: Number(estatus.value.toString()),
            headers
        });
    }
}
const METHODS = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'HEAD',
    'OPTIONS'
];
class AgalRequest extends AgalComplex {
    type = 'Objeto Peticion';
    cache = 'por-defecto';
    constructor(){
        super();
        const cabeceras = new AgalDictionary();
        cabeceras.set(defaultStack, 'user-agent', AgalString.from(`Agal/${Agal.versions.agal} (Deno/${Deno.version.deno})`));
        this._set('url', AgalString.from(''));
        this._set('cabeceras', cabeceras);
        this._set('metodo', AgalString.from('GET'));
    }
    toString() {
        return `[Peticion ${this.get(defaultStack, 'metodo')}]`;
    }
    _set(name, value) {
        return super.set(defaultStack, name, value);
    }
    set(stack, _name, _value) {
        return new AgalTypeError(stack, 'No se puede modificar una peticion').throw();
    }
    static from(stack, url, options) {
        const req = new AgalRequest();
        req._set('url', AgalString.from(url));
        if (!options) return req;
        if (options.method && typeof options.method === 'string') {
            if (!METHODS.includes(options.method)) return new AgalTypeError(stack, `Metodo "${options.method}" invalido`).throw();
            req._set('metodo', AgalString.from(options.method));
        } else options.method = 'GET';
        if (options.body && (typeof options.body === 'string' || options.body instanceof Uint8Array)) {
            if (options.method === 'GET') return new AgalTypeError(stack, `No se puede enviar un cuerpo con el metodo ${options.method}`).throw();
            req._set('cuerpo', AgalIntArray.from(options.body instanceof Uint8Array ? options.body : options.body.split('').map((c)=>c.charCodeAt(0))));
        }
        if (options.cache && typeof options.cache === 'string') {
            if (!AgalRequest.getCache(options.cache)) return new AgalTypeError(stack, `Cache "${options.cache}" invalido`).throw();
            req.cache = options.cache;
        }
        if (options.headers && typeof options.headers === 'object') {
            const cabeceras = req.get(defaultStack, 'cabeceras');
            options.headers['user-agent'] ??= `Agal/${Agal.versions.agal} (Deno/${Deno.version.deno} ${Deno.build.os})`;
            Object.entries(options.headers).forEach(([key, value])=>cabeceras.set(defaultStack, key, AgalString.from(value)));
        }
        return req;
    }
    static async fromRequest(request) {
        const req = new AgalRequest();
        req._set('url', AgalString.from(request.url));
        req._set('metodo', AgalString.from(request.method));
        const body = await request.arrayBuffer();
        if (body.byteLength) req._set('cuerpo', AgalIntArray.from(new Uint8Array(body)));
        const cabeceras = req.get(defaultStack, 'cabeceras');
        for (const [key, value] of request.headers.entries())cabeceras.set(defaultStack, key, AgalString.from(value));
        return req;
    }
    toRequest() {
        const url = this.get(defaultStack, 'url');
        const metodo = this.get(defaultStack, 'metodo');
        const cuerpo = this.get(defaultStack, 'cuerpo');
        const cabeceras = this.get(defaultStack, 'cabeceras');
        const URL1 = url.value;
        const METHOD = metodo.value;
        const BODY = cuerpo && new Uint8Array(cuerpo);
        const HEADERS = Object.fromEntries(cabeceras.keys().map((key)=>{
            const value = cabeceras.get(defaultStack, key);
            return [
                key,
                value.value
            ];
        }));
        return new Request(URL1, {
            method: METHOD,
            cache: 'no-store',
            headers: HEADERS,
            body: BODY
        });
    }
    static getCache(cache) {
        switch(cache){
            case 'por-defecto':
                if (globalThis.AgalRequestCache !== 'por-defecto') return this.getCache(globalThis.AgalRequestCache);
                return 'default';
            case 'sin-guardar':
                return 'no-store';
            case 'recargar':
                return 'reload';
            case 'sin-cache':
                return 'no-cache';
            case 'solo-cache':
                return 'only-if-cached';
            case 'forzar-cache':
                return 'force-cache';
        }
    }
}
function clases(mod) {
    mod.set(defaultStack, 'Respuesta', new AgalClass('Respuesta', {
        __constructor__ (stack, _name, _este, cuerpo, options) {
            const res = new AgalResponse();
            if (!(cuerpo instanceof AgalIntArray)) return new AgalTypeError(stack, 'Se esperaba un arreglo de enteros').throw();
            res.body = cuerpo;
            if (options) {
                if (!(options instanceof AgalDictionary)) return new AgalTypeError(stack, 'Se esperaba un objeto').throw();
                const estatus = options.get(stack, 'estatus');
                if (estatus) {
                    if (!(estatus instanceof AgalNumber)) return new AgalTypeError(stack, 'El estatus debe ser un numero').throw();
                    const n = Number(estatus.value.toString()) || 0;
                    if (!n || Number.isInteger(n)) return new AgalTypeError(stack, 'El estatus debe ser un numero Real Entero').throw();
                    if (n <= 100 || n >= 599) return new AgalTypeError(stack, 'El estatus debe ser un numero entre 100 y 599').throw();
                    res._set('estatus', estatus);
                }
                const cabeceras = options.get(stack, 'cabeceras');
                if (cabeceras) {
                    if (!(cabeceras instanceof AgalDictionary)) return new AgalTypeError(stack, 'Se esperaba un objeto').throw();
                    cabeceras.keys().forEach((key)=>{
                        const value = cabeceras.get(stack, key);
                        if (!(value instanceof AgalString)) return new AgalTypeError(stack, 'Se esperaba una cadena').throw();
                        res.get(stack, 'cabeceras').set(stack, key, value);
                    });
                }
            }
            return res;
        },
        isInstance (value) {
            return value instanceof AgalResponse;
        }
    }));
    mod.set(defaultStack, 'Peticion', new AgalClass('Peticion', {
        async __constructor__ (stack, _name, _este, URL1, options) {
            if (URL1 instanceof AgalString) {
                const url = URL1.value.toString();
                const opts = {};
                if (options instanceof AgalDictionary) {
                    const metodo = options.get(stack, 'metodo');
                    opts.method = metodo?.value;
                    const cuerpo = options.get(stack, 'cuerpo');
                    opts.body = cuerpo instanceof AgalIntArray ? new Uint8Array(cuerpo) : cuerpo?.value;
                    const cabeceras = options.get(stack, 'cabeceras');
                    opts.headers = cabeceras?.keys().reduce((headers, key)=>{
                        const value = cabeceras.get(stack, key);
                        headers[key] = value.value;
                        return headers;
                    }, {});
                    const cache = options.get(stack, 'cache');
                    opts.cache = cache?.value;
                }
                URL1 = AgalRequest.from(stack, url, opts);
            }
            if (!(URL1 instanceof AgalRequest)) return new AgalTypeError(stack, 'Se esperaba una cadena o un objeto').throw();
            return URL1;
        },
        isInstance (value) {
            return value instanceof AgalRequest;
        }
    }));
}
function client(mod) {
    const cached = new Map();
    const USE_CACHE_TYPES = [
        'forzar-cache',
        'solo-cache'
    ];
    const LOAD_CACHE_TYPES = [
        'forzar-cache',
        'recargar',
        'sin-cache'
    ];
    const cliente = AgalFunction.from(async function cliente(stack, _name, _este, URL1, options) {
        if (URL1 instanceof AgalString) {
            const url = URL1.value.toString();
            const opts = {};
            if (options instanceof AgalDictionary) {
                const metodo = options.get(stack, 'metodo');
                opts.method = metodo?.value;
                const cuerpo = options.get(stack, 'cuerpo');
                opts.body = cuerpo instanceof AgalIntArray ? new Uint8Array(cuerpo) : cuerpo?.value;
                const cabeceras = options.get(stack, 'cabeceras');
                opts.headers = cabeceras?.keys().reduce((headers, key)=>{
                    const value = cabeceras.get(stack, key);
                    headers[key] = value.value;
                    return headers;
                }, {});
                const cache = options.get(stack, 'cache');
                opts.cache = cache?.value;
            }
            URL1 = AgalRequest.from(stack, url, opts);
        }
        if (!(URL1 instanceof AgalRequest)) return new AgalTypeError(stack, 'Se esperaba una cadena o un objeto').throw();
        const cacheType = URL1.cache === 'por-defecto' ? globalThis.AgalRequestCache : URL1.cache;
        const request = URL1.toRequest();
        if (USE_CACHE_TYPES.includes(cacheType)) {
            const cachedResponse = cached.get(request.url);
            if (cachedResponse) return cachedResponse;
        }
        if (cacheType === 'solo-cache') return new AgalTypeError(stack, `No funciono la peticion a '${request.url}'`).throw();
        const netAccess = await Agal.Permissions.get('NET', request.url);
        if (netAccess === false) return new AgalTypeError(stack, `No se puede acceder a '${request.url}'`).throw();
        const response = await Agal.fetch(request).catch(()=>null);
        if (!response) return new AgalTypeError(stack, `No se pudo conectar a '${request.url}' con el metodo '${request.method}'`).throw();
        const data = AgalResponse.from(stack, new Uint8Array(await response.arrayBuffer()), {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        }, request.url);
        if (LOAD_CACHE_TYPES.includes(cacheType)) cached.set(request.url, data);
        return data;
    });
    mod.set(defaultStack, 'cliente', cliente);
}
function server(mod) {
    async function serveHttp(conn, listen, callback) {
        const httpConn = Deno.serveHttp(conn);
        for await (const requestEvent of httpConn)requestEvent.respondWith(callback(requestEvent.request, listen));
    }
    async function listen(port, callback) {
        const listener = Deno.listen({
            port
        });
        for await (const conn of listener)serveHttp(conn, listener, callback);
    }
    mod.set(defaultStack, 'servidor', AgalFunction.from(async function servidor(stack, _name, este, puerto, funcion, error) {
        if (!(puerto instanceof AgalNumber)) return new AgalTypeError(stack, 'Se esperaba un numero').throw();
        const port = Number(puerto.value.toString());
        if (!port || !Number.isInteger(port)) return new AgalTypeError(stack, 'El puerto debe ser un numero natural').throw();
        if (port <= 0 || port >= 65536) return new AgalTypeError(stack, 'El puerto debe ser un numero entre 1 y 65535').throw();
        if (!(funcion instanceof AgalFunction)) return new AgalTypeError(stack, 'Se esperaba una funcion para el segundo parametro').throw();
        if (!(error instanceof AgalFunction)) return new AgalTypeError(stack, 'Se esperaba una funcion para el tercer parametro').throw();
        listen(port, async (request, listen)=>{
            const req = await AgalRequest.fromRequest(request);
            const res = await funcion.call(stack, 'funcion', este, req);
            if (res instanceof AgalError && res.throwned) {
                res.catch();
                const resE = await error.call(stack, 'error', este, res);
                if (resE instanceof AgalResponse) return resE.toResponse();
                try {
                    listen.close();
                } catch (_) {
                    null;
                }
            }
            if (!(res instanceof AgalResponse)) return new Response('No se pudo procesar la peticion', {
                status: 500
            });
            return res.toResponse();
        });
        return null;
    }));
}
const __default9 = (register)=>register.set('http', function http() {
        const mod = new AgalDictionary();
        clases(mod);
        client(mod);
        server(mod);
        return mod;
    });
const __default10 = (register)=>register.set('permisos', function Permisos() {
        const obj = new AgalDictionary();
        obj.set(defaultStack, 'quitar', AgalFunction.from(async (stack, _name, _este, permiso, data)=>{
            if (!(permiso instanceof AgalString)) return new AgalTypeError(stack, 'Se esperaba una cadena en el permiso').throw();
            if (!data) return null;
            if (!(data instanceof AgalString)) return new AgalTypeError(stack, 'Se esperaba una cadena en el dato').throw();
            return null;
        }));
        obj.set(defaultStack, 'pedir', AgalFunction.from(async (stack, _name, _este, permiso, data)=>{
            if (!(permiso instanceof AgalString)) return new AgalTypeError(stack, 'Se esperaba una cadena en el permiso').throw();
            if (!data) return AgalBoolean.from(await Agal.Permissions.get(permiso.value));
            if (!(data instanceof AgalString)) return new AgalTypeError(stack, 'Se esperaba una cadena en el dato').throw();
            return AgalBoolean.from(await Agal.Permissions.get(permiso.value, data.value));
        }));
        return obj;
    });
function FileFunctions(mod) {
    const leerArchivo = AgalFunction.from(async (stack, _name, _este, archivo)=>{
        if (archivo instanceof AgalString) {
            const file = await Agal.Permissions.get('LEER', archivo.value) ? await Deno.readFile(archivo.value).catch(()=>null) : null;
            if (file === null) return new AgalReferenceError(stack, `No se pudo encontrar el archivo '${archivo.value}'`).throw();
            return AgalIntArray.from(file);
        } else return new AgalTypeError(stack, 'El archivo debe ser una cadena').throw();
    });
    leerArchivo.set(defaultStack, 'nombre', AgalString.from('sab.leerArchivo'));
    mod.set(defaultStack, 'leerArchivo', leerArchivo);
    const crearArchivo = AgalFunction.from(async (stack, _name, _este, archivo, datos)=>{
        if (archivo instanceof AgalString) {
            if (datos instanceof AgalIntArray) {
                const data = await Agal.Permissions.get('CREAR', archivo.value) ? await Deno.writeFile(archivo.value, new Uint8Array(datos)).catch(()=>null) : false;
                if (data === null) return new AgalReferenceError(stack, `No se pudo crear el archivo '${archivo.value}'`).throw();
                return datos;
            } else return new AgalTypeError(stack, 'Los datos deben ser un ListaEnteros').throw();
        } else return new AgalTypeError(stack, 'El archivo debe ser una cadena').throw();
    });
    crearArchivo.set(defaultStack, 'nombre', AgalString.from('sab.crearArchivo'));
    mod.set(defaultStack, 'crearArchivo', crearArchivo);
}
async function readDir(path) {
    const data = Deno.readDir(path);
    const files = [];
    for await (const file of data)files.push(file.name);
    return files;
}
function FolderFunctions(mod) {
    const leerCarpeta = AgalFunction.from(async (stack, _name, _este, carpeta)=>{
        if (carpeta instanceof AgalString) {
            const data = await Agal.Permissions.get('LEER', carpeta.value) ? await readDir(carpeta.value).catch(()=>null) : null;
            if (data === null) return new AgalReferenceError(stack, `No se pudo leer la carpeta '${carpeta.value}'`).throw();
            return AgalList.from(data);
        } else return new AgalTypeError(stack, 'La carpeta debe ser una cadena').throw();
    });
    leerCarpeta.set(defaultStack, 'nombre', AgalString.from('sab.leerCarpeta'));
    mod.set(defaultStack, 'leerCarpeta', leerCarpeta);
    const crearCarpeta = AgalFunction.from(async (stack, _name, _este, carpeta)=>{
        if (carpeta instanceof AgalString) {
            const data = await Agal.Permissions.get('CREAR', carpeta.value) ? await Deno.mkdir(carpeta.value).catch(()=>null) : false;
            if (data === null) return new AgalReferenceError(stack, `No se pudo crear la carpeta '${carpeta.value}'`).throw();
            return AgalIntArray.from(data);
        } else return new AgalTypeError(stack, 'La carpeta debe ser una cadena').throw();
    });
    crearCarpeta.set(defaultStack, 'nombre', AgalString.from('sab.crearCarpeta'));
    mod.set(defaultStack, 'crearCarpeta', crearCarpeta);
}
const __default11 = (register)=>register.set('sab', function sab() {
        const mod = new AgalDictionary();
        FileFunctions(mod);
        FolderFunctions(mod);
        const borrar = AgalFunction.from(async (stack, _name, _este, archivo)=>{
            if (archivo instanceof AgalString) {
                const data = await Agal.Permissions.get('BORRAR', archivo.value) ? await Deno.remove(archivo.value).catch(()=>null) : false;
                if (data === null) return new AgalReferenceError(stack, `No se pudo borrar '${archivo.value}'`).throw();
                return AgalIntArray.from(data);
            } else return new AgalTypeError(stack, 'La ruta debe ser una cadena').throw();
        });
        borrar.set(defaultStack, 'nombre', AgalString.from('sab.borrar'));
        mod.set(defaultStack, 'borrar', borrar);
        return mod;
    });
class AgalEvents extends AgalComplex {
    type = 'Objeto Eventos';
    #events = {};
    constructor(){
        super();
        this.set(defaultStack, 'en', AgalFunction.from(async (stack, _name, _este, evento, funcion)=>{
            if (!evento) return new AgalTypeError(stack, 'Se esperaba un evento pero se recibió nada').throw();
            if (!(evento instanceof AgalString)) return new AgalTypeError(stack, 'El evento debe ser una cadena').throw();
            if (!funcion) return new AgalTypeError(stack, 'Se esperaba una función pero se recibió nada').throw();
            if (!(funcion instanceof AgalFunction)) return new AgalTypeError(stack, 'La función debe ser una función').throw();
            if (!this.#events[evento.value]) this.#events[evento.value] = [];
            this.#events[evento.value].push(funcion);
            return funcion;
        }));
        this.set(defaultStack, 'emitir', AgalFunction.from(async (stack, name, este, evento, ...args)=>{
            if (!evento) return new AgalTypeError(stack, 'Se esperaba un evento pero se recibió nada');
            if (!(evento instanceof AgalString)) return new AgalTypeError(stack, 'El evento debe ser una cadena');
            if (!this.#events[evento.value]) return null;
            for(let i = 0; i < this.#events[evento.value].length; i++){
                this.#events[evento.value][i].call(stack, name, este, ...args);
            }
            return null;
        }));
    }
    emit(evento, ...args) {
        if (!this.#events[evento]) return;
        for(let i = 0; i < this.#events[evento].length; i++)this.#events[evento][i].call(defaultStack, 'emit', this, ...args.map(__default));
    }
    on(evento, funcion) {
        if (!this.#events[evento]) this.#events[evento] = [];
        this.#events[evento].push(funcion);
    }
}
const __default12 = (register)=>register.set('Eventos', function Eventos() {
        return new AgalClass('Eventos', {
            __constructor__: async ()=>new AgalEvents(),
            isInstance: (value)=>value instanceof AgalEvents
        });
    });
const __default13 = (register)=>register.set('proceso', function proceso() {
        const mod = new AgalDictionary();
        mod.set(defaultStack, 'salir', new AgalFunction(defaultStack, 'proceso.salir', ()=>Deno.exit(0)));
        mod.set(defaultStack, 'version', AgalString.from(Agal.versions.agal));
        mod.set(defaultStack, 'args', AgalString.from(Agal.args));
        return mod;
    });
const data = [];
function writeln(str) {
    console.log(str);
    data.push(str + '\n');
}
function __default14(register) {
    register.set('consola', ()=>{
        const pintar = AgalFunction.from(async (_stack, _name, _este, ...args)=>{
            const data = [];
            for (const arg of args){
                const value = await AgalRuntimeToConsole(_stack, arg);
                if (value instanceof AgalError) return value.throw();
                data.push(value);
            }
            writeln(data.filter(Boolean).join(' '));
            return null;
        });
        pintar.set(defaultStack, 'nombre', AgalString.from('consola.pintar'));
        const limpiar = AgalFunction.from(()=>{
            console.clear();
            data.length = 0;
            return null;
        });
        limpiar.set(defaultStack, 'nombre', AgalString.from('consola.limpiar'));
        const mod = AgalDictionary.from({
            limpiar,
            pintar
        });
        return mod;
    });
}
function getCodeFromTextError(text) {
    const match = text.match(/os error (\d+)/);
    if (match) return parseInt(match[1]);
    return 0;
}
function getMessageFromCode(code) {
    switch(code){
        case 10061:
            return 'No se pudo establecer la conexión';
        case 10054:
            return 'Se ha cerrado la conexión';
        case 10060:
            return 'Tiempo de espera agotado';
        default:
            return 'Error desconocido';
    }
}
class AgalWebSocket extends AgalEvents {
    type = 'Objeto WebSocket extiende Eventos';
    constructor(){
        super();
        this.set(defaultStack, 'ABIERTO', AgalBoolean.from(false));
        this.set(defaultStack, 'CERRADO', AgalBoolean.from(false));
        this.set(defaultStack, 'conectar', AgalFunction.from((stack, _name, _self, URL1)=>{
            if (URL1 instanceof AgalString) this.connect(URL1.value);
            else return new AgalTypeError(stack, 'Se esperaba una cadena como URL de conexión');
            return null;
        }));
    }
    connect(url) {
        try {
            const urlTest = new URL(url);
            if (urlTest.protocol !== 'ws:' && urlTest.protocol !== 'wss:') return new AgalTypeError(defaultStack, 'Se esperaba una URL con protocolo ws o wss');
        } catch (_e) {
            return new AgalTypeError(defaultStack, 'Se esperaba una URL válida');
        }
        const ws = new Deno._WebSocket(url);
        ws.onopen = ()=>{
            this.emit('abrir');
            this.set(defaultStack, 'ABIERTO', AgalBoolean.from(true));
        };
        ws.onclose = (e)=>{
            this.emit('cerrar', e.code, e.reason);
            this.set(defaultStack, 'ABIERTO', AgalBoolean.from(false));
            this.set(defaultStack, 'CERRADO', AgalBoolean.from(true));
        };
        ws.onmessage = async (e)=>{
            if (typeof e.data === 'string') this.emit('mensaje', e.data);
            if (e.data instanceof ArrayBuffer) {
                const buffer = new Uint8Array(e.data);
                this.emit('mensaje', AgalIntArray.from(buffer));
            }
            if (e.data instanceof Blob) {
                const buffer = new Uint8Array(await e.data.arrayBuffer());
                this.emit('mensaje', AgalIntArray.from(buffer));
            }
        };
        ws.onerror = (e)=>{
            const code = getCodeFromTextError(e.message);
            const message = getMessageFromCode(code);
            this.emit('error', new AgalError(defaultStack, message));
        };
        this.set(defaultStack, 'enviar', AgalFunction.from((stack, _name, _self, mensaje)=>{
            if (mensaje instanceof AgalString) ws.send(mensaje.value);
            else if (mensaje instanceof AgalIntArray) ws.send(new Uint8Array(mensaje));
            else return new AgalTypeError(stack, 'Se esperaba una cadena o una ListaEnteros como mensaje');
            return null;
        }));
        this.set(defaultStack, 'desconectar', AgalFunction.from((_stack, _name, _self)=>{
            ws.close();
            return null;
        }));
        return ws;
    }
    static from() {
        return new AgalWebSocket();
    }
}
function __default15(register) {
    register.set('ws', ()=>{
        return new AgalClass('WebSocket', {
            __constructor__: AgalWebSocket.from,
            isInstance: (value)=>value instanceof AgalWebSocket
        });
    });
}
function getModule(path) {
    const module = new AgalDictionary();
    const splitPath = path.split(/[\\\/]/g);
    module.set(defaultStack, 'ruta', AgalString.from(splitPath.slice(0, -1).join('/')));
    module.set(defaultStack, 'archivo', AgalString.from(splitPath.join('/')));
    module.set(defaultStack, 'exportar', new AgalDictionary());
    module.set(defaultStack, 'hijos', new AgalList());
    const importar = AgalFunction.from(async function requiere(stack, _name, _este, path, config) {
        if (path instanceof AgalString) return await makeRequire(stack, module, path.value, config);
        return new AgalTypeError(stack, 'Se esperaba una cadena').throw();
    });
    importar.set(defaultStack, 'nombre', AgalString.from('importar'));
    importar.set(defaultStack, 'mod', module);
    module.set(defaultStack, 'importar', importar);
    return module;
}
function getModuleScope(path) {
    const data = getGlobalScope();
    const modulo = getModule(path);
    data.set('importar', defaultStack, modulo.get(defaultStack, 'importar'), {
        col: 0,
        row: 0
    });
    data.set('exportar', defaultStack, modulo.get(defaultStack, 'exportar'), {
        col: 0,
        row: 0
    });
    data.set('modulo', defaultStack, modulo, {
        col: 0,
        row: 0
    });
    return data;
}
async function agal(code, path = Deno.cwd() + '/inicio.agal', stack = defaultStack) {
    path = path.replace(/\\/g, '/');
    const parser = new Parser1();
    const program = parser.produceAST(code, false, path);
    const scope = getModuleScope(path);
    const data = await interpreter(program, scope, stack);
    if (data instanceof AgalError) return data;
    return data.get(defaultStack, 'exportar');
}
async function evalLine(line, lineIndex, scope, stack = defaultStack) {
    scope = scope ?? getModuleScope(Deno.cwd() + '/inicio.agal');
    const parser = new Parser1();
    const program = parser.produceAST(line, false, `<linea:${lineIndex}>`);
    const runtime = await interpreter(program.body, scope, stack);
    return [
        runtime,
        scope,
        stack
    ];
}
async function AgalEval(code) {
    const parser = new Parser1();
    const program = parser.produceAST(code, false, '<nativo>');
    return await interpreter(program.body, getGlobalScope(), defaultStack);
}
function __default16(register) {
    register.set('clases/Funcion', ()=>new AgalClass('Funcion', {
            __constructor__ (stack, _name, _este, ...argums) {
                const [code, ...args] = argums.reverse();
                if (!code) return new AgalTypeError(stack, 'No se ha especificado el codigo de la funcion').throw();
                const validCode = code instanceof AgalString;
                if (!validCode) return new AgalTypeError(stack, 'El codigo de la funcion debe ser un texto').throw();
                const validArgs = args.every((arg)=>arg instanceof AgalString);
                if (!validArgs) return new AgalTypeError(stack, 'Los argumentos de la funcion deben ser textos').throw();
                return AgalEval(`fn funcion(${args.join(',')}){ ${code} }`);
            },
            isInstance (value) {
                return value instanceof AgalFunction;
            }
        }));
}
function __default17(register) {
    __default1(register);
    __default16(register);
    __default2(register);
    __default3(register);
    __default4(register);
    __default5(register);
    __default6(register);
    register.set('clases', async ()=>{
        const clases = new AgalDictionary();
        clases.set(defaultStack, 'Dicionario', await register.get('clases/Dicionario'));
        clases.set(defaultStack, 'Buleano', await register.get('clases/Buleano'));
        clases.set(defaultStack, 'Funcion', await register.get('clases/Funcion'));
        clases.set(defaultStack, 'Cadena', await register.get('clases/Cadena'));
        clases.set(defaultStack, 'Numero', await register.get('clases/Numero'));
        clases.set(defaultStack, 'Error', await register.get('clases/Error'));
        clases.set(defaultStack, 'Lista', await register.get('clases/Lista'));
        return clases;
    });
}
const cache3 = new Map();
__default9(__default7);
__default8(__default7);
__default10(__default7);
__default11(__default7);
__default12(__default7);
__default13(__default7);
__default14(__default7);
__default17(__default7);
__default15(__default7);
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
const resolvePath = (path, folder)=>{
    try {
        const url = new URL(path, folder);
        return resolve(url.href);
    } catch (_e) {
        return null;
    }
};
async function makeRequire(stack, modulo, pathFile, config) {
    if (__default7.has(pathFile)) return __default7.get(pathFile);
    const Rtype = config && typeof config.get === 'function' && config.get(stack, 'tipo');
    let type = 'modulo';
    if (Rtype instanceof AgalString && Rtype.value === 'json') type = 'json';
    const ruta = modulo.get(stack, 'ruta') ? await AgalRuntimeToAgalString(stack, modulo.get(stack, 'ruta')) : 'nulo';
    if (ruta instanceof AgalError) return ruta.throw();
    const folder = ((ruta || Deno.cwd()) + '/').replace(/\\/g, '/').replace(/[\/]{1,}/g, '/');
    const path = resolvePath(pathFile, folder);
    if (path === null) return new AgalReferenceError(stack, `No se pudo encontrar el archivo '${pathFile}' en '${folder}'`).throw();
    if (type === 'modulo' && cache3.has(path)) return cache3.get(path);
    const file = await Deno.readTextFile(path).catch(()=>null);
    if (file === null) return new AgalReferenceError(stack, `No se pudo encontrar el archivo '${pathFile}' en '${path}'`).throw();
    const hijos = modulo.get(stack, 'hijos');
    if (!(hijos instanceof AgalList)) return new AgalTypeError(stack, 'Se esperaba una lista').throw();
    hijos.set(stack, hijos.length.toString(), AgalDictionary.from({
        nombre: pathFile,
        ruta: path,
        tipo: type
    }));
    if (type === 'json') {
        try {
            const obj = JSON.parse(file);
            return __default(obj);
        } catch (_e) {
            return new AgalTypeError(stack, `No se pudo importar como JSON "${pathFile}"`).throw();
        }
    }
    const code = await agal(file, path, stack);
    cache3.set(path, code);
    return code;
}
const mod11 = {
    AgalResponse: AgalResponse,
    AgalRequest: AgalRequest,
    AgalIntArray: AgalIntArray,
    AgalWebSocket: AgalWebSocket,
    default: __default7
};
const mod12 = {
    default: makeRequire
};
const mod13 = {
    AgalRuntime: AgalRuntime,
    parse: __default,
    complex: mod3,
    primitive: mod2
};
const mod14 = {
    Enviroment: Enviroment,
    agal: agal,
    evalLine: evalLine,
    getModule: getModule,
    getModuleScope: getModuleScope,
    AgalEval: AgalEval,
    global: mod10,
    libraries: mod11,
    values: mod13,
    interpreter: mod8,
    require: mod12,
    stack: mod1,
    utils: mod9
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
        return null;
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
globalThis.Agal = {
    Permissions: new PermissionManager(),
    versions: {
        agal: '0.1.0',
        deno: Deno.version.deno
    },
    fetch: (url, options)=>{
        if (Deno.version.v8) return fetch(url, options);
        return new Promise((resolve)=>{
            resolve(new Response(''));
        });
    },
    args: '',
    console: {
        input: async ()=>{
            return await input.question('');
        },
        output: (str)=>{
            console.log(str);
        }
    }
};
Deno._WebSocket = WebSocket;
exports.frontend = mod;
exports.runtime = mod14;
return exports
})()