import { MetadataRoute } from "next";
import { isIPFS } from "@bera/config";

export default function robots(): MetadataRoute.Robots {
  if (isIPFS) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
