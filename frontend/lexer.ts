import tokenizer, {
	Token as PreToken,
	TokenOptions,
	skip,
} from 'https://raw.githubusercontent.com/AdrianCraft07/ts-lib/main/tokenize.fn.ts';

import { ParserError } from '../Errors.ts';

type TokenCallback = Exclude<TokenOptions<TokenType>[0][1], TokenType>;

export const enum TokenType {
	// Types
	Number = 'Number',
	String = 'String',
	Identifier = 'Identifier',

	// Operators
	Equals = 'Equals', // =
	Negate = 'Negate', // !
	And = 'And', // &
	Or = 'Or', // |

	OpenParen = 'OpenParen', // (
	CloseParen = 'CloseParen', // )
	BinaryOperator = 'BinaryOperator', // + - * / %
	Semicolon = 'Semicolon', // ;
	Comma = 'Comma', // ,
	Dot = 'Dot', // .
	Colon = 'Colon', // :
	OpenBrace = 'OpenBrace', // {
	CloseBrace = 'CloseBrace', // }
	OpenBracket = 'OpenBracket', // [
	CloseBracket = 'CloseBracket', // ]
	OpenAngle = 'OpenAngle', // <
	CloseAngle = 'CloseAngle', // >
	Backslash = 'Backslash', // \
	EOF = 'EOF', // End of file

	// Keywords
	Def = 'Def',
	Const = 'Const',
	Funcion = 'Funcion',
	Si = 'Si',
	Entonces = 'Entonces',
	Retorna = 'Retorna',
	Mientras = 'Mientras',
	Romper = 'Romper',
	Continuar = 'Continuar',
	Clase = 'Clase',
	Estatico = 'Estatico',
}
export type Token = PreToken<TokenType> & {file:string};

// reserved keywords
const KEYWORDS: Record<string, TokenType> = {
	def: TokenType.Def,
	const: TokenType.Const,
	fn: TokenType.Funcion,
	si: TokenType.Si,
	entonces: TokenType.Entonces,
	ret: TokenType.Retorna,
	mientras: TokenType.Mientras,
	romper: TokenType.Romper,
	continuar: TokenType.Continuar,
	clase: TokenType.Clase,
	est: TokenType.Estatico,
};

// Validate that the character is a letter
function isAlpha(src = '') {
	return src.match(/[a-z_$0-9]/i) != null;
}

function isConst(str: string){
	if(str === 'i') return true;
	if(str === 'e') return true;
	if(str === 'π') return true;
	return false
}
// Validate that the character is a number
function isInt(str: string, bool = true) {
	const c = str.charCodeAt(0);
	const bounds = ['0'.charCodeAt(0), '9'.charCodeAt(0)];

	const isNumber = c >= bounds[0] && c <= bounds[1];
	const isDot = bool && str == '.';

	return isNumber || isDot || isConst(str);
}

const toString: TokenCallback = function (quote, { col, row }, line) {
	const src = line.split('').slice(col);
	let str = '';
	src.shift();
	while (src.length > 0 && src[0] != quote) {
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
				if (!n1 || !n2)
					new ParserError(
						line.length - (src.length - 2),
						row,
						`Se esperaba un numero hexadecimal`
					).throw();
				str += String.fromCharCode(parseInt(hex, 16));
			} else if (next == 'u') {
				src.shift();
				const n1 = src.shift();
				const n2 = src.shift();
				const n3 = src.shift();
				const n4 = src.shift();
				const hex = `${n1}${n2}${n3}${n4}`;
				if (!n1 || !n2 || !n3 || !n4)
					new ParserError(
						line.length - (src.length - 4),
						row,
						`Se esperaba un numero hexadecimal`
					).throw();
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
				if (!n1 || !n2 || !n3 || !n4 || !n5 || !n6 || !n7 || !n8)
					new ParserError(
						line.length - (src.length - 8),
						row,
						'Se esperaba un numero hexadecimal'
					).throw();
				str += String.fromCharCode(parseInt(hex, 16));
			} else if (next == '\\') str += '\\';
			else if (next == '"') str += '"';
			else if (next == "'") str += "'";
		} else str += src.shift();
	}
	src.shift();
	return [{ type: TokenType.String, value: str, col, row }, str.length + 1];
};

// Tokenize the source code
export function tokenize(sourceCode: string, file = 'iniciar.agal'): Token[] {
	const tokens = tokenizer<TokenType>(sourceCode, [
		[/[\n\r\t\s]/, skip],
		['(', TokenType.OpenParen],
		[')', TokenType.CloseParen],
		['{', TokenType.OpenBrace],
		['}', TokenType.CloseBrace],
		['[', TokenType.OpenBracket],
		[']', TokenType.CloseBracket],
		['<', TokenType.OpenAngle],
		['>', TokenType.CloseAngle],
		['+', TokenType.BinaryOperator],
		['-', TokenType.BinaryOperator],
		['*', TokenType.BinaryOperator],
		['/', TokenType.BinaryOperator],
		['%', TokenType.BinaryOperator],
		['^', TokenType.BinaryOperator],
		['=', TokenType.Equals],
		['!', TokenType.Negate],
		['&', TokenType.And],
		['|', TokenType.Or],
		[';', TokenType.Semicolon],
		[':', TokenType.Colon],
		[',', TokenType.Comma],
		['.', TokenType.Dot],
		['\\', TokenType.Backslash],
		['"', toString],
		["'", toString],
		[
			/[0-9]/,
			function (char, { col, row }, line) {
				let value = char;
				let i = col;
				while (isInt(line[++i] || '')) {
					if (line[i] == '.' && value.includes('.'))
						new ParserError(
							i,
							row,
							`Un numero no puede tener mas de dos puntos decimales`
						).throw();
					if(line[i] == '.' && (value.includes('π')||value.includes('e')||value.includes('i')))
						new ParserError(
							i,
							row,
							'Una constante no puede tener un punto decimal'
						).throw();
					value += line[i];
				}

				return [
					{
						type: TokenType.Number,
						value,
						col,
						row,
					},
					value.length-1,
				];
			},
		],
		[
			/[$_a-z]/i,
			function (char, { col, row }, line) {
				let value = char;
				let i = col;
				while (isAlpha(line[++i])) {
					value += line[i];
				}

				const reserved = KEYWORDS[value];

				if (reserved)
					return [
						{
							type: reserved,
							value,
							col,
							row,
						},
						value.length - 1,
					];
				else
					return [
						{
							type: TokenType.Identifier,
							value,
							col,
							row,
						},
						value.length - 1,
					];
			},
		],
	]) as Token[];

	tokens.push({
		type: TokenType.EOF,
		value: '',
		col: null as unknown as number,
		row: null as unknown as number,
		file
	});
	tokens.forEach((token) => {
		token.file = file;
		token.col++;
		token.row++;
	})

	return tokens;
}
