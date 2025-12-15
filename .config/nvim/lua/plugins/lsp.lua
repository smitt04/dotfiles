-- INFO:List of formatters to install via Mason
local formatters = {
  "goimports",
}

-- INFO:List of linters to install via Mason
local linters = {
  "golangci_lint_ls",
  "markdownlint",
  "eslint",
}

-- INFO:List of language servers to install & setup via Mason.
-- NOTE: These should be nvim-lspconfig server names that are *also* supported by Mason for automatic server setup.
-- Any and all server settings are overriden via the lsp/ folder.
local language_servers = {
  "bashls",
  "buf_ls",
  "cssls",
  "dockerls",
  "ghostty-ls",
  "gopls",
  "graphql",
  "graphql-language-service-cli",
  "html",
  "lua_ls",
  "postgres_lsp",
  "pug-lsp",
  "tailwindcss",
  "terraformls",
  "tofu_ls",
  "vtsls",
  "vue_ls",
  "yamlls",
}

local allMasonPkgs = vim.iter({ language_servers, linters, formatters }):flatten():totable()

return {
  {
    "whoissethdaniel/mason-tool-installer.nvim",
    dependencies = {
      {
        "williamboman/mason.nvim",
        opts = {
          registries = {
            "github:mason-org/mason-registry",
            "github:mkindberg/ghostty-ls",
          },
        },
      },
    },
    opts = { ensure_installed = allMasonPkgs },
  },
  {
    "williamboman/mason-lspconfig.nvim",
    dependencies = {
      {
        "neovim/nvim-lspconfig",

        -- Useful status updates for LSP.
        { "j-hui/fidget.nvim", event = "LspAttach", opts = {} },

        -- Allows extra capabilities provided by blink.cmp
        "saghen/blink.cmp",
      },
    },
    opts = {
      automatic_enable = allMasonPkgs,
    },
  },
  { "mkindberg/ghostty-ls", config = true },
}
