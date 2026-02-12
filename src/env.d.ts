/**** Ambient types for Vite-like import.meta.env without depending on vite/client ****/
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string
  readonly VITE_GEOAPIFY_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
