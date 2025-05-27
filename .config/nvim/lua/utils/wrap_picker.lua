local M = {}

local function get_default_picker(name)
  local ok, telescope_builtin = pcall(require, "telescope.builtin")
  if not ok then
    return function()
      vim.notify("Telescope not available", vim.log.levels.WARN)
    end
  end
  return telescope_builtin[name]
end

M.wrap_picker = function(name, opts)
  opts = opts or {}

  return function()
    local ok, Snacks = pcall(require, "snacks")
    local snacks_picker = ok and Snacks.picker and Snacks.picker[name]

    if type(snacks_picker) == "function" then
      return snacks_picker(opts)
    end

    local fallback = opts.fallback or get_default_picker(name)
    if type(fallback) == "function" then
      return fallback(opts)
    else
      vim.notify("No picker found for '" .. name .. "'", vim.log.levels.WARN)
    end
  end
end

return M
