# Pipes & redirects — |, >, >>

The pipe `|` feeds one command's output into the next. `>` redirects output into
a file (overwriting), `>>` appends.

## What you will learn

- `a | b` — pipe stdout of `a` into `b`
- `cmd > file` — overwrite a file with output
- `cmd >> file` — append output to a file
- Chain freely: `ls | sort > sorted.txt`

## Try it

```bash
cat notes.txt | grep Lorem
ls | sort > sorted.txt
cat sorted.txt
ls | wc -l
```
