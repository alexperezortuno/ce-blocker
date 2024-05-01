// import browser from "webextension-polyfill";
//
// console.log("Hello from the background!");
//

document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.onInstalled.addListener((details: any) => {
    console.log("Extension installed:", details);
  });
});
