import { fetchIosStoreData, fetchIosCategoryPeers } from "@/libs/store/appstore";
import { fetchAndroidStoreData, fetchAndroidCategoryPeers } from "@/libs/store/googleplay";
import type { StoreData, CategoryBenchmark } from "@/libs/contracts";

export async function fetchStoreData(
  store: string,
  storeId: string,
  bundleId: string,
  country: string
): Promise<StoreData> {
  if (store === "ios" && storeId) return fetchIosStoreData(storeId, country);
  if (store === "android" && bundleId) return fetchAndroidStoreData(bundleId, country);
  return null;
}

export async function loadCategoryBenchmark(
  store: string,
  storeId: string,
  bundleId: string,
  country: string,
  storeData: StoreData
): Promise<CategoryBenchmark> {
  if (!storeData?.primaryGenreId) return null;
  if (store === "ios") return fetchIosCategoryPeers(storeData.primaryGenreId, country, storeId);
  if (store === "android") return fetchAndroidCategoryPeers(storeData.primaryGenreId, storeData.primaryGenreName, country, bundleId);
  return null;
}
