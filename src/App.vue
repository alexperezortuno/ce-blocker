<script setup lang="ts">
import {onMounted, ref, watch} from "vue";

const isDarkMode = ref(false);

onMounted(() => {
  chrome.storage.local.get(['settings'], (result: any) => {
    if (result.settings) {
      isDarkMode.value = result.settings.darkMode || false;
      applyDarkMode(isDarkMode.value);
    }
  });
});

function applyDarkMode(dark: boolean) {
  if (dark) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

watch(isDarkMode, (newVal) => {
  applyDarkMode(newVal);
  chrome.storage.local.get(['settings'], (result: any) => {
    const settings = result.settings || { blocked: 0 };
    settings.darkMode = newVal;
    chrome.storage.local.set({ settings });
  });
});

defineExpose({ isDarkMode });
</script>

<template>
  <router-view :isDarkMode="isDarkMode" @toggle-dark-mode="isDarkMode = !isDarkMode"/>
</template>

<style>
.dark-mode {
  background-color: #1a1a1a !important;
  color: #e0e0e0 !important;
}

.dark-mode .custom-color-white {
  color: #e0e0e0 !important;
}

.dark-mode .form-control {
  background-color: #2d2d2d !important;
  color: #e0e0e0 !important;
  border-color: #444 !important;
}

.dark-mode .form-control:focus {
  background-color: #2d2d2d !important;
  color: #e0e0e0 !important;
  border-color: #666 !important;
  box-shadow: 0 0 0 0.2rem rgba(255, 255, 255, 0.1) !important;
}

.dark-mode .form-text {
  color: #aaa !important;
}

.dark-mode .btn-primary {
  background-color: #4a4a8a !important;
  border-color: #5a5a9a !important;
}

.dark-mode .btn-primary:hover {
  background-color: #5a5a9a !important;
  border-color: #6a6aaa !important;
}

.dark-mode .btn-outline-danger {
  color: #ff6b6b !important;
  border-color: #ff6b6b !important;
}

.dark-mode .btn-outline-danger:hover {
  background-color: #ff6b6b !important;
  color: #1a1a1a !important;
}

.dark-mode a.custom-color-white {
  color: #e0e0e0 !important;
}

.dark-mode .swal2-popup {
  background-color: #2d2d2d !important;
  color: #e0e0e0 !important;
}

.dark-mode .swal2-html-container {
  color: #e0e0e0 !important;
}

.dark-mode .swal2-modal {
  background-color: #2d2d2d !important;
}

.dark-mode .swal2-input {
  background-color: #3d3d3d !important;
  color: #e0e0e0 !important;
  border-color: #555 !important;
}

.dark-mode .swal2-title {
  color: #e0e0e0 !important;
}

.dark-mode label {
  color: #e0e0e0 !important;
}
</style>
