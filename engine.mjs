// The opening number sets the abacus. Classify every subsequent move
// against the running total, with carry or borrow taking precedence.
export function classifyMove(total, term) {
  if (term === 0 || total < 0 || total + term < 0) {
    throw new RangeError('A move must have a nonzero term and nonnegative totals.');
  }

  const sign = Math.sign(term);
  let magnitude = Math.abs(term);
  let usesFive = false;

  while (magnitude > 0) {
    const before = total % 10;
    const digit = magnitude % 10;
    const after = before + sign * digit;
    if (after < 0 || after > 9) return 'ten';

    // A direct move sends every moving bead in the same direction.
    // With a complement of five, the upper and lower beads move oppositely.
    const upperDelta = Math.floor(after / 5) - Math.floor(before / 5);
    const lowerDelta = (after % 5) - (before % 5);
    usesFive ||= upperDelta * lowerDelta < 0;
    magnitude = Math.floor(magnitude / 10);
    total = Math.floor(total / 10);
  }

  return usesFive ? 'five' : 'simple';
}

export function generateRound({ digits, count, mode, subtraction }, random = Math.random) {
  if (!Number.isInteger(digits) || digits < 1 || digits > 4 ||
      !Number.isInteger(count) || count < 2 || count > 30 ||
      !['simple', 'five', 'ten'].includes(mode)) {
    throw new RangeError('Invalid exercise settings.');
  }

  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  const width = max - min + 1;

  if (!subtraction && mode !== 'ten' && count * min > max) return null;

  for (let attempt = 0; attempt < 64; attempt++) {
    let total = min + Math.floor(random() * width);
    const terms = [total];

    while (terms.length < count) {
      const start = Math.floor(random() * width);
      const direction = random() < 0.5 ? -1 : 1;
      const preferredSign = subtraction && random() < 0.5 ? -1 : 1;
      let selected = 0;

      for (let index = 0; index < width; index++) {
        const magnitude = min + (start + direction * index + width) % width;
        const first = preferredSign * magnitude;
        if (total + first >= 0 && classifyMove(total, first) === mode) {
          selected = first;
          break;
        }
        if (subtraction && total - first >= 0 && classifyMove(total, -first) === mode) {
          selected = -first;
          break;
        }
      }

      if (!selected) break;
      total += selected;
      terms.push(selected);
    }

    if (terms.length === count) return { terms, total };
  }

  return null;
}
