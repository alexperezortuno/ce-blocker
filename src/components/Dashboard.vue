<script setup lang="ts">
import {computed, onMounted, reactive, ref, toRaw} from "vue";
import Swal from "sweetalert2";
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";

const blockUrls = reactive<{rules: any[], isEnabled: boolean}>({rules: [], isEnabled: false});
const domain: any = ref<string>('');
const rule: any = ref<string>('');
const searchQuery = ref<string>('');

let deletedRule: any = null;
let deletedIndex: number = -1;
let undoTimeout: any = null;

const filteredRules = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  if (!query) return blockUrls.rules;
  return blockUrls.rules.filter((r: any) => {
    const urlFilter = r.condition?.urlFilter?.toLowerCase() || '';
    const initiatorDomains = r.condition?.initiatorDomains?.join(' ')?.toLowerCase() || '';
    return urlFilter.includes(query) || initiatorDomains.includes(query);
  });
});

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

function loadRules() {
  chrome.storage.local.get(['blocker'], (result: any) => {
    if (result.blocker) {
      blockUrls.rules = Array.isArray(result.blocker.rules) ? [...result.blocker.rules] : [];
      blockUrls.isEnabled = Boolean(result.blocker.isEnabled);
    }
  });
}

onMounted(() => {
  loadRules();
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.blocker) {
      loadRules();
    }
  });
});

async function addDomain(): Promise<void> {
  if (rule.value === '') {
    await Toast.fire({
      icon: "error",
      title: "Rule is required"
    });
    return;
  }

  const existingRule = blockUrls.rules.find((r: any) => r.condition?.urlFilter === rule.value);
  if (existingRule) {
    await Toast.fire({
      icon: "warning",
      title: "Rule already exists"
    });
    return;
  }

  const addRule: any = {
    "id": blockUrls.rules.length + 1,
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

  blockUrls.rules.push(addRule);

  domain.value = '';
  rule.value = '';
  updateStaticRules();
}

function updateStaticRules(): void {
  let newRules: any[] = [];
  const rawRules = toRaw(blockUrls.rules);
  const rawIsEnabled = toRaw(blockUrls.isEnabled);

  if (Array.isArray(rawRules)) {
    rawRules.forEach((item: any, index: number) => {
      const addRule: any = {
        "id": index + 1,
        "priority": item.priority || 1,
        "action": item.action || {type: chrome.declarativeNetRequest.RuleActionType.BLOCK},
        "condition": {
          "urlFilter": item.condition.urlFilter,
        }
      };

      if (item.condition.initiatorDomains) {
        addRule.condition.initiatorDomains = item.condition.initiatorDomains;
      } else if (item.condition.excludedInitiatorDomains) {
        addRule.condition.excludedInitiatorDomains = item.condition.excludedInitiatorDomains;
      }

      newRules.push(addRule);
    });
  }

  chrome.declarativeNetRequest.getDynamicRules(previousRules => {
    const previousRuleIds: number[] = previousRules.map((r: any) => r.id);
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: previousRuleIds,
      addRules: rawIsEnabled ? newRules : []
    });

    chrome.storage.local.set({
      blocker: {
        rules: newRules,
        isEnabled: rawIsEnabled
      }
    });
  });
}

