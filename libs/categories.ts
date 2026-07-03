// Apple App Store genre IDs — used to filter the iTunes top-charts RSS feeds.
// https://itunes.apple.com/{country}/rss/topfreeapplications/genre={id}/json
export const IOS_CATEGORIES = [
  { id: "6000", label: "Business" },
  { id: "6001", label: "Weather" },
  { id: "6002", label: "Utilities" },
  { id: "6003", label: "Travel" },
  { id: "6004", label: "Sports" },
  { id: "6005", label: "Social Networking" },
  { id: "6006", label: "Reference" },
  { id: "6007", label: "Productivity" },
  { id: "6008", label: "Photo & Video" },
  { id: "6009", label: "News" },
  { id: "6010", label: "Navigation" },
  { id: "6011", label: "Music" },
  { id: "6012", label: "Lifestyle" },
  { id: "6013", label: "Health & Fitness" },
  { id: "6014", label: "Games" },
  { id: "6015", label: "Finance" },
  { id: "6016", label: "Entertainment" },
  { id: "6017", label: "Education" },
  { id: "6018", label: "Books" },
  { id: "6020", label: "Medical" },
  { id: "6023", label: "Food & Drink" },
  { id: "6024", label: "Shopping" },
  { id: "6026", label: "Developer Tools" },
  { id: "6027", label: "Graphics & Design" },
] as const;

export type CategoryId = (typeof IOS_CATEGORIES)[number]["id"];

export const CATEGORY_MAP = Object.fromEntries(
  IOS_CATEGORIES.map((c) => [c.id, c.label])
) as Record<string, string>;

// Google Play category constants — the id is the exact string google-play-scraper's
// `category` enum expects (e.g. category.SOCIAL), not an arbitrary label.
export const ANDROID_CATEGORIES = [
  { id: "ART_AND_DESIGN", label: "Art & Design" },
  { id: "AUTO_AND_VEHICLES", label: "Auto & Vehicles" },
  { id: "BEAUTY", label: "Beauty" },
  { id: "BOOKS_AND_REFERENCE", label: "Books & Reference" },
  { id: "BUSINESS", label: "Business" },
  { id: "COMICS", label: "Comics" },
  { id: "COMMUNICATION", label: "Communication" },
  { id: "DATING", label: "Dating" },
  { id: "EDUCATION", label: "Education" },
  { id: "ENTERTAINMENT", label: "Entertainment" },
  { id: "EVENTS", label: "Events" },
  { id: "FINANCE", label: "Finance" },
  { id: "FOOD_AND_DRINK", label: "Food & Drink" },
  { id: "HEALTH_AND_FITNESS", label: "Health & Fitness" },
  { id: "HOUSE_AND_HOME", label: "House & Home" },
  { id: "LIFESTYLE", label: "Lifestyle" },
  { id: "MAPS_AND_NAVIGATION", label: "Maps & Navigation" },
  { id: "MEDICAL", label: "Medical" },
  { id: "MUSIC_AND_AUDIO", label: "Music & Audio" },
  { id: "NEWS_AND_MAGAZINES", label: "News & Magazines" },
  { id: "PARENTING", label: "Parenting" },
  { id: "PERSONALIZATION", label: "Personalization" },
  { id: "PHOTOGRAPHY", label: "Photography" },
  { id: "PRODUCTIVITY", label: "Productivity" },
  { id: "SHOPPING", label: "Shopping" },
  { id: "SOCIAL", label: "Social" },
  { id: "SPORTS", label: "Sports" },
  { id: "TOOLS", label: "Tools" },
  { id: "TRAVEL_AND_LOCAL", label: "Travel & Local" },
  { id: "VIDEO_PLAYERS", label: "Video Players" },
  { id: "WEATHER", label: "Weather" },
  { id: "GAME", label: "Games" },
] as const;

export const ANDROID_CATEGORY_MAP = Object.fromEntries(
  ANDROID_CATEGORIES.map((c) => [c.id, c.label])
) as Record<string, string>;
