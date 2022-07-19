import { isWildcardExpr, Tag, WildcardExpr } from "./model";

export function tagToString({group, element}: Tag): string {
  return (
    group.toString(16).padStart(4, '0')
      + element.toString(16).padStart(4, '0')
  ).toUpperCase()
}

export function tagToMatcher({group, element}: Tag): RegExp {
  const toRegexStr = (s: number | WildcardExpr) => isWildcardExpr(s)
    ? s.value.replace(/^0x/, '').replace(/_/g, '.')
    : s.toString(16).padStart(4, '0')
  return new RegExp(`^${toRegexStr(group)}${toRegexStr(element)}$`.toUpperCase());
}
