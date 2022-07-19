import { Tag } from "./model";

export function tagToString({group, element}: Tag): string {
  return (
    group.toString(16).padStart(4, '0')
      + element.toString(16).padStart(4, '0')
  ).toUpperCase()
}
