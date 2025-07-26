// pwaService.js - Service Worker registration and management
import { Workbox } from 'workbox-window';

class PWAService {
  constructor() {
    this.wb = null;
    this.registration = null;
    this.updateAvailable = false;
    this.onUpdateAvailable = () => {};
  }

  // Register the service worker
  register() {
    if ('serviceWorker' in navigator) {
      this.wb = new Workbox('/sw.js');

      // Add update found handler
      this.wb.addEventListener('waiting', event => {
        this.updateAvailable = true;
        if (this.onUpdateAvailable) {
          this.onUpdateAvailable(true);
        }
      });

      // Register the service worker
      this.wb.register()
        .then(registration => {
          this.registration = registration;
          console.log('Service worker registered successfully:', registration);
        })
        .catch(error => {
          console.error('Service worker registration failed:', error);
        });

      return true;
    } else {
      console.warn('Service workers are not supported in this browser');
      return false;
    }
  }

  // Update the service worker
  update() {
    if (!this.wb) {
      return Promise.reject(new Error('Workbox is not initialized'));
    }

    return new Promise((resolve, reject) => {
      // Add an event listener to detect when the update is complete
      this.wb.addEventListener('controlling', event => {
        // The updated service worker is now controlling the page
        console.log('Service worker updated and now controlling the page');
        resolve(true);
        window.location.reload();
      });

      // Add an error listener
      this.wb.addEventListener('error', event => {
        console.error('Service worker update failed:', event);
        reject(event);
      });

      // Trigger the update
      this.wb.messageSkipWaiting();
    });
  }

  // Check if the app is installed (works on supported browsers only)
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Set update available handler
  setUpdateAvailableHandler(handler) {
    this.onUpdateAvailable = handler;
  }

  // Get the update available status
  getUpdateAvailableStatus() {
    return this.updateAvailable;
  }
}

// Export a singleton instance
const pwaService = new PWAService();
export default pwaService; 