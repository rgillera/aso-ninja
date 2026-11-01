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
};

export type CompetitorTimeline = {
  storeId: string;
  name: string;
  iconUrl: string | null;
  events: UpdateEvent[];
};

// One line of the grid: the app itself ("app") or a competitor (its store id).
export type TimelineRow = {
  key: string;
  name: string;
  iconUrl: string | null;
  isCompetitor: boolean;
  eventByDate: Map<string, UpdateEvent>;
};

export type SelectedUpdate = {
  rowKey: string;
  rowName: string;
  event: UpdateEvent;
};
