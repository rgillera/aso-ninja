import { useEffect, useRef, useState } from "react";
import {
  QuestionMarkCircleIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { App, StoreData } from "@/libs/contracts";

type Props = {
  app: App;
  storeData: StoreData;
  onIconUpload: (file: File) => void;
  customScreenshotUrls: string[];
  onScreenshotUpload: (files: FileList) => void;
  onRemoveScreenshot: (url: string) => void;
  customVideoUrl: string | null;
  onVideoUpload: (file: File) => void;
};

function VisualCardHeader({ title, badge }: { title: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-5 pt-4 pb-1">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <QuestionMarkCircleIcon className="size-4 text-gray-600" />
      {badge}
    </div>
  );
}

function UploadLabel({
  className,
  label,
  accept,
  multiple,
  onFiles,
}: {
  className: string;
  label: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/[0.12] bg-[#0d0f14] text-gray-500 hover:text-gray-300 hover:border-white/20 transition-colors ${className}`}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <ArrowUpTrayIcon className="size-5" />
      <span className="text-xs text-center px-2">{label}</span>
    </label>
  );
}

export default function AppVisualPreview({
  app,
  storeData,
  onIconUpload,
  customScreenshotUrls,
  onScreenshotUpload,
  onRemoveScreenshot,
  customVideoUrl,
  onVideoUpload,
}: Props) {
  const screenshotsRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const storeScreenshots = storeData?.screenshotUrls ?? [];
  const totalScreenshots = customScreenshotUrls.length + storeScreenshots.length;

  useEffect(() => {
    const el = screenshotsRef.current;
    if (!el) return;

    const updateScrollState = () => {
      setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
    };

    updateScrollState();
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);
    el.addEventListener("scroll", updateScrollState);
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [totalScreenshots]);

  return (
    <>
      {/* App Icon */}
      <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
        <VisualCardHeader title="App Icon" />
        <p className="px-5 pb-4 text-xs text-gray-500 leading-relaxed">
          For iPhone 6.5&rdquo; display, Apple requires app icons to have 1024x1024 dimensions.
        </p>
        <div className="px-5 pb-5">
          <label className="group relative block size-28 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onIconUpload(file);
                e.target.value = "";
              }}
            />
            {app.icon_url ? (
              <>
                <img src={app.icon_url} alt={app.name} className="size-28 rounded-2xl object-cover ring-1 ring-white/[0.08]" />
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowUpTrayIcon className="size-5 text-white" />
                </div>
              </>
            ) : (
              <div className="flex size-28 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/[0.12] text-gray-500 transition-colors group-hover:text-gray-300 group-hover:border-white/20">
                <ArrowUpTrayIcon className="size-5" />
                <span className="text-xs">Upload</span>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Screenshots */}
      <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
        <VisualCardHeader
          title="Screenshots"
          badge={
            totalScreenshots > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400 ring-1 ring-green-500/20">
                <CheckCircleIcon className="size-3.5" />
                {totalScreenshots} screenshots
              </span>
            ) : undefined
          }
        />
        <p className="px-5 pb-4 text-xs text-gray-500 leading-relaxed">
          For iPhone 6.5&rdquo; display, Apple requires portrait screenshots to have 1242x2688 or 1284x2778 dimensions and landscape screenshots to have 2688x1242 or 2778x1284 dimensions.
        </p>
        <div className="relative px-5 pb-5">
          <div ref={screenshotsRef} className="flex gap-3 overflow-x-auto scroll-smooth pb-1 scrollbar-none">
            <UploadLabel
              className="w-28 aspect-[9/19.5] shrink-0"
              label="Upload"
              accept="image/*"
              multiple
              onFiles={onScreenshotUpload}
            />
            {customScreenshotUrls.map((url, i) => (
              <div key={`custom-${url}`} className="group relative w-28 aspect-[9/19.5] shrink-0 overflow-hidden rounded-xl bg-[#0d0f14] ring-1 ring-emerald-500/40">
                <img src={url} alt={`Custom screenshot ${i + 1}`} className="size-full object-cover" />
                <button
                  onClick={() => onRemoveScreenshot(url)}
                  className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100"
                >
                  <XMarkIcon className="size-3" />
                </button>
              </div>
            ))}
            {storeScreenshots.map((url, i) => (
              <div key={`store-${i}`} className="w-28 aspect-[9/19.5] shrink-0 overflow-hidden rounded-xl bg-[#0d0f14] ring-1 ring-white/[0.08]">
                <img src={url} alt={`Screenshot ${i + 1}`} className="size-full object-cover" />
              </div>
            ))}
          </div>
          {canScrollRight && (
            <button
              onClick={() => screenshotsRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-[#22252f] ring-1 ring-white/[0.1] text-gray-300 hover:text-white shadow-lg shadow-black/30 transition-colors"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Video */}
      <div className="rounded-2xl bg-[#1a1d24] ring-1 ring-white/[0.08] overflow-hidden shadow-lg shadow-black/20">
        <VisualCardHeader title="Video" />
        <p className="px-5 pb-4 text-xs text-gray-500 leading-relaxed">
          Apple requires App previews to be in M4V, MP4, or MOV format and can&rsquo;t exceed 500 MB.
        </p>
        <div className="mx-5 mb-5">
          {customVideoUrl ? (
            <label className="group relative block h-40 w-full cursor-pointer overflow-hidden rounded-xl ring-1 ring-white/[0.08]">
              <input
                type="file"
                accept="video/mp4,video/quicktime,.m4v,.mp4,.mov"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onVideoUpload(file);
                  e.target.value = "";
                }}
              />
              <video src={customVideoUrl} className="size-full object-cover" muted loop autoPlay playsInline />
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/50 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                <ArrowUpTrayIcon className="size-4" />
                Replace video
              </div>
            </label>
          ) : (
            <UploadLabel
              className="h-40 w-full"
              label="Upload and test your new video"
              accept="video/mp4,video/quicktime,.m4v,.mp4,.mov"
              onFiles={(files) => onVideoUpload(files[0])}
            />
          )}
        </div>
      </div>
    </>
  );
}
