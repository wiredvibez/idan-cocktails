// ─────────────────────────────────────────────────
// INGREDIENT ALIASES
// Maps canonical category → array of Hebrew/English variants
// ─────────────────────────────────────────────────
const INGREDIENT_ALIASES = {
  // Spirits
  "vodka": ["וודקה", "vodka", "וודקה לימון", "וודקה הדרים", "וודקה וניל", "וודקה ליים"],
  "bourbon": ["בורבון", "bourbon", "בורבון או ויסקי ריי", "ויסקי בורבון", "ויסקי ריי או בורבון"],
  "rye_whiskey": ["וויסקי ריי", "ריי ויסקי", "rye", "rye whiskey"],
  "scotch": ["סקוטש", "scotch", "סקוטש בלנדד", "סקוטש איילה", "סקוטש איילה (ציפה)"],
  "gin": ["ג'ין", "gin"],
  "rum_white": ["רום לבן", "רום", "white rum", "rum"],
  "rum_dark": ["רום כהה", "רום שחור", "dark rum", "רום כהה (לציפה)"],
  "tequila": ["טקילה", "tequila", "טקילה בלאנקו", "טקילה ריפוסאדו"],
  "mezcal": ["מזקל", "מסקל", "mezcal"],
  "cognac": ["קוניאק", "cognac", "brandy"],

  // Liqueurs & Modifiers
  "campari": ["קמפרי", "campari"],
  "aperol": ["אפרול", "aperol"],
  "kahlua": ["קהלואה", "kahlua", "coffee liqueur", "ליקר קפה"],
  "baileys": ["בייליס", "baileys", "irish cream"],
  "triple_sec": ["טריפל סק", "triple sec", "cointreau", "קוואנטרו", "קואנטרו"],
  "sweet_vermouth": ["ורמוט מתוק", "sweet vermouth", "vermouth"],
  "amaretto": ["אמרטו", "amaretto"],
  "chartreuse": ["שארטרוז ירוק", "שרטרז ירוק", "chartreuse", "green chartreuse"],
  "benedictine": ["בנדיקטין", "benedictine"],
  "maraschino": ["ליקר מרסקינו", "maraschino"],
  "prosecco": ["פרוסקו", "prosecco", "champagne", "שמפניה"],
  "bitters": ["ביטרס", "אנגוסטורה ביטרס", "bitters", "angostura", "ביטרס פישו"],
  "fernet": ["פרנט ברנקה", "fernet", "fernet branca"],
  "amaro": ["אמרו נונינו", "amaro nonino", "amaro"],
  "absinthe": ["אבסינת", "אבסינת (שטיפה)", "absinthe"],
  "galliano": ["גליאנו", "galliano"],
  "blue_curacao": ["בלו קוראסאו", "blue curacao", "קוראסאו תפוז"],
  "cherry_liqueur": ["ליקר דובדבן", "cherry liqueur", "cherry heering"],
  "chocolate_liqueur": ["ליקר שוקולד", "chocolate liqueur"],
  "creme_de_menthe": ["קרם דה מנט ירוק", "creme de menthe"],
  "creme_de_cacao": ["קרם דה קקאו", "קרם דה קקאו לבן", "creme de cacao"],
  "creme_de_noyaux": ["קרם דה נויו", "creme de noyaux"],
  "licor43": ["ליקר 43", "licor 43"],
  "peach_schnapps": ["שנפס אפרסק", "peach schnapps"],
  "passoa": ["ליקר פסיפלורה", "passoa"],
  "grenadine": ["גרנדין", "grenadine"],

  // Mixers
  "simple_syrup": ["סירופ פשוט", "סירופ פשוט (2:1)", "simple syrup"],
  "agave_syrup": ["סירופ אגבה", "נקטר אגבה", "agave"],
  "honey_syrup": ["סירופ דבש", "סירופ ג'ינג'ר-דבש", "honey syrup"],
  "raspberry_syrup": ["סירופ פטל", "raspberry syrup"],
  "orgeat": ["סירופ אורגט", "orgeat"],
  "soda": ["סודה", "מי סודה", "soda", "סודה אשכולית"],
  "lime_juice": ["מיץ ליים", "מיץ ליים טרי", "lime juice"],
  "lemon_juice": ["מיץ לימון", "מיץ לימון טרי", "lemon juice"],
  "orange_juice": ["מיץ תפוזים", "מיץ תפוזים טרי", "orange juice"],
  "pineapple_juice": ["מיץ אננס", "מיץ אננס טרי", "pineapple juice"],
  "grapefruit_juice": ["מיץ אשכולית", "מיץ אשכולית סחוט טרי", "grapefruit juice"],
  "cranberry_juice": ["מיץ חמוציות", "cranberry juice"],
  "passionfruit_juice": ["מיץ פסיפלורה", "מיץ פסיפלורה טרי", "passionfruit juice"],
  "lemonade": ["לימונדה", "lemonade"],
  "cream": ["שמנת מתוקה", "שמנת", "heavy cream"],
  "coconut_cream": ["קרם קוקוס", "coconut cream"],
  "egg_white": ["חלבון ביצה", "egg white"],
  "espresso": ["אספרסו טרי", "אספרסו כפול", "אספרסו כפול (חם)", "espresso"],
  "ice_cream": ["גלידת וניל", "vanilla ice cream"],
};

