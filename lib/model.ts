export enum TokenType {
  LeftParen = '(',
  RightParen = ')',
  LeftBracket = '{',
  RightBracket = '}',
  LeftSquare = '[',
  RightSquare = ']',
  Comma = ',',
  Period = '.',
  Equals = '==',
  Assign = '=',
  NotEquals = '!=',
  Number = 'Number',
  WildcardNum = 'WildcardNum',
  String = 'String',
  Regex = 'Regex',
  Identifier = 'Identifier',
  Keyword = 'Keyword',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType
  literal?: any;
}

// The format of this input can obviously change
export type DicomTree = string | number | {[key: string]: DicomTree};

export interface Tag {
  group: number | WildcardExpr;
  element: number | WildcardExpr;
  child?: Tag;
}

export interface RegExpExpr {
  type: 'RegExp';
  value: string;
}

export interface WildcardExpr {
  type: 'Wildcard';
  value: string;
}

export type LHS = Operation | Tag;
export type RHS = Operation
  | RegExpExpr
  | WildcardExpr
  | string
  | number
  | null;

export interface Operation {
  op: string;
  lhs: LHS;
  rhs: RHS;
}

export function isWildcardExpr(tree: any): tree is WildcardExpr {
  return tree?.type === 'Wildcard'
}

export function isTag(tree: any): tree is Tag {
  return typeof tree?.group === 'number'
    && typeof tree?.element === 'number'
}

export function isRegExpExpr(tree: any): tree is RegExpExpr {
  return tree?.type === 'RegExp';
}
