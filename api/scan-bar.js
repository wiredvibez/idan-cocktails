import newrelic from 'newrelic';

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

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  const image = body?.image;

  if (!image) {
    return res.status(400).json({ error: 'No image provided' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const geminiPrompt = `You are identifying alcohol bottles in a bar photo for a cocktail recipe matcher. Be thorough — identify EVERY bottle you can see, even partially visible ones.

TASK: List every alcohol bottle visible. Return a JSON array. If you see bottles but can't read labels, still identify them by shape/color with "low" confidence. NEVER return an empty array if bottles are visible.

VALID CATEGORIES (use these exact keys):
vodka, gin, bourbon, rye_whiskey, scotch, rum, rum_dark, tequila, mezcal, cognac, campari, aperol, kahlua, baileys, triple_sec, sweet_vermouth, amaretto, chartreuse, benedictine, maraschino, blue_curacao, galliano, fernet, absinthe, peach_schnapps, cherry_liqueur, chocolate_liqueur, creme_de_menthe, creme_de_cacao, licor43, bitters, orange_bitters, grenadine, prosecco, passoa, liqueur, syrup, simple_syrup, honey_syrup, agave_syrup, raspberry_syrup, orgeat

BRAND → CATEGORY CHEAT SHEET:
Absolut/Grey Goose/Smirnoff/Belvedere/Ketel One → vodka
Bombay/Hendrick's/Tanqueray/Beefeater/Gordon's → gin
Jack Daniel's/Jim Beam/Maker's Mark/Wild Turkey/Woodford Reserve → bourbon
Johnnie Walker/Glenfiddich/Macallan/Glenlivet/Chivas/Highland Park → scotch
Bacardi/Havana Club/Captain Morgan (white) → rum | Captain Morgan (dark)/Kraken/Myers → rum_dark
Don Julio/Patron/Jose Cuervo/Herradura/Casamigos → tequila
Hennessy/Rémy Martin/Courvoisier → cognac
Campari → campari | Aperol → aperol | Kahlúa → kahlua | Baileys → baileys
Cointreau → triple_sec | Disaronno → amaretto | Jägermeister/Fernet Branca → fernet
Martini Rosso/Carpano Antica → sweet_vermouth | Angostura → bitters
Monin/Torani/1883 → syrup (specify flavor)

VISUAL IDENTIFICATION (when labels are unreadable):
• Clear liquid + tall slim bottle = vodka or gin
• Amber/brown + squat bottle = bourbon or whiskey
• Amber + tall elegant = scotch or cognac (Hennessy has distinctive rounded shape)
• Bright red bottle = Campari | Orange gradient = Aperol
• Dark brown + Aztec-style label = Kahlúa | Cream-colored = Baileys
• Small bottle with oversized label = Angostura bitters
• Tall yellow bottle = Galliano | Orange square bottle = Cointreau
• Wire cage/foil top = prosecco or champagne
• Tall bottle + fruit illustration = Monin syrup
• Green bottle = Chartreuse, Tanqueray, or absinthe

RULES:
1. Read label text first. Even partial text counts ("...olut" = Absolut = vodka).
2. If label unreadable, use bottle shape + liquid color + cap color to identify.
3. IGNORE: water, soda, cola, juice, fresh fruit, ice, salt, sugar, tonic water.
4. Count all bottles visible. Your output should match the number of alcohol bottles you see.
5. For dark/blurry images: look for faint outlines, silhouettes, reflections, cap colors.
6. When unsure between two categories, pick the more likely one with "low" confidence.

CONFIDENCE: "high" = label clearly read. "medium" = identified by shape/brand. "low" = best guess.

OUTPUT FORMAT: Return a JSON array. Each entry MUST have these 4 fields:
{"name_en": "Brand + Type", "name_he": "Hebrew name", "category": "category_key", "confidence": "high|medium|low"}
Example: {"name_en": "Absolut Vodka", "name_he": "וודקה אבסולוט", "category": "vodka", "confidence": "high"}`;

  let base64Data = image;
  let mimeType = 'image/jpeg';
  if (image.startsWith('data:')) {
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }
  }

  const imageSizeKb = Math.round(base64Data.length * 0.75 / 1024);
  newrelic.addCustomAttributes({ image_size_kb: imageSizeKb });

  const model =
    process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

  try {
    const geminiStart = Date.now();
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      newrelic.addCustomAttributes({ gemini_latency_ms: Date.now() - geminiStart, gemini_error: geminiRes.status });
      console.error('Gemini API error:', geminiRes.status, model, errText);
      let details = errText.slice(0, 400);
      try {
        const parsed = JSON.parse(errText);
        details = parsed?.error?.message || parsed?.message || details;
      } catch {
        /* keep text slice */
      }
      return res.status(502).json({
        error: 'AI service error',
        model,
        upstreamStatus: geminiRes.status,
        details
      });
    }

    const geminiData = await geminiRes.json();

    // With responseSchema, Gemini should return clean JSON
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find(p => p.text && !p.thought) || parts.find(p => p.text);
    const textContent = textPart?.text;
    if (!textContent) {
      console.error('No text in Gemini response. Parts:', JSON.stringify(parts.map(p => Object.keys(p))));
      return res.status(200).json({ bottles: [] });
    }

    let bottles;
    try {
      bottles = JSON.parse(textContent);
    } catch (parseErr) {
      // Fallback: try to extract JSON array from response
      let cleaned = textContent.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          bottles = JSON.parse(arrayMatch[0]);
        } catch (e) {
          console.error('Fallback parse failed:', cleaned.substring(0, 200));
          return res.status(200).json({ bottles: [] });
        }
      } else {
        console.error('No JSON array found:', cleaned.substring(0, 200));
        return res.status(200).json({ bottles: [] });
      }
    }

    if (!Array.isArray(bottles)) {
      return res.status(200).json({ bottles: [] });
    }

    // Normalize: ensure every bottle has required fields
    const CATEGORY_HEBREW = {
      vodka: 'וודקה', gin: "ג'ין", bourbon: 'בורבון', rye_whiskey: 'וויסקי ריי',
      scotch: 'סקוטש', rum: 'רום', rum_dark: 'רום כהה', tequila: 'טקילה',
      mezcal: 'מזקל', cognac: 'קוניאק', campari: 'קמפרי', aperol: 'אפרול',
      kahlua: 'קהלואה', baileys: 'בייליס', triple_sec: 'טריפל סק',
      sweet_vermouth: 'ורמוט מתוק', amaretto: 'אמרטו', chartreuse: 'שארטרז',
      benedictine: 'בנדיקטין', maraschino: 'מרשקינו', blue_curacao: 'בלו קוראסאו',
      galliano: 'גליאנו', fernet: 'פרנה', absinthe: 'אבסינת',
      peach_schnapps: 'ליקר אפרסק', cherry_liqueur: 'ליקר דובדבן',
      chocolate_liqueur: 'ליקר שוקולד', creme_de_menthe: 'קרם דה מנט',
      creme_de_cacao: 'קרם דה קקאו', licor43: 'ליקור 43',
      bitters: 'ביטרס', orange_bitters: 'ביטרס תפוז', grenadine: 'גרנדין',
      prosecco: 'פרוסקו', passoa: 'פסואה', liqueur: 'ליקר',
      syrup: 'סירופ', simple_syrup: 'סירופ פשוט', honey_syrup: 'סירופ דבש',
      agave_syrup: 'סירופ אגבה', raspberry_syrup: 'סירופ פטל', orgeat: 'אורגיט'
    };

    const normalized = bottles.map(b => ({
      name_en: b.name_en || b.name || b.category || 'Unknown',
      name_he: b.name_he || CATEGORY_HEBREW[b.category] || b.category || 'לא ידוע',
      category: b.category || 'liqueur',
      confidence: b.confidence || 'low'
    }));

    newrelic.addCustomAttributes({
      gemini_latency_ms: Date.now() - geminiStart,
      bottle_count: normalized.length
    });

    return res.status(200).json({ bottles: normalized });

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
