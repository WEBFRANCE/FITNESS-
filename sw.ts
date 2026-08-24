import { defaultCache } from '@serwist/next/worker';
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from 'serwist';

// Vérifiez ces noms de types contre la doc Serwist au moment de l'install —
// c'est un boilerplate stable mais l'exact des exports peut varier d'une
// version à l'autre.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Cache les GIFs/modèles 3D des exercices + les sons + le shell HTML,
  // pour l'usage 100% offline exigé (salles sous-terraines).
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
