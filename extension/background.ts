/**
 * Opens the reader in the tab the user is looking at. The extension has no
 * standing access to any site: the toolbar button, the keyboard shortcut and
 * the context menu each grant access to that one tab (activeTab).
 */
const MENU_ID = "speed-reading";
const BLOCKED =
  "Speed Reading kann auf dieser Seite nicht starten (Browser-Seiten, der Erweiterungs-Store und PDF-Dateien sind gesperrt).";

async function openReader(tab: chrome.tabs.Tab | undefined) {
  if (tab?.id === undefined) return;
  const tabId = tab.id;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await chrome.action.setBadgeText({ tabId, text: "" });
    await chrome.action.setTitle({ tabId, title: "" });
  } catch {
    // The browser refuses scripts here; say so where the user just clicked.
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#a36370" });
    await chrome.action.setBadgeText({ tabId, text: "!" });
    await chrome.action.setTitle({ tabId, title: BLOCKED });
  }
}

chrome.action.onClicked.addListener((tab) => void openReader(tab));

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Mit Speed Reading lesen",
      contexts: ["page", "selection"],
    });
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID) void openReader(tab);
});
