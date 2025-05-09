return {
  {
    "nvim-telescope/telescope.nvim",
    tag = "0.1.8",
    dependencies = {
      "nvim-lua/plenary.nvim",
      { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
      { "nvim-telescope/telescope-ui-select.nvim" },
      "nvim-telescope/telescope-file-browser.nvim",
      "nvim-tree/nvim-web-devicons",
      { "polirritmico/telescope-lazy-plugins.nvim" },
    },
    config = function()
      local actions = require("telescope.actions")
      local fb_actions = require("telescope").extensions.file_browser.actions

      require("telescope").setup({
        pickers = {
          find_files = {
            hidden = true,
          },
          buffers = {
            sort_lastused = true,
            ignore_current_buffer = false,
            sort_mru = true,
          },
          lsp_document_symbols = {
            symbol_width = 60,
          },
          lsp_dynamic_workspace_symbols = {
            ymbol_width = 60,
          },
          diagnostics = {
            theme = "ivy",
            initial_mode = "normal",
            layout_config = {
              preview_cutoff = 9999,
            },
          },
        },
        extensions = {
          fzf = {},
          ["ui-select"] = {
            require("telescope.themes").get_dropdown(),
          },
          file_browser = {
            -- theme = "dropdown",
            -- cwd_to_path = true,
            hidden = true,
            respect_gitignore = false,
            grouped = true,
            initial_mode = "normal",
            previewer = true,
            layout_config = {
              height = 40,
              width = 0.6,
              prompt_position = "top",
            },
            sorting_strategy = "ascending",
            -- disables netrw and use telescope-file-browser in its place
            hijack_netrw = true,
            mappings = {
              -- your custom insert mode mappings
              ["n"] = {
                -- your custom normal mode mappings
                ["N"] = fb_actions.create,
                ["p"] = fb_actions.goto_parent_dir,
                ["/"] = function()
                  vim.cmd("startinsert")
                end,
                ["<C-u>"] = function(prompt_bufnr)
                  for _ = 1, 10 do
                    actions.move_selection_previous(prompt_bufnr)
                  end
                end,
                ["<C-d>"] = function(prompt_bufnr)
                  for _ = 1, 10 do
                    actions.move_selection_next(prompt_bufnr)
                  end
                end,
                ["<PageUp>"] = actions.preview_scrolling_up,
                ["<PageDown>"] = actions.preview_scrolling_down,
              },
            },
          },
        },
      })

      require("telescope").load_extension("fzf")
      require("telescope").load_extension("ui-select")
      require("telescope").load_extension("file_browser")
      require("telescope").load_extension("lazy_plugins")

      local builtin = require("telescope.builtin")
      vim.keymap.set("n", "<leader>sh", builtin.help_tags, { desc = "[S]earch [H]elp" })
      vim.keymap.set("n", "<leader>sk", builtin.keymaps, { desc = "[S]earch [K]eymaps" })
      vim.keymap.set("n", "<leader>sf", builtin.find_files, { desc = "[S]earch [F]iles" })
      -- vim.keymap.set("n", "<leader>st", builtin.builtin, { desc = "[S]earch [T]elescope" })
      vim.keymap.set("n", "<leader>st", "<cmd>:TodoTelescope<CR>", { desc = "[S]earch [T]odo" })
      vim.keymap.set("n", "<leader>sW", builtin.grep_string, { desc = "[S]earch current [W]ord" })
      vim.keymap.set("n", "<leader>sg", builtin.live_grep, { desc = "[S]earch by [G]rep" })
      vim.keymap.set("n", "<leader>sd", builtin.diagnostics, { desc = "[S]earch [D]iagnostics" })
      vim.keymap.set("n", "<leader>s<space>", builtin.resume, { desc = "[S]earch [ ] Resume" })
      vim.keymap.set("n", "<leader>s.", builtin.oldfiles, { desc = '[S]earch Recent Files ("." for repeat)' })
      vim.keymap.set("n", "<leader><leader>", builtin.buffers, { desc = "[ ] Find existing buffers" })
      vim.keymap.set("n", "<leader>ss", builtin.lsp_document_symbols, { desc = "[S]earch [S]ymbols" })
      vim.keymap.set(
        "n",
        "<leader>sw",
        builtin.lsp_dynamic_workspace_symbols,
        { desc = "[S]earch [W]orkspace Symbols" }
      )
      vim.keymap.set("n", "<leader>sr", builtin.lsp_references, { desc = "[S]earch [R]eferences" })
      vim.keymap.set("n", "<leader>/", function()
        -- You can pass additional configuration to Telescope to change the theme, layout, etc.
        builtin.current_buffer_fuzzy_find(require("telescope.themes").get_dropdown({
          winblend = 10,
          previewer = false,
        }))
      end, { desc = "[/] Fuzzily search in current buffer" })
      vim.keymap.set("n", "<leader>s/", function()
        builtin.live_grep({
          grep_open_files = true,
          prompt_title = "Live Grep in Open Files",
        })
      end, { desc = "[S]earch [/] in Open Files" })
      -- Shortcut for searching your Neovim configuration files
      vim.keymap.set("n", "<leader>sn", function()
        builtin.find_files({ cwd = vim.fn.stdpath("config") })
      end, { desc = "[S]earch [N]eovim files" })

      -- File Browser
      vim.keymap.set("n", "<leader>sb", function()
        local function telescope_buffer_dir()
          return vim.fn.expand("%:p:h")
        end
        require("telescope").extensions.file_browser.file_browser({
          path = "%:p:h",
          cwd = telescope_buffer_dir(),
          -- respect_gitignore = false,
          -- hidden = true,
          -- grouped = true,
          -- previewer = true,
          -- initial_mode = "normal",
          -- layout_config = { height = 40 },
        })
      end, { desc = "[S]earch File [B]rowser" })

      -- Lazy Plugins
      vim.keymap.set("n", "<leader>sp", function()
        require("telescope").extensions.lazy_plugins.lazy_plugins()
      end, { desc = "[S]earch [P]lugins" })

      -- Git Related Key Maps
      vim.keymap.set("n", "<leader>gs", builtin.git_status, { desc = "[G]it [S]tatus" })
    end,
  },
}
