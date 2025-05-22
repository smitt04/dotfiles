return {
  {
    "akinsho/toggleterm.nvim",
    enabled = false,
    version = "*",
    config = function()
      require("toggleterm").setup({
        direction = "float",
        float_opts = {
          border = "rounded",
        },
      })

      vim.keymap.set({ "n", "t" }, "<space>tt", require("toggleterm").toggle)
      vim.keymap.set("t", "<esc><esc>", "<c-\\><c-n>")
    end,
  },
}
