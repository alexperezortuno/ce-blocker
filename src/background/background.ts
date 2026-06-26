let isUpdatingRules = false;

const validateRule = (rule: any): boolean => {
    return rule &&
           typeof rule.id === 'number' &&
           typeof rule.priority === 'number' &&
           rule.action &&
           typeof rule.action.type === 'string' &&
           rule.condition &&
           typeof rule.condition.urlFilter === 'string';
};

const autoFixRule = (rule: any, index: number): any => {
    return {
        id: typeof rule.id === 'number' ? rule.id : index + 1,
        priority: typeof rule.priority === 'number' ? rule.priority : 1,
        action: rule.action && typeof rule.action.type === 'string' ? rule.action : {type: chrome.declarativeNetRequest.RuleActionType.BLOCK},
        condition: rule.condition && typeof rule.condition.urlFilter === 'string' ? rule.condition : {urlFilter: rule.condition?.urlFilter || rule.rule || ''}
    };
};

const registerEventListeners = () => {
    chrome.runtime.onInstalled.addListener(() => {
        console.log('Extension started');
        chrome.storage.local.get(['settings', 'blocker'], (result: any) => {
            if (!result.settings) {
                chrome.storage.local.set({settings: {blocked: 0}}).then(() => console.log('Settings initialized'));
            }

            if (!result.blocker) {
                chrome.storage.local.set({
                    blocker: {
                        rules: [],
                        isEnabled: false
                    }
                }, () => console.log('Blocker initialized'));
            }
        });
    });

    chrome.webRequest.onErrorOccurred.addListener(
        (res: any) => {
            if (res.error === 'net::ERR_BLOCKED_BY_CLIENT') {
                chrome.storage.local.get(['settings'], (result: any) => {
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

    chrome
        .runtime
        .onMessage
        .addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: any) => {
            if (message.updateRules !== undefined) {
                if (isUpdatingRules) {
                    sendResponse({success: false, error: 'Update in progress'});
                    return true;
                }

                isUpdatingRules = true;

                const blockerRules = message.updateRules.data;
                const isEnabled = message.updateRules.isEnabled;

                if (!Array.isArray(blockerRules)) {
                    isUpdatingRules = false;
                    sendResponse({success: false, error: 'Invalid rules format'});
                    return true;
                }

                const validatedRules = blockerRules
                    .filter(validateRule)
                    .map((rule, index) => validateRule(rule) ? rule : autoFixRule(rule, index));

                chrome
                    .declarativeNetRequest
                    .getDynamicRules((previousRules: any) => {
                        const previousRulesIds: number[] = previousRules.map((rule: any) => rule.id);

                        chrome.declarativeNetRequest.updateDynamicRules({
                            removeRuleIds: previousRulesIds,
                            addRules: isEnabled ? validatedRules : []
                        }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('Failed to update rules:', chrome.runtime.lastError);
                                isUpdatingRules = false;
                                sendResponse({success: false, error: chrome.runtime.lastError.message});
                                return;
                            }

                            console.log('Rules updated');
                            chrome
                                .storage
                                .local
                                .set({
                                        blocker: {
                                            rules: validatedRules,
                                            isEnabled: isEnabled
                                        }
                                    },
                                    () => {
                                        console.log('Blocker rules updated');
                                        isUpdatingRules = false;
                                        sendResponse({success: true});
                                    });
                        });
                    });

                return true;
            }
        });
}

(() => {
    registerEventListeners();
})();
