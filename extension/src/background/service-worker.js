importScripts("../shared/storage.js");

const POLL_ALARM_NAME = "job-poll-alarm";
const POLL_INTERVAL_MINUTES = 60;

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(POLL_ALARM_NAME, {
    periodInMinutes: POLL_INTERVAL_MINUTES
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== POLL_ALARM_NAME) {
    return;
  }

  // Placeholder for backend poll. Kept intentionally local in MVP.
  const storage = globalThis.JobApplyAssistant && globalThis.JobApplyAssistant.storage;
  if (!storage) {
    return;
  }

  await storage.appendFillLog({
    timestamp: new Date().toISOString(),
    type: "background-poll",
    note: "No backend connected yet"
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "open-options") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }
});
