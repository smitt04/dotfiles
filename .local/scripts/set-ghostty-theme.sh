#!/bin/bash

CONFIG="$HOME/.config/ghostty/config"

# Change to desired theme (passed as first argument)
sed -i '' "s/^theme = .*/theme = $1/" "$CONFIG"

osascript -e 'tell application "System Events" to keystroke "," using {command down, shift down}'
