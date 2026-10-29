---
description: Allow macOS notifications from Claude Code (one-time setup)
---

Help me allow macOS notifications for the macos-notifications plugin.

Background: the plugin shows notifications through `osascript`, and macOS shows those as coming from Script Editor. Script Editor only appears in System Settings → Notifications after it has shown a notification itself, so it has to be run once by hand.

1. Run this command to open Script Editor with a one-line test script:

   ```
   open -a "Script Editor" "${CLAUDE_PLUGIN_ROOT}/scripts/first-run.applescript"
   ```

2. Tell me to:
   - click **Run** (▶) in Script Editor, or press ⌘R
   - click **Allow** if macOS asks whether Script Editor may send notifications
   - in System Settings → Notifications → **Script Editor**, check that notifications are allowed and pick **Banners** (disappear on their own) or **Alerts** (stay until dismissed)
   - make sure no Focus mode is hiding notifications

3. Ask me whether the test notification appeared. If it did, send one more through the plugin's own script to confirm that path works too:

   ```
   echo '{"hook_event_name":"Stop","cwd":"'"$PWD"'"}' | osascript -l JavaScript "${CLAUDE_PLUGIN_ROOT}/scripts/notify.js"
   ```

   If the Bash tool runs in a sandbox, run these commands outside it: a sandbox can silently block notifications.

4. If nothing appears, check that Script Editor is listed and allowed in System Settings → Notifications, and that Do Not Disturb or another Focus mode is off.
