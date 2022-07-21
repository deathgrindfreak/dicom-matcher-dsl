import { expect } from 'chai'
import { TagEvaluate } from '../tag-eval';

describe('tag-eval', () => {
  it('Should match simple logic', () => {
    const matcher = TagEvaluate.compile(`
      ({0x0000, 0x0000} == 0 OR {0x0001, 0x0002} == 1)
      AND ({0x0003, 0x0004} == 2 AND {0x0005, 0x0006} == 3)
    `);

    let isDone = matcher.update({group: 0x0003, element: 0x0004}, 2);
    expect(isDone).to.be.false;

    isDone = matcher.update({group: 0x0005, element: 0x0006}, 4);
    expect(isDone).to.be.false;

    isDone = matcher.update({group: 0x0000, element: 0x0000}, 0);
    expect(isDone).to.be.true;

    expect(matcher.matches()).to.be.false;
  });
});
