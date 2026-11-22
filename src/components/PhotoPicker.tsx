import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";

export function PhotoPicker({ files, onChange, max = 6 }: { files: File[]; onChange: (f: File[]) => void; max?: number }) {
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {previews.map((u, i) => (
        <div key={u} className="relative">
          <img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
          <button type="button" aria-label="Quitar foto" onClick={() => onChange(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-background/90 p-1">
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {files.length < max && (
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-card text-xs text-muted-foreground hover:bg-muted">
          <ImagePlus className="h-5 w-5" />
          Agregar foto
          <input
            type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only"
            onChange={(e) => { onChange([...files, ...Array.from(e.target.files ?? [])].slice(0, max)); e.target.value = ""; }}
          />
        </label>
      )}
    </div>
  );
}
