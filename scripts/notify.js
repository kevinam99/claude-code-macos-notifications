// macOS notifications for Claude Code hooks (Stop and Notification events).
// Runs with the JavaScript for Automation built into macOS:
//   osascript -l JavaScript notify.js  < hook-input.json
//
// Environment variables (all optional):
//   CLAUDE_NOTIFY_SOUND_DONE   sound when a response finishes (default Glass, "none" for silent)
//   CLAUDE_NOTIFY_SOUND_INPUT  sound when input is needed (default Ping, "none" for silent)
//   CLAUDE_NOTIFY_ON_DONE      set to 0 to skip "finished" notifications
//   CLAUDE_NOTIFY_DRY_RUN      set to 1 to print "title|subtitle|message|sound" instead of notifying

ObjC.import('Foundation');

function env(name) {
  const value = $.NSProcessInfo.processInfo.environment.objectForKey(name);
  return value.isNil() ? undefined : value.js;
}

function readStdin() {
  const data = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
  return $.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding).js || '';
}

function parse(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : {};
  } catch (e) {
    return {};
  }
}

function projectName(cwd) {
  const parts = typeof cwd === 'string' ? cwd.split('/').filter(Boolean) : [];
  return parts.length ? parts[parts.length - 1] : '';
}

// The transcript format is internal to Claude Code, so any failure here just
// means no conversation title. A /rename title wins over the generated one.
function conversationTitle(transcriptPath) {
  if (typeof transcriptPath !== 'string' || !transcriptPath) return '';
  const contents = $.NSString.stringWithContentsOfFileEncodingError(transcriptPath, $.NSUTF8StringEncoding, null);
  if (contents.isNil()) return '';
  let custom = '';
  let generated = '';
  for (const line of contents.js.split('\n')) {
    if (line.indexOf('-title"') === -1) continue;
    const entry = parse(line);
    if (entry.type === 'custom-title' && entry.customTitle) custom = entry.customTitle;
    if (entry.type === 'ai-title' && entry.aiTitle) generated = entry.aiTitle;
  }
  return custom || generated;
}

function soundSetting(name, fallback) {
  const value = env(name);
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'none' ? '' : value;
}

function describe(input) {
  const message = typeof input.message === 'string' ? input.message : '';
  if (input.hook_event_name === 'Stop') {
    return { kind: 'done', text: '✅ Finished — ready for your next message' };
  }
  switch (input.notification_type) {
    case 'permission_prompt':
      // Claude Code reports its own questions as a permission prompt for AskUserQuestion.
      if (message.indexOf('AskUserQuestion') !== -1) return { kind: 'input', text: '❓ Has a question for you' };
      return { kind: 'input', text: '🔐 ' + message };
    case 'idle_prompt':
      return { kind: 'input', text: '⏳ ' + message };
    case 'elicitation_dialog':
      return { kind: 'input', text: '❓ ' + message };
  }
  return { kind: 'input', text: '🔔 ' + (message || 'Claude Code needs your attention') };
}

function run() {
  const input = parse(readStdin());
  const { kind, text } = describe(input);
  if (kind === 'done' && env('CLAUDE_NOTIFY_ON_DONE') === '0') return;

  const project = projectName(input.cwd);
  const conversation = conversationTitle(input.transcript_path);
  const title = project ? 'Claude Code · ' + project : 'Claude Code';
  const subtitle = conversation ? 'Conversation: ' + conversation : '';
  const sound = kind === 'done'
    ? soundSetting('CLAUDE_NOTIFY_SOUND_DONE', 'Glass')
    : soundSetting('CLAUDE_NOTIFY_SOUND_INPUT', 'Ping');

  if (env('CLAUDE_NOTIFY_DRY_RUN') === '1') return [title, subtitle, text, sound].join('|');

  const options = { withTitle: title };
  if (subtitle) options.subtitle = subtitle;
  if (sound) options.soundName = sound;
  const app = Application.currentApplication();
  app.includeStandardAdditions = true;
  app.displayNotification(text, options);
}
