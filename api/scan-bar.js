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

  const geminiPrompt = `You are a liquor bottle scanner. Analyze this image systematically:

STEP 1: Scan left-to-right, top-to-bottom. Examine EVERY bottle individually.
STEP 2: For each bottle, identify the spirit category from its label text, bottle shape, color, and cap.
STEP 3: Output one entry per unique category found. If you see 3 whiskey bottles, output whiskey once.

Category identification guide:
- Clear liquid + tall bottle = likely vodka or gin (check label)
- Amber/brown liquid = whiskey, bourbon, scotch, brandy, or cognac
- Red/orange distinctive bottle = campari or aperol
- Dark brown squat bottle = kahlua, baileys, amaretto, or liqueur
- Green bottle with herbs = chartreuse or absinthe
- White/cream = baileys or coconut rum

Valid categories: vodka, gin, whiskey, bourbon, scotch, rum, tequila, mezcal, cognac, campari, aperol, kahlua, baileys, triple_sec, sweet_vermouth, amaretto, chartreuse, absinthe, fernet, bitters, prosecco, liqueur, brandy

Return ONLY a JSON array: [{"name_en":"Brand or type","name_he":"Hebrew name","category":"category","confidence":"high|medium|low"}]`;

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
        maxOutputTokens: 16384,
        thinkingConfig: {
          thinkingBudget: 1024
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

    // Gemini 2.5 with thinking returns multiple parts — find the text part (not thought)
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text);
    const textContent = textPart?.text;
    if (!textContent) {
      return res.status(200).json({ bottles: [] });
    }

    let cleaned = textContent.trim();
    // Strip markdown code fences
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    // Extract JSON array even if surrounded by text
    let bottles;
    try {
      bottles = JSON.parse(cleaned);
    } catch (parseErr) {
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          bottles = JSON.parse(arrayMatch[0]);
        } catch (e) {
          console.error('Failed to parse extracted JSON:', arrayMatch[0].substring(0, 200));
          return res.status(200).json({ bottles: [] });
        }
      } else {
        console.error('No JSON array found in response:', cleaned.substring(0, 200));
        return res.status(200).json({ bottles: [] });
      }
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
