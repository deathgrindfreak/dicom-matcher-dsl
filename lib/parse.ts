import { ParseError } from "./error";
import { isTag, Operation, RHS, Tag, Token, TokenType } from "./model";

export class Parser {
  private readonly tokens: Token[];
  private readonly variables: Map<string, Tag | RHS> = new Map();
  private idx = 0;

  public static parse(tokens: Token[]): Operation {
    const parser = new Parser(tokens)
    parser.parseDefinitionsBlock();

    // An empty match expression should match everything by default
    if (parser.check(TokenType.EOF)) {
      return {
        op: 'TAUTOLOGY',
        lhs: {group: 0, element: 0},
        rhs: null,
      }
    }

    return parser.parseExpression(0);
  }

  private constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private parseDefinitionsBlock() {
    if (this.matchKeyword('DEFINE')) {
      while (!this.check(TokenType.Keyword) && !this.check(TokenType.EOF)) {
        const [lhs, rhs] = this.parseAssignment();
        this.variables.set(lhs, rhs);
      }

      if (!this.matchKeyword('END')) {
        throw new ParseError('Expected "END" keyword');
      }
    }
  }

  private parseAssignment(): [string, Tag | RHS] {
    const lhs = this.consume(TokenType.Identifier, 'Expected identifier');
    this.consume(TokenType.Assign, 'Expected "="')
    const rhs = this.parseTag() ?? this.parseRHSValue();
    if (!rhs) throw new ParseError('Expected rhs');
    return [lhs.literal, rhs];
  }

  // If this looks weird, it's because Pratt parsing is weird
  private parseExpression(minBp: number): Operation {
    let lhs = this.parseParenExpr();
    if (lhs === null) throw new ParseError('Expected expression')

    while (true) {
      if (this.check(TokenType.EOF) || this.check(TokenType.RightParen)) break;
      const op = this.consume(TokenType.Keyword, "Expected AND or OR");

      const [lBp, rBp] = this.infixBindingPower(op.literal);
      if (lBp < minBp) {
        this.idx--; // Push the op back
        break;
      }

      const rhs = this.parseExpression(rBp);
      if (rhs === null) throw new ParseError('Expected expression')

      lhs = {op: op.literal, lhs, rhs};
    }

    return lhs;
  }

  private parseParenExpr(): Operation | null {
    if (this.match(TokenType.LeftParen)) {
      const expr = this.parseExpression(0);
      this.consume(TokenType.RightParen, 'Expected ")"')
      return expr;
    } else if (this.matchKeyword('NOT')) {
      const expr = this.parseParenExpr();
      if (!expr) throw new ParseError('Expected expression');
      return {op: 'NOT', lhs: expr, rhs: null};
    }
    return this.parseComparison();
  }

  private infixBindingPower(op: string): [number, number] {
    switch (op) {
        case 'OR': return [1, 2];
        case 'AND': return [3, 4];
        default: throw new ParseError(`Bad operator ${op}`);
    }
  }

  private parseComparison(): Operation | null {
    const tag = this.parseTag();
    if (tag) {
      const op = this.match(TokenType.Equals) ?? this.consume(TokenType.NotEquals, 'Expected "==" or "!="');

      const listComparison = this.parseList(tag, op.type);
      if (listComparison) return listComparison;

      return {
        op: op.type === TokenType.Equals ? '==' : '!=',
        lhs: tag,
        rhs: this.parseRHSValue(),
      }
    }
    return null;
  }

  private parseList(
    identifier: Tag,
    opType: TokenType,
  ): Operation | null {
    const consumeComparison = (): Operation => ({
      op: opType === TokenType.Equals ? '==' : '!=',
      lhs: identifier,
      rhs: this.parseRHSValue(),
    })

    const listOp = this.match(TokenType.Keyword);
    if (listOp) {
      if (!['ANY', 'ALL'].includes(listOp.literal)) {
        throw new ParseError('Expected "ANY" or "ALL"');
      }
      this.consume(TokenType.LeftSquare, 'Expected "["')

      let lhs = consumeComparison();
      while (this.match(TokenType.Comma) && !this.check(TokenType.RightSquare) && !this.check(TokenType.EOF)) {
        lhs = {
          op: listOp.literal === 'ANY' ? 'OR' : 'AND',
          lhs,
          rhs: consumeComparison(),
        }
      }

      this.consume(TokenType.RightSquare, 'Expected "]"')
      return lhs;
    }

    return null;
  }

  private parseComparisonValue(): Token {
    const variable = this.match(TokenType.Identifier);
    if (variable) {
      const alias = this.variables.get(variable.literal);
      if (!alias) throw new ParseError(`Undefined variable "${variable}"`);
      if (typeof alias === 'number') return {type: TokenType.Number, literal: alias}
      if (typeof alias === 'string') return {type: TokenType.String, literal: alias}
      throw new ParseError(`Variable "${variable}" must be a string or number`);
    }

    return this.match(TokenType.String)
      ?? this.match(TokenType.Regex)
      ?? this.match(TokenType.WildcardNum)
      ?? this.consume(TokenType.Number, 'Expected string, regex or number')
  }

  private parseRHSValue(): RHS {
    const token = this.parseComparisonValue();
    switch (token.type) {
      case TokenType.String:
      case TokenType.Number:
        return token.literal;
      case TokenType.Regex: return {
        type: 'RegExp',
        value: token.literal
      }
      case TokenType.WildcardNum: return {
        type: 'Wildcard',
        value: token.literal
      }
      default: throw new ParseError("Expected rhs value");
    }
  }

  private parseTag(): Tag | null{
    const variable = this.match(TokenType.Identifier);
    if (variable) {
      const alias = this.variables.get(variable.literal);
      if (!alias) throw new ParseError(`Undefined variable "${variable}"`);
      if (!isTag(alias)) throw new ParseError(`Variable "${variable}" must be a tag type`);

      if (this.match(TokenType.Period)) {
        alias.child = this.parseTag() ?? undefined;
      }

      return alias;
    }

    if (this.match(TokenType.LeftBracket)) {
      const group = this.match(TokenType.WildcardNum) ?? this.consume(TokenType.Number, "Expected group");
      this.consume(TokenType.Comma, "Expected comma");
      const element =  this.match(TokenType.WildcardNum) ?? this.consume(TokenType.Number, "Expected element");
      this.consume(TokenType.RightBracket, "Expected '}'");

      let child;
      if (this.match(TokenType.Period)) {
        child = this.parseTag() ?? undefined;
      }

      return {
        group: group.type === TokenType.Number
          ? group.literal
          : {type: 'Wildcard', value: group.literal},
        element: element.type === TokenType.Number
          ? element.literal
          : {type: 'Wildcard', value: element.literal},
        child
      }
    }

    return null;
  }

  private consume(tokenType: TokenType, message: string): Token {
    if (this.check(tokenType)) return this.advance() as Token;
    throw new ParseError(message);
  }

  private matchKeyword(k: string): boolean {
    return this.match(TokenType.Keyword)?.literal === k;
  }

  private match(...types: TokenType[]): Token | null {
    const matches = types.some(t => this.check(t));
    if (matches) return this.advance();
    return null;
  }

  protected check(tokenType: TokenType): boolean {
    return this.peek()?.type === tokenType;
  }

  private advance(): Token | null {
    if (this.isAtEnd()) return null;
    const c = this.peek();
    this.idx++;
    return c ?? null;
  }

  private peek(): Token | null {
    if (this.isAtEnd()) return null;
    return this.tokens[this.idx] ?? null;
  }

  private isAtEnd() {
    return this.idx >= this.tokens.length;
  }
}
