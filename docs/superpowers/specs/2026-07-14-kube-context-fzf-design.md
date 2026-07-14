# Fuzzy Kubernetes Context Switcher

## Goal

Add a Bash function named `kctx` that lets the user choose a Kubernetes context from an `fzf` list and immediately switches to it.

## Location

Add the function to the existing Kubernetes section of `.bash/functions`. `.bashrc` already sources this file.

## Behavior

1. Verify that `kubectl` and `fzf` are available. Return a nonzero status with a clear message if either command is missing.
2. Read exact context names from `kubectl config get-contexts -o name`.
3. Return a nonzero status with a clear message when no contexts are configured.
4. Display the names in `fzf`, with the current context included in the prompt for orientation.
5. If the user cancels or makes no selection, return without changing context.
6. Otherwise run `kubectl config use-context "$selected"` and preserve its exit status.

## Implementation Constraints

- Use Bash syntax consistent with `.bash/functions`.
- Keep state in local variables.
- Quote expansions.
- Do not add dependencies, aliases, namespace selection, context mutation beyond the selected switch, or compatibility shims.

## Verification

- Run `bash -n .bash/functions`.
- Run `shellcheck .bash/functions` when ShellCheck is installed.
- Smoke test the function with stubbed `kubectl` and `fzf` commands, proving successful selection invokes `use-context` with the exact selected name without changing the real kube context.
- Smoke test cancellation, proving `use-context` is not invoked.
