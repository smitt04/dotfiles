return {
  {
    "nvim-mini/mini.nvim",
    config = function()
      -- Move lines of code
      -- Defaults are Alt (Meta) + hjkl
      require("mini.move").setup()
    end,
  },
}
