declare module "@app-config" {
  /** Корневой app.json проекта */
  const appConfig: {
    expo: {
      experiments: {
        /** Base path для статического web-экспорта */
        baseUrl?: string;
      };
      extra: {
        /** Origin для загрузки public-ассетов на нативных платформах */
        assetOrigin: string;
      };
    };
  };

  export default appConfig;
}