async function openRuleModal(index: number): Promise<void> {
  const currentRule = blockUrls.rules[index];
  const initiatorDomains = currentRule.condition.initiatorDomains?.join(', ') || '';
  const excludedDomains = currentRule.condition.excludedInitiatorDomains?.filter((d: string) => d !== 'localhost').join(', ') || '';

  const { value: formValues } = await Swal.fire({
    title: 'Edit Rule',
    html: `
      <div style="text-align: left; margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">URL Filter *</label>
        <input id="swal-urlFilter" class="swal2-input" value="${currentRule.condition.urlFilter}" placeholder="*://*.example.com/*">
      </div>
      <div style="text-align: left; margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Initiator Domains</label>
        <input id="swal-initiatorDomains" class="swal2-input" value="${initiatorDomains}" placeholder="domain1.com, domain2.com">
      </div>
      <div style="text-align: left; margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Excluded Domains</label>
        <input id="swal-excludedDomains" class="swal2-input" value="${excludedDomains}" placeholder="domain1.com, domain2.com">
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Save',
    cancelButtonText: 'Delete',
    confirmButtonColor: '#0d6efd',
    cancelButtonColor: '#dc3545',
    preConfirm: () => {
      return {
        urlFilter: (document.getElementById('swal-urlFilter') as HTMLInputElement).value,
        initiatorDomains: (document.getElementById('swal-initiatorDomains') as HTMLInputElement).value,
        excludedDomains: (document.getElementById('swal-excludedDomains') as HTMLInputElement).value
      };
    }
  });

  if (formValues) {
    if (!formValues.urlFilter) {
      await Toast.fire({icon: "error", title: "URL filter is required"});
      return;
    }

    const updatedRule: any = {
      id: index + 1,
      priority: 1,
      action: {type: chrome.declarativeNetRequest.RuleActionType.BLOCK},
      condition: {urlFilter: formValues.urlFilter}
    };

    if (formValues.initiatorDomains) {
      updatedRule.condition.initiatorDomains = formValues.initiatorDomains.split(',').map((d: string) => d.trim()).filter((d: string) => d);
    }

    if (formValues.excludedDomains) {
      updatedRule.condition.excludedInitiatorDomains = formValues.excludedDomains.split(',').map((d: string) => d.trim()).filter((d: string) => d);
    }
    updatedRule.condition.excludedInitiatorDomains = updatedRule.condition.excludedInitiatorDomains || [];
    if (!updatedRule.condition.initiatorDomains) {
      updatedRule.condition.excludedInitiatorDomains.push('localhost');
    }

    blockUrls.rules[index] = updatedRule;
    updateStaticRules();
    await Toast.fire({icon: "success", title: "Rule updated"});
  } else {
    removeItem(index, true);
  }
}

async function removeItem(index: number, fromModal: boolean = false): Promise<void> {
  if (undoTimeout) {
    clearTimeout(undoTimeout);
    undoTimeout = null;
  }

  deletedRule = {...blockUrls.rules[index]};
  deletedIndex = index;

  blockUrls.rules.splice(index, 1);

  if (!fromModal) {
    updateStaticRules();
  }

  Toast.fire({
    icon: "success",
    title: "Rule deleted",
    toast: true,
    showConfirmButton: true,
    confirmButtonText: "Undo",
    timer: 5000,
    timerProgressBar: true,
    didOpen: (toast: any) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  }).then((result: any) => {
    if (result.isConfirmed) {
      undoDelete();
    }
  });

  undoTimeout = setTimeout(() => {
    deletedRule = null;
    deletedIndex = -1;
  }, 5000);
}

function undoDelete(): void {
  if (deletedRule !== null && deletedIndex !== -1) {
    blockUrls.rules.splice(deletedIndex, 0, deletedRule);
    deletedRule = null;
    deletedIndex = -1;
    updateStaticRules();
    Toast.fire({icon: "info", title: "Rule restored"});
  }
}

async function toggleEnabled(): Promise<void> {
  const rawRules = toRaw(blockUrls.rules);
  const rulesToApply: any[] = Array.isArray(rawRules) ? Array.from(rawRules) : [];

  chrome.declarativeNetRequest.getDynamicRules(previousRules => {
    const previousRuleIds: number[] = previousRules.map((r: any) => r.id);
    const addRules: any[] = toRaw(blockUrls.isEnabled) ? rulesToApply : [];
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: previousRuleIds,
      addRules: addRules
    });
  });

  chrome.storage.local.set({
    blocker: {
      rules: Array.isArray(rawRules) ? Array.from(rawRules) : [],
      isEnabled: toRaw(blockUrls.isEnabled)
    }
  });
}

async function clearAllRules(): Promise<void> {
  const ruleCount = blockUrls.rules.length;
  if (ruleCount === 0) return;

  const result = await Swal.fire({
    title: 'Clear All Rules',
    text: `Delete all ${ruleCount} rule(s) and disable blocker?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete All',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d'
  });

  if (result.isConfirmed) {
    blockUrls.isEnabled = false;
    blockUrls.rules = [];

    chrome.declarativeNetRequest.getDynamicRules(previousRules => {
      const previousRuleIds = previousRules.map((r: any) => r.id);
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: previousRuleIds,
        addRules: []
      });
    });

    chrome.storage.local.set({
      blocker: {
        rules: [],
        isEnabled: false
      }
    });

    await Toast.fire({icon: "success", title: "All rules cleared"});
  }
}

function trimString(item: string, maxLength: number): string {
  if (item.length > maxLength) {
    return item.substring(0, maxLength) + '...';
  } else {
    return item;
  }
}

function moveRuleUp(index: number): void {
  if (index === 0) return;
  const temp = blockUrls.rules[index];
  blockUrls.rules[index] = blockUrls.rules[index - 1];
  blockUrls.rules[index - 1] = temp;
  updateStaticRules();
}

