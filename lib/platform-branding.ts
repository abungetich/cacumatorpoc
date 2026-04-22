import { revalidateTag, unstable_cache } from "next/cache";
import { DEFAULT_PLATFORM_BRANDING, type PlatformBrandingView } from "@/lib/platform-branding-defaults";
import { prisma } from "@/lib/prisma";

const PLATFORM_BRANDING_TAG = "platform-branding-public";

const getPlatformBrandingCached = unstable_cache(
  async (): Promise<PlatformBrandingView> => {
    const branding = await prisma.platformBranding.findUnique({
      where: { id: DEFAULT_PLATFORM_BRANDING.id },
      select: {
        id: true,
        platformName: true,
        logoUrl: true,
        ceoName: true,
        ceoTitle: true,
        ceoWelcomeMessage: true,
      },
    });

    if (!branding) {
      return DEFAULT_PLATFORM_BRANDING;
    }

    return {
      id: branding.id,
      platformName: branding.platformName || DEFAULT_PLATFORM_BRANDING.platformName,
      logoUrl: branding.logoUrl,
      ceoName: branding.ceoName || DEFAULT_PLATFORM_BRANDING.ceoName,
      ceoTitle: branding.ceoTitle || DEFAULT_PLATFORM_BRANDING.ceoTitle,
      ceoWelcomeMessage: branding.ceoWelcomeMessage || DEFAULT_PLATFORM_BRANDING.ceoWelcomeMessage,
    };
  },
  ["platform-branding-public"],
  { revalidate: 300, tags: [PLATFORM_BRANDING_TAG] },
);

export async function getPlatformBranding(): Promise<PlatformBrandingView> {
  return getPlatformBrandingCached();
}

export function invalidatePlatformBrandingCache() {
  revalidateTag(PLATFORM_BRANDING_TAG, "max");
}
