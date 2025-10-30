return {
  settings = {
    gopls = {
      gofumpt = true,
      templateExtensions = { "gotmpl" },
      env = {
        GOEXPERIMENT = "jsonv2",
      },
      buildFlags = { "-tags=libvirt" },
    },
  },
}
