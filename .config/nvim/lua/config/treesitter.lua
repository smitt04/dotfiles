local ensureInstalled = {
  "bash",
  "css",
  "env",
  "gitcommit",
  "go",
  "gomod",
  "gosum",
  "gowork",
  "gotmpl",
  "graphql",
  "html",
  "javascript",
  "json",
  "lua",
  "makefile",
  "markdown",
  "markdown_inline",
  "proto",
  "pug",
  "query",
  "regex",
  "sql",
  "ssh_config",
  "tmux",
  "typescript",
  "vim",
  "vimdoc",
  "vue",
  "yaml",
}
local alreadyInstalled = require("nvim-treesitter.config").get_installed()
local parsersToInstall = vim
  .iter(ensureInstalled)
  :filter(function(parser)
    return not vim.tbl_contains(alreadyInstalled, parser)
  end)
  :totable()
require("nvim-treesitter").install(parsersToInstall)

vim.api.nvim_create_autocmd("FileType", {
  desc = "User: enable treesitter highlighting",
  callback = function(ctx)
    -- highlights
    local hasStarted = pcall(vim.treesitter.start) -- errors for filetypes with no parser

    -- indent
    local noIndent = {}
    if hasStarted and not vim.list_contains(noIndent, ctx.match) then
      vim.bo.indentexpr = "v:lua.require'nvim-treesitter'.indentexpr()"
    end
  end,
})
