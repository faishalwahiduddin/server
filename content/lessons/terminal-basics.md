# Terminal basics — export, whatis, whereis, which

You are `user` on a simulated machine called `server`. Nothing here is real — every
command runs against an in-memory filesystem in your browser.

## What you will learn

- `export` with no arguments lists every environment variable
- `echo $NAME` reads one variable back (`$USER`, `$HOME`, `$SHELL` …)
- `whatis <cmd>` prints a one-line description
- `whereis <cmd>` shows where the binary and its manual live
- `which <cmd>` shows which binary your shell would run

## Try it

```bash
export
echo $USER
whatis ls
whereis ls
which ls
```

Use **Up/Down arrows** in the terminal to walk through your history.
