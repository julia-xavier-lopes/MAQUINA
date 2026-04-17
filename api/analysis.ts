export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    data: {
      id: Date.now(),
      machineSuggestions: [
        {
          title: "Teste funcionando",
          description: "Sua API já está respondendo 🎉",
          confidence: "high",
        },
      ],
      aiSummary: "Integração OK",
    },
  });
}