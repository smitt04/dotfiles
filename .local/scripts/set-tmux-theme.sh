#!/bin/bash

THEME_FILE="$HOME/.dotfiles/.config/tmux/themes/$1.conf"

if [ -f "$THEME_FILE" ]; then
  # Update tmux.conf so the theme persists on reboot
  sed -i '' "s|source-file ~/.dotfiles/.config/tmux/themes/.*\.conf|source-file ~/.dotfiles/.config/tmux/themes/$1.conf|" "$HOME/.dotfiles/.tmux.conf"
  # Apply immediately to the running session
  tmux source-file "$THEME_FILE"
fi
