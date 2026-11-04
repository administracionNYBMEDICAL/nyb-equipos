import "server-only";
import { connection } from "next/server";
import { asAnon, asUser, type Tx } from "./db";
import {
  EQUIPMENT_STATUS_FOR_REPAIR,
  OPEN_REPAIR_STATUSES,
  OPEN_SQL,
  type EquipmentStatus,
  type RepairStatus,
} from "./status";

// Capa de datos: todas las pantallas leen y escriben solo por acá.

export type EquipmentRow = {
  id: string;
  code: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  serial: string | null;
  status: EquipmentStatus;
  sector: string | null;
  client_name: string | null;
  site_name: string | null;
  open_order_status: RepairStatus | null;
  last_activity: string | null;
};

export type HistoryEntry = {
  id: string;
  type: string;
  summary: string;
  created_by_name: string;
  created_at: string;
  visible_on_qr: boolean;
};

export type RepairOrder = {
  id: string;
  number: string;
  equipment_id: string;
  client_id: string;
  client_name: string;
  received_at: string;
  pickup_remito: string | null;
  accessories_in: string | null;
  reported_fault: string | null;
  status: RepairStatus;
  technician_id: string | null;
  technician_name: string | null;
  budget_number: string | null;
  budget_date: string | null;
  budget_cents: string | null;
  cost_cents: string | null;
  currency: string;
  delivered_at: string | null;
  delivery_remito: string | null;
  comments: string | null;
  source: string;
};

export type EquipmentDetail = EquipmentRow & {
  qr_token: string;
  client_id: string | null;
  site_id: string | null;
  umdns_code: string | null;
  asset_number: string | null;
  status_reason: string | null;
  manufactured_on: string | null;
  warranty_until: string | null;
  purchased_on: string | null;
  condition: "propio" | "comodato" | "alquiler" | null;
  classification: string | null;
  notes: string | null;
  owner: "cliente" | "nyb";
  created_at: string;
  has_photo: boolean;
  photo_version: string | null;
  history: HistoryEntry[];
  orders: RepairOrder[];
};

// ---------- Listados ----------

export async function listEquipment(
  uid: string,
  f: { q?: string; clientId?: string; status?: string; limit?: number },
): Promise<EquipmentRow[]> {
  return asUser(uid, async (tx) => {
    const where: string[] = [];
    const args: unknown[] = [];
    if (f.q?.trim()) {
      args.push(`%${f.q.trim()}%`);
      where.push(
        `(e.code ilike $${args.length} or e.serial ilike $${args.length} or e.brand ilike $${args.length}
          or e.model ilike $${args.length} or e.equipment_type ilike $${args.length} or s.name ilike $${args.length}
          or c.name ilike $${args.length} or e.asset_number ilike $${args.length})`,
      );
    }
    if (f.clientId) {
      args.push(f.clientId);
      where.push(`e.client_id = $${args.length}`);
    }
    if (f.status) {
      args.push(f.status);
      where.push(`e.status = $${args.length}`);
    }
    args.push(f.limit ?? 200);
    const r = await tx.query(
      `select e.id, e.code, e.equipment_type, e.brand, e.model, e.serial, e.status, e.sector,
              c.name as client_name, s.name as site_name,
              (select ro.status from repair_orders ro where ro.equipment_id = e.id
                 and ro.status in (${OPEN_SQL}) limit 1) as open_order_status,
              (select max(h.created_at) from history_entries h where h.equipment_id = e.id) as last_activity
         from equipment e
         left join clients c on c.id = e.client_id
         left join sites s on s.id = e.site_id
        ${where.length ? "where " + where.join(" and ") : ""}
        order by last_activity desc nulls last, e.code desc
        limit $${args.length}`,
      args,
    );
    return r.rows;
  });
}

export async function countEquipment(uid: string): Promise<{ total: number; clients: number }> {
  return asUser(uid, async (tx) => {
    const r = await tx.query(
      `select count(*)::int as total, count(distinct client_id)::int as clients from equipment where status <> 'baja'`,
    );
    return r.rows[0];
  });
}

