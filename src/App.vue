<script setup lang="ts">
import {onMounted} from "vue";

onMounted(() => {
  chrome.webRequest.onErrorOccurred.addListener(
      (res: any) => {
        console.log('onErrorOccurred', res);
      },
      {urls: ["<all_urls>"]},
      [
        "extraHeaders"
      ]
  );
});
</script>

<template>
  <router-view/>
</template>

<style scoped>
</style>
