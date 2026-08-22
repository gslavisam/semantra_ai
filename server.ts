import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

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
    });
  });

  // AI Companion Metadata Analysis API
  app.post("/api/ai/analyze-companion", async (req, res) => {
    try {
      const { fileName, fileContent, fields } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "GEMINI_API_KEY environment variable is not set.",
        });
      }

      const ai = getAIClient();
      const prompt = `You are Semantra's Bounded AI Metadata & Data Dictionary Analyzer.
Analyze the provided companion specification/metadata file ("${fileName || 'Companion Spec'}") and extract precise field descriptions, inferred data types, semantic categories, and business logic for each field.

Companion Content/Specification Snippet:
${typeof fileContent === 'string' ? fileContent.slice(0, 12000) : JSON.stringify(fileContent).slice(0, 12000)}

Known Uploaded Fields:
${JSON.stringify(fields || [])}

Perform deep semantic extraction. Identify domain concepts (e.g. SAP KUNNR = Customer Number, VKORG = Sales Org, turnover/promet = monetary amount).
Semantic Categories MUST be one of: 'datetime', 'monetary', 'classification', 'customer', 'identifier', 'quantity', 'status', 'text', 'other'.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
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

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (err: any) {
      console.error("Error analyzing companion metadata:", err);
      res.status(500).json({ error: err.message || "Companion analysis failed" });
    }
  });

  // AI Enhanced Mapping Suggestions API
  app.post("/api/ai/enhance-mappings", async (req, res) => {
    try {
      const { sourceFields, targetFields, companionMetadata, sampleData } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "GEMINI_API_KEY environment variable is not set.",
        });
      }

      const ai = getAIClient();
      const prompt = `You are Semantra's AI Mapping & Data Integration Engine.
Analyze source fields against candidate target fields using companion specification metadata and sample data.

Source Fields: ${JSON.stringify(sourceFields || [])}
Candidate Target Fields: ${JSON.stringify(targetFields || [])}
Companion Spec Metadata: ${JSON.stringify(companionMetadata || {})}
Sample Data Values: ${JSON.stringify(sampleData || {})}

For each source field:
1. Identify the best matching target field.
2. Determine confidence score (0.0 to 1.0) and confidence level ('high', 'medium', 'low').
3. List active signals from: 'name', 'semantic', 'knowledge', 'canonical', 'correction'.
4. Detect type or semantic conflicts (e.g. date mapped to numeric column) and describe the risk.
5. Provide a clear, professional explanation referencing companion spec metadata where applicable.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
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

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (err: any) {
      console.error("Error enhancing mappings with AI:", err);
      res.status(500).json({ error: err.message || "AI mapping enhancement failed" });
    }
  });

  // AI Copilot Interactive Assistant API
  app.post("/api/ai/copilot", async (req, res) => {
    try {
      const { query, activeTab, workspaceStep, mappingCount, lowConfidenceCount, activeBranch } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({
          error: "GEMINI_API_KEY environment variable is not set.",
        });
      }

      const ai = getAIClient();
      const contextString = `
Current User Application Context:
- Active Tab: ${activeTab || "N/A"}
- Workspace Step: ${workspaceStep || "N/A"}
- Active Governance Branch: ${activeBranch || "main"}
- Total Mapped Fields: ${mappingCount ?? 5}
- Low Confidence Fields: ${lowConfidenceCount ?? 1}
`;

      const systemInstruction = `You are the official built-in AI Copilot of Semantra Data Workbench, a deterministic-first semantic mapping and governance platform.
Your purpose is to answer user queries with high precision, always focusing on the context of Semantra's features and workflows:
1. Workspace Setup: Selecting presets (SAP Customer, Material, Supplier, etc.) or uploading Companion Specs (CSV, Excel, DDL) to feed the multi-signal engine.
2. Contract Reverse Engineering: Parsing raw SQL DDL, OpenAPI/Swagger specifications, and JSON schemas.
3. Multi-Signal Scoring: Composing Name (string similarity), Semantic (descriptions/types), Knowledge (catalog concept matches), Canonical (glossary matches), and LLM (Gemini-enhanced semantic logic) signals into confidence levels.
4. Governance & Branching: Creating draft dictionary overlays, staging changes, running accuracy checks against gold datasets, and merging into main.
5. Code Generation & Quality: Exporting Pandas, PySpark, dbt validation schemas, and Great Expectations.

CRITICAL RULES:
- The user may ask questions in any language (e.g., Serbian, French, Spanish, German). You MUST translate/interpret their intent, but you MUST ALWAYS answer in clear, professional English.
- Keep your answers strictly in the context of Semantra application and data integration concepts.
- If a question is totally out of scope (e.g., recipes, general programming unrelated to data integration, weather), politely state that you are specialized in Semantra and guide them back to its features.
- Deliver response in beautifully structured Markdown with lists and bold headers.`;

      const userPrompt = `${contextString}\nUser Query: ${query}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });

      res.json({ text: response.text || "I am here to assist with Semantra." });
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
