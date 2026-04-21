local M = {}

local function notify_err(msg)
  vim.notify(msg, vim.log.levels.ERROR, { title = "ai_tmux" })
end

local function relative_path(abs)
  local dir = vim.fn.fnamemodify(abs, ":h")
  local out = vim.fn.systemlist({ "git", "-C", dir, "rev-parse", "--show-toplevel" })
  local root
  if vim.v.shell_error == 0 and out[1] and out[1] ~= "" then
    root = out[1]
  else
    root = vim.fn.getcwd()
  end
  root = vim.fs.normalize(root)
  local path = vim.fs.normalize(abs)
  if path:sub(1, #root + 1) == root .. "/" then
    return path:sub(#root + 2)
  end
  return vim.fn.fnamemodify(abs, ":.")
end

local function find_claude_pane()
  local fmt = "#{pane_id}\t#{pane_active}\t#{pane_current_command}"
  local out = vim.fn.systemlist({ "tmux", "list-panes", "-s", "-F", fmt })
  if vim.v.shell_error ~= 0 then
    return nil
  end
  for _, line in ipairs(out) do
    local id, active, cmd = line:match("^(%S+)\t(%S+)\t(.*)$")
    if id and active == "0" and cmd then
      local lc = cmd:lower()
      if lc:match("claude") or lc:match("opencode") or lc:match("codex") then
        return id
      end
    end
  end
  return "{last}"
end

function M.send_ref(opts)
  opts = opts or {}
  local abs = vim.api.nvim_buf_get_name(0)
  if abs == "" then
    notify_err("Buffer has no file name")
    return
  end

  local lstart, lend
  if opts.visual then
    lstart = vim.fn.getpos("'<")[2]
    lend = vim.fn.getpos("'>")[2]
  else
    lstart = vim.fn.line(".")
    lend = lstart
  end
  if lstart > lend then
    lstart, lend = lend, lstart
  end

  local rel = relative_path(abs)
  local token
  if lstart == lend then
    token = string.format("@%s#L%d ", rel, lstart)
  else
    token = string.format("@%s#L%d-L%d ", rel, lstart, lend)
  end

  local pane = find_claude_pane()
  if not pane then
    notify_err("No target tmux pane")
    return
  end

  vim.fn.system({ "tmux", "send-keys", "-t", pane, "-l", token })
  if vim.v.shell_error ~= 0 then
    notify_err("tmux send-keys failed")
    return
  end
  vim.notify("Sent " .. token:gsub("%s+$", "") .. " → " .. pane, vim.log.levels.INFO, { title = "ai_tmux" })
end

local function detect_lang(abs)
  local ft = vim.filetype.match({ filename = abs }) or vim.bo.filetype
  return ft or ""
end

function M.send_snippet(opts)
  opts = opts or {}
  local abs = vim.api.nvim_buf_get_name(0)
  if abs == "" then
    notify_err("Buffer has no file name")
    return
  end

  local lstart, lend
  if opts.visual then
    lstart = vim.fn.getpos("'<")[2]
    lend = vim.fn.getpos("'>")[2]
  else
    lstart = vim.fn.line(".")
    lend = lstart
  end
  if lstart > lend then
    lstart, lend = lend, lstart
  end

  local lines = vim.api.nvim_buf_get_lines(0, lstart - 1, lend, false)
  local rel = relative_path(abs)
  local header
  if lstart == lend then
    header = string.format("%s:L%d", rel, lstart)
  else
    header = string.format("%s:L%d-L%d", rel, lstart, lend)
  end

  local lang = detect_lang(abs)
  local body = table.concat(lines, "\n")
  local snippet = string.format("`%s`\n```%s\n%s\n```\n", header, lang, body)

  local pane = find_claude_pane()
  if not pane then
    notify_err("No target tmux pane")
    return
  end

  vim.fn.system({ "tmux", "load-buffer", "-b", "nvim_snippet", "-" }, snippet)
  if vim.v.shell_error ~= 0 then
    notify_err("tmux load-buffer failed")
    return
  end
  vim.fn.system({ "tmux", "paste-buffer", "-d", "-b", "nvim_snippet", "-t", pane })
  if vim.v.shell_error ~= 0 then
    notify_err("tmux paste-buffer failed")
    return
  end
  vim.notify("Sent snippet " .. header .. " → " .. pane, vim.log.levels.INFO, { title = "ai_tmux" })
end

return M
