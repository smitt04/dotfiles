local function map(mode, key, cmd, opts)
  opts = opts or {}
  vim.keymap.set(mode, key, cmd, opts)
end

-- Change paste to not yank text
map("x", "p", '"_dP', { noremap = true, silent = true })

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
-- map("n", "<tab>", "<cmd>bnext<cr>", { desc = "[B]uffer [N]ext" })
-- map("n", "<S-tab>", "<cmd>bprevious<cr>", { desc = "[B]uffer [P]rev" })
-- map(
--   "n",
--   "<leader>bD",
--   ":lua Snacks.bufdelete.other()<CR>",
--   { desc = "[B]uffer [D]elete - Close all but the current buffer" }
-- )
-- map("n", "<leader>bd", ":lua Snacks.bufdelete.delete()<CR>", { desc = "[B]uffer [d]elete - Close the current buffer" })
map("n", "gb", ":BufferLinePick<CR>")
