<script setup lang="ts">
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import Swal from "sweetalert2";
import {onMounted, ref} from "vue";
import {useRouter} from "vue-router";
import axios from "axios";

defineProps<{
  isDarkMode?: boolean
}>();

const emit = defineEmits<{
  (e: 'toggle-dark-mode'): void
}>();

const router = useRouter();
const isEnabled = ref<boolean>(false);
const blockerRules = ref<any>({rules: []});

const presets = [
  {
    name: 'Advertising',
    domains: [
      'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
      'googletag.com', 'googletagmanager.com', 'adservice.google.com',
      'pagead2.googlesyndication.com', 'ads.facebook.com', 'advertising.com',
      'adnxs.com', 'criteo.com', 'outbrain.com', 'taboola.com'
    ]
  },
  {
    name: 'Trackers',
    domains: [
      'google-analytics.com', 'googletagmanager.com', 'hotjar.com',
      'mixpanel.com', 'segment.io', 'segment.com', 'amplitude.com',
      'fullstory.com', 'crazyegg.com', 'mouseflow.com', 'inspectlet.com'
    ]
  },
  {
    name: 'Social Media',
    domains: [
      'connect.facebook.net', 'platform.twitter.com', 'platform.linkedin.com',
      'apis.google.com', 'accounts.google.com', 'social9.com',
      'addthis.com', 'sharethis.com', 'sharingbuttons.io'
    ]
  },
  {
    name: 'Malware',
    domains: [
      'malware.com', 'phishing.com', 'suspicious-domain.com'
    ]
  }
];

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

        if (!importData || !importData.rules) {
          await Toast.fire({icon: "error", title: "No valid rules found"});
          return;
        }

        let rulesArray = importData.rules;
        if (!Array.isArray(rulesArray)) {
          rulesArray = Object.values(rulesArray);
        }

        if (!rulesArray || rulesArray.length === 0) {
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

        const validatedRules = rulesArray.map((rule: any, index: number) => {
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
          router.push('/');
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

async function importPreset(preset: any): Promise<void> {
  const result = await Swal.fire({
    title: `Load ${preset.name}?`,
    text: `This will add ${preset.domains.length} blocking rules. Merge or replace existing rules?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: "Replace",
    cancelButtonText: "Merge",
    reverseButtons: true
  });

  const replace = result.isConfirmed;

  const presetRules = preset.domains.map((domain: string, index: number) => ({
    id: index + 1,
    priority: 1,
    action: {type: chrome.declarativeNetRequest.RuleActionType.BLOCK},
    condition: {
      urlFilter: `*://*.${domain}/*`,
      excludedInitiatorDomains: ['localhost']
    }
  }));

  const rulesToSend = replace ? presetRules : [...blockerRules.value.rules, ...presetRules];

  const response = await chrome.runtime.sendMessage({
    updateRules: {
      data: rulesToSend,
      isEnabled: true
    }
  });

  if (response?.success) {
    await Toast.fire({icon: "success", title: `${preset.name} loaded`});
    router.push('/');
  } else {
    await Toast.fire({icon: "error", title: response?.error || "Failed to load preset"});
  }
}

async function importFromUrl(): Promise<void> {
  const { value: url } = await Swal.fire({
    title: 'Import from URL',
    html: '<input id="url-input" class="swal2-input" placeholder="https://example.com/blocklist.json">',
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Import',
    cancelButtonText: 'Cancel',
    preConfirm: () => {
      return (document.getElementById('url-input') as HTMLInputElement).value;
    }
  });

  if (!url) return;

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    await Toast.fire({icon: "error", title: "URL must start with http:// or https://"});
    return;
  }

  try {
    Swal.showLoading();
    const response = await axios.get(url, { timeout: 10000 });
    const importData = response.data;

    if (!importData || !importData.rules) {
      await Swal.close();
      await Toast.fire({icon: "error", title: "Invalid JSON format"});
      return;
    }

    await Swal.close();

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
    let rulesArray = importData.rules;

    if (!Array.isArray(rulesArray)) {
      rulesArray = Object.values(rulesArray);
    }

    const validatedRules = rulesArray.map((rule: any, index: number) => ({
      id: rule.id || index + 1,
      priority: rule.priority ?? 1,
      action: rule.action || {type: chrome.declarativeNetRequest.RuleActionType.BLOCK},
      condition: rule.condition || {urlFilter: rule.rule || ''}
    }));

    const rulesToSend = replace ? validatedRules : [...blockerRules.value.rules, ...validatedRules];

    const updateResponse = await chrome.runtime.sendMessage({
      updateRules: {
        data: rulesToSend,
        isEnabled: importData.isEnabled !== undefined ? importData.isEnabled : isEnabled.value
      }
    });

    if (updateResponse?.success) {
      await Toast.fire({icon: "success", title: "Rules imported from URL"});
      router.push('/');
    } else {
      await Toast.fire({icon: "error", title: updateResponse?.error || "Import failed"});
    }
  } catch (err: any) {
    await Swal.close();
    console.error('Failed to fetch URL:', err);
    await Toast.fire({icon: "error", title: "Failed to fetch URL: " + (err.message || "Network error")});
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
        if (result.blocker) {
          blockerRules.value.rules = Array.isArray(result.blocker.rules) ? [...result.blocker.rules] : [];
          isEnabled.value = Boolean(result.blocker.isEnabled);
        }
      });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blocker) {
      blockerRules.value.rules = Array.isArray(changes.blocker.newValue?.rules) ? [...changes.blocker.newValue.rules] : [];
      isEnabled.value = Boolean(changes.blocker.newValue?.isEnabled);
    }
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
        <span>Dark mode</span>
      </div>
      <div class="col-2 mb-2">
        <div class="form-check form-switch">
          <input class="form-check-input"
                 type="checkbox"
                 role="switch"
                 id="darkModeSwitch"
                 :checked="isDarkMode"
                 @change="emit('toggle-dark-mode')">
        </div>
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

      <div class="col-10 custom-color-white mb-2">
        <span>Import from URL</span>
      </div>
      <div class="col-2 mb-2">
        <a class="custom-color-white"
           @click="importFromUrl"
           title="Import from URL">
          <font-awesome-icon :icon="['fas', 'globe']"/>
        </a>
      </div>

      <div class="col-12 custom-color-white mb-2 mt-3">
        <h5>Preset Blocklists</h5>
      </div>
      <div class="col-12 mb-2">
        <div class="row g-2">
          <div class="col-6 col-md-3" v-for="preset in presets" :key="preset.name">
            <button class="btn btn-outline-primary btn-sm w-100 text-start"
                    @click="importPreset(preset)">
              <font-awesome-icon :icon="['fas', 'plus']" class="me-1"/>
              {{ preset.name }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
