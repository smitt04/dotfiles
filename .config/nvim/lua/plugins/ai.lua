return {
  {
    "azorng/goose.nvim",
    event = "VeryLazy",
    opts = {
      keymap = {
        global = {
          select_session = "<leader>gS",
        },
      },
      providers = {
        bedrock = {
          "us.anthropic.claude-sonnet-4-20250514-v1:0",
          "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        },
      },
    },
    config = function(_, opts)
      require("goose").setup(opts)
    end,
    dependencies = {
      "nvim-lua/plenary.nvim",
      {
        "MeanderingProgrammer/render-markdown.nvim",
        opts = {
          anti_conceal = { enabled = false },
        },
      },
    },
  },
  {
    "github/copilot.vim",
    enabled = true,
  },
  {
    "olimorris/codecompanion.nvim",
    enabled = false,
    opts = {
      strategies = {
        inline = {
          adapter = "copilot",
        },
      },
    },
    dependencies = {
      "nvim-lua/plenary.nvim",
      "nvim-treesitter/nvim-treesitter",
    },
  },
}
