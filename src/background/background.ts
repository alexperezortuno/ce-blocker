const registerEventListeners = () => {
    chrome.runtime.onInstalled.addListener(() => {
        console.log('Extension started');
        chrome.storage.local.get( ['settings', 'blocker'], (result: any) => {
            if (!result.settings) {
                chrome.storage.local.set({settings: {blocked: 0}}).then(() => console.log('Settings initialized'));
            }

            if (!result.blocker) {
                chrome.storage.local.set({blocker: {rules: [], isEnabled: false}}, () => console.log('Blocker initialized'));
            }
        });
    });

    chrome.webRequest.onErrorOccurred.addListener(
        (res: any) => {
            if (res.error === 'net::ERR_BLOCKED_BY_CLIENT') {
                chrome.storage.local.get( ['settings'], (result: any) => {
                    if (result.settings.blocked !== undefined) {
                        chrome.storage.local.set({settings: {blocked: result.settings.blocked + 1}}).then();
                    }
                });
            }
        },
        {urls: ["<all_urls>"]},
        [
            "extraHeaders"
        ]
    );
}

(() => {
    registerEventListeners();
})();
