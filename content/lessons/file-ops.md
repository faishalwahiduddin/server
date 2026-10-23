# File operations — ls, cat, touch, cp, mv, rm

Files live in a tree rooted at `/`. You start in `/home/user`. Two commands cover
most daily reading: `ls` lists a directory, `cat` prints a file.

## What you will learn

- `ls` — list the current directory (`README.md`, `notes.txt` are already here)
- `cat <file>` — print a file
- `touch <file>` — create an empty file
- `cp <src> <dst>` — copy · `mv <src> <dst>` — move/rename · `rm <file>` — delete

## Try it

```bash
ls
cat notes.txt
touch hello.txt
cp notes.txt backup.txt
ls
```

`cat` on a missing file prints an error — that is normal, and the exit code is non-zero.
