return {
  settings = {
    gopls = {
      gofumpt = true,
      templateExtensions = { "gotmpl" },
      env = {
        GOEXPERIMENT = "synctest",
      },
    },
  },
}
