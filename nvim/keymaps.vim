" Resize Panes with Arrow Keys
nnoremap <Left> :vertical resize -1<CR>
nnoremap <Right> :vertical resize +1<CR>
nnoremap <Up> :resize -1<CR>
nnoremap <Down> :resize +1<CR>

" Disable arrow keys completely in Insert Mode
imap <up> <nop>
imap <down> <nop>
imap <left> <nop>
imap <right> <nop>

" Return to last buffer opened
nmap <Leader><Leader> <c-^>

" Switch Between Buffers
nnoremap <M-Tab> :bnext!<CR>
nnoremap <M-S-Tab> :bprev!<CR><Paste>

