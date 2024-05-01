const registerEventListeners = () => {
    chrome.runtime.onMessage.addListener((message: any, _sender: any) => {
        console.log('message received', message);
    })
}

(() => {
    registerEventListeners();
})();