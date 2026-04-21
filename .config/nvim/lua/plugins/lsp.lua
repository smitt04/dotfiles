-- Mason registry package names
local mason_packages = {
  -- Language servers
  "bash-language-server",
  "buf",
  "css-lsp",
  "dockerfile-language-server",
  "ghostty-ls",
  "gopls",
  "graphql-language-service-cli",
  "html-lsp",
  "json-lsp",
  "lua-language-server",
  "postgres-language-server",
  "rust-analyzer",
  "pug-lsp",
  "tailwindcss-language-server",
  "terraform-ls",
  "tofu-ls",
  "vtsls",
  "vue-language-server",
  "yaml-language-server",
  -- LSP-based linters
  "eslint-lsp",
  "golangci-lint-langserver",
  -- Formatters
  "goimports",
  "markdownlint",
}

-- lspconfig server names to activate
local lsp_servers = {
  "bashls",
  "buf_ls",
  "cssls",
  "dockerls",
  "eslint",
  "ghostty", -- Mason: ghostty-ls
  "golangci_lint_ls",
  "gopls",
  "graphql", -- Mason: graphql-language-service-cli
  "html",
  "jsonls",
  "lua_ls",
  "postgres_lsp",
  "rust_analyzer",
  "tailwindcss",
  "terraformls",
  "tofu_ls",
  "vtsls",
  "vue_ls",
  "yamlls",
}

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
    opts = { ensure_installed = mason_packages },
  },
  {
    "neovim/nvim-lspconfig",
    dependencies = {
      { "j-hui/fidget.nvim", event = "LspAttach", opts = {} },
      "saghen/blink.cmp",
    },
    config = function()
      for _, server in ipairs(lsp_servers) do
        vim.lsp.enable(server)
      end
    end,
  },
  { "mkindberg/ghostty-ls", config = true },
}
