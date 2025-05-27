return {
  { -- Adds git related signs to the gutter, as well as utilities for managing changes
    "lewis6991/gitsigns.nvim",
    opts = {
      signs = {
        add = { text = "┃" },
        change = { text = "┃" },
        delete = { text = "_" },
        topdelete = { text = "‾" },
        changedelete = { text = "~" },
        untracked = { text = "┆" },
      },
      signs_staged = {
        add = { text = "┃" },
        change = { text = "┃" },
        delete = { text = "_" },
        topdelete = { text = "‾" },
        changedelete = { text = "~" },
        untracked = { text = "┆" },
      },
      signs_staged_enable = true,
      signcolumn = true,
      on_attach = function(bufnr)
        local gitsigns = require("gitsigns")

        local function map(mode, l, r, opts)
          opts = opts or {}
          opts.buffer = bufnr
          vim.keymap.set(mode, l, r, opts)
        end

        -- Navigation
        map("n", "]c", function()
          if vim.wo.diff then
            vim.cmd.normal({ "]c", bang = true })
          else
            gitsigns.nav_hunk("next")
          end
        end, { desc = "Jump to next git [c]hange" })

        map("n", "[c", function()
          if vim.wo.diff then
            vim.cmd.normal({ "[c", bang = true })
          else
            gitsigns.nav_hunk("prev")
          end
        end, { desc = "Jump to previous git [c]hange" })

        -- Actions
        -- visual mode
        map("v", "<leader>hs", function()
          gitsigns.stage_hunk({ vim.fn.line("."), vim.fn.line("v") })
        end, { desc = "Git [H]unk [S]tage" })
        map("v", "<leader>hr", function()
          gitsigns.reset_hunk({ vim.fn.line("."), vim.fn.line("v") })
        end, { desc = "Git [H]unk [R]eset" })

        -- normal mode
        map("n", "<leader>hs", gitsigns.stage_hunk, { desc = "Git [H]unk [S]tage" })
        map("n", "<leader>hr", gitsigns.reset_hunk, { desc = "Git [H]unk [R]eset" })
        map("n", "<leader>hS", gitsigns.stage_buffer, { desc = "Git Buffer [S]tage" })
        map("n", "<leader>hu", gitsigns.stage_hunk, { desc = "Git [H]unk Stage [U]ndo" })
        map("n", "<leader>hR", gitsigns.reset_buffer, { desc = "Git Buffer [R]eset" })
        map("n", "<leader>hp", gitsigns.preview_hunk, { desc = "Git [H]unk [P]review" })
        map("n", "<leader>hb", gitsigns.blame_line, { desc = "Git [B]lame Line" })
        map("n", "<leader>hd", gitsigns.diffthis, { desc = "Git [D]iff Against Index" })
        map("n", "<leader>hD", function()
          gitsigns.diffthis("@")
        end, { desc = "Git [D]iff Against Last Commit" })

        -- Toggles
        map("n", "<leader>tb", gitsigns.toggle_current_line_blame, { desc = "[T]oggle Git Show [B]lame Line" })
        map("n", "<leader>tD", gitsigns.preview_hunk_inline, { desc = "[T]oggle git show [D]eleted" })
      end,
    },
  },
  {
    "kdheepak/lazygit.nvim",
    lazy = true,
    enabled = false,
    cmd = {
      "LazyGit",
      "LazyGitConfig",
      "LazyGitCurrentFile",
      "LazyGitFilter",
      "LazyGitFilterCurrentFile",
    },
    -- optional for floating window border decoration
    dependencies = {
      "nvim-lua/plenary.nvim",
    },
    -- setting the keybinding for LazyGit with 'keys' is recommended in
    -- order to load the plugin when the command is run for the first time
    keys = {
      { "<leader>lg", "<cmd>LazyGit<cr>", desc = "LazyGit" },
    },
  },
  {
    "sindrets/diffview.nvim",
    opts = {
      enhanced_diff_hl = true,
    },
    config = function(_, opts)
      require("diffview").setup(opts)
    end,
  },
  -- {
  --   "NeogitOrg/neogit",
  --   dependencies = {
  --     "nvim-lua/plenary.nvim",
  --     "sindrets/diffview.nvim",
  --     "nvim-telescope/telescope.nvim",
  --   },
  --   opts = {
  --     kind = "floating",
  --     popup = {
  --       kind = "floating",
  --     },
  --   },
  -- },
}
