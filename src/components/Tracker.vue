<script setup lang="ts">
import {RouteLocationNormalizedLoaded, useRoute} from "vue-router";
import {onMounted, ref} from "vue";
import {remove} from "lodash";

interface WebRequestDetails {
  documentId?: string;
  documentLifecycle?: string;
  frameId?: number;
  frameType?: string;
  fromCache?: boolean;
  initiator?: string;
  ip?: string;
  method?: string;
  parentFrameId?: number;
  requestId?: string;
  responseHeaders?: ResponseHeader[];
  statusCode?: number;
  statusLine?: string;
  tabId?: number;
  timeStamp?: number;
  type?: string;
  url?: string;
}

interface ResponseHeader {
  name?: string;
  value?: string;
}

const route: RouteLocationNormalizedLoaded = useRoute();
let datas: any = ref<WebRequestDetails[]>([]);

onMounted(async () => {
  chrome.storage.session.set({'data': []}).then();

  // chrome.webRequest.onBeforeSendHeaders.addListener(
  //     (details: any) => {
  //       if (details.tabId === Number(route.query.tabId)) {
  //         console.log(details);
  //         saveInStorage(details);
  //       }
  //       return {cancel: details.url.indexOf("://www.evil.com/") != -1};
  //     },
  //     {urls: ["<all_urls>"]},
  //     [
  //       'requestHeaders'
  //     ]
  // );

  chrome.webRequest.onCompleted.addListener(
      (details: any) => {
        if (details.tabId === Number(route.query.tabId)) {
          saveInStorage(details);
        }
      },
      {urls: ["<all_urls>"]},
      [
        "responseHeaders",
        "extraHeaders"
      ]
  );
});

function getStorage(): void {
  chrome.storage.session.get(['data'], (result) => {
    if (result.data && result.data.length !== datas.value.length) {
      datas.value = result.data;
    }
  });
}

function saveInStorage(data: WebRequestDetails): void {
  chrome.storage.session.get(['data'], (result) => {
    if (result.data) {
      chrome.storage.session.set({
        'data': [...result.data, data]
      })
          .then(() => {
            getStorage();
          });
    }
  });
}

function trimString(item: string, maxLength: number): string {
  if (item.length > maxLength) {
    return item.substring(0, maxLength) + '...';
  } else {
    return item;
  }
}

function removeItem(item: any) {
  chrome.storage.session.get(['data'], (result) => {
    if (result.data) {
      const newData = remove(result.data, (i: any) => i.requestId !== item.requestId);
      chrome.storage.session.set({
        'data': newData
      }).then(() => {
        getStorage();
      });
    }
  });
}

/**
 * Add point with color by status code
 */
function addPoint(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) {
    return 'bg-success';
  } else if (statusCode >= 300 && statusCode < 400) {
    return 'bg-warning';
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'bg-danger';
  } else if (statusCode >= 500) {
    return 'bg-secondary';
  } else {
    return 'bg-primary';
  }
}
</script>

<template>
  <div class="container-fluid color-white">
    <div class="row">
      <div class="col-12">
        <h2 class="text-center">Track</h2>
      </div>
      <div class="col-12">
        <table class="table table-dark table-striped table-hover">
          <thead>
          <tr>
            <th scope="col">URL</th>
            <th scope="col">STATUS</th>
            <th scope="col">METHOD</th>
            <th scope="col">ACTION</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(d, index) in datas" :key="index">
            <th class="custom-th" scope="row">
              <span
                  data-bs-toggle="tooltip"
                  data-bs-placement="top"
                  data-bs-custom-class="custom-tooltip"
                  data-bs-title="This top tooltip is themed via CSS variables."
              >
              {{ trimString(d?.url, 40) }}
              </span>
            </th>
            <td class="status-code">
              <span class="point me-1"
                    :class="addPoint(d?.statusCode)"></span> {{ d?.statusCode }}
            </td>
            <td>{{ d?.method }}</td>
            <td>
              <button class="btn btn-primary me-1" @click="console.log(d)">See</button>
              <button class="btn btn-danger"
                      @click="removeItem(d)"
              >
                <svg viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="15" height="15">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                        d="M6.793 7.5L1.146 1.854l.708-.708L7.5 6.793l5.646-5.647.708.708L8.207 7.5l5.647 5.646-.707.707L7.5 8.207l-5.646 5.646-.708-.707L6.793 7.5z"
                        fill="currentColor"></path>
                </svg>
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.point {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  color: #7c7c7c;
}

.status-code {
  font-size: 11px;
}
.custom-th {
  font-size: 11px;
  text-align: center;
}
</style>
