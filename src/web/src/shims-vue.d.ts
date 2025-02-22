// Vue.js 3.3.0
import type { DefineComponent, ComponentCustomProperties as VueComponentCustomProperties } from 'vue'
// Quasar Framework 3.0.0
import type { QuasarPluginOptions, QVueGlobals } from '@quasar/app-webpack'
// Vue Router 4.0.0
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router'
// Vuex 4.0.0
import type { Store } from 'vuex'

// Define the state interface for type-safe Vuex store
interface StateInterface {
  // Root state type definition
  version: string
  // Add other state properties as needed
}

// Define custom API instance interface
interface ApiInstance {
  // API instance methods and properties
  get: (url: string) => Promise<any>
  post: (url: string, data: any) => Promise<any>
  put: (url: string, data: any) => Promise<any>
  delete: (url: string) => Promise<any>
}

// Declare module for Vue Single File Components
declare module '*.vue' {
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Declare module for Quasar Framework
declare module 'quasar' {
  import { QuasarPluginOptions } from '@quasar/app-webpack'
  export * from '@quasar/app-webpack'
}

// Extended Vue Router type declarations
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: string[]
    title?: string
    icon?: string
    layout?: string
  }
}

// Extend Vue's ComponentCustomProperties for global properties
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties extends VueComponentCustomProperties {
    // Vuex Store instance
    $store: Store<StateInterface>
    
    // Vue Router instance and current route
    $router: Router
    $route: RouteLocationNormalizedLoaded
    
    // Quasar Framework instance
    $q: QVueGlobals
    
    // Custom API instance
    $api: ApiInstance
  }
}

// Global type declarations
declare global {
  // Window interface extensions if needed
  interface Window {
    // Add any global window properties
  }
}

// Export type augmentations
export {
  StateInterface,
  ApiInstance,
  ComponentCustomProperties
}