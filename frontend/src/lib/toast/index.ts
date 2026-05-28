/**
 * Toast Module
 *
 * Strict public surface for all toast notification utilities.
 * Consumers must import from "@/lib/toast" — never from internal paths.
 */

export { toastManager, ToastManager } from './toast-manager';
export type { ToastType } from './toast-manager';

export {
  toastApiError,
  getApiErrorMessage,
  API_ERROR_TOAST_MESSAGES,
} from './api-error-map';
