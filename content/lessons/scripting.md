# Shell variables — export, echo, $NAME

Your first step toward scripting: store values in variables with `export` and
expand them with `$`. Chain commands with `&&`.

## What you will learn

- `export NAME=value` — set a variable
- `echo $NAME` — expand it
- `env` — list all variables
- `a && b` — run `b` only if `a` succeeded

## Try it

```bash
export CITY=jakarta
echo $CITY
env | grep CITY
export CITY=jakarta && echo $CITY
```
