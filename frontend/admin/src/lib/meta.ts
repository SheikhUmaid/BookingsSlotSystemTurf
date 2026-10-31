export const pageMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} · TurfOS by Zinth Labs` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · TurfOS by Zinth Labs` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