// Ingredients that are garnishes or trivially available — skip in matching
const GARNISH_KEYWORDS = [
  'לקישוט', 'garnish', 'קליפת', 'נענע', 'דובדבן', 'פולי קפה',
  'אגוז מוסקט', 'אבקת קקאו', 'מלח גס', 'מלח', 'סוכר לשפת',
  'קוביות קרח', 'קרח כתוש', 'קוביית סוכר', 'קרח'
];

// Common household items that users likely have — auto-checkable
const COMMON_INGREDIENTS = [
  "simple_syrup", "lime_juice", "lemon_juice", "soda", "egg_white",
  "orange_juice", "ice_cream", "cream", "espresso", "lemonade"
];

function isGarnish(ingredientName) {
  const lower = ingredientName.toLowerCase();
  return GARNISH_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

function normalize(str) {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if a bottle category matches a recipe ingredient name.
 * Uses exact alias lookup — no fuzzy substring matching.
 */
function matchIngredient(bottleCategory, recipeIngredientName) {
  const normBottle = normalize(bottleCategory);
  const normRecipe = normalize(recipeIngredientName);

  // Direct exact match
  if (normBottle === normRecipe) return true;

  // Find canonical group for the bottle
  let bottleCanonical = null;
  for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
    if (normalize(canonical) === normBottle ||
        aliases.some(a => normalize(a) === normBottle)) {
      bottleCanonical = canonical;
      break;
    }
  }

  if (!bottleCanonical) return false;

  // Check if recipe ingredient is in the same canonical group
  const aliases = INGREDIENT_ALIASES[bottleCanonical];
  return normalize(bottleCanonical) === normRecipe ||
         aliases.some(a => normalize(a) === normRecipe);
}

/**
 * Find full and partial cocktail matches.
 * NOTE: cocktails-wiki uses `item` field for ingredient names.
 */
function findCocktailMatches(bottles, manualIngredients, cocktailList) {
  const availableCategories = bottles.map(b => normalize(b.category));

  const allAvailable = [...availableCategories];
  for (const manual of manualIngredients) {
    allAvailable.push(normalize(manual));
    for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
      if (aliases.some(a => normalize(a) === normalize(manual) || normalize(a).includes(normalize(manual)))) {
        allAvailable.push(normalize(canonical));
      }
    }
  }

  // Auto-add common ingredients
  for (const common of COMMON_INGREDIENTS) {
    if (!allAvailable.includes(normalize(common))) {
      allAvailable.push(normalize(common));
    }
  }

  const fullMatch = [];
  const partialMatch = [];

  for (const cocktail of cocktailList) {
    // cocktails-wiki uses `item` field
    const requiredIngredients = cocktail.ingredients.filter(i => !isGarnish(i.item));
    const missing = [];

    for (const ing of requiredIngredients) {
      const found = allAvailable.some(avail => matchIngredient(avail, ing.item));
      if (!found) {
        missing.push(ing.item);
      }
    }

    if (missing.length === 0) {
      fullMatch.push({ ...cocktail, missing: [] });
    } else if (missing.length === 1) {
      partialMatch.push({ ...cocktail, missing });
    }
  }

  return { fullMatch, partialMatch };
}

/**
 * Check which identified bottles are used in any recipe.
 */
function tagBottlesUsage(bottles, cocktailList) {
  return bottles.map(bottle => {
    const used = cocktailList.some(c =>
      c.ingredients.some(ing => matchIngredient(bottle.category, ing.item))
    );
    return { ...bottle, usedInRecipes: used };
  });
}

/**
 * Get all known ingredient names for autocomplete.
 */
function getAllIngredientNames() {
  const names = new Set();
  for (const aliases of Object.values(INGREDIENT_ALIASES)) {
    for (const alias of aliases) {
      names.add(alias);
    }
  }
  return [...names].sort();
}
