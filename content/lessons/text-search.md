# Text operations — grep, head, tail, sort, uniq, wc

Small tools, combined freely. `grep` searches, `head`/`tail` slice the edges,
`sort`/`uniq` order and de-duplicate, `wc` counts.

## What you will learn

- `grep <word> <file>` — print matching lines
- `head -n <file>` / `tail -n <file>` — first / last lines
- `sort` / `uniq` — order lines, drop adjacent duplicates
- `wc <file>` — lines, words, characters

## Try it

```bash
cat notes.txt
grep dolor notes.txt
head -1 notes.txt
wc notes.txt
```
