import { Router } from "express";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable, equipmentTable } from "@workspace/db";
import { CreateChatSessionBody, SendChatMessageBody, GetChatMessagesParams, SendChatMessageParams } from "@workspace/api-zod";
import { eq, asc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `Você é um especialista em eficiência energética industrial, Indústria 4.0 e ESG (Environmental, Social, Governance) para pequenas e médias empresas no Brasil. 
Você tem profundo conhecimento em:
- Retrofit industrial e modernização de equipamentos
- Motores elétricos, compressores, bombas, esteiras e outros equipamentos industriais
- Normas brasileiras de eficiência energética (PROCEL, ABNT)
- Sensores industriais (corrente, vibração, temperatura, ultrassom, pressão)
- Inversores de frequência, soft starters, CLPs e automação
- Manutenção preditiva e preventiva
- Cálculo de payback e ROI de projetos de eficiência
- Programas de financiamento como BNDES, Finame, e fundos de sustentabilidade
- Emissões de CO2 e pegada de carbono industrial
- Certificações ESG e relatórios de sustentabilidade

Responda sempre em português do Brasil, de forma técnica mas acessível. Quando aplicável, forneça estimativas numéricas e referências a normas ou programas brasileiros.`;

router.get("/chat/sessions", async (req, res) => {
  try {
    const sessions = await db.select().from(chatSessionsTable).orderBy(chatSessionsTable.createdAt);
    res.json(sessions);
  } catch (err) {
    req.log.error({ err }, "Failed to list chat sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chat/sessions", async (req, res) => {
  try {
    const body = CreateChatSessionBody.parse(req.body);
    const [session] = await db.insert(chatSessionsTable).values({
      title: body.title,
      equipmentId: body.equipmentId ?? null,
    }).returning();
    res.status(201).json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to create chat session");
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/chat/sessions/:id/messages", async (req, res) => {
  try {
    const params = GetChatMessagesParams.parse({ id: parseInt(req.params.id) });
    const messages = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, params.id))
      .orderBy(asc(chatMessagesTable.createdAt));
    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "Failed to get chat messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/chat/sessions/:id/messages", async (req, res) => {
  try {
    const params = SendChatMessageParams.parse({ id: parseInt(req.params.id) });
    const body = SendChatMessageBody.parse(req.body);

    await db.insert(chatMessagesTable).values({
      sessionId: params.id,
      role: "user",
      content: body.content,
    });

    const history = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, params.id))
      .orderBy(asc(chatMessagesTable.createdAt));

    let systemContent = SYSTEM_PROMPT;
    if (body.equipmentContext) {
      systemContent += `\n\nContexto do equipamento em análise:\n${body.equipmentContext}`;
    }

    const messages: Array<{role: "user" | "assistant" | "system"; content: string}> = [
      { role: "system", content: systemContent },
      ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(chatMessagesTable).values({
      sessionId: params.id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to send chat message");
    res.write(`data: ${JSON.stringify({ error: "Failed to process message" })}\n\n`);
    res.end();
  }
});

export default router;
