import { isRegExpExpr, isTag, isWildcardExpr, LHS, RHS, Tag } from "./model";
import { Parser } from "./parse";
import { Scanner } from "./scan";
import { tagToMatcher, tagToString } from "./util";

interface ReducedOp {
  op: string;
  lhs: LHS | ReducedOp | boolean;
  rhs: RHS | ReducedOp | boolean;
}

export class TagEvaluate {
  private ast: any;

  public static compile(source: string) {
    return new TagEvaluate(Parser.parse(Scanner.scan(source)));
  }

  private constructor(ast: any) {
    this.ast = ast;
  }

  public matches(): boolean | null {
    if (isBoolean(this.ast)) return this.ast;
    return null;
  }

  public currentAst() {
    const clone = Object.assign({}, this.ast);
    return clone;
  }

  public update(input: Tag, value: string | number): boolean {
    this.ast = ev(this.ast);
    return isBoolean(this.ast);

    function ev(tree: ReducedOp | boolean): ReducedOp | boolean {
      if (isBoolean(tree)) return tree;

      const {op, lhs, rhs} = tree;
      switch (op) {
        case 'TAUTOLOGY': return true;
        case 'AND': {
          const l = ev(lhs as ReducedOp | boolean);
          if (l === false) return false; // Short circuit

          const r = ev(rhs as ReducedOp | boolean);
          if (isBoolean(l) && isBoolean(r)) return l && r;

          return {op, lhs: l, rhs: r}
        }
        case 'OR': {
          const l = ev(lhs as ReducedOp | boolean);
          if (l === true) return true; // Short circuit

          const r = ev(rhs as ReducedOp | boolean);
          if (isBoolean(l) && isBoolean(r)) return l || r;

          return {op, lhs: l, rhs: r}
        }
        case 'NOT': return !ev(lhs as ReducedOp);
        case '==': {
          if (!isTag(lhs)) throw new Error('Expected tag type');
          if (!doesKeyMatch(lhs)) return tree;

          if (isRegExpExpr(rhs)) {
            return new RegExp(rhs.value).test(value.toString());
          }
          return value === rhs;
        }
        case '!=': {
          if (!isTag(lhs)) throw new Error('Expected tag type');
          if (!doesKeyMatch(lhs)) return tree;

          if (isRegExpExpr(rhs)) {
            return !(new RegExp(rhs.value).test(value.toString()));
          }
          return value !== rhs;
        }
        default: throw new Error(`Bad op ${op}`)
      }
    }

    function doesKeyMatch(tag: Tag): boolean {
      if (isWildcardExpr(tag.group) || isWildcardExpr(tag.element)) {
        return tagToMatcher(tag).test(tagToString(input));
      }
      return tagToString(input) === tagToString(tag);
    }
  }
}

function isBoolean(v: any): v is boolean {
  return v === true || v === false;
}
