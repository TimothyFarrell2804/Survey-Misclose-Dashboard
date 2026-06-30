import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertTraverseSchema, insertLegSchema, insertJoinSessionSchema, insertJoinPointSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(httpServer: Server, app: Express) {
  // ── Traverses ──────────────────────────────────────────────────────────────
  app.get("/api/traverses", (_req, res) => res.json(storage.getTraverses()));

  app.post("/api/traverses", (req, res) => {
    const p = insertTraverseSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error });
    res.json(storage.createTraverse(p.data));
  });

  app.delete("/api/traverses/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    storage.deleteTraverse(id);
    res.json({ ok: true });
  });

  // ── Legs ───────────────────────────────────────────────────────────────────
  app.get("/api/traverses/:id/legs", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    res.json(storage.getLegs(id));
  });

  app.post("/api/traverses/:id/legs", (req, res) => {
    const traverseId = parseInt(req.params.id);
    if (isNaN(traverseId)) return res.status(400).json({ error: "Invalid id" });
    const p = insertLegSchema.safeParse({ ...req.body, traverseId });
    if (!p.success) return res.status(400).json({ error: p.error });
    res.json(storage.createLeg(p.data));
  });

  app.patch("/api/legs/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const leg = storage.updateLeg(id, req.body);
    if (!leg) return res.status(404).json({ error: "Not found" });
    res.json(leg);
  });

  app.delete("/api/legs/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    storage.deleteLeg(id);
    res.json({ ok: true });
  });

  app.post("/api/traverses/:id/reorder", (req, res) => {
    const traverseId = parseInt(req.params.id);
    if (isNaN(traverseId)) return res.status(400).json({ error: "Invalid id" });
    const { orderedIds } = z.object({ orderedIds: z.array(z.number()) }).parse(req.body);
    storage.reorderLegs(traverseId, orderedIds);
    res.json({ ok: true });
  });

  // ── Join Sessions ──────────────────────────────────────────────────────────
  app.get("/api/joins", (_req, res) => res.json(storage.getJoinSessions()));

  app.post("/api/joins", (req, res) => {
    const p = insertJoinSessionSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: p.error });
    res.json(storage.createJoinSession(p.data));
  });

  app.patch("/api/joins/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const session = storage.updateJoinSession(id, req.body);
    if (!session) return res.status(404).json({ error: "Not found" });
    res.json(session);
  });

  app.delete("/api/joins/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    storage.deleteJoinSession(id);
    res.json({ ok: true });
  });

  // ── Join Points ────────────────────────────────────────────────────────────
  app.get("/api/joins/:id/points", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    res.json(storage.getJoinPoints(id));
  });

  app.post("/api/joins/:id/points", (req, res) => {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid id" });
    const p = insertJoinPointSchema.safeParse({ ...req.body, sessionId });
    if (!p.success) return res.status(400).json({ error: p.error });
    res.json(storage.createJoinPoint(p.data));
  });

  app.patch("/api/joins/points/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const pt = storage.updateJoinPoint(id, req.body);
    if (!pt) return res.status(404).json({ error: "Not found" });
    res.json(pt);
  });

  app.delete("/api/joins/points/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    storage.deleteJoinPoint(id);
    res.json({ ok: true });
  });

  app.post("/api/joins/:id/reorder", (req, res) => {
    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) return res.status(400).json({ error: "Invalid id" });
    const { orderedIds } = z.object({ orderedIds: z.array(z.number()) }).parse(req.body);
    storage.reorderJoinPoints(sessionId, orderedIds);
    res.json({ ok: true });
  });
}
