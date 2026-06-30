import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── TRAVERSE ───────────────────────────────────────────────────────────────

export const traverses = sqliteTable("traverses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const legs = sqliteTable("legs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  traverseId: integer("traverse_id").notNull().references(() => traverses.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  bearingDeg: integer("bearing_deg").notNull().default(0),
  bearingMin: integer("bearing_min").notNull().default(0),
  bearingSec: real("bearing_sec").notNull().default(0),
  distance: real("distance").notNull().default(0),
});

export const insertTraverseSchema = createInsertSchema(traverses).omit({ id: true, createdAt: true });
export const insertLegSchema = createInsertSchema(legs).omit({ id: true });

export type InsertTraverse = z.infer<typeof insertTraverseSchema>;
export type InsertLeg = z.infer<typeof insertLegSchema>;
export type Traverse = typeof traverses.$inferSelect;
export type Leg = typeof legs.$inferSelect;

// ─── JOIN ────────────────────────────────────────────────────────────────────

// A named join session (list of points)
export const joinSessions = sqliteTable("join_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  scaleFactor: real("scale_factor").notNull().default(1.0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Individual survey points within a join session
export const joinPoints = sqliteTable("join_points", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => joinSessions.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  label: text("label").notNull().default(""),
  easting: real("easting").notNull().default(0),
  northing: real("northing").notNull().default(0),
});

export const insertJoinSessionSchema = createInsertSchema(joinSessions).omit({ id: true, createdAt: true });
export const insertJoinPointSchema = createInsertSchema(joinPoints).omit({ id: true });

export type InsertJoinSession = z.infer<typeof insertJoinSessionSchema>;
export type InsertJoinPoint = z.infer<typeof insertJoinPointSchema>;
export type JoinSession = typeof joinSessions.$inferSelect;
export type JoinPoint = typeof joinPoints.$inferSelect;
