import { DicomTree, isRegExpExpr, isTag, Operation, Tag } from "./model";
import { Parser } from "./parse";
import { Scanner } from "./scan";
import { tagToString } from "./util";

export class Evaluate {
  private readonly ast: any;

  public static compile(source: string) {
    return new Evaluate(Parser.parse(Scanner.scan(source)));
  }

  private constructor(ast: any) {
    console.log(JSON.stringify(ast, null, 2))
    this.ast = ast;
  }

  evaluate(input: DicomTree): boolean {
    return ev(this.ast);

    function ev({op, lhs, rhs}: Operation): boolean {
      switch (op) {
        case 'AND': return ev(lhs as Operation) && ev(rhs as Operation);
        case 'OR': return ev(lhs as Operation) || ev(rhs as Operation);
        case 'NOT': return !ev(lhs as Operation);
        case '==': {
          if (!isTag(lhs)) throw new Error('Expected tag type');
          const value = getValues(input, lhs);
          if (isRegExpExpr(rhs)) {
            return new RegExp(rhs.value).test(value.toString());
          }
          return value === rhs;
        }
        case '!=': {
          const value = getValues(input, lhs as Tag);
          if (isRegExpExpr(rhs)) {
            return !(new RegExp(rhs.value).test(value.toString()));
          }
          return value !== rhs;
        }
        default: throw new Error(`Bad op ${op}`)
      }
    }

    function getValues(input: DicomTree, tag: Tag): DicomTree {
      if (typeof input === 'string' || typeof input === 'number') return input;
      const v = input[tagToString(tag)];
      return v && tag.child ? getValues(v, tag.child) : v;
    }
  }
}
