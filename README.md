# Soroban Flash Web

Flash Anzan practice for solo learners and instructors. Set the difficulty,
digit count, number of terms and flash timing. Keep a running total as the terms
appear, then reveal the answer.

## Run locally

From the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. The app is static and requires no install or build.
Run the exercise checks with `node --test`.

## Practice rules

- **Simple** uses direct bead moves in each affected column.
- **Complex 5** requires a complement of five in at least one column, with no
  carry or borrow.
- **Complex 10** requires a carry or borrow in at least one column.
- The opening number sets the abacus. Each remaining term practices the selected
  technique and counts as one operation. Running totals stay nonnegative.
- Every term has the configured number of digits. Some combinations cannot
  produce a full round. Try fewer terms or allow subtraction when this happens.

Use **Space** to pause or continue, **Esc** to return to settings, and
**Fullscreen** for projection. Switching tabs pauses the round. Preferences
and the count of completed operations are stored in the current browser.
