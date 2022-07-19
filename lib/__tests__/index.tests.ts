import { expect } from 'chai'
import { Evaluate } from '../eval';

describe('', function () {
  it('', () => {
    const matcher = Evaluate.compile(`
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
    `);

    // Prints "true"
    console.log(
      matcher.evaluate({
        '00080016': '1.2.123123.345345345',
        '00081090': 'WeirdDevice',
        '0123FFFF': 1234567,
        '0020000E': '1.1.231123.12312312',
        '01233456': {
          '1030234F': 1234568,
        },
      })
    );
  })
})
