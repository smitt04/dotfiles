return {
  settings = {
    format = {
      enable = false, -- let conform handle the formatting
    },
    Lua = {
      completion = {
        callSnippet = "Replace",
      },
      runtime = {
        version = "LuaJIT",
      },
      -- diagnostics = {
      --   globals = { "Snacks" },
      -- },
      -- Make the server aware of Neovim runtime files
      workspace = {
        checkThirdParty = false,
        library = {
          vim.env.VIMRUNTIME,
          "${3rd}/luv/library",
        },
        diagnostics = {
          disable = {
            "missing-fields",
          },
        },
      },
    },
  },
}
