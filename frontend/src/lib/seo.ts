type JsonLdData = Record<string, unknown> | Array<Record<string, unknown>>;

export function upsertJsonLd(id: string, data: JsonLdData): () => void {
  if (typeof document === "undefined") return () => {};

  const scriptId = `json-ld-${id}`;
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;

  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    document.head.appendChild(script);
  }

  script.text = JSON.stringify(data);

  return () => {
    script?.remove();
  };
}
