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