export async function listClients(uid: string): Promise<{ id: string; name: string }[]> {
  return asUser(uid, async (tx) => (await tx.query("select id, name from clients order by lower(name)")).rows);
}

export async function listSiteNames(uid: string): Promise<{ client_name: string; name: string }[]> {
  return asUser(
    uid,
    async (tx) =>
      (
        await tx.query(
          "select c.name as client_name, s.name from sites s join clients c on c.id = s.client_id order by lower(s.name)",
        )
      ).rows,
  );
}

export async function listEquipmentTypes(uid: string): Promise<string[]> {
  return asUser(uid, async (tx) =>
    (await tx.query("select distinct equipment_type from equipment order by 1")).rows.map((r) => r.equipment_type),
  );
}

export async function listStaff(uid: string): Promise<{ id: string; full_name: string }[]> {
  return asUser(
    uid,
    async (tx) => (await tx.query("select id, full_name from staff where active order by full_name")).rows,
  );
}

// ---------- Panel ----------

export async function dashboardStats(uid: string) {
  return asUser(uid, async (tx) => {
    const r = await tx.query(
      `select
         (select count(*)::int from repair_orders where status in (${OPEN_SQL})) as in_shop,
         (select count(*)::int from repair_orders where status = 'reparado') as ready,
         (select count(*)::int from maintenance_status where due_state = 'vencido') as overdue,
         (select count(*)::int from maintenance_status where due_state = 'por_vencer') as due_soon,
         (select count(*)::int from tickets where status = 'nuevo') as new_tickets,
         (select count(*)::int from equipment where status <> 'baja') as equipment,
         (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from
            (select status, count(*)::int as n from equipment where status <> 'baja' group by status) x) as by_status`,
    );
    return r.rows[0] as {
      by_status: Partial<Record<EquipmentStatus, number>>;
      in_shop: number;
      ready: number;
      overdue: number;
      due_soon: number;
      new_tickets: number;
      equipment: number;
    };
  });
}

// ---------- Equipo ----------

async function resolveClient(tx: Tx, name: string): Promise<string> {
  const clean = name.trim().replace(/\s+/g, " ");
  const found = await tx.query("select id from clients where lower(name) = lower($1)", [clean]);
  if (found.rows[0]) return found.rows[0].id;
  return (await tx.query("insert into clients (name) values ($1) returning id", [clean])).rows[0].id;
}

async function resolveSite(tx: Tx, clientId: string, name: string): Promise<string> {
  const clean = name.trim().replace(/\s+/g, " ");
  const found = await tx.query("select id from sites where client_id = $1 and lower(name) = lower($2)", [clientId, clean]);
  if (found.rows[0]) return found.rows[0].id;
  return (await tx.query("insert into sites (client_id, name) values ($1, $2) returning id", [clientId, clean])).rows[0]
    .id;
}

export type NewEquipment = {
  clientName: string;
  siteName?: string;
  sector?: string;
  equipmentType: string;
  brand?: string;
  model?: string;
  serial?: string;
  assetNumber?: string;
  umdnsCode?: string;
  notes?: string;
  condition?: string;
  classification?: string;
  manufacturedOn?: string;
  purchasedOn?: string;
  warrantyUntil?: string;
};

const blank = (s?: string | null) => (s && s.trim() ? s.trim() : null);

export async function createEquipment(uid: string, input: NewEquipment): Promise<{ id: string; code: string }> {
  return asUser(uid, async (tx) => {
    const clientId = await resolveClient(tx, input.clientName);
    const siteId = blank(input.siteName) ? await resolveSite(tx, clientId, input.siteName!) : null;
    const r = await tx.query(
      `insert into equipment (client_id, site_id, sector, equipment_type, brand, model, serial, asset_number, umdns_code, notes,
                              condition, classification, manufactured_on, purchased_on, warranty_until)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id, code`,
      [
        clientId,
        siteId,
        blank(input.sector),
        input.equipmentType.trim(),
        blank(input.brand),
        blank(input.model),
        blank(input.serial),
        blank(input.assetNumber),
        blank(input.umdnsCode),
        blank(input.notes),
        blank(input.condition),
        blank(input.classification),
        blank(input.manufacturedOn),
        blank(input.purchasedOn),
        blank(input.warrantyUntil),
      ],
    );
    return r.rows[0];
  });
}

