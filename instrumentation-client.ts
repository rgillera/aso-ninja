import { initMixpanel } from "@/libs/mixpanel";

try {
  initMixpanel();
} catch {
  // Analytics must never break the app.
}
