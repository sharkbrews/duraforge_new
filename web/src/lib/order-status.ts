import type { PickPackStatus } from "./types";

export const PICK_PACK_STAGES: PickPackStatus[] = [
  "received",
  "picking",
  "packed",
  "despatched",
  "delivered",
];

export const STATUS_LABELS: Record<PickPackStatus, string> = {
  received: "Order received",
  picking: "Picking",
  packed: "Packed & quality checked",
  despatched: "Despatched",
  delivered: "Delivered",
};

export const STATUS_MESSAGES: Record<PickPackStatus, string> = {
  received: "We've got it, we're on it 💪",
  picking: "Rummaging through the shelves for your kit…",
  packed: "Sealed, labelled, double-checked. It's a beauty.",
  despatched: "It's gone! Tracking details below.",
  delivered: "Job done. Let us know how the rebuild goes.",
};

export const STATUS_ICONS: Record<PickPackStatus, string> = {
  received: "📥",
  picking: "🔍",
  packed: "✅",
  despatched: "🚚",
  delivered: "🏠",
};

export function statusIndex(status: PickPackStatus): number {
  return PICK_PACK_STAGES.indexOf(status);
}

export function isStageComplete(
  stage: PickPackStatus,
  current: PickPackStatus,
): boolean {
  return statusIndex(stage) <= statusIndex(current);
}

export function dbStatusFromPickPack(
  status: PickPackStatus,
): "RECEIVED" | "PICKING" | "PACKED" | "DESPATCHED" | "DELIVERED" {
  return status.toUpperCase() as
    | "RECEIVED"
    | "PICKING"
    | "PACKED"
    | "DESPATCHED"
    | "DELIVERED";
}
