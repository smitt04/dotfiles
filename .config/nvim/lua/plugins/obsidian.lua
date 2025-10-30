return {
  "epwalsh/obsidian.nvim",
  version = "*",
  lazy = true,
  ft = "markdown",
  dependencies = {
    "nvim-lua/plenary.nvim",
  },
  opts = {
    ui = {
      enable = false,
    },
    workspaces = {
      {
        name = "work",
        path = "~/obsidian/work",
      },
    },
  },
  config = function(_, opts)
    require("obsidian").setup(opts)
  end,
}
