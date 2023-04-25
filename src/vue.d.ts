declare module '*.vue' {
  import type { DefineComponent } from 'vue'; // module "../node_modules/vue/dist/vue" has no exported member “DefineComponent”。ts(2305)
  // eslint-disable-next-line @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
