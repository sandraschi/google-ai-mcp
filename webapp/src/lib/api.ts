// Dev default is the dev backend (11014). Installer builds set VITE_API_BASE to the
// operator backend port (see native/build.ps1).
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:11014";
