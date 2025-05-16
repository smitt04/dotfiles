return {
  { "digitaltoad/vim-pug" },
  {
    "MeanderingProgrammer/render-markdown.nvim",
    -- dependencies = { 'nvim-treesitter/nvim-treesitter', 'echasnovski/mini.nvim' }, -- if you use the mini.nvim suite
    dependencies = { "nvim-treesitter/nvim-treesitter", "echasnovski/mini.icons" }, -- if you use standalone mini plugins
    -- dependencies = { 'nvim-treesitter/nvim-treesitter', 'nvim-tree/nvim-web-devicons' }, -- if you prefer nvim-web-devicons
    ---@module 'render-markdown'
    ---@type render.md.UserConfig
    opts = {
      completions = {
        lsp = {
          enabled = true,
        },
      },
    },
  },
  {
    "rcarriga/nvim-dap-ui",
    dependencies = {
      "mfussenegger/nvim-dap",
      "nvim-neotest/nvim-nio",
      "leoluz/nvim-dap-go",
    },
    config = function()
      local dap, dapui = require("dap"), require("dapui")
      local dapgo = require("dap-go")
      dapui.setup()
      dapgo.setup()
      dap.listeners.before.attach.dapui_config = function()
        dapui.open()
      end
      dap.listeners.before.launch.dapui_config = function()
        dapui.open()
      end

      -- Include the next few lines until the comment only if you feel you need it
      dap.listeners.before.event_terminated.dapui_config = function()
        dapui.close()
      end
      dap.listeners.before.event_exited.dapui_config = function()
        dapui.close()
      end
      -- Include everything after this

      vim.keymap.set("n", "<leader>dC", function()
        require("dap").continue()
      end, { desc = "[D]ebug [C]ontinue" })
      vim.keymap.set("n", "<leader>do", function()
        require("dap").step_over()
      end, { desc = "[D]ebug [O]ver" })
      vim.keymap.set("n", "<leader>di", function()
        require("dap").step_into()
      end, { desc = "[D]ebug [I]nto" })
      vim.keymap.set("n", "<F12>", function()
        require("dap").step_out()
      end, { desc = "[D]ebug O[u]t" })
      vim.keymap.set("n", "<Leader>db", function()
        require("dap").toggle_breakpoint()
      end, { desc = "[D]ebug [B]reakpoint" })
      vim.keymap.set("n", "<Leader>dB", function()
        require("dap").set_breakpoint()
      end, { desc = "[D]ebug Set [B]reakpoint" })
      vim.keymap.set("n", "<Leader>dp", function()
        require("dap").set_breakpoint(nil, nil, vim.fn.input("Log point message: "))
      end, { desc = "[D]ebug Log [P]oint" })
      vim.keymap.set("n", "<Leader>dr", function()
        require("dap").repl.open()
      end, { desc = "[D]ap [R]epl" })
      vim.keymap.set("n", "<Leader>dl", function()
        require("dap").run_last()
      end, { desc = "[D]ap [L]ast" })

      vim.keymap.set("n", "<Leader>dw", function()
        dapui.open()
      end, { desc = "[D]ap Open [W]indow" })
      vim.keymap.set("n", "<Leader>dW", function()
        dapui.close()
      end, { desc = "[D]ap Close [W]indow" })
    end,
  },
}
