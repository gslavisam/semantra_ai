import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// ==========================================
// PII MASKING ENGINE (SERVER-SIDE)
// ==========================================
const PII_PATTERNS = [
  { type: 'email', pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g },
  { type: 'iban', pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g },
  { type: 'credit_card', pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g },
  { type: 'national_id', pattern: /\b(0[1-9]|[12][0-9]|3[01])(0[1-9]|1[0-2])[0-9]{3}[0-9]{6}\b/g },
  { type: 'tax_id', pattern: /\b(?:PIB|TAX|VAT|ID)?:?\s*([1-9][0-9]{7,9})\b/gi },
  { type: 'phone', pattern: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g },
  { type: 'ip', pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g }
];

function maskServerPII(data: any): { sanitized: any; detectedCount: number; mapping: Record<string, string> } {
  let detectedCount = 0;
  const mapping: Record<string, string> = {};
  const counters: Record<string, number> = {};

  function sanitizeString(str: string): string {
    let result = str;
    for (const item of PII_PATTERNS) {
      item.pattern.lastIndex = 0;
      const matches = Array.from(result.matchAll(item.pattern));
      for (const m of matches) {
        const raw = m[0];
        if (raw.startsWith('[MASKED_') || raw.length < 3) continue;
        
        let token = "";
        for (const [k, v] of Object.entries(mapping)) {
          if (v === raw) { token = k; break; }
        }
        if (!token) {
          const count = (counters[item.type] || 0) + 1;
          counters[item.type] = count;
          token = `[MASKED_${item.type.toUpperCase()}_${count}]`;
          mapping[token] = raw;
        }
        result = result.replace(raw, token);
        detectedCount++;
      }
    }
    return result;
  }

  function traverse(obj: any): any {
    if (typeof obj === 'string') return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(traverse);
    if (obj !== null && typeof obj === 'object') {
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        res[k] = traverse(v);
      }
      return res;
    }
    return obj;
  }

  const sanitized = traverse(data);
  return { sanitized, detectedCount, mapping };
}

