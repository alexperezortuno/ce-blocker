<script setup lang="ts">
import {onMounted, ref} from "vue";
import Swal from "sweetalert2";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";

let blockUrls: any = ref<any>({rules: [], isEnabled: false});
const domain: any = ref<string>('');
const rule: any = ref<string>('');

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  didOpen: (toast: any) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

onMounted(() => {
  chrome.storage.local.get(['blocker'], (result: any) => {
    blockUrls.value = result.blocker;
  });
});

async function addDomain(): Promise<void> {
  if (rule.value === '') {
    await Toast.fire({
      icon: "error",
      title: "Domain and rule are required"
    });
    return;
  }

  const addRule: any = {
    "id": blockUrls.value.rules.length + 1,
    "priority": 1,
    "action": {"type": chrome.declarativeNetRequest.RuleActionType.BLOCK},
    "condition": {
      "urlFilter": rule.value
    }
  };

  if (domain.value !== '') {
    const domainStrToArray: string[] = domain.value.split(',') || [];
    addRule.condition.initiatorDomains = domainStrToArray.map((item: string) => item.trim());
  } else {
    addRule.condition.excludedInitiatorDomains = ['localhost'];
  }

  blockUrls.value.rules.push(addRule);

  domain.value = '';
  rule.value = '';
  updateStaticRules();
}

function updateStaticRules(): void {
  let newRules: any[] = [];
  blockUrls.value.rules.forEach((domain: any, index: number) => {
    const addRule: any = {
      "id": index + 1,
      "priority": 1,
      "action": {"type": chrome.declarativeNetRequest.RuleActionType.BLOCK},
      "condition": {
        "urlFilter": domain.condition.urlFilter,
      }
    }

    if (domain.condition.initiatorDomains) {
      addRule.condition.initiatorDomains = domain.condition.initiatorDomains;
    } else {
      addRule.condition.excludedInitiatorDomains = ['localhost'];
    }

    newRules.push(addRule);
  });

  chrome.declarativeNetRequest.getDynamicRules(previousRules => {
    const previousRuleIds = previousRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: previousRuleIds,
      addRules: blockUrls.value.isEnabled ? newRules : []
    });

    chrome.storage.local.set({
      blocker: {
        rules: newRules,
        isEnabled: blockUrls.value.isEnabled
      }
    }, () => console.log('Blocker is set'));
  });
}

function removeItem(item: any, index: number): void {
  console.log(item);
  blockUrls.value.rules.splice(index, 1);
  updateStaticRules();
}

function toggleEnabled(): void {
  let newRules: any[] = [];
  blockUrls.value.rules.forEach((domain: any, index: number) => {
    newRules.push({
      "id": index + 1,
      "priority": 1,
      "action": {"type": chrome.declarativeNetRequest.RuleActionType.BLOCK},
      "condition": {
        "excludedInitiatorDomains": ['localhost'],
        "urlFilter": domain.condition.urlFilter,
      }
    });
  });

  chrome.declarativeNetRequest.getDynamicRules(previousRules => {
    const previousRuleIds = previousRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: previousRuleIds,
      addRules: blockUrls.value.isEnabled ? newRules : []
    });
  });

  chrome.storage.local.set({
    blocker: {
      rules: newRules,
      isEnabled: blockUrls.value.isEnabled
    }
  }, () => console.log('Blocker is set'));
}

function trimString(item: string, maxLength: number): string {
  if (item.length > maxLength) {
    return item.substring(0, maxLength) + '...';
  } else {
    return item;
  }
}
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12 text-center mt-3 mb-3">
        <h1 class="custom-color-white">Traffic blocker</h1>
      </div>

      <div class="col-12 mb-2">
        <div class="row g-3 align-items-center">
          <div class="col-12">
            <input type="text"
                   id="domain"
                   class="form-control"
                   placeholder="*"
                   aria-describedby="domainHelp"
                   v-model="domain">
            <div id="domainHelp"
                 class="form-text custom-color-white">
              example.com or live blank for all domains.
            </div>
          </div>

          <div class="col-12">
            <input type="text"
                   id="rule"
                   class="form-control"
                   aria-describedby="rule"
                   required
                   placeholder="*://*.example.com/*"
                   v-model="rule">
            <div id="domainHelp"
                 class="form-text custom-color-white">
              Rule can be a URL or a wildcard.
            </div>
          </div>
        </div>
      </div>

      <div class="col-10 mb-3">
        <button class="btn btn-primary"
                @click="addDomain">
          Add rule
        </button>
      </div>

      <div class="col-2 mb-3">
        <div class="form-check form-switch">
          <input class="form-check-input"
                 type="checkbox"
                 role="switch"
                 id="flexSwitchCheckChecked"
                 v-model="blockUrls.isEnabled"
                 aria-checked="false"
                 @change="toggleEnabled">
        </div>
      </div>

      <div class="col-12 mt-2 text-center"
           v-for="(blockUrl, index) in blockUrls.rules"
           :key="index">
        <div class="row">
          <div class="col-10 text-start custom-color-white">
            {{ trimString(blockUrl.condition.urlFilter, 30) }}
          </div>
          <div class="col-2">
            <button class="btn btn-outline-danger btn-sm"
                    @click="removeItem(blockUrl, index)"
            >
              <font-awesome-icon :icon="['fas', 'remove']" />
            </button>
          </div>
        </div>
      </div>

      <div class="col-12 mt-2 mb-2">
        <div class="row g-3 align-items-right">
          <div class="col-10"></div>
          <div class="col-2">
            <RouterLink
                to="/statistics"
                class="btn btn-primary btn-sm">
              <font-awesome-icon :icon="['fas', 'chart-bar']" />
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
