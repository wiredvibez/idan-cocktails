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

  const geminiPrompt = `PROTOCOL: High-Precision Alcohol Audit with Master Recipe Cross-Reference

You are auditing a bar photo against a MASTER RECIPE LIST from a cocktail database. Your goal is to identify every bottle that matches an ingredient below.

═══ MASTER RECIPE LIST (High-Value Targets) ═══

SPIRITS: vodka, gin, bourbon, rye_whiskey, scotch, rum (white), rum (dark), tequila, mezcal, cognac
LIQUEURS: kahlua, baileys, campari, aperol, triple_sec (Cointreau), amaretto, chartreuse (green), benedictine, maraschino, blue_curacao, galliano, fernet, absinthe, peach_schnapps, passoa, cherry_liqueur, chocolate_liqueur, creme_de_menthe, creme_de_cacao, licor_43
MODIFIERS: sweet_vermouth, bitters (Angostura), orange_bitters, Peychaud's bitters, grenadine, prosecco
SYRUPS & SPECIALTY (IMPORTANT — DO NOT SKIP): Monin syrups (any flavor), simple syrup, honey syrup, agave syrup, orgeat, raspberry syrup, ginger syrup, elderflower syrup

CRITICAL: Monin bottles are HIGH-VALUE TARGETS. They have a distinctive tall bottle with a fruit/flavor illustration on the label. If you see ANY Monin bottle, identify the flavor. If the flavor text is blurry, output "Monin - [Flavor Unclear]" with category "syrup".

EXCLUDE from identification: plain water, soda water, tonic water, cola, fresh whole fruit, ice, table salt, table sugar.

═══ MULTI-PASS VERIFICATION ═══

PASS 1 — OCR: Read text on every label. Even partial text counts (e.g., "...olut" = Absolut Vodka).
PASS 2 — Silhouette & Branding: Identify by bottle shape, cap color, label color scheme, liquid color:
  • Clear + tall slim bottle = vodka or gin (check label to distinguish)
  • Amber/brown + squat = bourbon or whiskey
  • Amber + tall = scotch or cognac
  • Red distinctive bottle = Campari (round label) or Aperol (orange gradient)
  • Dark brown squat = Kahlúa (Aztec art), Baileys (cream label), Amaretto (square)
  • Green herbal = Chartreuse (bright green) or Absinthe
  • Cream/white = Baileys or Malibu
  • Small bottle + dropper = Bitters (Angostura = oversized label)
  • Tall + distinctive shape = Galliano (yellow tall), Cointreau (orange square)
  • Bubbly/wire cage = Prosecco or Champagne
  • Red/brown with Italian text = Sweet Vermouth (Martini Rosso, Carpano)
  • Tall bottle + colorful fruit illustration label + "MONIN" text = Monin syrup (identify the flavor!)
  • Tall clear/colored bottle with flavor label = specialty syrup (check brand: Monin, Torani, 1883)
PASS 3 — Low-Light Recovery: The image may have been pre-enhanced from a dark original. Look for:
  • Faint label outlines and text that appears washed-out (still readable)
  • Bottle silhouettes against shelves even if labels are unclear
  • Reflections on glass that reveal bottle shape
  • Cap colors visible even when labels are dark
  • If a bottle is clearly alcohol but unreadable, output it as the most likely category with "medium" or "low" confidence
PASS 4 — Ambiguity Resolution: If image is blurry/dark, give Top 3 probable matches based on bottle shape + liquid color. Mark confidence accordingly.
PASS 5 — Completeness Check: Count total bottles visible in image. If your output has fewer items than bottles visible, re-scan for missed items (especially syrups, small bottles, and partially hidden ones).

═══ BRAND → CATEGORY MAPPING ═══

Absolut/Grey Goose/Smirnoff/Belvedere/Ketel One → vodka
Bombay/Hendrick's/Tanqueray/Beefeater/Gordon's → gin
Jack Daniel's/Jim Beam/Maker's Mark/Wild Turkey/Woodford → bourbon
Johnnie Walker/Glenfiddich/Macallan/Glenlivet/Chivas → scotch
Bacardi/Havana Club → rum
Don Julio/Patron/Jose Cuervo/Herradura → tequila
Hennessy/Rémy Martin/Courvoisier → cognac
Jägermeister → liqueur (herbal)
Kahlúa → kahlua | Baileys → baileys | Campari → campari
Aperol → aperol | Cointreau → triple_sec | Disaronno → amaretto
Martini Rosso/Carpano → sweet_vermouth | Angostura → bitters
Monin → syrup (specify flavor in name_en, e.g., "Monin Elderflower Syrup")
Torani/1883/DaVinci → syrup (specify flavor)

═══ OUTPUT FORMAT ═══

Return ONLY a valid JSON array. One entry per unique category found. No markdown, no explanation.
[{"name_en":"Brand + Type","name_he":"Hebrew category name","category":"category_key","confidence":"high|medium|low"}]

Category keys: vodka, gin, bourbon, rye_whiskey, scotch, rum, rum_dark, tequila, mezcal, cognac, campari, aperol, kahlua, baileys, triple_sec, sweet_vermouth, amaretto, chartreuse, benedictine, maraschino, blue_curacao, galliano, fernet, absinthe, peach_schnapps, cherry_liqueur, chocolate_liqueur, creme_de_menthe, creme_de_cacao, licor43, bitters, grenadine, prosecco, passoa, liqueur, syrup, simple_syrup, honey_syrup, agave_syrup, raspberry_syrup, orgeat`;

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
          thinkingBudget: 2048
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
