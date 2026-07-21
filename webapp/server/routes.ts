import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
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

  // ── Crown Plan Interpretation ──────────────────────────────────────────────
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

  app.post("/api/interpret-plan", upload.single("plan"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const client = new Anthropic();
      const b64 = req.file.buffer.toString("base64");

      // For PDFs, use document type; for images use image type
      const isPdf = req.file.mimetype === "application/pdf";
      if (isPdf) {
        // PDF support requires claude-3-5-sonnet with beta header — use image path for now
        return res.status(400).json({ error: "PDF upload is not yet supported. Please convert your plan to a JPG or PNG image and re-upload." });
      }

      // Normalise MIME type — some browsers send image/jpg instead of image/jpeg
      const rawMime = req.file.mimetype;
      const safeMime = (rawMime === "image/jpg" ? "image/jpeg" : rawMime) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      const imageSource = { type: "image" as const, source: { type: "base64" as const, media_type: safeMime, data: b64 } };

      const prompt = `You are an expert Australian land surveyor specialising in NSW Crown portion plans. 
Carefully examine this Crown portion plan image and extract ALL survey data visible.

Return a JSON object with this exact structure:
{
  "planReference": { "value": "...", "confidence": "green|orange|red", "note": "..." },
  "surveyorName": { "value": "...", "confidence": "green|orange|red", "note": "..." },
  "surveyDate": { "value": "...", "confidence": "green|orange|red", "note": "..." },
  "parish": { "value": "...", "confidence": "green|orange|red", "note": "..." },
  "county": { "value": "...", "confidence": "green|orange|red", "note": "..." },
  "lotNumber": { "value": "...", "confidence": "green|orange|red", "note": "..." },
  "titleArea": { "value": "...", "confidence": "green|orange|red", "note": "...", "unit": "acres|hectares|m2" },
  "boundaryLines": [
    {
      "lineNumber": 1,
      "bearing": { "value": "DDD°MM'SS\"", "confidence": "green|orange|red", "note": "..." },
      "distance": { "value": "...", "confidence": "green|orange|red", "note": "...", "unit": "links|metres|chains|feet" },
      "adjoiningInfo": "..."
    }
  ],
  "adjoiningParcels": [{ "label": "...", "confidence": "green|orange|red" }],
  "generalNotes": "...",
  "overallReadability": "green|orange|red"
}

Confidence ratings:
- green: clearly legible, high confidence in the value
- orange: partially legible or inferred from context, moderate confidence  
- red: illegible, heavily degraded, or unreadable — include best guess if possible

For bearings: use format DDD°MM'SS" (whole-circle bearings). Old plans may use quadrant bearings — convert to whole-circle.
For distances: note the unit (links, chains, metres, feet). Old NSW plans typically use links.
If a field is not present on this plan, use null for value.
Return ONLY the JSON, no other text.`;

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: [
            imageSource,
            { type: "text", text: prompt }
          ]
        }]
      });

      const raw = (message.content[0] as { type: string; text: string }).text;
      console.log("Claude raw response (first 300):", raw.slice(0, 300));

      // Robustly extract JSON — find first { ... } block
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in Claude response. Raw: " + raw.slice(0, 200));
      }
      const parsed = JSON.parse(jsonMatch[0]);
      res.json({ ok: true, data: parsed });
    } catch (err: unknown) {
      console.error("interpret-plan error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  });
}

// ── Crown Plan Interpretation (vision AI) ─────────────────────────────────────
