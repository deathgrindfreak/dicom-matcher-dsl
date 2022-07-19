import { expect } from 'chai'
import { Evaluate } from '../eval';

describe('eval', function () {
  it('Empty expression should match everything', () => {
    const matcher = Evaluate.compile('');
    expect(matcher.evaluate({})).to.be.true;
  });

  it('Should eval simple "==" comparison', () => {
    const matcher = Evaluate.compile('{0x0000, 0x0000} == 1');
    expect(matcher.evaluate({'00000000': 1})).to.be.true;
  });

  it('Should eval simple "!=" comparison', () => {
    const matcher = Evaluate.compile('{0x0000, 0x0000} != 1');
    expect(matcher.evaluate({'00000000': 0})).to.be.true;
  });

  it('Should eval simple "AND" comparison', () => {
    const matcher = Evaluate.compile(`
      {0x0000, 0x0000} == 0 AND {0x0001, 0x0002} == 1
    `);
    expect(matcher.evaluate({'00000000': 0, '00010002': 1})).to.be.true;
  });

  it('Should eval simple "OR" comparison', () => {
    const matcher = Evaluate.compile(`
      {0x0000, 0x0000} == 0 OR {0x0001, 0x0002} == 1
    `);
    expect(matcher.evaluate({'00000000': 0, '00010002': 1000})).to.be.true;
  });

  it('Should eval simple "OR" comparison with missing record', () => {
    const matcher = Evaluate.compile(`
      {0x0000, 0x0000} == 0 OR {0x0001, 0x0002} == 1
    `);
    expect(matcher.evaluate({'00010002': 1})).to.be.true;
  });

  it('Should eval simple boolean with "AND" and "OR"', () => {
    const matcher = Evaluate.compile(`
      {0x1111, 0x1111} == 2 AND {0x0000, 0x0000} == 0 OR {0x0001, 0x0002} == 1
    `);
    expect(matcher.evaluate({'00000000': 0, '11111111': 2})).to.be.true;
  });

  it('Should eval with parentheses', () => {
    const matcher = Evaluate.compile(`
      {0x1111, 0x1111} == 2 AND ({0x0000, 0x0000} == 0 OR {0x0001, 0x0002} == 1)
    `);
    expect(matcher.evaluate({'00010002': 1, '11111111': 2})).to.be.true;
  });

  it('Should handle "not"', () => {
    const matcher = Evaluate.compile(`
      {0x1111, 0x1111} == 2 AND NOT ({0x0000, 0x0000} == 0 OR {0x0001, 0x0002} == 1)
    `);
    expect(matcher.evaluate({'11111111': 2})).to.be.true;
  });

  it('Should handle "any" expression', () => {
    const matcher = Evaluate.compile(`{0x0000, 0x0000} == ANY[1, 2, "123", 123]`);
    expect(matcher.evaluate({'00000000': "123"})).to.be.true;
  });

  it('Should handle "all" expression', () => {
    const matcher = Evaluate.compile(`{0x0000, 0x0000} != ALL[1, 2, "123", 123]`);
    expect(matcher.evaluate({'00000000': 1000})).to.be.true;
  });

  it('Should handle regular expression', () => {
    const matcher = Evaluate.compile(`{0x0000, 0x0000} == /Regex.Match\\d{1-4}/`);
    expect(matcher.evaluate({'00000000': 'Regex_Match9000'})).to.be.true;
  });

  it('Should handle wildcard tag', () => {
    const matcher = Evaluate.compile(`{0x0_0_, 0x_00_} == 1`);
    expect(matcher.evaluate({
      '00000000': 0,
      '01011001': 1000,
      '09099009': 1, // Will match on this one
      '11111111': 'Should\'nt match, but doesn\'t matter anyway'
    })).to.be.true;
  });

  it('Should handle nested tag', () => {
    const matcher = Evaluate.compile(`
      {0x0000, 0x0000}.{0x0000, 0x0001} == "Here's a string to match"
    `);
    expect(matcher.evaluate({
      '00000000': {
        '00000001': "Here's a string to match"
      }
    })).to.be.true;
  });

  it('Should handle nested wildcard tag', () => {
    const matcher = Evaluate.compile(`{0x0_0_, 0x_00_}.{0x0000, 0x000_} == 1`);
    expect(matcher.evaluate({
      '09099009': {
        '00000008': 1
      }
    })).to.be.true;
  });

  it('Should handle a simple variable', () => {
    const matcher = Evaluate.compile(`
      DEFINE var = {0x0000, 0x0000} END
      var == 1
    `);
    expect(matcher.evaluate({'00000000': 1})).to.be.true;
  });

  it('Should handle comparing two variables', () => {
    const matcher = Evaluate.compile(`
      DEFINE
        var1 = {0x0000, 0x0000}
        var2 = 1
      END
      var1 == var2 AND NOT var1 != var2
    `);
    expect(matcher.evaluate({'00000000': 1})).to.be.true;
  });

  it('Should handle nested variables', () => {
    const matcher = Evaluate.compile(`
      DEFINE
        var1 = {0x0000, 0x0000}
        var2 = {0x0000, 0x0001}
        var3 = {0x0000, 0x0002}
      END
      var1.var2.var3 == 1
    `);
    expect(matcher.evaluate({
      '00000000': {
        '00000001': {
          '00000002': 1
        }
      }
    })).to.be.true;
  });

  it('Empty expression with definition block should match everything', () => {
    const matcher = Evaluate.compile('DEFINE unused = "blah" END');
    expect(matcher.evaluate({})).to.be.true;
  });
})
