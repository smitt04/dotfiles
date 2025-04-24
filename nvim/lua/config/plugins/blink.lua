return {
  {
    "saghen/blink.cmp",
    dependencies = {
      "rafamadriz/friendly-snippets",
      "folke/lazydev.nvim",
    },
    version = "1.*",
    ---
    ---@module 'blink.cmp'
    ---@type blink.cmp.Config
    opts = {
      keymap = {
        ["<C-space>"] = { "show", "show_documentation", "hide_documentation" },
        ["<C-e>"] = { "hide", "fallback" },
        ["<CR>"] = { "accept", "fallback" },

        ["<Tab>"] = {
          function(cmp)
            return cmp.select_next()
          end,
          "snippet_forward",
          "fallback",
        },
        ["<S-Tab>"] = {
          function(cmp)
            return cmp.select_prev()
          end,
          "snippet_backward",
          "fallback",
        },

        ["<C-k>"] = { "select_prev", "fallback" },
        ["<C-j>"] = { "select_next", "fallback" },

        ["<C-f>"] = { "scroll_documentation_up", "fallback" },
        ["<C-b>"] = { "scroll_documentation_down", "fallback" },
      },

      appearance = {
        nerd_font_variant = "mono",
      },

      sources = {
        default = { "lsp", "path", "snippets", "buffer" },
        providers = {
          lsp = {
            min_keyword_length = function(ctx)
              return ctx.trigger.kind == "manual" and 0 or 2 -- trigger when invoking with shortcut
            end,
            score_offset = 0,
          },
          path = {
            min_keyword_length = 0,
          },
          snippets = {
            min_keyword_length = 2,
            should_show_items = function(ctx)
              return ctx.trigger.initial_kind ~= "trigger_character" and not require("blink.cmp").snippet_active()
            end,
          },
          buffer = {
            min_keyword_length = 5,
            max_items = 5,
          },
        },
      },
      cmdline = {
        keymap = {
          preset = "inherit",
        },
        completion = {
          menu = {
            auto_show = false,
          },
        },
      },
      signature = { enabled = true },
      completion = {
        documentation = {
          auto_show = true,
          auto_show_delay_ms = 250,
          treesitter_highlighting = true,
          window = { border = "rounded" },
        },
        list = {
          selection = { preselect = false, auto_insert = true },
        },
        trigger = {
          show_on_insert_on_trigger_character = false,
          show_on_accept_on_trigger_character = false,
        },
        menu = {
          border = "rounded",
          draw = {
            columns = { { "label", "label_description", gap = 1 }, { "kind_icon" } },
          },
        },
      },
    },
    opts_extend = { "sources.default" },
  },
}
