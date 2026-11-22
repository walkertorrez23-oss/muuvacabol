import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function uploadPhotos(userId: string, files: File[], folder: string) {
  const paths: string[] = [];
  for (const f of files) {
    if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name} supera 10 MB`);
    const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("photos").upload(path, f, { contentType: f.type });
    if (error) throw new Error(`No se pudo subir ${f.name}: ${error.message}`);
    paths.push(path);
  }
  return paths;
}

export function usePhotoUrls(paths: string[] | null | undefined) {
  const list = paths ?? [];
  return useQuery({
    queryKey: ["photo-urls", list],
    enabled: list.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("photos").createSignedUrls(list, 3600);
      if (error) throw error;
      return data.map((d) => d.signedUrl ?? "");
    },
  });
}