/** Edita los datos de un equipo. La hoja de vida anota sola qué cambió (y si cambió de ubicación). */
export async function updateEquipment(uid: string, id: string, input: NewEquipment): Promise<void> {
  return asUser(uid, async (tx) => {
    const clientId = await resolveClient(tx, input.clientName);
    const siteId = blank(input.siteName) ? await resolveSite(tx, clientId, input.siteName!) : null;
    const r = await tx.query(
      `update equipment set client_id = $2, site_id = $3, sector = $4, equipment_type = $5, brand = $6, model = $7,
              serial = $8, asset_number = $9, umdns_code = $10, notes = $11, condition = $12, classification = $13,
              manufactured_on = $14, purchased_on = $15, warranty_until = $16
        where id = $1`,
      [
        id,
        clientId,
        siteId,
        blank(input.sector),
        input.equipmentType.trim(),
        blank(input.brand),
        blank(input.model),
        blank(input.serial),
        blank(input.assetNumber),
        blank(input.umdnsCode),
        blank(input.notes),
        blank(input.condition),
        blank(input.classification),
        blank(input.manufacturedOn),
        blank(input.purchasedOn),
        blank(input.warrantyUntil),
      ],
    );
    if (r.rowCount === 0) throw new Error("Equipo inexistente");
  });
}

/** Etiqueta perdida o dañada: nuevo QR; el anterior deja de abrir la ficha. */
export async function regenerateQr(uid: string, id: string): Promise<void> {
  return asUser(uid, async (tx) => {
    const r = await tx.query(
      `update equipment set qr_token = translate(encode(gen_random_bytes(9), 'base64'), '+/', '-_') where id = $1`,
      [id],
    );
    if (r.rowCount === 0) throw new Error("Equipo inexistente");
    await tx.query(
      `insert into history_entries (equipment_id, type, summary, created_by, created_by_name)
       values ($1, 'qr', 'Se generó una etiqueta QR nueva; la anterior dejó de funcionar', auth.uid(), current_signature())`,
      [id],
    );
  });
}

// ---------- Foto ----------

export async function setPhoto(uid: string, id: string, mime: string, data: Buffer): Promise<void> {
  return asUser(uid, async (tx) => {
    const had = (await tx.query("select 1 from equipment_photos where equipment_id = $1", [id])).rowCount;
    await tx.query(
      `insert into equipment_photos (equipment_id, mime_type, data, uploaded_by, updated_at)
       values ($1, $2, $3, auth.uid(), now())
       on conflict (equipment_id) do update set mime_type = excluded.mime_type, data = excluded.data,
         uploaded_by = excluded.uploaded_by, updated_at = now()`,
      [id, mime, data],
    );
    await tx.query(
      `insert into history_entries (equipment_id, type, summary, created_by, created_by_name)
       values ($1, 'foto', $2, auth.uid(), current_signature())`,
      [id, had ? "Se cambió la foto del equipo" : "Se agregó la foto del equipo"],
    );
  });
}

export async function getPhoto(uid: string, id: string): Promise<{ mime: string; data: Buffer } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return asUser(uid, async (tx) => {
    const r = await tx.query("select mime_type, data from equipment_photos where equipment_id = $1", [id]);
    return r.rows[0] ? { mime: r.rows[0].mime_type, data: r.rows[0].data } : null;
  });
}

const ORDER_SELECT = `select ro.*, ro.budget_cents::text, ro.cost_cents::text, c.name as client_name,
       coalesce(st.full_name, ro.technician_name) as technician_name
  from repair_orders ro
  join clients c on c.id = ro.client_id
  left join staff st on st.id = ro.technician_id`;

