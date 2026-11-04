import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminFetch } from "./api";

export interface Pitch {
  _id: string;
  name: string;
  size: string;
  description: string;
}

/** All pitches, shared cache with the Pitches page ("admin-pitches"). */
export function usePitches() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const query = useQuery({
    queryKey: ["admin-pitches"],
    queryFn: () => adminFetch<{ pitches: Pitch[]; total: number }>("/admin/pitches"),
    enabled: isClient,
  });

  return { ...query, pitches: query.data?.pitches ?? [] };
}
