return {
  {
    "stevearc/oil.nvim",
    enabled = false,
    ---@module 'oil'
    ---@type oil.SetupOpts
    opts = {
      view_options = {
        show_hidden = false,
      },
      win_options = {
        winbar = "%#@attribute.builtin#%{substitute(v:lua.require('oil').get_current_dir(), '^' . $HOME, '~', '')}",
      },
      float = {
        max_width = 0.8,
        preview_split = "right",
      },
    },
    dependencies = { { "echasnovski/mini.icons", opts = {} } },
    lazy = false,
    keys = {
      {
        "<space>of",
        function()
          local oil = require("oil")
          if vim.w.is_oil_win then
            oil.close()
          else
            oil.open_float(nil, { preview = {} })
          end
          -- require("oil").toggle_float()
          -- require("oil").open_preview()
        end,
        desc = "Open Oil in left sidebar",
      },
    },
    -- config = function(_, opts)
    --   require('oil').setup(opts)
    --   vim.api.nvim_create_autocmd("User", {
    --     pattern = "OilEnter",
    --     callback = vim.schedule_wrap(function(args)
    --       local oil = require("oil")
    --       if vim.api.nvim_get_current_buf() == args.data.buf and oil.get_cursor_entry() then
    --         oil.open_preview()
    --       end
    --     end),
    --   })
    -- end,
  },
}
