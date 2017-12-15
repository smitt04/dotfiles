call plug#begin('~/.local/share/nvim/plugged')

" A Welcome Screen
Plug 'mhinz/vim-startify'

" A Working Dir to VCS root
Plug 'airblade/vim-rooter'

" Fuzzy Search
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/fzf.vim'

" Theme
Plug 'dracula/vim'

" Indentation Guides
Plug 'Yggdroot/indentLine'

" Git
Plug 'airblade/vim-gitgutter'

" Tabs and Status bars
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'




call plug#end()

runtime sensible.vim
runtime keymaps.vim
runtime main.vim

" Map the Leader key
let mapleader="\<SPACE>"

" Load Plugin Configs
runtime plugins/vim-startify.vim
runtime plugins/indentline.vim
runtime plugins/vim-airline.vim
