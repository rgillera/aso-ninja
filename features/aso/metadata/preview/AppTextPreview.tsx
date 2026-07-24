import type { App, StoreData } from "@/libs/contracts";
import KeywordDensity from "./KeywordDensity";
import { MetadataSection } from "./MetadataFieldCard";

type Props = {
  app: App;
  storeData: StoreData;
  dark: boolean;
  promotionalText: string;
  originalName: string;
  originalSubtitle: string;
  originalDescription: string;
  onNameChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onPromotionalTextChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

export default function AppTextPreview({
  app,
  storeData,
  dark,
  promotionalText,
  originalName,
  originalSubtitle,
  originalDescription,
  onNameChange,
  onSubtitleChange,
  onPromotionalTextChange,
  onDescriptionChange,
}: Props) {
  if (app.store === "android") {
    return (
      <>
        <MetadataSection title="App Name" value={app.name} limit={30} placeholder="Enter app name…" dark={dark} originalValue={originalName} onChange={onNameChange} />
        <MetadataSection title="Short Description" value={storeData?.subtitle ?? ""} limit={80} placeholder="Enter short description…" dark={dark} rows={3} originalValue={originalSubtitle} onChange={onSubtitleChange} />
        <MetadataSection title="Description" value={storeData?.description ?? ""} limit={4000} placeholder="Enter description…" dark={dark} rows={10} originalValue={originalDescription} onChange={onDescriptionChange} />
        <KeywordDensity description={storeData?.description ?? ""} originalDescription={originalDescription} />
      </>
    );
  }

  return (
    <>
      <MetadataSection title="App Name" value={app.name} limit={30} placeholder="Enter app name…" dark={dark} originalValue={originalName} onChange={onNameChange} />
      <MetadataSection title="App Subtitle" value={storeData?.subtitle ?? ""} limit={30} placeholder="Enter subtitle…" dark={dark} originalValue={originalSubtitle} onChange={onSubtitleChange} />
      <MetadataSection title="Promotional Text" value={promotionalText} limit={170} placeholder="Enter promotional text…" dark={dark} rows={3} onChange={onPromotionalTextChange} />
      <MetadataSection title="Description" value={storeData?.description ?? ""} limit={4000} placeholder="Enter description…" dark={dark} rows={10} originalValue={originalDescription} onChange={onDescriptionChange} />
    </>
  );
}
