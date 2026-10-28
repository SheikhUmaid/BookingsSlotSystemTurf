export const pageMeta = (title: string, description: string) => ({
  meta: [
    { title: `${title} · Turf Booking Admin` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · Turf Booking Admin` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
