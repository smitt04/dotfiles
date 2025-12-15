return {
  {
    "nvim-neotest/neotest",
    dependencies = {
      "nvim-neotest/nvim-nio",
      "nvim-lua/plenary.nvim",
      "antoinemadec/FixCursorHold.nvim",
      {
        "nvim-treesitter/nvim-treesitter",
        branch = "main",
        build = function()
          vim.cmd(":TSUpdate go")
        end,
      },
      {
        "fredrikaverpil/neotest-golang",
        -- dir = "~/projects/smitt04/neotest-golang",
        -- dev = true,
        version = "*",
        dependencies = {
          "andythigpen/nvim-coverage",
        },
        build = function()
          vim.system({ "go", "install", "gotest.tools/gotestsum@latest" }):wait() -- Optional, but recommended
        end,
      },
    },
    keys = {
      {
        "<leader>ta",
        function()
          require("neotest").run.attach()
        end,
        desc = "[T]est [A]ttach",
      },
      {
        "<leader>tf",
        function()
          require("neotest").run.run(vim.fn.expand("%"))
        end,
        desc = "[T]est Run [F]ile",
      },
      {
        "<leader>tA",
        function()
          require("neotest").run.run(vim.uv.cwd())
        end,
        desc = "[T]est [A]ll Files",
      },
      {
        "<leader>tn",
        function()
          require("neotest").run.run()
        end,
        desc = "[T]est [N]earest",
      },
      {
        "<leader>tl",
        function()
          require("neotest").run.run_last()
        end,
        desc = "[T]est [L]ast",
      },
      {
        "<leader>ts",
        function()
          require("neotest").summary.toggle()
        end,
        desc = "[T]est [S]ummary",
      },
      {
        "<leader>to",
        function()
          require("neotest").output.open({ enter = true, auto_close = true })
        end,
        desc = "[T]est [O]utput",
      },
      {
        "<leader>tO",
        function()
          require("neotest").output_panel.toggle()
        end,
        desc = "[T]est [O]utput Panel",
      },
      {
        "<leader>tS",
        function()
          require("neotest").run.stop()
        end,
        desc = "[T]est [S]top",
      },
    },

    config = function()
      local neotest_golang_opts = {
        runner = "gotestsum",
        testify_enabled = true,
        gotestsum_args = {},
        go_test_args = {
          "-v",
          "-race",
          "-count=1",
          "-coverprofile=" .. vim.fn.getcwd() .. "/coverage.out",
        },
        env = {
          GOEXPERIMENT = "jsonv2",
        },
        dev_notifications = true,
      }
      require("neotest").setup({
        adapters = {
          require("neotest-golang")(neotest_golang_opts),
        },
      })
    end,
  },
  {
    "andythigpen/nvim-coverage",
    version = "*",
    keys = {
      { "<leader>tc", "<cmd>Coverage<cr>", desc = "Coverage in gutter" },
      { "<leader>tC", "<cmd>CoverageLoad<cr><cmd>CoverageSummary<cr>", desc = "Coverage summary" },
    },
    config = function()
      require("coverage").setup({
        auto_reload = true,
        lang = {
          go = {
            coverage_file = vim.fn.getcwd() .. "/coverage.out",
          },
        },
      })
    end,
  },
}
