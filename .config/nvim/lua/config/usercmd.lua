vim.api.nvim_create_user_command("GhosttyTheme", function(opts)
  local theme = opts.args
  local home = vim.fn.expand("~")
  vim.fn.system({ home .. "/.local/scripts/set-ghostty-theme.sh", theme })
end, {
  nargs = 1,
  complete = function()
    return { "catppuccin-mocha", "tokyonight-night", "sonokai" }
  end,
})

vim.api.nvim_create_user_command("TmuxTheme", function(opts)
  local theme = opts.args
  local home = vim.fn.expand("~")
  vim.fn.system({ home .. "/.local/scripts/set-tmux-theme.sh", theme })
end, {
  nargs = 1,
  complete = function()
    return { "catppuccin-mocha", "tokyonight-night", "sonokai" }
  end,
})
