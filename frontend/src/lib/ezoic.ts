type EzStandalone = {
  cmd?: Array<() => void>;
  showAds?: (...placementIds: number[]) => void;
};

type EzoicWindow = Window & {
  ezstandalone?: EzStandalone;
};

const requestedPlacementSets = new Set<string>();

export function requestEzoicAds(placementIds: readonly number[]): void {
  if (typeof window === "undefined") return;

  const uniqueIds = Array.from(
    new Set(placementIds.filter((id) => Number.isInteger(id) && id > 0)),
  );
  if (uniqueIds.length === 0) return;

  const key = [...uniqueIds].sort((a, b) => a - b).join(",");
  if (requestedPlacementSets.has(key)) return;
  requestedPlacementSets.add(key);

  const win = window as EzoicWindow;
  const ez = (win.ezstandalone ??= {});
  const queue = (ez.cmd ??= []);

  queue.push(() => {
    ez.showAds?.(...uniqueIds);
  });
}
