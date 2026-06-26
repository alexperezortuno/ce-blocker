<script setup lang="ts">
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import Swal from "sweetalert2";
import {onMounted, ref, toRaw} from "vue";

const isEnabled = ref<boolean>(false);
const blockerRules = ref<any>({rules: []});

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

async function exportFile(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['blocker']);
    const exportData = {
      rules: result.blocker?.rules || [],
      isEnabled: result.blocker?.isEnabled || false
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules.json';
    a.click();
    URL.revokeObjectURL(url);

    await Toast.fire({
      icon: "success",
      title: "Rules exported"
    });
  } catch (err) {
    console.error('Failed to export: ', err);
    await Toast.fire({
      icon: "error",
      title: "Export failed"
    });
  }
}

async function importRules(): Promise<void> {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        let importData: any;
        try {
          const text: string = e.target.result;
          importData = JSON.parse(text);
        } catch {
          await Toast.fire({icon: "error", title: "Invalid JSON file"});
          return;
        }

        if (!importData || !importData.rules || !Array.isArray(importData.rules) || importData.rules.length === 0) {
          await Toast.fire({icon: "error", title: "No valid rules found"});
          return;
        }

        const result = await Swal.fire({
          title: "Import rules",
          text: "Replace existing rules or merge with them?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Replace",
          cancelButtonText: "Merge",
          reverseButtons: true
        });

        const replace = result.isConfirmed;

        const validatedRules = importData.rules.map((rule: any, index: number) => {
          const fixedRule: any = {
            id: rule.id || index + 1,
            priority: rule.priority ?? 1,
            action: rule.action || {type: chrome.declarativeNetRequest.RuleActionType.BLOCK},
            condition: rule.condition || {urlFilter: rule.rule || ''}
          };

          if (!fixedRule.condition.urlFilter && rule.rule) {
            fixedRule.condition.urlFilter = rule.rule;
          }

          if (fixedRule.condition.initiatorDomains) {
            fixedRule.condition.initiatorDomains = fixedRule.condition.initiatorDomains;
          } else if (fixedRule.condition.excludedInitiatorDomains) {
            fixedRule.condition.excludedInitiatorDomains = fixedRule.condition.excludedInitiatorDomains;
          }

          return fixedRule;
        });

        const rulesToSend = replace ? validatedRules : [...blockerRules.value.rules, ...validatedRules];

        const response = await chrome.runtime.sendMessage({
          updateRules: {
            data: rulesToSend,
            isEnabled: importData.isEnabled !== undefined ? importData.isEnabled : isEnabled.value
          }
        });

        if (response?.success) {
          await Toast.fire({icon: "success", title: "Rules imported"});
        } else {
          await Toast.fire({icon: "error", title: response?.error || "Import failed"});
        }
      };
      reader.readAsText(file);
    }
    input.click();
  } catch (err) {
    console.error('Failed to import: ', err);
    await Toast.fire({icon: "error", title: "Import failed"});
  }
}

// function openModal(): void {
//   Swal.fire({
//     title: 'Import rules',
//     input: 'textarea',
//     inputPlaceholder: 'Paste here',
//     showCancelButton: true,
//     confirmButtonText: 'Import',
//     showLoaderOnConfirm: true,
//     preConfirm: (value) => {
//       importRule.value = value;
//       importRules();
//     }
//   });
// }

onMounted(() => {
  chrome
      .storage
      .local
      .get(['blocker'], async (result: any) => {
        blockerRules.value.rules = toRaw(result.blocker.rules);
        console.log("BLOCKER", blockerRules.value.rules);
        isEnabled.value = result.blocker.isEnabled;
      });
})
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
           @click="exportFile">
          <font-awesome-icon :icon="['fas', 'file-export']"/>
        </a>
      </div>

      <div class="col-10 custom-color-white mb-2">
        <span>Import rules</span>
      </div>
      <div class="col-2 mb-2">
        <a class="custom-color-white"
           @click="importRules">
          <font-awesome-icon :icon="['fas', 'file-import']"/>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
