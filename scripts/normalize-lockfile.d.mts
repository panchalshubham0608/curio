export declare function normalizeResolvedTarballUrl(resolvedUrl: string): string;

export declare function normalizeLockfileObject(lockfile: {
  packages?: Record<string, { resolved?: string }>;
}): {
  changedCount: number;
  nonPublicUrls: Array<{ pkgKey: string; from: string; to: string }>;
};