export async function getEquipment(uid: string, id: string): Promise<EquipmentDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return asUser(uid, async (tx) => {
    const r = await tx.query(
      `select e.*, c.name as client_name, s.name as site_name,
              (p.equipment_id is not null) as has_photo,
              extract(epoch from p.updated_at)::bigint::text as photo_version
         from equipment e left join clients c on c.id = e.client_id left join sites s on s.id = e.site_id
         left join equipment_photos p on p.equipment_id = e.id
        where e.id = $1`,
      [id],
    );
    const e = r.rows[0];
    if (!e) return null;
    const history = (
      await tx.query(
        `select id::text, type, summary, created_by_name, created_at, visible_on_qr
           from history_entries where equipment_id = $1 order by created_at desc, id desc limit 200`,
        [id],
      )
    ).rows;
    const orders = (await tx.query(`${ORDER_SELECT} where ro.equipment_id = $1 order by ro.received_at desc, ro.number desc`, [id]))
      .rows.map(normalizeOrder);
    const open = orders.find((o) => (OPEN_REPAIR_STATUSES as readonly string[]).includes(o.status));
    return { ...e, history, orders, open_order_status: open?.status ?? null, last_activity: history[0]?.created_at ?? null };
  });
}

export async function setEquipmentStatus(uid: string, id: string, status: EquipmentStatus, reason?: string) {
  return asUser(uid, async (tx) => {
    await tx.query("update equipment set status = $2, status_reason = $3 where id = $1", [id, status, blank(reason)]);
  });
}

export async function addNote(uid: string, equipmentId: string, text: string, visibleOnQr: boolean) {
  return asUser(uid, async (tx) => {
    await tx.query(
      `insert into history_entries (equipment_id, type, summary, visible_on_qr, created_by, created_by_name)
       values ($1, 'nota', $2, $3, auth.uid(), current_signature())`,
      [equipmentId, text.trim(), visibleOnQr],
    );
  });
}

// ---------- Taller ----------

function normalizeOrder(o: Record<string, unknown>): RepairOrder {
  const d = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : (v as string | null));
  return { ...(o as RepairOrder), received_at: d(o.received_at)!, budget_date: d(o.budget_date), delivered_at: d(o.delivered_at) };
}

export type OpenOrderCard = RepairOrder & {
  code: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  site_name: string | null;
};

export async function listOpenOrders(uid: string): Promise<OpenOrderCard[]> {
  return asUser(uid, async (tx) => {
    const r = await tx.query(
      `select ro.*, ro.budget_cents::text, ro.cost_cents::text, c.name as client_name,
              coalesce(st.full_name, ro.technician_name) as technician_name,
              e.code, e.equipment_type, e.brand, e.model, s.name as site_name
         from repair_orders ro
         join clients c on c.id = ro.client_id
         join equipment e on e.id = ro.equipment_id
         left join sites s on s.id = e.site_id
         left join staff st on st.id = ro.technician_id
        where ro.status in (${OPEN_SQL})
        order by ro.received_at asc, ro.number asc`,
    );
    return r.rows.map((o) => normalizeOrder(o) as OpenOrderCard);
  });
}

export type NewRepairOrder = {
  equipmentId: string;
  receivedAt: string;
  pickupRemito?: string;
  accessoriesIn?: string;
  reportedFault?: string;
  technicianId?: string;
};

export class OpenOrderExists extends Error {}

