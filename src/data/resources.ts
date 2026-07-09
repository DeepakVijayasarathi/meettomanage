import type { Resource } from "@/types";

export const RESOURCES: Resource[] = [
  { id: "r-1", title: "Phonics Level 1 — Reading Book", type: "book", courseCategory: "Phonics", batchId: "b-1", uploadedOn: "2026-06-01", downloadable: false, visibleToParents: true, sizeLabel: "4.2 MB" },
  { id: "r-2", title: "Blending Sounds Worksheet — Week 3", type: "worksheet", courseCategory: "Phonics", batchId: "b-1", uploadedOn: "2026-07-02", downloadable: true, visibleToParents: true, sizeLabel: "820 KB" },
  { id: "r-3", title: "Number Sequencing Worksheet", type: "worksheet", courseCategory: "Maths", batchId: "b-3", uploadedOn: "2026-07-04", downloadable: true, visibleToParents: true, sizeLabel: "610 KB" },
  { id: "r-4", title: "Math Explorers — Activity Book", type: "book", courseCategory: "Maths", batchId: "b-3", uploadedOn: "2026-06-15", downloadable: false, visibleToParents: true, sizeLabel: "6.8 MB" },
  { id: "r-5", title: "Reading Adventures — Story Pack 2", type: "book", courseCategory: "Reading", batchId: "b-5", uploadedOn: "2026-06-28", downloadable: false, visibleToParents: false, sizeLabel: "3.5 MB" },
  { id: "r-6", title: "Session Recording — Phonics-A1 · Jul 6", type: "recording", courseCategory: "Phonics", batchId: "b-1", uploadedOn: "2026-07-06", downloadable: false, visibleToParents: true },
  { id: "r-7", title: "Session Recording — MathJr-B1 · Jul 7", type: "recording", courseCategory: "Maths", batchId: "b-3", uploadedOn: "2026-07-07", downloadable: false, visibleToParents: true },
  { id: "r-8", title: "Creative Writing Prompts — Set 4", type: "worksheet", courseCategory: "Writing", batchId: "b-7", uploadedOn: "2026-07-01", downloadable: true, visibleToParents: true, sizeLabel: "540 KB" },
];

export function getResourcesForBatch(batchId: string) {
  return RESOURCES.filter((r) => r.batchId === batchId);
}
