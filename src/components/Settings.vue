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

      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      const blob: Blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const url: any = URL.createObjectURL(blob);
      const a: HTMLAnchorElement = document.createElement('a');
      a.href = url;
      a.download = 'rules.json';
      a.click();
      await Toast.fire({
        icon: "success",
        title: "Copied to clipboard"
      });
    });
  } catch (err) {
    console.error('Failed to copy: ', err);
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
        const text: any = e.target.result;
        const data: any = JSON.parse(text);

        if (!data || data.length === 0) {
          return;
        }

        data.forEach((item: any) => {
          let prevData: any = {
            "id": 0,
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

          blockerRules.value.rules.push(toRaw(prevData));
        });
        blockerRules
            .value
            .rules
            .forEach((item: any, index: number) => {
              item.id = index + 1;
            });

        await chrome
            .runtime
            .sendMessage({
              updateRules: {
                data: blockerRules.value.rules,
                isEnabled: isEnabled.value
              }
            });
      };
      reader.readAsText(file);

      await Toast.fire({
        icon: "success",
        title: "Rules imported"
      });
    }
    input.click();
  } catch (err) {
    console.error('Failed to import: ', err);
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