export async function createRepairOrder(uid: string, input: NewRepairOrder): Promise<{ id: string; number: string }> {
  return asUser(uid, async (tx) => {
    const eq = await tx.query("select client_id, owner from equipment where id = $1", [input.equipmentId]);
    if (!eq.rows[0]) throw new Error("Equipo inexistente");
    const open = await tx.query(
      `select number from repair_orders where equipment_id = $1 and status in (${OPEN_SQL})`,
      [input.equipmentId],
    );
    if (open.rows[0]) throw new OpenOrderExists(open.rows[0].number);
    const r = await tx.query(
      `insert into repair_orders (equipment_id, client_id, received_at, pickup_remito, accessories_in, reported_fault, technician_id, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, auth.uid()) returning id, number`,
      [
        input.equipmentId,
        eq.rows[0].client_id,
        input.receivedAt,
        blank(input.pickupRemito),
        blank(input.accessoriesIn),
        blank(input.reportedFault),
        blank(input.technicianId),
      ],
    );
    await tx.query("select set_config('nyb.auto_status', '1', true)");
    await tx.query("update equipment set status = 'en_taller', status_reason = null where id = $1 and status <> 'en_taller'", [
      input.equipmentId,
    ]);
    return r.rows[0];
  });
}

export async function getRepairOrder(
  uid: string,
  id: string,
): Promise<(RepairOrder & { code: string; equipment_type: string; brand: string | null; model: string | null; serial: string | null; site_name: string | null; sector: string | null }) | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return asUser(uid, async (tx) => {
    const r = await tx.query(
      `select ro.*, ro.budget_cents::text, ro.cost_cents::text, c.name as client_name,
              coalesce(st.full_name, ro.technician_name) as technician_name,
              e.code, e.equipment_type, e.brand, e.model, e.serial, e.sector, s.name as site_name
         from repair_orders ro
         join clients c on c.id = ro.client_id
         join equipment e on e.id = ro.equipment_id
         left join sites s on s.id = e.site_id
         left join staff st on st.id = ro.technician_id
        where ro.id = $1`,
      [id],
    );
    return r.rows[0] ? (normalizeOrder(r.rows[0]) as never) : null;
  });
}

export type RepairUpdate = {
  status: RepairStatus;
  technicianId?: string | null;
  budgetNumber?: string;
  budgetDate?: string;
  budgetCents?: number | null;
  costCents?: number | null;
  deliveredAt?: string;
  deliveryRemito?: string;
  comments?: string;
};

export async function updateRepairOrder(uid: string, id: string, u: RepairUpdate) {
  return asUser(uid, async (tx) => {
    const r = await tx.query(
      `update repair_orders set status = $2, technician_id = $3, budget_number = $4, budget_date = $5,
              budget_cents = $6, cost_cents = $7, delivered_at = $8, delivery_remito = $9, comments = $10
        where id = $1 returning equipment_id`,
      [
        id,
        u.status,
        blank(u.technicianId),
        blank(u.budgetNumber),
        blank(u.budgetDate),
        u.budgetCents ?? null,
        u.costCents ?? null,
        blank(u.deliveredAt),
        blank(u.deliveryRemito),
        blank(u.comments),
      ],
    );
    const equipmentId = r.rows[0]?.equipment_id;
    if (!equipmentId) throw new Error("Orden inexistente");
    await tx.query("select set_config('nyb.auto_status', '1', true)");
    await tx.query("update equipment set status = $2, status_reason = null where id = $1 and status is distinct from $2", [
      equipmentId,
      EQUIPMENT_STATUS_FOR_REPAIR[u.status],
    ]);
    return equipmentId as string;
  });
}

// ---------- Ficha pública (QR) ----------

export type PublicCard = {
  code: string;
  type: string;
  brand: string | null;
  model: string | null;
  serial: string | null;
  site: string | null;
  sector: string | null;
  status: EquipmentStatus;
  next_due_on: string | null;
  last_service_on: string | null;
  history: { at: string; type: string; summary: string }[];
  documents: { id: string; filename: string }[];
};

export async function getPublicCard(token: string): Promise<PublicCard | null> {
  await connection();
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) return null;
  return asAnon(async (tx) => (await tx.query("select public_equipment_card($1) as card", [token])).rows[0]?.card ?? null);
}

export async function equipmentIdForToken(uid: string, token: string): Promise<string | null> {
  return asUser(uid, async (tx) => (await tx.query("select id from equipment where qr_token = $1", [token])).rows[0]?.id ?? null);
}
