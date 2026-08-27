"use strict";

const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

function render(enabled) {
  toggle.checked = enabled;
  status.textContent = enabled ? "On for novig.com" : "Off";
}

chrome.storage.sync.get({ enabled: true }, (result) => {
  render(!result || result.enabled !== false);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  render(enabled);
  chrome.storage.sync.set({ enabled });
});
