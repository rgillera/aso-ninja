export type MetadataStatus = "draft" | "published" | "archived";

export type MetadataDraft = {
  id: string;
  app_id: string;
  locale: string;
  status: MetadataStatus;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  keyword_field: string | null;
  release_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
