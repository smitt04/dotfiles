return {
  {
    "akinsho/bufferline.nvim",
    version = "*",
    dependencies = "nvim-tree/nvim-web-devicons",
    config = function()
      vim.opt.termguicolors = true
      require("bufferline").setup({})
    end,
  },
  {
    "rmagatti/auto-session",
    ---@module "auto-session"
    ---@type AutoSession.Config
    opts = {
      -- allowed_dirs = { "~/projects/**" },
    },
    config = function(_, opts)
      vim.o.sessionoptions = "blank,buffers,curdir,folds,help,tabpages,winsize,winpos,terminal,localoptions"
      require("auto-session").setup(opts)
    end,
  },
  {
    "alexghergh/nvim-tmux-navigation",
    config = function()
      local nvim_tmux_nav = require("nvim-tmux-navigation")

      nvim_tmux_nav.setup({
        disable_when_zoomed = true, -- defaults to false
      })

      vim.keymap.set("n", "<C-h>", nvim_tmux_nav.NvimTmuxNavigateLeft)
      vim.keymap.set("n", "<C-j>", nvim_tmux_nav.NvimTmuxNavigateDown)
      vim.keymap.set("n", "<C-k>", nvim_tmux_nav.NvimTmuxNavigateUp)
      vim.keymap.set("n", "<C-l>", nvim_tmux_nav.NvimTmuxNavigateRight)
      vim.keymap.set("n", "<C-\\>", nvim_tmux_nav.NvimTmuxNavigateLastActive)
      -- vim.keymap.set('n', "<C-Space>", nvim_tmux_nav.NvimTmuxNavigateNext)
    end,
  },
  {
    "nvim-pack/nvim-spectre",
    pin = true,
    config = function()
      require("spectre").setup({
        default = {
          replace = {
            cmd = "oxi",
          },
        },
        is_block_ui_break = true,
      })

      vim.keymap.set("n", "<leader>S", '<cmd>lua require("spectre").toggle()<CR>', {
        desc = "Toggle Spectre",
      })
      -- vim.keymap.set("n", "<leader>sw", '<cmd>lua require("spectre").open_visual({select_word=true})<CR>', {
      --   desc = "Search current word",
      -- })
      -- vim.keymap.set("v", "<leader>sw", '<esc><cmd>lua require("spectre").open_visual()<CR>', {
      --   desc = "Search current word",
      -- })
      vim.keymap.set("n", "<leader>sp", '<cmd>lua require("spectre").open_file_search({select_word=true})<CR>', {
        desc = "Search on current file",
      })
    end,
  },
  {
    "folke/trouble.nvim",
    opts = {
      preview = {
        type = "split",
        relative = "win",
        position = "right",
        size = 0.3,
      },
    }, -- for default options, refer to the configuration section for custom setup.
    cmd = "Trouble",
    keys = {
      {
        "<leader>xx",
        "<cmd>Trouble diagnostics toggle<cr>",
        desc = "Diagnostics (Trouble)",
      },
      {
        "<leader>xX",
        "<cmd>Trouble diagnostics toggle filter.buf=0<cr>",
        desc = "Buffer Diagnostics (Trouble)",
      },
      {
        "<leader>cs",
        "<cmd>Trouble symbols toggle focus=false<cr>",
        desc = "Symbols (Trouble)",
      },
      {
        "<leader>cl",
        "<cmd>Trouble lsp toggle focus=false win.position=right<cr>",
        desc = "LSP Definitions / references / ... (Trouble)",
      },
      {
        "<leader>xL",
        "<cmd>Trouble loclist toggle<cr>",
        desc = "Location List (Trouble)",
      },
      {
        "<leader>xQ",
        "<cmd>Trouble qflist toggle<cr>",
        desc = "Quickfix List (Trouble)",
      },
    },
  },

  {
    "folke/todo-comments.nvim",
    dependencies = { "nvim-lua/plenary.nvim" },
    opts = {},
  },
}