function moveRuleDown(index: number): void {
  if (index === blockUrls.rules.length - 1) return;
  const temp = blockUrls.rules[index];
  blockUrls.rules[index] = blockUrls.rules[index + 1];
  blockUrls.rules[index + 1] = temp;
  updateStaticRules();
}
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12 text-center mt-3 mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <h1 class="custom-color-white mb-0">Traffic blocker</h1>
          <button
            v-if="blockUrls.rules.length > 0"
            class="btn btn-outline-danger btn-sm clear-btn"
            @click="clearAllRules"
            title="Clear all rules">
            <font-awesome-icon :icon="['fas', 'trash']"/>
          </button>
        </div>
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
              example.com or leave blank for all domains.
            </div>
          </div>

          <div class="col-12">
            <input type="text"
                   id="rule"
                   class="form-control"
                   aria-describedby="rule"
                   required
                   placeholder="*://*.example.com/*"
                   v-model="rule"
                   @keyup.enter="addDomain">
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
        <div class="form-check form-switch d-flex justify-content-end align-items-center">
          <input class="form-check-input"
                 type="checkbox"
                 role="switch"
                 id="flexSwitchCheckChecked"
                 v-model="blockUrls.isEnabled"
                 aria-checked="false"
                 @change="toggleEnabled">
          <label v-if="blockUrls.rules.length > 0" class="form-check-label ms-2 custom-color-white" for="flexSwitchCheckChecked">
            {{ blockUrls.isEnabled ? 'ON' : 'OFF' }}
          </label>
        </div>
      </div>

      <div class="col-12 mt-2 mb-2">
        <div class="row justify-content-end">
          <div class="col-2 align-self-end">
            <RouterLink
                to="/settings"
                class="custom-color-white">
              <font-awesome-icon :icon="['fas', 'sliders']"/>
            </RouterLink>
          </div>
          <div class="col-2 align-self-end">
            <RouterLink
                to="/statistics"
                class="custom-color-white">
              <font-awesome-icon :icon="['fas', 'chart-bar']"/>
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="col-12 mt-2 mb-4">
        <div class="row mb-3" v-if="blockUrls.rules.length > 1">
          <div class="col-12">
            <input type="text"
                   id="search"
                   class="form-control"
                   placeholder="Search rules..."
                   v-model="searchQuery">
          </div>
        </div>
        <div class="row">
          <div class="col-12 text-center mb-2"
               v-if="blockUrls.rules.length === 0">
            <span class="custom-color-white">No rules yet. Add one above.</span>
          </div>
          <div class="col-12 text-center mb-2"
               v-else-if="filteredRules.length === 0">
            <span class="custom-color-white">No rules match "{{ searchQuery }}"</span>
          </div>
          <div class="col-12 text-center mb-2"
               v-for="(blockUrl, index) in filteredRules"
               :key="blockUrl.id || index"
               @click="openRuleModal(blockUrls.rules.indexOf(blockUrl))"
               style="cursor: pointer;">
            <div class="row align-items-center custom-rule-row">
              <div class="col-1">
                <span class="badge bg-secondary custom-color-white">{{ index + 1 }}</span>
              </div>
              <div class="col-6 text-start custom-color-white">
                {{ trimString(blockUrl.condition.urlFilter, 30) }}
              </div>
              <div class="col-5 text-end">
                <button class="btn btn-outline-info btn-sm me-1 move-btn"
                        @click.stop="moveRuleUp(blockUrls.rules.indexOf(blockUrl))"
                        :disabled="blockUrls.rules.indexOf(blockUrl) === 0"
                        title="Move up">
                  <font-awesome-icon :icon="['fas', 'chevron-up']"/>
                </button>
                <button class="btn btn-outline-info btn-sm me-1 move-btn"
                        @click.stop="moveRuleDown(blockUrls.rules.indexOf(blockUrl))"
                        :disabled="blockUrls.rules.indexOf(blockUrl) === blockUrls.rules.length - 1"
                        title="Move down">
                  <font-awesome-icon :icon="['fas', 'chevron-down']"/>
                </button>
                <button class="btn btn-outline-danger btn-sm delete-btn"
                        @click.stop="removeItem(blockUrls.rules.indexOf(blockUrl))"
                        title="Delete rule">
                  <font-awesome-icon :icon="['fas', 'remove']"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-check-input {
  transition: all 0.3s ease;
}

.form-check-input:checked {
  background-color: #198754;
  border-color: #198754;
  box-shadow: 0 0 8px rgba(25, 135, 84, 0.5);
}

.form-check-input:not(:checked) {
  background-color: #6c757d;
  border-color: #6c757d;
}

.custom-rule-row {
  padding: 0.5rem;
  border-radius: 0.25rem;
  background-color: rgba(255, 255, 255, 0.05);
  transition: background-color 0.2s ease;
}

.custom-rule-row:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.badge {
  font-size: 0.75rem;
  font-weight: 500;
}

.move-btn {
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.move-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.move-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.delete-btn {
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  transform: scale(1.1);
}

.clear-btn {
  padding: 0.3rem 0.6rem;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background-color: #dc3545;
  color: white;
  transform: scale(1.05);
}
</style>
