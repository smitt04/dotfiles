return {
  {
    "nvim-treesitter/nvim-treesitter",
    main = "nvim-treesitter.configs",
    build = ":TSUpdate",
    opts = {

      ensure_installed = {
        "go",
        "pug",
        "typescript",
        "javascript",
        "css",
        "json",
        "yaml",
        "lua",
        "vim",
        "vimdoc",
        "query",
        "markdown",
        "markdown_inline",
      },
      auto_install = true,
      highlight = {
        enable = true,
        disable = function(_, buf)
          local max_filesize = 100 * 1024 -- 100 KB
          local ok, stats = pcall(vim.loop.fs_stat, vim.api.nvim_buf_get_name(buf))
          if ok and stats and stats.size > max_filesize then
            return true
          end
        end,
        additional_vim_regex_highlighting = { "ruby" },
      },
      indent = { enable = true, disable = { "ruby", "yaml" } },
    },
  },
}
