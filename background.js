// The manifest now uses "_execute_action" for the keyboard shortcut.
// This allows Chrome to natively handle the user gesture and toggle the panel
// open and closed automatically, exactly as if the user clicked the extension icon.

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
