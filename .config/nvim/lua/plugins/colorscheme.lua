return {
  {
    "zaldih/themery.nvim",
    lazy = false,
    opts = {
      themes = {
        {
          name = "Tokyonight Night",
          colorscheme = "tokyonight-night",
          after = [[
            vim.cmd("GhosttyTheme tokyonight_night")
            vim.cmd("TmuxTheme tokyonight-night")
          ]],
        },
        {
          name = "Catppuccin Mocha",
          colorscheme = "catppuccin-mocha",
          after = [[
            vim.cmd("GhosttyTheme catppuccin-mocha")
            vim.cmd("TmuxTheme catppuccin-mocha")
          ]],
        },
        {
          name = "Sonokai",
          colorscheme = "sonokai",
          after = [[
            vim.cmd("GhosttyTheme sonokai")
            vim.cmd("TmuxTheme sonokai")
          ]],
        },
      },
      livePreview = true,
    },
    config = true,
  },
  {
    "folke/tokyonight.nvim",
    enabled = true,
    lazy = false,
    priority = 1000,
    ---@class tokyonight.Config
    opts = {
      style = "night",
      transparent = true,
      styles = {
        sidebars = "transparent",
        floats = "transparent",
      },
      on_colors = function(colors)
        colors.bg = "#101016"
        colors.bg_sidebar = "#0b0b10"
      end,
    },
    config = function(_, opts)
      require("tokyonight").setup(opts)
      vim.cmd.colorscheme("tokyonight-night")
    end,
  },
  {
    "catppuccin/nvim",
    name = "catppuccin",
    lazy = false,
    priority = 1000,
    opts = {
      no_italic = true,
      auto_integrations = true,
      color_overrides = {
        mocha = {
          base = "#161621", -- default #1e1e2e, 30% darker
          mantle = "#12121b", -- default #181825, 30% darker
          crust = "#0d0d14", -- default #11111b, 30% darker
        },
      },
    },
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
    enabled = false,
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
  {
    "sainnhe/sonokai",
    lazy = false,
    priority = 1000,
    config = function()
      -- Optionally configure and load the colorscheme
      -- directly inside the plugin declaration.
      vim.g.sonokai_enable_italic = false
      vim.g.sonokai_style = "atlantis"
      vim.cmd.colorscheme("sonokai")
    end,
  },
}
