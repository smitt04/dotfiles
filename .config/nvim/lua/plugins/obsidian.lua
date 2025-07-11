return {
  "epwalsh/obsidian.nvim",
  version = "*",
  lazy = true,
  ft = "markdown",
  dependencies = {
    "nvim-lua/plenary.nvim",
  },
  opts = {
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
