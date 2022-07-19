import { ScanError } from "./error";
import { Token, TokenType } from "./model";

export class Scanner {
  private readonly source: string;
  private tokens: Token[] = [];
  private idx = 0;

  public static scan(source: string) {
    return new Scanner(source).scan();
  }

  private constructor(source: string) {
    this.source = source;
  }

  private scan(): Token[] {
    while (!this.isAtEnd()) this.scanToken();
    this.addToken(TokenType.EOF);
    return this.tokens;
  }

  private scanToken(): void {
    if (this.isAtEnd()) return;

    const c = this.advance();
    if (!c) return;

    switch (c) {
      case '#': {
        while (this.peek() !== '\n') this.advance();
        return;
      };
      case '(': return this.addToken(TokenType.LeftParen);
      case ')': return this.addToken(TokenType.RightParen);
      case '{': return this.addToken(TokenType.LeftBracket);
      case '}': return this.addToken(TokenType.RightBracket);
      case '[': return this.addToken(TokenType.LeftSquare);
      case ']': return this.addToken(TokenType.RightSquare);
      case ',': return this.addToken(TokenType.Comma);
      case '.': return this.addToken(TokenType.Period);
      case '!': {
        if (this.peek() !== '=') throw new ScanError('Expected "="')
        this.advance();
        return this.addToken(TokenType.NotEquals);
      };
      case '=': {
        if (this.peek() == '=') {
          this.advance();
          return this.addToken(TokenType.Equals);
        } else {
          return this.addToken(TokenType.Assign);
        }
      };
      case '"': return this.str();
      case '/': return this.regex();
    }

    if (/^\d$/.test(c)) return this.number();
    if (/^[a-zA-Z]$/.test(c)) return this.identifier();
  }

  private regex(): void {
    let regexBody = '';
    while (!this.isAtEnd() && this.peek() !== '/') {
      regexBody += this.advance();
    }

    if (this.isAtEnd()) throw new ScanError('Unterminated RegExp.');

    this.advance(); // skip /
    this.tokens.push({
      type: TokenType.Regex,
      literal: {
        type: 'RegExp',
        value: regexBody,
      }
    });
  }

  private str(): void {
    let strBody = '';
    while (!this.isAtEnd() && this.peek() !== '"') {
      strBody += this.advance();
    }

    if (this.isAtEnd()) throw new ScanError('Unterminated string.');

    this.advance(); // skip "
    this.tokens.push({type: TokenType.String, literal: strBody});
  }

  private identifier(): void {
    // Capture initial character
    this.idx--;
    let identBody = '';
    while (/^[a-zA-Z0-9]$/.test(this.peek() ?? '')) {
      identBody += this.advance();
    }

    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(identBody)) {
      throw new ScanError('Expected identifier');
    }

    const isKeyword = this.isKeyword(identBody);
    this.tokens.push({
      type: isKeyword ? TokenType.Keyword : TokenType.Identifier,
      literal: isKeyword ? identBody.toUpperCase() : identBody,
    });
  }

  private number(): void {
    // Capture initial digit
    this.idx--;
    let numBody = '';
    while (/^[\dxa-f_]$/i.test(this.peek() ?? '')) {
      numBody += this.advance();
    }

    // Wildcard number
    if (/^0x[\da-f_]+$/.test(numBody) && numBody.includes('_')) {
      this.tokens.push({
        type: TokenType.WildcardNum,
        literal: numBody,
      });
      return;
    }

    // Make sure we've actually parsed a number
    if (!/^(0x)?[\da-f]+$/i.test(numBody)) {
      throw new ScanError('Expected number');
    }

    this.tokens.push({
      type: TokenType.Number,
      literal: parseInt(numBody, /[xa-f]/i.test(numBody) ? 16 : 10),
    })
  }

  private isKeyword(k: string) {
    return /^(and|or|not|any|all|define|start|end)$/i.test(k);
  }

  private addToken(type: TokenType): void {
    this.tokens.push({type});
  }

  private advance(): string | null {
    if (this.isAtEnd()) return null;
    const c = this.peek();
    this.idx++;
    return c ?? null;
  }

  private peek(): string | null {
    if (this.isAtEnd()) return null;
    return this.source.charAt(this.idx) ?? null;
  }

  private isAtEnd() {
    return this.idx >= this.source.length;
  }
}
