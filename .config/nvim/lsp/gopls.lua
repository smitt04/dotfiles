return {
  settings = {
    gopls = {
      verboseOutput = true,
      gofumpt = true,
      templateExtensions = { "gotmpl" },
      env = {
        GOEXPERIMENT = "jsonv2",
      },
      buildFlags = { "-tags=libvirt" },
    },
  },
}
