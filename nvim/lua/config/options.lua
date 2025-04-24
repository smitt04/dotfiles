local o = vim.opt

-- stylua: ignore start
o.autoread       = true                          -- Enable autoread of files
o.breakindent    = true                          -- Enable breakindent so wrapped lines continue indented
o.clipboard      = "unnamedplus"                 -- keep in sync with the system clipboard
o.confirm        = true                          -- show confirm dialog on destructive actions
o.cursorline     = true                          -- Show line the cursor is on
o.cursorline     = true                          -- highlight the current line
o.foldenable     = true                          -- enable folding
o.foldexpr       = "v:lua.vnext.foldexpr()"      -- custom foldexpression
o.foldlevel      = 99
o.foldlevelstart = -1                            -- top level folds only are closed by default
o.foldmethod     = "expr"
o.foldnestmax    = 4                             -- max level of folds
o.foldtext       = ""
o.ignorecase     = true                          -- Ignore case in search patterns
o.inccommand     = 'split'                       -- Preview substitutions live
o.mouse          = 'nv'                          -- enable mouse in normal and visual mode
o.number         = true                          -- Always show numbers
o.relativenumber = false                         -- Don't show relative number
o.scrolloff      = 10                            -- Minimum number of lines to show below/above cursor
o.shiftwidth     = 4                             -- Set default width to 4 spaces
o.showmode       = false                         -- Don't show the mode since it is in the statusline
o.signcolumn     = 'yes'                         -- Always keep signcolumn on
o.smartcase      = true                          -- Override the 'ignorecase' if search pattern contains uppercase characters
o.splitbelow     = true                          -- Split windows below
o.splitright     = true                          -- Split windows on the right
o.undodir        = vim.fn.stdpath("data") .. "/undodir" -- set undo directory
o.undofile       = true                          -- enable/disable undo file creation
o.undolevels     = 1000                          -- number of changes that can be undone
o.updatetime     = 250                           -- How often to update swap file
-- stylua: ignore end
