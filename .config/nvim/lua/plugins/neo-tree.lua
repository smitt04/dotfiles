-- Neo-tree is a Neovim plugin to browse the file system
-- https://github.com/nvim-neo-tree/neo-tree.nvim

return {
  "nvim-neo-tree/neo-tree.nvim",
  version = "*",
  dependencies = {
    "nvim-lua/plenary.nvim",
    { "nvim-mini/mini.icons", opts = {} },
    "MunifTanjim/nui.nvim",
  },
  cmd = "Neotree",
  keys = {
    { "\\", ":Neotree reveal<CR>", desc = "NeoTree reveal", silent = true },
    { "<leader>nd", ":Neotree document_symbols right<CR>", desc = "NeoTree Document symbols", silent = true },
  },
  opts = {
    sources = { "filesystem", "git_status" },
    event_handlers = {
      {
        event = "file_moved",
        handler = function(data)
          require("Snacks").rename.on_rename_file(data.source, data.destination)
        end,
      },
      {
        event = "file_renamed",
        handler = function(data)
          require("Snacks").rename.on_rename_file(data.source, data.destination)
        end,
      },
    },
    filesystem = {
      filtered_items = {
        visible = true,
        hide_dotfiles = false,
        hide_gitignored = false,
        never_show = {
          ".DS_Store",
        },
      },
    },
    default_component_configs = {
      icon = {
        provider = function(icon, node) -- setup a custom icon provider
          local text, hl
          local mini_icons = require("mini.icons")
          if node.type == "file" then -- if it's a file, set the text/hl
            text, hl = mini_icons.get("file", node.name)
          elseif node.type == "directory" then -- get directory icons
            text, hl = mini_icons.get("directory", node.name)
            -- only set the icon text if it is not expanded
            if node:is_expanded() then
              text = nil
            end
          end

          -- set the icon text/highlight only if it exists
          if text then
            icon.text = text
          end
          if hl then
            icon.highlight = hl
          end
        end,
      },
      kind_icon = {
        provider = function(icon, node)
          local mini_icons = require("mini.icons")
          icon.text, icon.highlight = mini_icons.get("lsp", node.extra.kind.name)
        end,
      },
    },
  },
}
