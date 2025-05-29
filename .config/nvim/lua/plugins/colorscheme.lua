return {
  {
    "zaldih/themery.nvim",
    lazy = false,
    opts = {
      themes = {
        {
          name = "Tokyonight Night",
          colorscheme = "tokyonight-night",
          after = [[ vim.cmd("GhosttyTheme tokyonight_night") ]],
        },
        {
          name = "Catppuccin Mocha",
          colorscheme = "catppuccin-mocha",
          after = [[ vim.cmd("GhosttyTheme catppuccin-mocha") ]],
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
      term_colors = true,
      transparent_background = false,
      styles = {
        comments = {},
        conditionals = {},
        loops = {},
        functions = {},
        keywords = {},
        strings = {},
        variables = {},
        numbers = {},
        booleans = {},
        properties = {},
        types = {},
      },
      color_overrides = {
        mocha = {
          base = "#000000",
          mantle = "#000000",
          crust = "#000000",
        },
      },
      integrations = {
        telescope = {
          enabled = true,
          style = "nvchad",
        },
        dropbar = {
          enabled = true,
          color_mode = true,
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
}
