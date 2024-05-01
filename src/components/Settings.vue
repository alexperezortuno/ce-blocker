<script setup lang="ts">
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import Swal from "sweetalert2";
import {ref} from "vue";

const importRule = ref<string>('');
const isEnabled = ref<boolean>(false);

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 5000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

async function copyToClipboard(): Promise<void> {
  try {
    const data: any[] = [];
    chrome.storage.local.get(['blocker'], async (result: any) => {
      result.blocker.rules.forEach((item: any) => {
            let prevData: any = {
              rule: item.condition.urlFilter
            };

            if (item.condition.initiatorDomains) {
              prevData.domains = item.condition.initiatorDomains
            }

            data.push(prevData);
          }
      );

      console.log(data);
      await navigator.clipboard.writeText(JSON.stringify(data));
      await Toast.fire({
        icon: "success",
        title: "Copied to clipboard"
      });
    });
  } catch (err) {
    console.error('Failed to copy: ', err);
  }
}

function importRules(): void {
  let newRules: any[] = [];
  const values = JSON.parse(importRule.value);

  if (!values || values.length === 0) {
    return;
  }

  chrome.storage.local.get(['blocker'], async (result: any) => {
    isEnabled.value = result.blocker.isEnabled;
  });

  values.forEach((item: any, k: number) => {
    let prevData: any = {
      "id": k + 1,
      "priority": 1,
      "action": {"type": chrome.declarativeNetRequest.RuleActionType.BLOCK},
      "condition": {
        "urlFilter": item.rule
      }
    };

    if (item.domains) {
      prevData.condition.initiatorDomains = item.domains;
    } else {
      prevData.condition.excludedInitiatorDomains = ['localhost'];
    }

    newRules.push(prevData);
  });

  chrome.declarativeNetRequest.getDynamicRules(previousRules => {
    const previousRuleIds = previousRules.map(rule => rule.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: previousRuleIds,
      addRules: newRules
    });

    chrome.storage.local.set({
      blocker: {
        rules: newRules,
        isEnabled: isEnabled.value
      }
    }, () => console.log('Blocker is set'));
  });

  console.log(newRules);
}

function openModal(): void {
  Swal.fire({
    title: 'Import rules',
    input: 'textarea',
    inputPlaceholder: 'Paste here',
    showCancelButton: true,
    confirmButtonText: 'Import',
    showLoaderOnConfirm: true,
    preConfirm: (value) => {
      importRule.value = value;
      importRules();
    }
  });
}
</script>

<template>
  <div class="container-fluid">
    <div class="row justify-content-md-center">
      <div class="col-2 custom-color-white pt-2">
        <RouterLink to="/">
          <font-awesome-icon :icon="['fas', 'chevron-left']"/>
        </RouterLink>
      </div>
      <div class="col-10 custom-color-white mb-2 mt-2">
        <h2 class="ms-2">Settings</h2>
      </div>

      <div class="col-10 custom-color-white mb-2">
        <span>Export rules</span>
      </div>
      <div class="col-2 mb-2">
        <a class="custom-color-white"
           @click="copyToClipboard">
          <font-awesome-icon :icon="['fas', 'file-export']"/>
        </a>
      </div>

      <div class="col-10 custom-color-white mb-2">
        <span>Import rules</span>
      </div>
      <div class="col-2 mb-2">
        <a class="custom-color-white"
           @click="openModal">
          <font-awesome-icon :icon="['fas', 'file-import']" />
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
