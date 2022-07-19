import { DicomTree, isRegExpExpr, isTag, isWildcardExpr, Operation, Tag } from "./model";
import { Parser } from "./parse";
import { Scanner } from "./scan";
import { tagToMatcher, tagToString } from "./util";

export class Evaluate {
  private readonly ast: any;

  public static compile(source: string) {
    return new Evaluate(Parser.parse(Scanner.scan(source)));
  }

  private constructor(ast: any) {
    this.ast = ast;
  }

  evaluate(input: DicomTree): boolean {
    return ev(this.ast);

    function ev({op, lhs, rhs}: Operation): boolean {
      switch (op) {
        case 'TAUTOLOGY': return true;
        case 'AND': return ev(lhs as Operation) && ev(rhs as Operation);
        case 'OR': return ev(lhs as Operation) || ev(rhs as Operation);
        case 'NOT': return !ev(lhs as Operation);
        case '==': {
          if (!isTag(lhs)) throw new Error('Expected tag type');
          return getValues(input, lhs).some(value => {
            if (isRegExpExpr(rhs)) {
              return new RegExp(rhs.value).test(value.toString());
            }
            return value === rhs;
          });
        }
        case '!=': {
          if (!isTag(lhs)) throw new Error('Expected tag type');
          return getValues(input, lhs).some(value => {
            if (isRegExpExpr(rhs)) {
              return !(new RegExp(rhs.value).test(value.toString()));
            }
            return value !== rhs;
          })
        }
        default: throw new Error(`Bad op ${op}`)
      }
    }

    function getValues(input: DicomTree, tag: Tag): DicomTree[] {
      if (typeof input === 'string' || typeof input === 'number') return [input];

      if (isWildcardExpr(tag.group) || isWildcardExpr(tag.element)) {
        const matchingKeys = findMatchingKeys(input, tag);
        return matchingKeys.flatMap(k => {
          const v = input[k];
          return v && tag.child ? getValues(v, tag.child) : [v];
        })
      }

      const v = input[tagToString(tag)];
      return v && tag.child ? getValues(v, tag.child) : [v];
    }

    function findMatchingKeys(input: DicomTree, tag: Tag): string[] {
      const r = tagToMatcher(tag);
      return Object.keys(input).filter(k => r.test(k));
    }
  }
}
