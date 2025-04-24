return {
  {
    "folke/tokyonight.nvim",
    enabled = false,
    config = function()
      vim.cmd.colorscheme("tokyonight")
    end,
  },
  {
    "scottmckendry/cyberdream.nvim",
    enabled = false,
    priority = 1000,
    config = function()
      require("cyberdream").setup({
        transparent = false,
      })
      vim.cmd("colorscheme cyberdream")
    end,
  },
  {
    "bluz71/vim-moonfly-colors",
    name = "moonfly",
    enabled = true,
    priority = 1000,
    config = function()
      vim.g.moonflyCursorColor = true
      vim.g.moonflyUnderlineMatchParen = true
      vim.g.moonflyVirtualTextColor = true
      vim.cmd.colorscheme("moonfly")
    end,
  },
  {
    "tiagovla/tokyodark.nvim",
    enabled = false,
    config = function(_, opts)
      require("tokyodark").setup(opts) -- calling setup is optional
      vim.cmd([[colorscheme tokyodark]])
    end,
  },
}
