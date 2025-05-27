local Snacks = require("snacks")
return {
  {
    "folke/snacks.nvim",
    priority = 1000,
    lazy = false,
    keys = {
      {
        "<leader><space>",
        function()
          Snacks.picker.buffers({
            sort_lastused = true,
            hidden = false,
            current = false,
            layout = "ivy", -- vertical layout (input and list at the top, preview below)
            focus = "list", -- open in normal mode for immediate j/k navigation
            height = 0.4, -- smaller overall height for the buffers picker
            matcher = {
              frecency = false,
            },
          })
        end,
        desc = "Search Buffers",
      },
      {
        "<leader>sg",
        function()
          Snacks.picker.grep({
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
          Snacks.picker.help()
        end,
        desc = "[S]earch [H]elp",
      },
      {
        "<leader>dd",
        function()
          Snacks.picker.diagnostics({ layout = "ivy" })
        end,
        desc = "Show Diagnostics",
      },
      {
        "<leader>gl",
        function()
          Snacks.picker.git_log({
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
          Snacks.picker.git_branches({
            layout = "select",
          })
        end,
        desc = "[G]it [B]ranches",
      },
      {
        "<leader>gs",
        function()
          Snacks.picker.git_status({
            finder = "git_status",
            format = "git_status",
            focus = "list",
          })
        end,
        desc = "[G]it [S]tatus",
      },

      {
        "<leader>sk",
        function()
          Snacks.picker.keymaps({
            layout = "vertical",
          })
        end,
        desc = "[S]earch [K]eymaps",
      },
      {
        "<leader>sf",
        function()
          Snacks.picker.smart({
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
      },
      dashboard = {},
      toggle = { enabled = true },
      scroll = {},
      rename = {},
      picker = {
        matcher = {
          frecency = true,
          sort_empty = true,
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

  -- {
  --   "folke/trouble.nvim",
  --   optional = true,
  --   specs = {
  --     "folke/snacks.nvim",
  --     opts = function(_, opts)
  --       return vim.tbl_deep_extend("force", opts or {}, {
  --         picker = {
  --           actions = require("trouble.sources.snacks").actions,
  --           win = {
  --             input = {
  --               keys = {
  --                 ["<c-t>"] = {
  --                   "trouble_open",
  --                   mode = { "n", "i" },
  --                 },
  --               },
  --             },
  --           },
  --         },
  --       })
  --     end,
  --   },
  -- },
}
