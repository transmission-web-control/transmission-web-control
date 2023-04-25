declare module '*.vue' {
  import type { DefineComponent } from 'vue'; // module "../node_modules/vue/dist/vue" has no exported member “DefineComponent”。ts(2305)
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
