export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const geminiPrompt = `You are identifying alcohol bottles in a bar photo for a cocktail recipe matcher.

TASK: List every alcohol bottle visible. Return a JSON array.

VALID CATEGORIES (use these exact keys):
vodka, gin, bourbon, rye_whiskey, scotch, rum, rum_dark, tequila, mezcal, cognac, campari, aperol, kahlua, baileys, triple_sec, sweet_vermouth, amaretto, chartreuse, benedictine, maraschino, blue_curacao, galliano, fernet, absinthe, peach_schnapps, cherry_liqueur, chocolate_liqueur, creme_de_menthe, creme_de_cacao, licor43, bitters, orange_bitters, grenadine, prosecco, passoa, liqueur, syrup, simple_syrup, honey_syrup, agave_syrup, raspberry_syrup, orgeat

RULES:
1. Read label text first. Even partial text counts ("...olut" = Absolut = vodka).
2. If label is unreadable, identify by bottle shape, liquid color, and cap color.
3. Monin bottles (tall, colorful fruit illustration on label) = syrup. Specify the flavor in name_en (e.g. "Monin Elderflower Syrup").
4. IGNORE: water, soda, cola, juice cartons, fresh fruit, ice, salt, sugar, tonic water.
5. Count all bottles visible. If your list has fewer items than bottles you can see, look again for missed ones.
6. For dark or blurry images: look for faint label outlines, bottle silhouettes, reflections on glass, and cap colors.

CONFIDENCE:
- "high" = label text clearly readable
- "medium" = identified by bottle shape/color/brand recognition
- "low" = best guess from silhouette only

Each entry: {"name_en": "Brand + Type", "name_he": "Hebrew category name", "category": "category_key", "confidence": "high|medium|low"}`;

  let base64Data = image;
  let mimeType = 'image/jpeg';
  if (image.startsWith('data:')) {
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const geminiBody = {
      contents: [{
        parts: [
          { text: geminiPrompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name_en: { type: "STRING" },
              name_he: { type: "STRING" },
              category: {
                type: "STRING",
                enum: [
                  "vodka", "gin", "bourbon", "rye_whiskey", "scotch",
                  "rum", "rum_dark", "tequila", "mezcal", "cognac",
                  "campari", "aperol", "kahlua", "baileys", "triple_sec",
                  "sweet_vermouth", "amaretto", "chartreuse", "benedictine",
                  "maraschino", "blue_curacao", "galliano", "fernet",
                  "absinthe", "peach_schnapps", "cherry_liqueur",
                  "chocolate_liqueur", "creme_de_menthe", "creme_de_cacao",
                  "licor43", "bitters", "orange_bitters", "grenadine",
                  "prosecco", "passoa", "liqueur", "syrup", "simple_syrup",
                  "honey_syrup", "agave_syrup", "raspberry_syrup", "orgeat"
                ]
              },
              confidence: {
                type: "STRING",
                enum: ["high", "medium", "low"]
              }
            },
            required: ["name_en", "name_he", "category", "confidence"]
          }
        }
      }
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return res.status(502).json({ error: 'AI service error' });
    }

    const geminiData = await geminiRes.json();

    // With responseSchema, Gemini returns clean JSON directly
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find(p => p.text);
    const textContent = textPart?.text;
    if (!textContent) {
      return res.status(200).json({ bottles: [] });
    }

    let bottles;
    try {
      bottles = JSON.parse(textContent);
    } catch (parseErr) {
      console.error('JSON parse failed despite schema:', textContent.substring(0, 200));
      return res.status(200).json({ bottles: [] });
    }

    if (!Array.isArray(bottles)) {
      return res.status(200).json({ bottles: [] });
    }

    return res.status(200).json({ bottles });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
