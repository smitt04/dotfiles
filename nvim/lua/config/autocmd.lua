-- Hightlight when yanking text
vim.api.nvim_create_autocmd("TextYankPost", {
  desc = "Highlight when yanking text",
  group = vim.api.nvim_create_augroup("highlight-yank", { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})

--
-- Terminal
--
vim.api.nvim_create_autocmd("TermOpen", {
  group = vim.api.nvim_create_augroup("term-open", { clear = true }),
  callback = function()
    vim.opt.number = false
  end,
})

--
-- AutoReload files when changed outside of nvim
--
-- Trigger checktime on events
vim.api.nvim_create_autocmd({ "FocusGained", "BufEnter", "CursorHold", "CursorHoldI" }, {
  pattern = "*",
  command = "checktime",
})

-- Optional: notify on reload
vim.api.nvim_create_autocmd("FileChangedShellPost", {
  pattern = "*",
  callback = function()
    require("fidget").notify("File changed on disk. Buffer reloaded.", vim.log.levels.INFO)
  end,
})
