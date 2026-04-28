export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Vibly Console",
  defaultCoordinatorUrl: process.env.NEXT_PUBLIC_COORDINATOR_URL ?? "http://localhost:8787",
  demoApiToken: process.env.NEXT_PUBLIC_DEMO_API_TOKEN ?? "dev-token",
  devToolsEnabled: process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS !== "false",
};
