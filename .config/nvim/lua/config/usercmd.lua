vim.api.nvim_create_user_command("GhosttyTheme", function(opts)
  local theme = opts.args
  local home = vim.fn.expand("~")
  vim.fn.system({ home .. "/.local/scripts/set-ghostty-theme.sh", theme })
end, {
  nargs = 1,
  complete = function(_, _, _)
    -- return list of available theme names
    return { "catppuccin-mocha", "tokyonight-night" }
  end,
})