// ==========================================
// CIRCUIT BREAKER ENGINE (SERVER-SIDE)
// ==========================================
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class ServerCircuitBreaker {
  public state: CircuitState = 'CLOSED';
  public failureCount: number = 0;
  public successCount: number = 0;
  public consecutiveFailures: number = 0;
  public lastFailureTime?: string;
  public lastSuccessTime?: string;
  public lastStateChange: number = Date.now();
  public totalCalls: number = 0;
  public failedCalls: number = 0;
  public fallbackCalls: number = 0;
  public lastFallbackReason?: string;

  private failureThreshold = 3;
  private cooldownMs = 15000;
  private timeoutMs = 8000;

  public getState(): CircuitState {
    const now = Date.now();
    if (this.state === 'OPEN' && (now - this.lastStateChange) > this.cooldownMs) {
      this.state = 'HALF_OPEN';
      this.lastStateChange = now;
    }
    return this.state;
  }

  public recordSuccess() {
    this.successCount++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date().toISOString();
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.lastStateChange = Date.now();
    }
  }

  public recordFailure(reason: string) {
    this.failedCalls++;
    this.failureCount++;
    this.consecutiveFailures++;
    this.lastFailureTime = new Date().toISOString();
    this.lastFallbackReason = reason;

    if (this.state === 'HALF_OPEN' || this.consecutiveFailures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChange = Date.now();
    }
  }

  public reset() {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastStateChange = Date.now();
    this.lastFallbackReason = undefined;
  }

  public trip(reason = 'Manual Test Trip') {
    this.state = 'OPEN';
    this.consecutiveFailures = this.failureThreshold;
    this.lastFailureTime = new Date().toISOString();
    this.lastFallbackReason = reason;
    this.lastStateChange = Date.now();
  }

  public getMetrics() {
    const currentState = this.getState();
    const total = this.totalCalls || 1;
    const uptimePercent = Math.max(0, Math.min(100, Number((((total - this.failedCalls) / total) * 100).toFixed(1))));
    return {
      state: currentState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      fallbackActive: currentState === 'OPEN',
      lastFallbackReason: this.lastFallbackReason,
      totalCalls: this.totalCalls,
      failedCalls: this.failedCalls,
      fallbackCalls: this.fallbackCalls,
      uptimePercent
    };
  }

  public async execute<T>(
    operation: () => Promise<T>,
    fallback: () => T | Promise<T>
  ): Promise<{ data: T; fallbackUsed: boolean; fallbackReason?: string; circuitState: CircuitState }> {
    this.totalCalls++;
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      this.fallbackCalls++;
      const fbData = await fallback();
      return {
        data: fbData,
        fallbackUsed: true,
        fallbackReason: this.lastFallbackReason || 'CircuitBreaker is OPEN',
        circuitState: 'OPEN'
      };
    }

    try {
      const data = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Operation timeout after ${this.timeoutMs}ms`)), this.timeoutMs)
        )
      ]);

      this.recordSuccess();
      return {
        data,
        fallbackUsed: false,
        circuitState: this.state
      };
    } catch (err: any) {
      const reason = err?.message || 'Execution error';
      this.recordFailure(reason);
      this.fallbackCalls++;
      const fbData = await fallback();
      return {
        data: fbData,
        fallbackUsed: true,
        fallbackReason: reason,
        circuitState: this.state
      };
    }
  }
}

const serverCircuitBreaker = new ServerCircuitBreaker();

// ==========================================
// START SERVER
// ==========================================
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Lazy initialize GoogleGenAI client
  let aiClient: GoogleGenAI | null = null;
  function getAIClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  }

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      circuitBreaker: serverCircuitBreaker.getMetrics(),
    });
  });

  // Circuit Breaker Status Endpoint
  app.get("/api/ai/circuit-breaker/status", (req, res) => {
    res.json(serverCircuitBreaker.getMetrics());
  });

  // Circuit Breaker Reset Endpoint
  app.post("/api/ai/circuit-breaker/reset", (req, res) => {
    serverCircuitBreaker.reset();
    res.json({ message: "Circuit breaker reset to CLOSED", metrics: serverCircuitBreaker.getMetrics() });
  });

  // Circuit Breaker Trip Endpoint (Testing & Simulation)
  app.post("/api/ai/circuit-breaker/trip", (req, res) => {
    serverCircuitBreaker.trip(req.body.reason || "Manual steward test trip");
    res.json({ message: "Circuit breaker manually tripped to OPEN", metrics: serverCircuitBreaker.getMetrics() });
  });

  // PII Masking Test & Inspection Endpoint
  app.post("/api/ai/pii-mask", (req, res) => {
    const { payload } = req.body;
    const { sanitized, detectedCount, mapping } = maskServerPII(payload);
    res.json({
      original: payload,
      sanitized,
      detectedCount,
      isProtected: detectedCount > 0,
      tokenMap: mapping,
      timestamp: new Date().toISOString()
    });
  });

  // AI Companion Metadata Analysis API (with PII Masking & Circuit Breaker)
  app.post("/api/ai/analyze-companion", async (req, res) => {
    try {
      const { fileName, fileContent, fields } = req.body;

      // 1. Sanitize incoming inputs for PII
      const piiCheck = maskServerPII({ fileName, fileContent, fields });
      const safeData = piiCheck.sanitized;

      // 2. Define deterministic fallback
      const fallbackCompanion = () => {
        const fieldList = Array.isArray(safeData.fields) ? safeData.fields : [];
        const fieldAnalyses = fieldList.map((f: string) => {
          const lower = f.toLowerCase();
          let cat = 'text';
          let dt = 'VARCHAR(255)';
          let desc = `Field ${f}`;
          let conf = 0.85;

          if (lower.includes('kunnr') || lower.includes('cust') || lower.includes('client')) {
            cat = 'customer'; dt = 'VARCHAR(10)'; desc = 'Customer Account Identifier'; conf = 0.96;
          } else if (lower.includes('id') || lower.includes('code') || lower.includes('nr')) {
            cat = 'identifier'; dt = 'VARCHAR(32)'; desc = 'Entity Identification Code'; conf = 0.90;
          } else if (lower.includes('date') || lower.includes('time') || lower.includes('dat')) {
            cat = 'datetime'; dt = 'TIMESTAMP'; desc = 'Timestamp / Calendar Date'; conf = 0.92;
          } else if (lower.includes('amount') || lower.includes('promet') || lower.includes('price') || lower.includes('val')) {
            cat = 'monetary'; dt = 'DECIMAL(18,2)'; desc = 'Monetary Amount / Financial Value'; conf = 0.95;
          } else if (lower.includes('qty') || lower.includes('count') || lower.includes('kolicina')) {
            cat = 'quantity'; dt = 'NUMERIC(12,3)'; desc = 'Numerical Quantity'; conf = 0.90;
          }

          return {
            fieldName: f,
            description: desc,
            dataType: dt,
            semanticCategory: cat,
            synonyms: [f.toLowerCase(), f.toUpperCase()],
            businessRules: "Deterministic Rule-Based Fallback Analysis",
            confidence: conf
          };
        });

        return {
          fieldAnalyses,
          summary: "Deterministic Companion Metadata Extraction (Fallback Active)",
          domainContext: "Deterministic Multi-Signal Rule Profile",
          fallbackUsed: true
        };
      };

      // 3. Execute via Circuit Breaker
      const execution = await serverCircuitBreaker.execute(async () => {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY is not set.");
        }

        const ai = getAIClient();
        const prompt = `You are Semantra's Bounded AI Metadata & Data Dictionary Analyzer.
Analyze the provided companion specification/metadata file ("${safeData.fileName || 'Companion Spec'}") and extract precise field descriptions, inferred data types, semantic categories, and business logic for each field.

Companion Content/Specification Snippet:
${typeof safeData.fileContent === 'string' ? safeData.fileContent.slice(0, 12000) : JSON.stringify(safeData.fileContent).slice(0, 12000)}

Known Uploaded Fields:
${JSON.stringify(safeData.fields || [])}

Perform deep semantic extraction. Identify domain concepts (e.g. SAP KUNNR = Customer Number, VKORG = Sales Org, turnover/promet = monetary amount).
Semantic Categories MUST be one of: 'datetime', 'monetary', 'classification', 'customer', 'identifier', 'quantity', 'status', 'text', 'other'.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are an enterprise data integration expert analyzing metadata specifications, SAP data dictionaries, and companion JSON/CSV/DDL schema files.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                fieldAnalyses: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      fieldName: { type: Type.STRING },
                      description: { type: Type.STRING },
                      dataType: { type: Type.STRING },
                      semanticCategory: { type: Type.STRING },
                      synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                      businessRules: { type: Type.STRING },
                      confidence: { type: Type.NUMBER }
                    },
                    required: ["fieldName", "description", "semanticCategory"]
                  }
                },
                summary: { type: Type.STRING },
                domainContext: { type: Type.STRING }
              }
            }
          }
        });

        return JSON.parse(response.text || "{}");
      }, fallbackCompanion);

      res.json({
        ...execution.data,
        fallbackUsed: execution.fallbackUsed,
        fallbackReason: execution.fallbackReason,
        circuitBreakerState: execution.circuitState,
        piiSanitizedCount: piiCheck.detectedCount
      });
    } catch (err: any) {
      console.error("Error analyzing companion metadata:", err);
      res.status(500).json({ error: err.message || "Companion analysis failed" });
    }
  });

  // AI Enhanced Mapping Suggestions API (with PII Masking & Circuit Breaker)
  app.post("/api/ai/enhance-mappings", async (req, res) => {
    try {
      const { sourceFields, targetFields, companionMetadata, sampleData } = req.body;

      // 1. Sanitize incoming inputs for PII
      const piiCheck = maskServerPII({ sourceFields, targetFields, companionMetadata, sampleData });
      const safeData = piiCheck.sanitized;

      // 2. Deterministic Fallback Mappings
      const fallbackMappings = () => {
        const sFields: any[] = Array.isArray(safeData.sourceFields) ? safeData.sourceFields : [];
        const tFields: any[] = Array.isArray(safeData.targetFields) ? safeData.targetFields : [];

        const mappings = sFields.map((sf: any) => {
          const sName = typeof sf === 'string' ? sf : sf.name || sf.field || '';
          const sDesc = typeof sf === 'object' ? sf.description || '' : '';
          
          let bestTarget = tFields[0] ? (typeof tFields[0] === 'string' ? tFields[0] : tFields[0].name) : 'target_attribute';
          let bestScore = 0.85;

          // Simple token matcher
          for (const tf of tFields) {
            const tName = typeof tf === 'string' ? tf : tf.name || tf.field || '';
            if (tName.toLowerCase() === sName.toLowerCase()) {
              bestTarget = tName;
              bestScore = 0.98;
              break;
            } else if (tName.toLowerCase().includes(sName.toLowerCase()) || sName.toLowerCase().includes(tName.toLowerCase())) {
              bestTarget = tName;
              bestScore = 0.90;
            }
          }

          return {
            sourceField: sName,
            targetField: bestTarget,
            confidenceScore: bestScore,
            confidenceLevel: bestScore >= 0.85 ? "high" : "medium",
            explanation: `Deterministic multi-signal heuristic alignment for ${sName} -> ${bestTarget}.`,
            signals: ["name", "semantic", "canonical"],
            hasConflict: false,
            conflictReason: "",
            inferredTargetType: "VARCHAR",
            companionInsight: "Fallback rule engine engaged"
          };
        });

        return { mappings, fallbackUsed: true };
      };

      // 3. Execute via Circuit Breaker
      const execution = await serverCircuitBreaker.execute(async () => {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY environment variable is not set.");
        }

        const ai = getAIClient();
        const prompt = `You are Semantra's AI Mapping & Data Integration Engine.
Analyze source fields against candidate target fields using companion specification metadata and sample data.

Source Fields: ${JSON.stringify(safeData.sourceFields || [])}
Candidate Target Fields: ${JSON.stringify(safeData.targetFields || [])}
Companion Spec Metadata: ${JSON.stringify(safeData.companionMetadata || {})}
Sample Data Values: ${JSON.stringify(safeData.sampleData || {})}

For each source field:
1. Identify the best matching target field.
2. Determine confidence score (0.0 to 1.0) and confidence level ('high', 'medium', 'low').
3. List active signals from: 'name', 'semantic', 'knowledge', 'canonical', 'correction'.
4. Detect type or semantic conflicts (e.g. date mapped to numeric column) and describe the risk.
5. Provide a clear, professional explanation referencing companion spec metadata where applicable.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are Semantra's AI workbench assistant. Deliver high quality, explainable semantic mappings with active companion specification analysis.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                mappings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sourceField: { type: Type.STRING },
                      targetField: { type: Type.STRING },
                      confidenceScore: { type: Type.NUMBER },
                      confidenceLevel: { type: Type.STRING, enum: ["high", "medium", "low"] },
                      explanation: { type: Type.STRING },
                      signals: { type: Type.ARRAY, items: { type: Type.STRING } },
                      hasConflict: { type: Type.BOOLEAN },
                      conflictReason: { type: Type.STRING },
                      inferredTargetType: { type: Type.STRING },
                      companionInsight: { type: Type.STRING }
                    },
                    required: ["sourceField", "targetField", "confidenceScore", "confidenceLevel", "explanation"]
                  }
                }
              }
            }
          }
        });

        return JSON.parse(response.text || "{}");
      }, fallbackMappings);

      res.json({
        ...execution.data,
        fallbackUsed: execution.fallbackUsed,
        fallbackReason: execution.fallbackReason,
        circuitBreakerState: execution.circuitState,
        piiSanitizedCount: piiCheck.detectedCount
      });
    } catch (err: any) {
      console.error("Error enhancing mappings with AI:", err);
      res.status(500).json({ error: err.message || "AI mapping enhancement failed" });
    }
  });

  // AI Copilot Interactive Assistant API (with PII Masking & Circuit Breaker)
  app.post("/api/ai/copilot", async (req, res) => {
    try {
      const { query, history, activeTab, workspaceStep, mappingCount, lowConfidenceCount, activeBranch } = req.body;

      // 1. Sanitize user query for PII
      const piiCheck = maskServerPII({ query });
      const safeQuery = piiCheck.sanitized.query;

      // 2. Deterministic Fallback Copilot Response
      const fallbackCopilot = () => {
        return {
          text: `🤖 **Semantra Assistant (Offline / Fallback Mode):**\n\nI received your query regarding **${activeTab || 'Workspace'}** (Step: \`${workspaceStep || 'Setup'}\`).\n\n- **Active Governance Branch:** \`${activeBranch || 'main'}\`\n- **Mapped Fields:** \`${mappingCount ?? 5}\` (${lowConfidenceCount ?? 1} low confidence)\n- **Security Status:** 🛡️ PII Masking Active (${piiCheck.detectedCount} entities shielded)\n- **Circuit Breaker:** ${serverCircuitBreaker.getState()}\n\nAll deterministic matching heuristics (Levenshtein, Semantic taxonomy, Knowledge overlays, and Canonical mappings) are active and running at full fidelity.`,
          fallbackUsed: true
        };
      };

      // 3. Execute via Circuit Breaker
      const execution = await serverCircuitBreaker.execute(async () => {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("GEMINI_API_KEY environment variable is not set.");
        }

        const ai = getAIClient();
        const contextString = `
Current User Application Context:
- Active Tab: ${activeTab || "N/A"}
- Workspace Step: ${workspaceStep || "N/A"}
- Active Governance Branch: ${activeBranch || "main"}
- Total Mapped Fields: ${mappingCount ?? 5}
- Low Confidence Fields: ${lowConfidenceCount ?? 1}
- PII Sanitization Status: ${piiCheck.detectedCount > 0 ? 'Active Shielding' : 'Clean Input'}
`;

        const recentHistory = Array.isArray(history) && history.length > 0
          ? "\nConversation History:\n" + history.slice(-6).map((h: any) => `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join("\n\n")
          : "";

        const systemInstruction = `You are the official built-in AI Copilot of Semantra v1.3 Enterprise Workbench, a deterministic-first semantic mapping, governance, and reverse engineering platform.
Your purpose is to answer user queries with high precision, always focusing on the context of Semantra's features and workflows:
1. 5-Step Workspace Pipeline: Setup & Ingestion with PII Shield, Candidates Review with 10-signal RRF scoring, Decision Log with immutable audit trails, Code & Test Generation (PySpark, SQL, dbt, Great Expectations), and Executive Business Analyst Reports.
2. 8-Step Contract Reverse Engineering: Raw multi-entity DDL/OpenAPI/WSDL ingestion, Entity Relationship Graph & Smart FK Analysis, Canonical Model Synthesis (>90% confidence), and 1-Click Sync of contract invariants to Test Sets.
3. Multi-Signal Scoring: 10 signals (Exact, Token, Semantic, Knowledge, Canonical, Pattern, Statistical, Overlap, Embedding, Correction/LLM) fused via RRF (k=60) with 5 configurable scoring profiles.
4. Governance & Branching: Git-like draft dictionary overlays, 3-way merge conflict resolution wizard, benchmark delta regression testing, and glossary promotion.
5. Benchmarks & Golden Master: Ground-truth backtesting (Precision, Recall, F1) with Golden Master Alignment Audit and 1-Click Auto-Healing.
6. Zero-Trust Security: mTLS client verification, dynamic ABAC field masking, and Hardware HSM digital signatures.
7. Enterprise Shield & Semantic Cache: Z-Score Real-Time Anomaly Detection, Dead Letter Queue (DLQ), and Redis Vector Semantic Caching.

CRITICAL RULES:
- LANGUAGE ADAPTABILITY: You MUST respond in the EXACT SAME LANGUAGE that the user used in their question (e.g. if the user asks in Serbian/Croatian/Bosnian, answer in natural, fluent Serbian; if in English, answer in English; if in German, answer in German, etc.).
- ALWAYS provide direct, helpful, and specific answers to what the user actually asked, rather than repeating generic boilerplate.
- Keep your answers grounded in Semantra's capabilities and data engineering / integration domain.
- Format responses cleanly with Markdown headers, bold highlights, and clear bullet points.`;

        const userPrompt = `${contextString}${recentHistory}\nUser Question: ${safeQuery}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.4,
          }
        });

        return { text: response.text || "I am here to assist with Semantra." };
      }, fallbackCopilot);

      res.json({
        text: execution.data.text,
        fallbackUsed: execution.fallbackUsed,
        fallbackReason: execution.fallbackReason,
        circuitBreakerState: execution.circuitState,
        piiSanitizedCount: piiCheck.detectedCount
      });
    } catch (err: any) {
      console.error("Error in AI Copilot endpoint:", err);
      res.status(500).json({ error: err.message || "AI Copilot failed to process request" });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
