// import browser from "webextension-polyfill";
//
// console.log("Hello from the background!");
//
// browser.runtime.onInstalled.addListener((details: any) => {
//   console.log("Extension installed:", details);
// });
console.log('background.js');

chrome.webRequest.onCompleted.addListener(
    (details: any) => {
        console.log('onCompleted', details);
    },
    {urls: ["<all_urls>"]},
    [
        "responseHeaders",
        "extraHeaders"
    ]
);
