local function map(mode, key, cmd, opts)
  opts = opts or {}
  vim.keymap.set(mode, key, cmd, opts)
end

-- Clear highlights on search when pressing <Esc> in normal mode
--  See `:help hlsearch`
map("n", "<Esc>", "<cmd>nohlsearch<CR>")

-- Diagnostic keymaps
map("n", "<leader>q", vim.diagnostic.setloclist, { desc = "Open diagnostic [Q]uickfix list" })

-- Disable arrow keys in normal mode
-- map("n", "<left>", '<cmd>echo "Use h to move!!"<CR>')
-- map("n", "<right>", '<cmd>echo "Use l to move!!"<CR>')
-- map("n", "<up>", '<cmd>echo "Use k to move!!"<CR>')
-- map("n", "<down>", '<cmd>echo "Use j to move!!"<CR>')

-- Keybinds to make split navigation easier.
--  Use CTRL+<hjkl> to switch between windows
--
--  See `:help wincmd` for a list of all window commands
-- map("n", "<C-h>", "<C-w><C-h>", { desc = "Move focus to the left window" })
-- map("n", "<C-l>", "<C-w><C-l>", { desc = "Move focus to the right window" })
-- map("n", "<C-j>", "<C-w><C-j>", { desc = "Move focus to the lower window" })
-- map("n", "<C-k>", "<C-w><C-k>", { desc = "Move focus to the upper window" })

-- map("n", "<leader><leader>x", "<cmd>source %<CR>")
map("n", "<leader>x", ":.lua<CR>")
map("v", "<leader>x", ":lua<CR>")

-- buffers
map("n", "<tab>", "<cmd>bnext<cr>", { desc = "Next buffer" })
map("n", "<S-tab>", "<cmd>bprevious<cr>", { desc = "Prev buffer" })
map("n", "<leader>bD", "<cmd>%bd|e#|bd#<cr>", { desc = "Close all but the current buffer" })
map("n", "gb", ":BufferLinePick<CR>")

-- Create a terminal on the bottom
map("n", "<leader>st", function()
  vim.cmd.vnew()
  vim.cmd.term()
  vim.cmd.wincmd("J")
  vim.api.nvim_win_set_height(0, 15)
end)
