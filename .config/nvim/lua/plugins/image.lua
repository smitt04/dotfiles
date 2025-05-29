return {
  {
    "edluffy/hologram.nvim",
    enabled = false,
    config = function()
      require("hologram").setup({
        auto_display = true,
      })
    end,
  },
  {
    "3rd/image.nvim",
    build = false, -- so that it doesn't build the rock https://github.com/3rd/image.nvim/issues/91#issuecomment-2453430239
    opts = {
      processor = "magick_cli",
      integrations = {
        markdown = {
          clear_in_insert_mode = false,
          download_remote_images = true,
          only_render_image_at_cursor = true,
          only_render_image_at_cursor_mode = "inline",
        },
      },
      max_width = 80,
      max_height = 80,
    },
  },
}
