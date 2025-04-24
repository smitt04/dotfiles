# Dotfiles

The dotfiles for my systems

## Requirements

Ensure the following are installed

- Git
- Stow

## Installation

First, checkout the dotfiles repo in your `$HOME` directory using git

```sh
git clone git@github.com/smitt04/dotfiles.git
cd dotfiles
```

then use GNU stow to create symlinks

```sh
stow .
```
