<script setup lang="ts">

import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome";
</script>

<template>
<div class="container-fluid">
  <div class="row">
    <div class="col-2">
      <RouterLink to="/"
                  class="btn btn-primary btn-sm">
        <font-awesome-icon :icon="['fas', 'chevron-left']" />
      </RouterLink>
    </div>
    <div class="col-10 custom-color-white mb-2 mt-2 text-center">
      <h1>Statistics</h1>
    </div>

    <div class="col-12">

    </div>

    <div class="col-12"></div>
  </div>
</div>
</template>

<style scoped>

</style>
