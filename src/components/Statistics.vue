<script setup lang="ts">

import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {onMounted, onUnmounted, ref} from "vue";

const blockedTraffic: any = ref<number>(0);
let interval: any = ref<any>(null);

onMounted(() => {
  refreshCounter();
  interval = setInterval(() => {
    refreshCounter();
  }, 5000);
});

onUnmounted(() => {
  clearInterval(interval);
});

function refreshCounter(): void {
  chrome.storage.local.get(['settings'], (result: any) => {
    blockedTraffic.value = result.settings.blocked || 0;
  });
}
</script>

<template>
<div class="container-fluid">
  <div class="row justify-content-md-center">
    <div class="col-2 custom-color-white pt-2">
      <RouterLink to="/">
        <font-awesome-icon :icon="['fas', 'chevron-left']" />
      </RouterLink>
    </div>
    <div class="col-10 custom-color-white mb-2 mt-2">
      <h2 class="ms-2">Statistics</h2>
    </div>

    <div class="col-12 text-center">
      <h5>Traffic blocked</h5>
      <div class="row justify-content-md-center">
        <div class="col-12">
          <font-awesome-icon class="text-danger" :icon="['fas', 'ban']" />
        </div>
        <div class="col-12">
          <b class="custom-color-white">{{ blockedTraffic }}</b>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>

</style>
