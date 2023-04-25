<template>
  <div class="flex flex-row justify-between align-middle">
    <RouterLink to="/" class="order-first">
      <img id="logo" src="logo.png" alt="LOGO" />
    </RouterLink>

    <div class="order-last flex flex-col justify-center align-middle">
      <div class="flex flex-row">
        <UserButton
          icon="icon-transmission"
          :title="$t(`toolbar.tip['ui-original']`)"
          :text="$t(`toolbar['ui-original']`)"
          @click="console.log('click')"
        />

        <span class="mx-2"> | </span>

        <!-- 关于 -->
        <RouterLink to="/about" :title="$t('toolbar.about')" class="mr-2">
          <span class="l-btn-left l-btn-icon-left">
            <span class="l-btn-text">
              <span>{{ $t('toolbar.about') }}</span>
            </span>
            <span class="l-btn-icon icon-about">&nbsp;</span>
          </span>
        </RouterLink>
      </div>
    </div>
  </div>

  <RouterView />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import UserButton from './components/UserButton.vue';
import { transmission } from './lib/transmission';

export default defineComponent({
  components: {
    UserButton,
  },
  data() {
    return {
      transmission,
    };
  },
});
</script>
