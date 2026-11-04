import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyMove, generateRound, parseAnswer, simpleMaxTerms } from './engine.mjs';

test('classifies direct moves, complements, carries, and borrows', () => {
  for (const [total, term, mode] of [
    [3, 1, 'simple'], [3, 5, 'simple'], [8, -5, 'simple'],
    [4, 1, 'five'], [5, -1, 'five'], [24, 11, 'five'],
    [9, 1, 'ten'], [10, -1, 'ten'], [94, 16, 'ten'],
  ]) {
    assert.equal(classifyMove(total, term), mode);
  }
});

test('generated rounds match their settings and expected answers', () => {
  let seed = 31;
  const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 2 ** 32);
  for (const mode of ['simple', 'five', 'ten']) {
    for (let digits = 1; digits <= 4; digits++) {
      for (const subtraction of [false, true]) {
        const count = mode === 'simple' && !subtraction ? simpleMaxTerms : subtraction ? 30 : 2;
        const round = generateRound({ mode, digits, count, subtraction }, random);
        assert.ok(round, JSON.stringify({ mode, digits, count, subtraction }));
        assert.equal(round.terms.length, count);
        assert.ok(round.terms[0] > 0);
        let total = 0;
        for (const [index, term] of round.terms.entries()) {
          assert.equal(String(Math.abs(term)).length, digits);
          if (!subtraction) assert.ok(term > 0);
          if (index > 0) assert.equal(classifyMove(total, term), mode);
          total += term;
          assert.ok(total >= 0);
        }
        assert.equal(round.total, total);
      }
    }
  }
});

test('rejects invalid settings and handles impossible rounds', () => {
  const settings = { mode: 'simple', digits: 1, count: 30, subtraction: false };
  assert.equal(generateRound(settings), null);
  assert.throws(() => generateRound({ ...settings, digits: 0 }), RangeError);
});

test('checks whole-number answers in supported digit scripts', () => {
  for (const input of ['42', ' 042 ', '٤٢', '۴۲']) assert.equal(parseAnswer(input), 42);
  assert.equal(parseAnswer('٠'), 0);
  for (const input of ['', '-4', '4.2', '4e2', '9007199254740992']) {
    assert.equal(parseAnswer(input), null);
  }
});

test('default Simple rounds vary and include direct subtraction', () => {
  let seed = 31;
  const random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 2 ** 32);
  const rounds = Array.from({ length: 32 }, () =>
    generateRound({ mode: 'simple', digits: 1, count: 5, subtraction: true }, random)
  );
  assert.ok(rounds.every(round => round.terms.some(term => term < 0)));
  assert.ok(new Set(rounds.flatMap(round => round.terms.map(Math.abs))).size >= 6);
  assert.ok(new Set(rounds.map(round => round.terms.join(','))).size >= 20);
});
