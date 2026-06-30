import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import {
  traverses, legs,
  joinSessions, joinPoints,
  type Traverse, type Leg, type InsertTraverse, type InsertLeg,
  type JoinSession, type JoinPoint, type InsertJoinSession, type InsertJoinPoint,
} from "@shared/schema";
import { eq, asc } from "drizzle-orm";

const sqlite = new Database(process.env.DB_PATH || "data.db");
const db = drizzle(sqlite);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS traverses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS legs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    traverse_id INTEGER NOT NULL REFERENCES traverses(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    bearing_deg INTEGER NOT NULL DEFAULT 0,
    bearing_min INTEGER NOT NULL DEFAULT 0,
    bearing_sec REAL NOT NULL DEFAULT 0,
    distance REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS join_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    scale_factor REAL NOT NULL DEFAULT 1.0,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS join_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES join_sessions(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    easting REAL NOT NULL DEFAULT 0,
    northing REAL NOT NULL DEFAULT 0
  );
`);

export interface IStorage {
  // Traverses
  getTraverses(): Traverse[];
  getTraverse(id: number): Traverse | undefined;
  createTraverse(data: InsertTraverse): Traverse;
  deleteTraverse(id: number): void;
  // Legs
  getLegs(traverseId: number): Leg[];
  createLeg(data: InsertLeg): Leg;
  updateLeg(id: number, data: Partial<InsertLeg>): Leg | undefined;
  deleteLeg(id: number): void;
  reorderLegs(traverseId: number, orderedIds: number[]): void;
  // Join sessions
  getJoinSessions(): JoinSession[];
  getJoinSession(id: number): JoinSession | undefined;
  createJoinSession(data: InsertJoinSession): JoinSession;
  updateJoinSession(id: number, data: Partial<InsertJoinSession>): JoinSession | undefined;
  deleteJoinSession(id: number): void;
  // Join points
  getJoinPoints(sessionId: number): JoinPoint[];
  createJoinPoint(data: InsertJoinPoint): JoinPoint;
  updateJoinPoint(id: number, data: Partial<InsertJoinPoint>): JoinPoint | undefined;
  deleteJoinPoint(id: number): void;
  reorderJoinPoints(sessionId: number, orderedIds: number[]): void;
}

export class Storage implements IStorage {
  // ── Traverses ──────────────────────────────────────────────────────────────
  getTraverses(): Traverse[] {
    return db.select().from(traverses).all() as Traverse[];
  }
  getTraverse(id: number): Traverse | undefined {
    return db.select().from(traverses).where(eq(traverses.id, id)).get() as Traverse | undefined;
  }
  createTraverse(data: InsertTraverse): Traverse {
    return db.insert(traverses).values({ ...data, createdAt: new Date() }).returning().get() as Traverse;
  }
  deleteTraverse(id: number): void {
    db.delete(traverses).where(eq(traverses.id, id)).run();
  }
  // ── Legs ───────────────────────────────────────────────────────────────────
  getLegs(traverseId: number): Leg[] {
    return db.select().from(legs).where(eq(legs.traverseId, traverseId)).orderBy(asc(legs.order)).all() as Leg[];
  }
  createLeg(data: InsertLeg): Leg {
    return db.insert(legs).values(data).returning().get() as Leg;
  }
  updateLeg(id: number, data: Partial<InsertLeg>): Leg | undefined {
    return db.update(legs).set(data).where(eq(legs.id, id)).returning().get() as Leg | undefined;
  }
  deleteLeg(id: number): void {
    db.delete(legs).where(eq(legs.id, id)).run();
  }
  reorderLegs(traverseId: number, orderedIds: number[]): void {
    orderedIds.forEach((legId, index) => {
      db.update(legs).set({ order: index + 1 }).where(eq(legs.id, legId)).run();
    });
  }
  // ── Join Sessions ──────────────────────────────────────────────────────────
  getJoinSessions(): JoinSession[] {
    return db.select().from(joinSessions).all() as JoinSession[];
  }
  getJoinSession(id: number): JoinSession | undefined {
    return db.select().from(joinSessions).where(eq(joinSessions.id, id)).get() as JoinSession | undefined;
  }
  createJoinSession(data: InsertJoinSession): JoinSession {
    return db.insert(joinSessions).values({ ...data, createdAt: new Date() }).returning().get() as JoinSession;
  }
  updateJoinSession(id: number, data: Partial<InsertJoinSession>): JoinSession | undefined {
    return db.update(joinSessions).set(data).where(eq(joinSessions.id, id)).returning().get() as JoinSession | undefined;
  }
  deleteJoinSession(id: number): void {
    db.delete(joinSessions).where(eq(joinSessions.id, id)).run();
  }
  // ── Join Points ────────────────────────────────────────────────────────────
  getJoinPoints(sessionId: number): JoinPoint[] {
    return db.select().from(joinPoints).where(eq(joinPoints.sessionId, sessionId)).orderBy(asc(joinPoints.order)).all() as JoinPoint[];
  }
  createJoinPoint(data: InsertJoinPoint): JoinPoint {
    return db.insert(joinPoints).values(data).returning().get() as JoinPoint;
  }
  updateJoinPoint(id: number, data: Partial<InsertJoinPoint>): JoinPoint | undefined {
    return db.update(joinPoints).set(data).where(eq(joinPoints.id, id)).returning().get() as JoinPoint | undefined;
  }
  deleteJoinPoint(id: number): void {
    db.delete(joinPoints).where(eq(joinPoints.id, id)).run();
  }
  reorderJoinPoints(sessionId: number, orderedIds: number[]): void {
    orderedIds.forEach((ptId, index) => {
      db.update(joinPoints).set({ order: index + 1 }).where(eq(joinPoints.id, ptId)).run();
    });
  }
}

export const storage = new Storage();
