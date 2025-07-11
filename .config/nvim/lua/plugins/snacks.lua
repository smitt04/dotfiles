return {
  {
    "folke/snacks.nvim",
    priority = 1000,
    lazy = false,
    keys = {
      {
        "<leader><space>",
        function()
          require("snacks").picker.buffers({
            sort_lastused = true,
            hidden = false,
            current = false,
            -- layout = "ivy", -- vertical layout (input and list at the top, preview below)
            -- focus = "list", -- open in normal mode for immediate j/k navigation
            -- height = 0.4, -- smaller overall height for the buffers picker
            -- matcher = {
            --   cwd_bonus
            --   frecency = false,
            -- },
          })
        end,
        desc = "Search Buffers",
      },
      {
        "<leader>sg",
        function()
          require("snacks").picker.grep({
            cmd = "rg",
            hidden = true,
            ignored = true,
          })
        end,
        desc = "[S]earch [G]rep",
      },
      {
        "<leader>sh",
        function()
          require("snacks").picker.help()
        end,
        desc = "[S]earch [H]elp",
      },
      {
        "<leader>dd",
        function()
          require("snacks").picker.diagnostics({ layout = "ivy" })
        end,
        desc = "Show Diagnostics",
      },
      {
        "<leader>gl",
        function()
          require("snacks").picker.git_log({
            finder = "git_log",
            format = "git_log",
            preview = "git_show",
            confirm = "git_checkout",
            layout = "vertical",
          })
        end,
        desc = "[G]it [L]og",
      },
      {
        "<leader>gb",
        function()
          require("snacks").picker.git_branches({
            layout = "select",
          })
        end,
        desc = "[G]it [B]ranches",
      },
      {
        "<leader>gs",
        function()
          require("snacks").picker.git_status({
            finder = "git_status",
            format = "git_status",
            preview = "git_status",
            win = {
              input = {
                keys = {
                  ["<Tab>"] = { "git_stage", mode = { "n", "i" }, desc = "Toggle Git Stage" },
                },
              },
            },
          })
        end,
        desc = "[G]it [S]tatus",
      },

      {
        "<leader>sk",
        function()
          require("snacks").picker.keymaps({
            layout = "vertical",
          })
        end,
        desc = "[S]earch [K]eymaps",
      },
      {
        "<leader>sf",
        function()
          require("snacks").picker.smart({
            multi = { "recent", "buffers", "files" },
            matcher = {
              cwd_bonus = false, -- do not favor items in the current directory
              fuzzy = true,
              smartcase = true,
            },
            hidden = true,
            no_ignore = true,
            supports_live = true,
            sort = function(a, b)
              -- Try to pull recency information if available; if not, rely on the internal score.
              local a_time = a.last_used or 0
              local b_time = b.last_used or 0
              if a_time ~= b_time then
                return a_time > b_time
              else
                return (a.score or 0) > (b.score or 0)
              end
            end,
          })
        end,
        desc = "[S]earch [F]iles",
      },
      {
        "<leader>bD",
        function()
          require("snacks").bufdelete.other()
          require("snacks").notify.info("Deleted other buffers")
        end,
        desc = "[B]uffer [D]elete - Delete all buffers but current",
      },
      {
        "<leader>bd",
        function()
          require("snacks").bufdelete.delete()
          require("snacks").notify.info("Deleted current buffer")
        end,
        desc = "[B]uffer [d]elete - Delete current buffer",
      },
      {
        "<leader>nh",
        function()
          require("snacks").notifier.show_history()
        end,
        desc = "[N]otification [H]istory",
      },
    },
    ---@type snacks.Config
    opts = {
      indent = {
        animate = {
          enabled = false,
        },
      },
      notifier = {
        enabled = true,
        style = "fancy",
      },
      notify = {},
      dashboard = {},
      toggle = { enabled = true },
      scroll = {},
      rename = {},
      bufdelete = {},
      picker = {
        matcher = {
          frecency = true,
          sort_empty = true,
          hidden = true,
        },
        filter = {
          cwd = true,
        },
        -- formatters = {
        --   file = {
        --     filename_first = true, -- display filename before the file path
        --     truncate = 80,
        --   },
        -- },
      },
      explorer = {},
    },
  },

  {
    "folke/trouble.nvim",
    optional = true,
    specs = {
      "folke/snacks.nvim",
      opts = function(_, opts)
        return vim.tbl_deep_extend("force", opts or {}, {
          picker = {
            actions = require("trouble.sources.snacks").actions,
            win = {
              input = {
                keys = {
                  ["<c-t>"] = {
                    "trouble_open",
                    mode = { "n", "i" },
                  },
                },
              },
            },
          },
        })
      end,
    },
  },
}
