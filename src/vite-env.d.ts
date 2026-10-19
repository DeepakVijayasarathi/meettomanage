/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** JSON mapping exact emails or email domains to tenant URL codes. */
  readonly VITE_TENANT_EMAIL_MAP?: string;
}
