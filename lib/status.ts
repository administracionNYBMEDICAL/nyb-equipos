import tokens from "@/replica/design/tokens.json";

export const EQUIPMENT_STATUSES = ["operativo", "no_operativo", "en_taller", "faltante", "baja"] as const;
export const REPAIR_STATUSES = [
  "en_revision",
  "presupuestado",
  "esperando_repuesto",
  "en_reparacion",
  "reparado",
  "entregado",
  "faltante",
  "sin_reparacion",
] as const;
export const OPEN_REPAIR_STATUSES = ["en_revision", "presupuestado", "esperando_repuesto", "en_reparacion", "reparado"] as const;
/** Para SQL: los estados de una orden abierta. */
export const OPEN_SQL = OPEN_REPAIR_STATUSES.map((s) => `'${s}'`).join(",");
export const MAINTENANCE_STATES = ["vencido", "por_vencer", "al_dia"] as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];
export type RepairStatus = (typeof REPAIR_STATUSES)[number];
export type MaintenanceState = (typeof MAINTENANCE_STATES)[number];
export type StatusGroup = "equipment" | "repair" | "maintenance";

type StatusTable = Record<string, { label: string }>;
const table = tokens.status as unknown as Record<StatusGroup, StatusTable>;

export function statusLabel(group: StatusGroup, value: string): string {
  return table[group]?.[value]?.label ?? value.replaceAll("_", " ");
}

/** Estado en que queda el equipo cuando su orden pasa a cada estado. */
export const EQUIPMENT_STATUS_FOR_REPAIR: Record<RepairStatus, EquipmentStatus> = {
  en_revision: "en_taller",
  presupuestado: "en_taller",
  esperando_repuesto: "en_taller",
  en_reparacion: "en_taller",
  reparado: "en_taller",
  entregado: "operativo",
  faltante: "faltante",
  sin_reparacion: "no_operativo",
};
