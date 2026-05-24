/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_BUILD_TIME?: string;
  readonly REACT_APP_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
