# shellcheck shell=bash
# Load bash config modules
# shellcheck source=.bash/options
[ -f ~/.bash/options ] && source ~/.bash/options
# shellcheck source=.bash/exports
[ -f ~/.bash/exports ] && source ~/.bash/exports
# shellcheck source=.bash/aliases
[ -f ~/.bash/aliases ] && source ~/.bash/aliases
# shellcheck source=.bash/functions
[ -f ~/.bash/functions ] && source ~/.bash/functions
# shellcheck source=.bash/tools
[ -f ~/.bash/tools ] && source ~/.bash/tools
# shellcheck source=/dev/null
[ -f ~/.bash/secrets ] && source ~/.bash/secrets

### MANAGED BY RANCHER DESKTOP START (DO NOT EDIT)
export PATH="$HOME/.rd/bin:$PATH"
### MANAGED BY RANCHER DESKTOP END (DO NOT EDIT)
