# DICOM Matching DSL

> A tiny DSL for matching against DICOM files

## Getting Started

```
npm install --save @vix/dicom-matcher
```

## Grammar

``` ebnf
<definitions> ::= (DEFINE (<definition)+ END)?
<definition> ::= <alias> '=' <tag> | <string> | <number>

<statement> ::= <expr>
              | '(' <statement> ')'
              | "NOT" <statement>
              | <statement> "AND" <statement>
              | <statement> "OR" <statement>
<expr> ::= <dicom_var> ('==' | '!=') <dicom_value>
<dicom_var> ::= (<identifier> | <tag>) ('.' (<identifier> | <tag>))*
<identifier> ::= [a-zA-Z][a-zA-Z0-9]*
<dicom_value> ::= <list> | <number> | <string> | <regex>
<list> ::= ('ANY' | 'ALL') '[' (<number> | <string>) (',' (<number> | <string>))* ']'
<tag> ::= '{' <tag_number> ',' <tag_number> '}'
<tag_number> ::= '0x' (<hex> | <digit> | '_'){4}
<string> ::= '"' ?Any valid string character? '"'
<regex> ::= ?Any valid javascript RegExp?
<number> ::= <digit>+
<hex> ::= 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
<digit> ::= '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
```

## Sample program

``` text
# Here's a comment

# You can define variables in a DEFINE ... END block to eliminate repetition
DEFINE
  sopClassUID = {0x0008, 0x0016}
  sopInstanceUID = {0x0008, 0x0018}
  seriesInstanceUID = {0x0020, 0x000E}
  weirdNumber = 1234567
  someSopUID = "1.2.456.456456456456"
  anatomicRegionSequence = {0x0008, 0x2218}
  codeValue = {0x0008, 0x0100}
END

# Can use any valid boolean expression with "not", "and" or "or"
NOT (
  # The ANY expression compares all values in the square brackets against the tag
  sopInstanceUID == ANY[
    "1.2.11232.123123123",
    "1.2.123123.345345345",
    someSopUID
  ]
  OR sopClassUID != "1.2.1234.3456.123412341234"
)

# Nested tags inside of SQ tags can be matched with a '.'
AND {0x0123, 0x3456}.{0x1030, 0x234F} == weirdNumber

# You can also use variables as well with the '.' operator
AND anatomicRegionSequence.codeValue == "T-AA000"

# Tags are just the group and element numbers in curly braces (these don't have to be hex)
AND {0x0008, 0x1090} != ALL[
  "Forum",
  "IOLMaster700",
  /Atlas\\d{4}/ # Also can use regular expressions to match
]

# Underscores can match as a "wildcard" for any digit
AND {0x0008, 0x0_1_} == someSopUID

AND NOT (
  {0x0123, 0xFFFF} != weirdNumber
  OR seriesInstanceUID == "1.1.231123.12312312"
)
```
