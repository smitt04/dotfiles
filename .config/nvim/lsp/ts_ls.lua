local vue_language_server_path = vim.fn.expand("$MASON/packages/vue-language-server")
  .. "/node_modules/@vue/language-server"

return {
  init_options = {
    plugins = {
      {
        name = "@vue/typescript-plugin",
        location = vue_language_server_path,
        languages = { "vue" },
      },
    },
  },
  filetypes = { "vue", "typescript", "javascript", "javascriptreact", "typescriptreact" },
}
