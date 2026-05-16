<script setup lang="ts">
import { shallowRef, onMounted } from "vue";
import { bootPage, FRAME } from "./mp-runtime";

const PageComp = shallowRef<any>(null);

onMounted(async () => {
  PageComp.value = await bootPage(2);
});
</script>

<template>
  <div class="stage">
    <div class="device-frame" :style="{ width: FRAME.width + 'px', height: FRAME.height + 'px' }">
      <div class="device-statusbar">
        <span>9:41</span>
        <span class="dot" />
        <span>preview</span>
      </div>
      <div class="device-navbar">
        <span>My WxApp</span>
      </div>
      <div class="device-content">
        <component v-if="PageComp" :is="PageComp" />
        <div v-else class="loading">Loading mini program...</div>
      </div>
    </div>
    <div class="hint">
      Browser preview · glass-easel-style runtime · 改 /src/ 即热更新
    </div>
  </div>
</template>

<style>
:root {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif;
}

.stage {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #e2e8f0;
}

.device-frame {
  background: #ffffff;
  border-radius: 36px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18), 0 0 0 8px #1f2937;
  display: flex;
  flex-direction: column;
}

.device-statusbar {
  height: 28px;
  background: #0ea5e9;
  color: #ffffff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
}
.device-statusbar .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffffff;
  opacity: 0.5;
}

.device-navbar {
  height: 44px;
  background: #0ea5e9;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.device-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #f5f5f7;
}

.wxapp-root {
  min-height: 100%;
}

.loading {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
}

.hint {
  font-size: 12px;
  color: #64748b;
}
</style>
