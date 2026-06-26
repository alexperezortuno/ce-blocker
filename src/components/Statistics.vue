<script setup lang="ts">
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
import {onMounted, onUnmounted, ref} from "vue";
import Swal from "sweetalert2";

const blockedTraffic: any = ref<number>(0);
let interval: any = ref<any>(null);

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
    blockedTraffic.value = result.settings?.blocked || 0;
  });
}

async function resetStatistics(): Promise<void> {
  const result = await Swal.fire({
    title: 'Reset Statistics',
    text: 'Set blocked traffic counter to 0?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Reset',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d'
  });

  if (result.isConfirmed) {
    chrome.storage.local.set({settings: {blocked: 0}}, () => {
      blockedTraffic.value = 0;
      Toast.fire({icon: "success", title: "Counter reset"});
    });
  }
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
      <div class="col-8 custom-color-white mb-2 mt-2 text-center">
        <h2 class="ms-2">Statistics</h2>
      </div>
      <div class="col-2 pt-2">
        <button
          class="btn btn-outline-danger btn-sm"
          @click="resetStatistics"
          title="Reset counter">
          <font-awesome-icon :icon="['fas', 'rotate']" />
        </button>
      </div>

      <div class="col-12 text-center">
        <h5>Traffic blocked</h5>
        <div class="row justify-content-md-center">
          <div class="col-12">
            <font-awesome-icon class="text-danger" :icon="['fas', 'ban']" style="font-size: 3rem;" />
          </div>
          <div class="col-12 mt-3">
            <b class="custom-color-white" style="font-size: 2.5rem;">{{ blockedTraffic.toLocaleString() }}</b>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
