local function map(mode, key, cmd, opts)
  opts = opts or {}
  vim.keymap.set(mode, key, cmd, opts)
end

-- Clear highlights on search when pressing <Esc> in normal mode
--  See `:help hlsearch`
map("n", "<Esc>", "<cmd>nohlsearch<CR>")

-- Diagnostic keymaps
map("n", "<leader>q", vim.diagnostic.setloclist, { desc = "Open diagnostic [Q]uickfix list" })

-- Movement
map("i", "<M-b>", "<C-o>b", { desc = "Move cursor back one word", noremap = true })
map("i", "<M-f>", "<C-o>w", { desc = "Move cursor forward one word", noremap = true })
map("n", "<M-f>", "w", { desc = "Move cursor forward one word", noremap = true })

-- Execute lua
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
