import type { App } from "@/libs/contracts";

export type ScreenshotStatus = "unchanged" | "removed" | "repositioned" | "added";

export type ScreenshotItem = {
  status: ScreenshotStatus;
  url?: string;
};

export type FieldUpdate = {
  field: string;
  before: string;
  after: string;
  screenshotsBefore?: ScreenshotItem[];
  screenshotsAfter?:  ScreenshotItem[];
};

export type UpdateEvent = {
  date: string;
  versionBefore: string;
  versionAfter: string;
  fields: FieldUpdate[];
};

export type TimelineProps = {
  app: App;
  allApps: App[];
  screenshots?: string[];
};
