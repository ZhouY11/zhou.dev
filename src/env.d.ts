interface ImportMetaEnv {
  readonly DEPLOY_PLATFORM?: string;
  readonly SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
