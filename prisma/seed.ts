import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ─── RESTAURANTS ────────────────────────────────────────────────────────────

  const mcdonalds = await prisma.restaurant.upsert({
    where: { slug: 'mcdonalds' },
    update: {},
    create: {
      id: 'rest_mcdonalds',
      name: "McDonald's",
      slug: 'mcdonalds',
      category: 'Fast Food',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg',
      lat: 25.0805,
      lng: 55.1403,
      address: 'Dubai Marina Mall, Sheikh Zayed Rd, Dubai Marina',
    },
  })

  const kfc = await prisma.restaurant.upsert({
    where: { slug: 'kfc' },
    update: {},
    create: {
      id: 'rest_kfc',
      name: 'KFC',
      slug: 'kfc',
      category: 'Fast Food',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/en/b/bf/KFC_logo.svg',
      lat: 25.0823,
      lng: 55.1421,
      address: 'The Walk, JBR, Dubai',
    },
  })

  const burgerKing = await prisma.restaurant.upsert({
    where: { slug: 'burger-king' },
    update: {},
    create: {
      id: 'rest_burgerking',
      name: 'Burger King',
      slug: 'burger-king',
      category: 'Fast Food',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Burger_King_logo_%281999%29.svg',
      lat: 25.0812,
      lng: 55.1398,
      address: 'Marina Walk, Dubai Marina',
    },
  })

  const hardees = await prisma.restaurant.upsert({
    where: { slug: 'hardees' },
    update: {},
    create: {
      id: 'rest_hardees',
      name: "Hardee's",
      slug: 'hardees',
      category: 'Fast Food',
      logoUrl: null,
      lat: 25.0798,
      lng: 55.1412,
      address: 'Dubai Marina, Dubai',
    },
  })

  const pizzaHut = await prisma.restaurant.upsert({
    where: { slug: 'pizza-hut' },
    update: {},
    create: {
      id: 'rest_pizzahut',
      name: 'Pizza Hut',
      slug: 'pizza-hut',
      category: 'Pizza',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/sco/d/d2/Pizza_Hut_logo.svg',
      lat: 25.0791,
      lng: 55.1445,
      address: 'JBR, The Walk, Dubai',
    },
  })

  console.log('✓ Restaurants created')

  // ─── McDONALD'S MENU ────────────────────────────────────────────────────────

  const mcItems = await Promise.all([
    upsertMenuItem('item_mc_bigmacmeal',    mcdonalds.id, "Big Mac Meal",           "Meals",    0, "Big Mac with large fries and drink"),
    upsertMenuItem('item_mc_mcchickenmeal', mcdonalds.id, "McChicken Meal",         "Meals",    1, "McChicken with large fries and drink"),
    upsertMenuItem('item_mc_quartermeal',   mcdonalds.id, "Quarter Pounder Meal",   "Meals",    2, "Quarter Pounder with large fries and drink"),
    upsertMenuItem('item_mc_filetofish',    mcdonalds.id, "Filet-O-Fish Meal",      "Meals",    3, "Filet-O-Fish with large fries and drink"),
    upsertMenuItem('item_mc_nuggets6',      mcdonalds.id, "6 Piece McNuggets",      "Snacks",   0, "Crispy golden chicken nuggets"),
    upsertMenuItem('item_mc_nuggets9',      mcdonalds.id, "9 Piece McNuggets",      "Snacks",   1, "Crispy golden chicken nuggets"),
    upsertMenuItem('item_mc_mcflurry',      mcdonalds.id, "McFlurry Oreo",          "Desserts", 0, "Creamy vanilla ice cream with Oreo pieces"),
    upsertMenuItem('item_mc_applepie',      mcdonalds.id, "Apple Pie",              "Desserts", 1, "Warm, flaky baked apple pie"),
    upsertMenuItem('item_mc_bigmac',        mcdonalds.id, "Big Mac",               "Burgers",  0, "Two beef patties, special sauce, lettuce, cheese"),
    upsertMenuItem('item_mc_fries_large',   mcdonalds.id, "Large Fries",            "Sides",    0, "Crispy golden fries"),
  ])

  // Prices per platform (AED) — realistic Dubai pricing
  const mcPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number; NOON_FOOD: number }> = {
    'item_mc_bigmacmeal':    { TALABAT: 38, DELIVEROO: 40, CAREEM: 39, KEETA: 35, NOON_FOOD: 37 },
    'item_mc_mcchickenmeal': { TALABAT: 33, DELIVEROO: 35, CAREEM: 34, KEETA: 30, NOON_FOOD: 32 },
    'item_mc_quartermeal':   { TALABAT: 42, DELIVEROO: 44, CAREEM: 43, KEETA: 39, NOON_FOOD: 41 },
    'item_mc_filetofish':    { TALABAT: 36, DELIVEROO: 38, CAREEM: 37, KEETA: 33, NOON_FOOD: 35 },
    'item_mc_nuggets6':      { TALABAT: 22, DELIVEROO: 23, CAREEM: 22, KEETA: 20, NOON_FOOD: 21 },
    'item_mc_nuggets9':      { TALABAT: 30, DELIVEROO: 32, CAREEM: 31, KEETA: 28, NOON_FOOD: 29 },
    'item_mc_mcflurry':      { TALABAT: 18, DELIVEROO: 19, CAREEM: 18, KEETA: 16, NOON_FOOD: 17 },
    'item_mc_applepie':      { TALABAT: 10, DELIVEROO: 11, CAREEM: 10, KEETA: 9,  NOON_FOOD: 10 },
    'item_mc_bigmac':        { TALABAT: 26, DELIVEROO: 27, CAREEM: 26, KEETA: 24, NOON_FOOD: 25 },
    'item_mc_fries_large':   { TALABAT: 12, DELIVEROO: 13, CAREEM: 12, KEETA: 11, NOON_FOOD: 12 },
  }

  await upsertPrices(mcPrices)

  // ─── McDONALD'S PLATFORM LINKS & FEES ──────────────────────────────────────

  await upsertPlatformLinks(mcdonalds.id, {
    TALABAT:   { id: 'mc-talabat',   deep: 'https://www.talabat.com/uae/mcdonalds-dubai-marina-1',                           web: 'https://www.talabat.com/uae/mcdonalds-dubai-marina-1' },
    DELIVEROO: { id: 'mc-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/dubai-marina/mcdonald-s-marina',                 web: 'https://deliveroo.ae/menu/dubai/dubai-marina/mcdonald-s-marina' },
    CAREEM:    { id: 'mc-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/mcdonalds-dubai-marina',            web: 'https://www.careem.com/en-ae/food/restaurant/mcdonalds-dubai-marina' },
    KEETA:     { id: 'mc-keeta',     deep: 'https://www.keeta.com/ae/restaurant/mcdonalds-dubai-marina',                    web: 'https://www.keeta.com/ae/restaurant/mcdonalds-dubai-marina' },
    NOON_FOOD: { id: 'mc-noon',      deep: 'https://food.noon.com/ae/mcdonalds-dubai-marina',                               web: 'https://food.noon.com/ae/mcdonalds-dubai-marina' },
  })

  await upsertDeliveryFees(mcdonalds.id, {
    TALABAT:   { baseFee: 7, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 25 },
    DELIVEROO: { baseFee: 8, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 20 },
    CAREEM:    { baseFee: 6, serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 28 },
    KEETA:     { baseFee: 4, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 35 },
    NOON_FOOD: { baseFee: 5, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 30 },
  })

  console.log("✓ McDonald's done")

  // ─── KFC MENU ───────────────────────────────────────────────────────────────

  await Promise.all([
    upsertMenuItem('item_kfc_zingermeal',  kfc.id, "Zinger Burger Meal",    "Meals",    0, "Zinger Burger with fries and drink"),
    upsertMenuItem('item_kfc_crunchmeal',  kfc.id, "Crunch Burger Meal",    "Meals",    1, "Crispy Crunch Burger with fries and drink"),
    upsertMenuItem('item_kfc_hotshots',    kfc.id, "6 Piece Hot Shots",     "Snacks",   0, "Spicy crispy hot shots"),
    upsertMenuItem('item_kfc_wings6',      kfc.id, "6 Piece Hot Wings",     "Snacks",   1, "Original Recipe chicken wings"),
    upsertMenuItem('item_kfc_bucket9',     kfc.id, "9 Piece Bucket",        "Sharing",  0, "9 pieces of Original Recipe chicken"),
    upsertMenuItem('item_kfc_twister',     kfc.id, "Twister Wrap",          "Wraps",    0, "Crispy chicken in a tortilla wrap"),
    upsertMenuItem('item_kfc_coleslaw',    kfc.id, "Coleslaw",              "Sides",    0, "Creamy coleslaw"),
    upsertMenuItem('item_kfc_cheesemelt',  kfc.id, "Cheese Melt Burger",    "Burgers",  0, "Crispy chicken with melted cheese sauce"),
  ])

  const kfcPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number; NOON_FOOD: number }> = {
    'item_kfc_zingermeal':  { TALABAT: 38, DELIVEROO: 40, CAREEM: 39, KEETA: 36, NOON_FOOD: 37 },
    'item_kfc_crunchmeal':  { TALABAT: 34, DELIVEROO: 36, CAREEM: 35, KEETA: 32, NOON_FOOD: 33 },
    'item_kfc_hotshots':    { TALABAT: 20, DELIVEROO: 22, CAREEM: 21, KEETA: 18, NOON_FOOD: 19 },
    'item_kfc_wings6':      { TALABAT: 25, DELIVEROO: 27, CAREEM: 26, KEETA: 23, NOON_FOOD: 24 },
    'item_kfc_bucket9':     { TALABAT: 62, DELIVEROO: 65, CAREEM: 63, KEETA: 58, NOON_FOOD: 61 },
    'item_kfc_twister':     { TALABAT: 28, DELIVEROO: 30, CAREEM: 29, KEETA: 26, NOON_FOOD: 27 },
    'item_kfc_coleslaw':    { TALABAT: 11, DELIVEROO: 12, CAREEM: 11, KEETA: 10, NOON_FOOD: 11 },
    'item_kfc_cheesemelt':  { TALABAT: 32, DELIVEROO: 34, CAREEM: 33, KEETA: 30, NOON_FOOD: 31 },
  }

  await upsertPrices(kfcPrices)

  await upsertPlatformLinks(kfc.id, {
    TALABAT:   { id: 'kfc-talabat',   deep: 'https://www.talabat.com/uae/kfc-the-walk-jbr',               web: 'https://www.talabat.com/uae/kfc-the-walk-jbr' },
    DELIVEROO: { id: 'kfc-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/jbr/kfc-jbr',                 web: 'https://deliveroo.ae/menu/dubai/jbr/kfc-jbr' },
    CAREEM:    { id: 'kfc-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/kfc-dubai-marina', web: 'https://www.careem.com/en-ae/food/restaurant/kfc-dubai-marina' },
    KEETA:     { id: 'kfc-keeta',     deep: 'https://www.keeta.com/ae/restaurant/kfc-dubai-marina',         web: 'https://www.keeta.com/ae/restaurant/kfc-dubai-marina' },
    NOON_FOOD: { id: 'kfc-noon',      deep: 'https://food.noon.com/ae/kfc-dubai-marina',                    web: 'https://food.noon.com/ae/kfc-dubai-marina' },
  })

  await upsertDeliveryFees(kfc.id, {
    TALABAT:   { baseFee: 7,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 22 },
    DELIVEROO: { baseFee: 9,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 19 },
    CAREEM:    { baseFee: 6,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 26 },
    KEETA:     { baseFee: 4,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 32 },
    NOON_FOOD: { baseFee: 5,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 28 },
  })

  console.log('✓ KFC done')

  // ─── BURGER KING MENU ───────────────────────────────────────────────────────

  await Promise.all([
    upsertMenuItem('item_bk_whoppermeal',  burgerKing.id, "Whopper Meal",          "Meals",    0, "The iconic Whopper with fries and drink"),
    upsertMenuItem('item_bk_dblwhoppermeal', burgerKing.id, "Double Whopper Meal", "Meals",    1, "Double beef Whopper with fries and drink"),
    upsertMenuItem('item_bk_royalemeal',   burgerKing.id, "Chicken Royale Meal",   "Meals",    2, "Crispy chicken with fries and drink"),
    upsertMenuItem('item_bk_whopper',      burgerKing.id, "Whopper",               "Burgers",  0, "Flame-grilled beef, lettuce, tomato, mayo"),
    upsertMenuItem('item_bk_onionrings',   burgerKing.id, "Onion Rings",           "Sides",    0, "Crispy golden onion rings"),
    upsertMenuItem('item_bk_cheesytots',   burgerKing.id, "Cheesy Tots",           "Sides",    1, "Crispy potato bites with cheese"),
    upsertMenuItem('item_bk_milkshake',    burgerKing.id, "Chocolate Milkshake",   "Drinks",   0, "Thick and creamy chocolate shake"),
  ])

  const bkPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number; NOON_FOOD: number }> = {
    'item_bk_whoppermeal':    { TALABAT: 40, DELIVEROO: 42, CAREEM: 41, KEETA: 37, NOON_FOOD: 39 },
    'item_bk_dblwhoppermeal': { TALABAT: 51, DELIVEROO: 53, CAREEM: 52, KEETA: 47, NOON_FOOD: 50 },
    'item_bk_royalemeal':     { TALABAT: 37, DELIVEROO: 39, CAREEM: 38, KEETA: 34, NOON_FOOD: 36 },
    'item_bk_whopper':        { TALABAT: 27, DELIVEROO: 29, CAREEM: 28, KEETA: 25, NOON_FOOD: 26 },
    'item_bk_onionrings':     { TALABAT: 16, DELIVEROO: 17, CAREEM: 16, KEETA: 14, NOON_FOOD: 15 },
    'item_bk_cheesytots':     { TALABAT: 13, DELIVEROO: 14, CAREEM: 13, KEETA: 12, NOON_FOOD: 13 },
    'item_bk_milkshake':      { TALABAT: 18, DELIVEROO: 19, CAREEM: 18, KEETA: 16, NOON_FOOD: 17 },
  }

  await upsertPrices(bkPrices)

  await upsertPlatformLinks(burgerKing.id, {
    TALABAT:   { id: 'bk-talabat',   deep: 'https://www.talabat.com/uae/burger-king-dubai-marina',             web: 'https://www.talabat.com/uae/burger-king-dubai-marina' },
    DELIVEROO: { id: 'bk-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/dubai-marina/burger-king-marina',  web: 'https://deliveroo.ae/menu/dubai/dubai-marina/burger-king-marina' },
    CAREEM:    { id: 'bk-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/burger-king-marina',  web: 'https://www.careem.com/en-ae/food/restaurant/burger-king-marina' },
    KEETA:     { id: 'bk-keeta',     deep: 'https://www.keeta.com/ae/restaurant/burger-king-marina',           web: 'https://www.keeta.com/ae/restaurant/burger-king-marina' },
    NOON_FOOD: { id: 'bk-noon',      deep: 'https://food.noon.com/ae/burger-king-dubai-marina',                web: 'https://food.noon.com/ae/burger-king-dubai-marina' },
  })

  await upsertDeliveryFees(burgerKing.id, {
    TALABAT:   { baseFee: 6,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 24 },
    DELIVEROO: { baseFee: 8,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 18 },
    CAREEM:    { baseFee: 7,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 27 },
    KEETA:     { baseFee: 3,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 33 },
    NOON_FOOD: { baseFee: 5,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 29 },
  })

  console.log('✓ Burger King done')

  // ─── HARDEE'S MENU ──────────────────────────────────────────────────────────

  await Promise.all([
    upsertMenuItem('item_hd_thickburgermeal', hardees.id, "1/3 lb Thickburger Meal",     "Meals",    0, "Hand-crafted beef burger with fries and drink"),
    upsertMenuItem('item_hd_chickenmeal',     hardees.id, "Chicken Fillet Burger Meal",  "Meals",    1, "Crispy chicken fillet with fries and drink"),
    upsertMenuItem('item_hd_mushroom',        hardees.id, "Mushroom & Swiss Burger",     "Burgers",  0, "Beef patty with mushrooms and Swiss cheese"),
    upsertMenuItem('item_hd_naturalscut',     hardees.id, "Natural-Cut Fries",           "Sides",    0, "Skin-on natural cut fries"),
    upsertMenuItem('item_hd_onionrings',      hardees.id, "Onion Rings",                 "Sides",    1, "Beer-battered onion rings"),
    upsertMenuItem('item_hd_milkshake',       hardees.id, "Hand-Scooped Milkshake",      "Drinks",   0, "Real ice cream milkshake"),
  ])

  const hdPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number; NOON_FOOD: number }> = {
    'item_hd_thickburgermeal': { TALABAT: 42, DELIVEROO: 44, CAREEM: 43, KEETA: 39, NOON_FOOD: 41 },
    'item_hd_chickenmeal':     { TALABAT: 36, DELIVEROO: 38, CAREEM: 37, KEETA: 33, NOON_FOOD: 35 },
    'item_hd_mushroom':        { TALABAT: 29, DELIVEROO: 31, CAREEM: 30, KEETA: 27, NOON_FOOD: 28 },
    'item_hd_naturalscut':     { TALABAT: 13, DELIVEROO: 14, CAREEM: 13, KEETA: 12, NOON_FOOD: 13 },
    'item_hd_onionrings':      { TALABAT: 15, DELIVEROO: 16, CAREEM: 15, KEETA: 13, NOON_FOOD: 14 },
    'item_hd_milkshake':       { TALABAT: 22, DELIVEROO: 24, CAREEM: 23, KEETA: 20, NOON_FOOD: 21 },
  }

  await upsertPrices(hdPrices)

  await upsertPlatformLinks(hardees.id, {
    TALABAT:   { id: 'hd-talabat',   deep: 'https://www.talabat.com/uae/hardees-dubai-marina',             web: 'https://www.talabat.com/uae/hardees-dubai-marina' },
    DELIVEROO: { id: 'hd-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/dubai-marina/hardees-marina',  web: 'https://deliveroo.ae/menu/dubai/dubai-marina/hardees-marina' },
    CAREEM:    { id: 'hd-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/hardees-marina',  web: 'https://www.careem.com/en-ae/food/restaurant/hardees-marina' },
    KEETA:     { id: 'hd-keeta',     deep: 'https://www.keeta.com/ae/restaurant/hardees-marina',           web: 'https://www.keeta.com/ae/restaurant/hardees-marina' },
    NOON_FOOD: { id: 'hd-noon',      deep: 'https://food.noon.com/ae/hardees-dubai-marina',                web: 'https://food.noon.com/ae/hardees-dubai-marina' },
  })

  await upsertDeliveryFees(hardees.id, {
    TALABAT:   { baseFee: 7,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 26 },
    DELIVEROO: { baseFee: 9,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 21 },
    CAREEM:    { baseFee: 6,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 29 },
    KEETA:     { baseFee: 4,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 36 },
    NOON_FOOD: { baseFee: 5,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 31 },
  })

  console.log("✓ Hardee's done")

  // ─── PIZZA HUT MENU ─────────────────────────────────────────────────────────

  await Promise.all([
    upsertMenuItem('item_ph_pepperoni_m',  pizzaHut.id, "Pepperoni Pizza (M)",      "Pizzas",   0, "Classic pepperoni on tomato sauce"),
    upsertMenuItem('item_ph_pepperoni_l',  pizzaHut.id, "Pepperoni Pizza (L)",      "Pizzas",   1, "Classic pepperoni on tomato sauce"),
    upsertMenuItem('item_ph_bbqchicken_m', pizzaHut.id, "BBQ Chicken Pizza (M)",    "Pizzas",   2, "Grilled chicken with BBQ sauce"),
    upsertMenuItem('item_ph_bbqchicken_l', pizzaHut.id, "BBQ Chicken Pizza (L)",    "Pizzas",   3, "Grilled chicken with BBQ sauce"),
    upsertMenuItem('item_ph_stuffedcrust', pizzaHut.id, "Stuffed Crust Margherita (L)", "Pizzas", 4, "Cheese-stuffed crust with fresh tomato"),
    upsertMenuItem('item_ph_garlic',       pizzaHut.id, "Garlic Bread",             "Sides",    0, "Crispy garlic bread with herb butter"),
    upsertMenuItem('item_ph_wings6',       pizzaHut.id, "6 Piece Wings",            "Sides",    1, "Crispy chicken wings"),
    upsertMenuItem('item_ph_pasta',        pizzaHut.id, "Pasta Bolognese",          "Pasta",    0, "Rich beef bolognese with pasta"),
  ])

  const phPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number; NOON_FOOD: number }> = {
    'item_ph_pepperoni_m':  { TALABAT: 55,  DELIVEROO: 58,  CAREEM: 56,  KEETA: 52,  NOON_FOOD: 54  },
    'item_ph_pepperoni_l':  { TALABAT: 75,  DELIVEROO: 79,  CAREEM: 77,  KEETA: 70,  NOON_FOOD: 73  },
    'item_ph_bbqchicken_m': { TALABAT: 57,  DELIVEROO: 60,  CAREEM: 58,  KEETA: 53,  NOON_FOOD: 56  },
    'item_ph_bbqchicken_l': { TALABAT: 78,  DELIVEROO: 82,  CAREEM: 80,  KEETA: 73,  NOON_FOOD: 76  },
    'item_ph_stuffedcrust': { TALABAT: 85,  DELIVEROO: 89,  CAREEM: 87,  KEETA: 80,  NOON_FOOD: 83  },
    'item_ph_garlic':       { TALABAT: 18,  DELIVEROO: 19,  CAREEM: 18,  KEETA: 16,  NOON_FOOD: 17  },
    'item_ph_wings6':       { TALABAT: 28,  DELIVEROO: 30,  CAREEM: 29,  KEETA: 26,  NOON_FOOD: 27  },
    'item_ph_pasta':        { TALABAT: 32,  DELIVEROO: 34,  CAREEM: 33,  KEETA: 30,  NOON_FOOD: 31  },
  }

  await upsertPrices(phPrices)

  await upsertPlatformLinks(pizzaHut.id, {
    TALABAT:   { id: 'ph-talabat',   deep: 'https://www.talabat.com/uae/pizza-hut-jbr',                    web: 'https://www.talabat.com/uae/pizza-hut-jbr' },
    DELIVEROO: { id: 'ph-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/jbr/pizza-hut-jbr',            web: 'https://deliveroo.ae/menu/dubai/jbr/pizza-hut-jbr' },
    CAREEM:    { id: 'ph-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/pizza-hut-jbr',   web: 'https://www.careem.com/en-ae/food/restaurant/pizza-hut-jbr' },
    KEETA:     { id: 'ph-keeta',     deep: 'https://www.keeta.com/ae/restaurant/pizza-hut-jbr',            web: 'https://www.keeta.com/ae/restaurant/pizza-hut-jbr' },
    NOON_FOOD: { id: 'ph-noon',      deep: 'https://food.noon.com/ae/pizza-hut-jbr',                       web: 'https://food.noon.com/ae/pizza-hut-jbr' },
  })

  await upsertDeliveryFees(pizzaHut.id, {
    TALABAT:   { baseFee: 8,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 50, smallOrderFee: 8, estimatedMinutes: 35 },
    DELIVEROO: { baseFee: 10, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 55, smallOrderFee: 8, estimatedMinutes: 30 },
    CAREEM:    { baseFee: 7,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 50, smallOrderFee: 7, estimatedMinutes: 38 },
    KEETA:     { baseFee: 5,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 40, smallOrderFee: 5, estimatedMinutes: 42 },
    NOON_FOOD: { baseFee: 6,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 45, smallOrderFee: 6, estimatedMinutes: 35 },
  })

  console.log('✓ Pizza Hut done')

  // ─── SUBWAY (Downtown Dubai) ─────────────────────────────────────────────────

  const subway = await prisma.restaurant.upsert({
    where: { slug: 'subway-downtown' },
    update: {},
    create: {
      id: 'rest_subway_downtown',
      name: 'Subway',
      slug: 'subway-downtown',
      category: 'Sandwiches',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Subway_2016_logo.svg',
      lat: 25.1955,
      lng: 55.2786,
      address: 'Downtown Dubai, Sheikh Mohammed Bin Rashid Blvd',
    },
  })

  await Promise.all([
    upsertMenuItem('item_sub_footlong_italian',  subway.id, 'Footlong Italian BMT',         'Footlongs', 0, 'Pepperoni, salami, ham with your choice of veggies'),
    upsertMenuItem('item_sub_footlong_chicken',  subway.id, 'Footlong Chicken Teriyaki',     'Footlongs', 1, 'Teriyaki-glazed chicken with veggies'),
    upsertMenuItem('item_sub_footlong_tuna',     subway.id, 'Footlong Tuna',                 'Footlongs', 2, 'Tuna blend with your choice of veggies'),
    upsertMenuItem('item_sub_6inch_veggie',      subway.id, '6-Inch Veggie Delite',          '6-Inch',    0, 'Fresh veggies on freshly baked bread'),
    upsertMenuItem('item_sub_6inch_turkey',      subway.id, '6-Inch Turkey Breast',          '6-Inch',    1, 'Sliced turkey with fresh veggies'),
    upsertMenuItem('item_sub_cookies',           subway.id, '3 Cookies',                     'Extras',    0, 'Freshly baked chocolate chip cookies'),
  ])

  await upsertPrices({
    'item_sub_footlong_italian': { TALABAT: 32, DELIVEROO: 34, CAREEM: 33, KEETA: 29, NOON_FOOD: 31 },
    'item_sub_footlong_chicken': { TALABAT: 34, DELIVEROO: 36, CAREEM: 35, KEETA: 31, NOON_FOOD: 33 },
    'item_sub_footlong_tuna':    { TALABAT: 30, DELIVEROO: 32, CAREEM: 31, KEETA: 27, NOON_FOOD: 29 },
    'item_sub_6inch_veggie':     { TALABAT: 18, DELIVEROO: 19, CAREEM: 18, KEETA: 16, NOON_FOOD: 17 },
    'item_sub_6inch_turkey':     { TALABAT: 22, DELIVEROO: 23, CAREEM: 22, KEETA: 20, NOON_FOOD: 21 },
    'item_sub_cookies':          { TALABAT: 12, DELIVEROO: 13, CAREEM: 12, KEETA: 10, NOON_FOOD: 11 },
  })

  await upsertPlatformLinks(subway.id, {
    TALABAT:   { id: 'sub-talabat',   deep: 'https://www.talabat.com/uae/subway-downtown-dubai', web: 'https://www.talabat.com/uae/subway-downtown-dubai' },
    DELIVEROO: { id: 'sub-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/downtown/subway-downtown', web: 'https://deliveroo.ae/menu/dubai/downtown/subway-downtown' },
    CAREEM:    { id: 'sub-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/subway-downtown', web: 'https://www.careem.com/en-ae/food/restaurant/subway-downtown' },
    KEETA:     { id: 'sub-keeta',     deep: 'https://www.keeta.com/ae/restaurant/subway-downtown', web: 'https://www.keeta.com/ae/restaurant/subway-downtown' },
    NOON_FOOD: { id: 'sub-noon',      deep: 'https://food.noon.com/ae/subway-downtown', web: 'https://food.noon.com/ae/subway-downtown' },
  })

  await upsertDeliveryFees(subway.id, {
    TALABAT:   { baseFee: 5, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 22 },
    DELIVEROO: { baseFee: 7, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 5, estimatedMinutes: 18 },
    CAREEM:    { baseFee: 5, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 25 },
    KEETA:     { baseFee: 3, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 30 },
    NOON_FOOD: { baseFee: 4, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 27 },
  })

  console.log('✓ Subway done')

  // ─── SHAKE SHACK (DIFC) ──────────────────────────────────────────────────────

  const shakeShack = await prisma.restaurant.upsert({
    where: { slug: 'shake-shack-difc' },
    update: {},
    create: {
      id: 'rest_shakeshack_difc',
      name: 'Shake Shack',
      slug: 'shake-shack-difc',
      category: 'Burgers',
      logoUrl: null,
      lat: 25.2120,
      lng: 55.2822,
      address: 'Gate Village, DIFC, Dubai',
    },
  })

  await Promise.all([
    upsertMenuItem('item_ss_shackburger',    shakeShack.id, 'ShackBurger',             'Burgers',  0, 'Cheeseburger with lettuce, tomato, ShackSauce'),
    upsertMenuItem('item_ss_smokeshack',     shakeShack.id, 'SmokeShack',              'Burgers',  1, 'ShackBurger + crispy bacon + cherry peppers'),
    upsertMenuItem('item_ss_chickenshack',   shakeShack.id, 'Chicken Shack',           'Chicken',  0, 'Crispy chicken + pickles + buttermilk herb mayo'),
    upsertMenuItem('item_ss_fries',          shakeShack.id, 'Crinkle Cut Fries',       'Sides',    0, 'Crispy crinkle-cut fries'),
    upsertMenuItem('item_ss_shake_vanilla',  shakeShack.id, 'Vanilla Shake',           'Shakes',   0, 'Hand-spun vanilla frozen custard shake'),
    upsertMenuItem('item_ss_shake_choc',     shakeShack.id, 'Chocolate Shake',         'Shakes',   1, 'Hand-spun chocolate frozen custard shake'),
  ])

  await upsertPrices({
    'item_ss_shackburger':   { TALABAT: 49, DELIVEROO: 51, CAREEM: 50, KEETA: 45, NOON_FOOD: 48 },
    'item_ss_smokeshack':    { TALABAT: 57, DELIVEROO: 60, CAREEM: 58, KEETA: 53, NOON_FOOD: 56 },
    'item_ss_chickenshack':  { TALABAT: 48, DELIVEROO: 50, CAREEM: 49, KEETA: 44, NOON_FOOD: 47 },
    'item_ss_fries':         { TALABAT: 22, DELIVEROO: 23, CAREEM: 22, KEETA: 20, NOON_FOOD: 21 },
    'item_ss_shake_vanilla': { TALABAT: 35, DELIVEROO: 37, CAREEM: 36, KEETA: 32, NOON_FOOD: 34 },
    'item_ss_shake_choc':    { TALABAT: 35, DELIVEROO: 37, CAREEM: 36, KEETA: 32, NOON_FOOD: 34 },
  })

  await upsertPlatformLinks(shakeShack.id, {
    TALABAT:   { id: 'ss-talabat',   deep: 'https://www.talabat.com/uae/shake-shack-difc', web: 'https://www.talabat.com/uae/shake-shack-difc' },
    DELIVEROO: { id: 'ss-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/difc/shake-shack-difc', web: 'https://deliveroo.ae/menu/dubai/difc/shake-shack-difc' },
    CAREEM:    { id: 'ss-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/shake-shack-difc', web: 'https://www.careem.com/en-ae/food/restaurant/shake-shack-difc' },
    KEETA:     { id: 'ss-keeta',     deep: 'https://www.keeta.com/ae/restaurant/shake-shack-difc', web: 'https://www.keeta.com/ae/restaurant/shake-shack-difc' },
    NOON_FOOD: { id: 'ss-noon',      deep: 'https://food.noon.com/ae/shake-shack-difc', web: 'https://food.noon.com/ae/shake-shack-difc' },
  })

  await upsertDeliveryFees(shakeShack.id, {
    TALABAT:   { baseFee: 8, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 40, smallOrderFee: 6, estimatedMinutes: 28 },
    DELIVEROO: { baseFee: 9, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 45, smallOrderFee: 6, estimatedMinutes: 22 },
    CAREEM:    { baseFee: 7, serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 40, smallOrderFee: 5, estimatedMinutes: 30 },
    KEETA:     { baseFee: 5, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 4, estimatedMinutes: 38 },
    NOON_FOOD: { baseFee: 6, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 40, smallOrderFee: 5, estimatedMinutes: 32 },
  })

  console.log('✓ Shake Shack done')

  // ─── POPEYES (JLT) ───────────────────────────────────────────────────────────

  const popeyes = await prisma.restaurant.upsert({
    where: { slug: 'popeyes-jlt' },
    update: {},
    create: {
      id: 'rest_popeyes_jlt',
      name: "Popeyes",
      slug: 'popeyes-jlt',
      category: 'Chicken',
      logoUrl: null,
      lat: 25.0730,
      lng: 55.1510,
      address: 'Cluster J, JLT, Dubai',
    },
  })

  await Promise.all([
    upsertMenuItem('item_pop_chickencombo',   popeyes.id, 'Classic Chicken Combo',      'Combos',   0, '2-piece classic chicken + side + drink'),
    upsertMenuItem('item_pop_spicycombo',     popeyes.id, 'Spicy Chicken Combo',         'Combos',   1, '2-piece spicy chicken + side + drink'),
    upsertMenuItem('item_pop_chickensandwich',popeyes.id, 'Chicken Sandwich',            'Burgers',  0, 'Crispy chicken fillet on a brioche bun'),
    upsertMenuItem('item_pop_tenders3',       popeyes.id, '3-Piece Tenders',             'Tenders',  0, 'Hand-battered chicken tenders'),
    upsertMenuItem('item_pop_redbeansrice',   popeyes.id, 'Red Beans & Rice',            'Sides',    0, 'Authentic Louisiana red beans and rice'),
    upsertMenuItem('item_pop_macaroni',       popeyes.id, 'Mac & Cheese',                'Sides',    1, 'Creamy macaroni and cheese'),
  ])

  await upsertPrices({
    'item_pop_chickencombo':    { TALABAT: 36, DELIVEROO: 38, CAREEM: 37, KEETA: 33, NOON_FOOD: 35 },
    'item_pop_spicycombo':      { TALABAT: 38, DELIVEROO: 40, CAREEM: 39, KEETA: 35, NOON_FOOD: 37 },
    'item_pop_chickensandwich': { TALABAT: 32, DELIVEROO: 34, CAREEM: 33, KEETA: 29, NOON_FOOD: 31 },
    'item_pop_tenders3':        { TALABAT: 30, DELIVEROO: 32, CAREEM: 31, KEETA: 27, NOON_FOOD: 29 },
    'item_pop_redbeansrice':    { TALABAT: 14, DELIVEROO: 15, CAREEM: 14, KEETA: 12, NOON_FOOD: 13 },
    'item_pop_macaroni':        { TALABAT: 13, DELIVEROO: 14, CAREEM: 13, KEETA: 11, NOON_FOOD: 12 },
  })

  await upsertPlatformLinks(popeyes.id, {
    TALABAT:   { id: 'pop-talabat',   deep: 'https://www.talabat.com/uae/popeyes-jlt', web: 'https://www.talabat.com/uae/popeyes-jlt' },
    DELIVEROO: { id: 'pop-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/jlt/popeyes-jlt', web: 'https://deliveroo.ae/menu/dubai/jlt/popeyes-jlt' },
    CAREEM:    { id: 'pop-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/popeyes-jlt', web: 'https://www.careem.com/en-ae/food/restaurant/popeyes-jlt' },
    KEETA:     { id: 'pop-keeta',     deep: 'https://www.keeta.com/ae/restaurant/popeyes-jlt', web: 'https://www.keeta.com/ae/restaurant/popeyes-jlt' },
    NOON_FOOD: { id: 'pop-noon',      deep: 'https://food.noon.com/ae/popeyes-jlt', web: 'https://food.noon.com/ae/popeyes-jlt' },
  })

  await upsertDeliveryFees(popeyes.id, {
    TALABAT:   { baseFee: 6, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 24 },
    DELIVEROO: { baseFee: 8, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 5, estimatedMinutes: 20 },
    CAREEM:    { baseFee: 6, serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 27 },
    KEETA:     { baseFee: 4, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 33 },
    NOON_FOOD: { baseFee: 5, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 29 },
  })

  console.log('✓ Popeyes done')

  // ─── TIM HORTONS (Business Bay) ──────────────────────────────────────────────

  const timHortons = await prisma.restaurant.upsert({
    where: { slug: 'tim-hortons-business-bay' },
    update: {},
    create: {
      id: 'rest_timhortons_bb',
      name: "Tim Hortons",
      slug: 'tim-hortons-business-bay',
      category: 'Cafe',
      logoUrl: null,
      lat: 25.1888,
      lng: 55.2606,
      address: 'Business Bay, Dubai',
    },
  })

  await Promise.all([
    upsertMenuItem('item_th_double_double',  timHortons.id, 'Double Double Coffee',      'Coffee',   0, 'Coffee with 2 creams and 2 sugars'),
    upsertMenuItem('item_th_ice_capp',       timHortons.id, 'Iced Capp',                 'Coffee',   1, 'Blended iced cappuccino'),
    upsertMenuItem('item_th_bagel',          timHortons.id, 'BLTA Bagel',                'Food',     0, 'Bacon, lettuce, tomato & avocado bagel'),
    upsertMenuItem('item_th_wrap_grilled',   timHortons.id, 'Grilled Chicken Wrap',      'Food',     1, 'Grilled chicken with veggies in a wrap'),
    upsertMenuItem('item_th_timbits12',      timHortons.id, '12 Timbits',                'Extras',   0, '12 bite-sized donut holes'),
    upsertMenuItem('item_th_muffin',         timHortons.id, 'Blueberry Muffin',          'Extras',   1, 'Classic blueberry muffin'),
  ])

  await upsertPrices({
    'item_th_double_double': { TALABAT: 18, DELIVEROO: 19, CAREEM: 18, KEETA: 16, NOON_FOOD: 17 },
    'item_th_ice_capp':      { TALABAT: 22, DELIVEROO: 23, CAREEM: 22, KEETA: 20, NOON_FOOD: 21 },
    'item_th_bagel':         { TALABAT: 29, DELIVEROO: 31, CAREEM: 30, KEETA: 26, NOON_FOOD: 28 },
    'item_th_wrap_grilled':  { TALABAT: 31, DELIVEROO: 33, CAREEM: 32, KEETA: 28, NOON_FOOD: 30 },
    'item_th_timbits12':     { TALABAT: 19, DELIVEROO: 20, CAREEM: 19, KEETA: 17, NOON_FOOD: 18 },
    'item_th_muffin':        { TALABAT: 12, DELIVEROO: 13, CAREEM: 12, KEETA: 11, NOON_FOOD: 12 },
  })

  await upsertPlatformLinks(timHortons.id, {
    TALABAT:   { id: 'th-talabat',   deep: 'https://www.talabat.com/uae/tim-hortons-business-bay', web: 'https://www.talabat.com/uae/tim-hortons-business-bay' },
    DELIVEROO: { id: 'th-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/business-bay/tim-hortons-business-bay', web: 'https://deliveroo.ae/menu/dubai/business-bay/tim-hortons-business-bay' },
    CAREEM:    { id: 'th-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/tim-hortons-business-bay', web: 'https://www.careem.com/en-ae/food/restaurant/tim-hortons-business-bay' },
    KEETA:     { id: 'th-keeta',     deep: 'https://www.keeta.com/ae/restaurant/tim-hortons-business-bay', web: 'https://www.keeta.com/ae/restaurant/tim-hortons-business-bay' },
    NOON_FOOD: { id: 'th-noon',      deep: 'https://food.noon.com/ae/tim-hortons-business-bay', web: 'https://food.noon.com/ae/tim-hortons-business-bay' },
  })

  await upsertDeliveryFees(timHortons.id, {
    TALABAT:   { baseFee: 6, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 20 },
    DELIVEROO: { baseFee: 7, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 5, estimatedMinutes: 16 },
    CAREEM:    { baseFee: 5, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 23 },
    KEETA:     { baseFee: 3, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 28 },
    NOON_FOOD: { baseFee: 4, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 3, estimatedMinutes: 25 },
  })

  console.log('✓ Tim Hortons done')

  // ─── FIVE GUYS (Dubai Mall area) ─────────────────────────────────────────────

  const fiveGuys = await prisma.restaurant.upsert({
    where: { slug: 'five-guys-dubai-mall' },
    update: {},
    create: {
      id: 'rest_fiveguys_dm',
      name: 'Five Guys',
      slug: 'five-guys-dubai-mall',
      category: 'Burgers',
      logoUrl: null,
      lat: 25.1977,
      lng: 55.2797,
      address: 'The Dubai Mall, Downtown Dubai',
    },
  })

  await Promise.all([
    upsertMenuItem('item_fg_hamburger',        fiveGuys.id, 'Hamburger',                  'Burgers',  0, 'Two beef patties, lettuce, tomato, all the way'),
    upsertMenuItem('item_fg_cheeseburger',     fiveGuys.id, 'Cheeseburger',               'Burgers',  1, 'Two beef patties with cheese, all the way'),
    upsertMenuItem('item_fg_baconburger',      fiveGuys.id, 'Bacon Burger',               'Burgers',  2, 'Two beef patties with crispy bacon'),
    upsertMenuItem('item_fg_hotdog',           fiveGuys.id, 'Hot Dog',                    'Hot Dogs', 0, 'All-beef hot dog in a toasted bun'),
    upsertMenuItem('item_fg_fries_regular',    fiveGuys.id, 'Regular Fries',              'Sides',    0, 'Boardwalk style fries cooked in peanut oil'),
    upsertMenuItem('item_fg_milkshake',        fiveGuys.id, 'Milkshake',                  'Shakes',   0, 'Hand-spun milkshake in your choice of flavour'),
  ])

  await upsertPrices({
    'item_fg_hamburger':     { TALABAT: 55, DELIVEROO: 58, CAREEM: 56, KEETA: 51, NOON_FOOD: 54 },
    'item_fg_cheeseburger':  { TALABAT: 60, DELIVEROO: 63, CAREEM: 61, KEETA: 56, NOON_FOOD: 59 },
    'item_fg_baconburger':   { TALABAT: 65, DELIVEROO: 68, CAREEM: 66, KEETA: 61, NOON_FOOD: 64 },
    'item_fg_hotdog':        { TALABAT: 42, DELIVEROO: 44, CAREEM: 43, KEETA: 39, NOON_FOOD: 41 },
    'item_fg_fries_regular': { TALABAT: 28, DELIVEROO: 30, CAREEM: 29, KEETA: 26, NOON_FOOD: 27 },
    'item_fg_milkshake':     { TALABAT: 45, DELIVEROO: 47, CAREEM: 46, KEETA: 42, NOON_FOOD: 44 },
  })

  await upsertPlatformLinks(fiveGuys.id, {
    TALABAT:   { id: 'fg-talabat',   deep: 'https://www.talabat.com/uae/five-guys-dubai-mall', web: 'https://www.talabat.com/uae/five-guys-dubai-mall' },
    DELIVEROO: { id: 'fg-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/downtown/five-guys-dubai-mall', web: 'https://deliveroo.ae/menu/dubai/downtown/five-guys-dubai-mall' },
    CAREEM:    { id: 'fg-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/five-guys-dubai-mall', web: 'https://www.careem.com/en-ae/food/restaurant/five-guys-dubai-mall' },
    KEETA:     { id: 'fg-keeta',     deep: 'https://www.keeta.com/ae/restaurant/five-guys-dubai-mall', web: 'https://www.keeta.com/ae/restaurant/five-guys-dubai-mall' },
    NOON_FOOD: { id: 'fg-noon',      deep: 'https://food.noon.com/ae/five-guys-dubai-mall', web: 'https://food.noon.com/ae/five-guys-dubai-mall' },
  })

  await upsertDeliveryFees(fiveGuys.id, {
    TALABAT:   { baseFee: 9,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 50, smallOrderFee: 7, estimatedMinutes: 30 },
    DELIVEROO: { baseFee: 10, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 55, smallOrderFee: 7, estimatedMinutes: 25 },
    CAREEM:    { baseFee: 8,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 50, smallOrderFee: 6, estimatedMinutes: 33 },
    KEETA:     { baseFee: 6,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 45, smallOrderFee: 5, estimatedMinutes: 40 },
    NOON_FOOD: { baseFee: 7,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 50, smallOrderFee: 6, estimatedMinutes: 35 },
  })

  console.log('✓ Five Guys done')

  // ─── NANDOS (Jumeirah) ───────────────────────────────────────────────────────

  const nandos = await prisma.restaurant.upsert({
    where: { slug: 'nandos-jumeirah' },
    update: {},
    create: {
      id: 'rest_nandos_jum',
      name: "Nando's",
      slug: 'nandos-jumeirah',
      category: 'Chicken',
      logoUrl: null,
      lat: 25.2080,
      lng: 55.2530,
      address: 'Jumeirah 1, Dubai',
    },
  })

  await Promise.all([
    upsertMenuItem('item_nan_quartermeal',   nandos.id, '1/4 Chicken Meal',             'Meals',    0, 'PERi-PERi quarter chicken with side and roll'),
    upsertMenuItem('item_nan_halfmeal',      nandos.id, '1/2 Chicken Meal',             'Meals',    1, 'PERi-PERi half chicken with side and roll'),
    upsertMenuItem('item_nan_fullmeal',      nandos.id, 'Full Chicken Meal',             'Meals',    2, 'Whole PERi-PERi chicken with two sides'),
    upsertMenuItem('item_nan_strip5',        nandos.id, '5 Chicken Strips',             'Starters', 0, 'Flame-grilled PERi-PERi chicken strips'),
    upsertMenuItem('item_nan_bottomless',    nandos.id, 'Bottomless Froyo',             'Extras',   0, 'Bottomless frozen yoghurt'),
    upsertMenuItem('item_nan_corn',          nandos.id, 'PERi-PERi Corn on the Cob',   'Sides',    0, 'Chargrilled corn with PERi-PERi butter'),
  ])

  await upsertPrices({
    'item_nan_quartermeal': { TALABAT: 42, DELIVEROO: 44, CAREEM: 43, KEETA: 39, NOON_FOOD: 41 },
    'item_nan_halfmeal':    { TALABAT: 59, DELIVEROO: 62, CAREEM: 60, KEETA: 55, NOON_FOOD: 58 },
    'item_nan_fullmeal':    { TALABAT: 82, DELIVEROO: 86, CAREEM: 84, KEETA: 77, NOON_FOOD: 80 },
    'item_nan_strip5':      { TALABAT: 38, DELIVEROO: 40, CAREEM: 39, KEETA: 35, NOON_FOOD: 37 },
    'item_nan_bottomless':  { TALABAT: 19, DELIVEROO: 20, CAREEM: 19, KEETA: 17, NOON_FOOD: 18 },
    'item_nan_corn':        { TALABAT: 14, DELIVEROO: 15, CAREEM: 14, KEETA: 12, NOON_FOOD: 13 },
  })

  await upsertPlatformLinks(nandos.id, {
    TALABAT:   { id: 'nan-talabat',   deep: 'https://www.talabat.com/uae/nandos-jumeirah', web: 'https://www.talabat.com/uae/nandos-jumeirah' },
    DELIVEROO: { id: 'nan-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/jumeirah/nandos-jumeirah', web: 'https://deliveroo.ae/menu/dubai/jumeirah/nandos-jumeirah' },
    CAREEM:    { id: 'nan-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/nandos-jumeirah', web: 'https://www.careem.com/en-ae/food/restaurant/nandos-jumeirah' },
    KEETA:     { id: 'nan-keeta',     deep: 'https://www.keeta.com/ae/restaurant/nandos-jumeirah', web: 'https://www.keeta.com/ae/restaurant/nandos-jumeirah' },
    NOON_FOOD: { id: 'nan-noon',      deep: 'https://food.noon.com/ae/nandos-jumeirah', web: 'https://food.noon.com/ae/nandos-jumeirah' },
  })

  await upsertDeliveryFees(nandos.id, {
    TALABAT:   { baseFee: 7, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 5, estimatedMinutes: 26 },
    DELIVEROO: { baseFee: 9, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 40, smallOrderFee: 6, estimatedMinutes: 22 },
    CAREEM:    { baseFee: 7, serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 5, estimatedMinutes: 29 },
    KEETA:     { baseFee: 5, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 4, estimatedMinutes: 36 },
    NOON_FOOD: { baseFee: 6, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 5, estimatedMinutes: 30 },
  })

  console.log("✓ Nando's done")

  // ─── PROMOTIONS ─────────────────────────────────────────────────────────────

  // Keeta often runs promotions to grow market share
  await prisma.promotion.upsert({
    where: { id: 'promo_keeta_launch' },
    update: {},
    create: {
      id: 'promo_keeta_launch',
      platform: 'KEETA',
      restaurantId: null,
      type: 'PERCENTAGE_OFF',
      value: 15,
      minOrder: 30,
      maxDiscount: 20,
      description: '15% off your order with Keeta',
      isActive: true,
      updatedAt: new Date(),
    },
  })

  // Deliveroo running free delivery on McDonald's
  await prisma.promotion.upsert({
    where: { id: 'promo_deliveroo_mc_freedel' },
    update: {},
    create: {
      id: 'promo_deliveroo_mc_freedel',
      platform: 'DELIVEROO',
      restaurantId: mcdonalds.id,
      type: 'FREE_DELIVERY',
      value: 8,
      minOrder: 40,
      description: 'Free delivery on McDonald\'s over 40 AED',
      isActive: true,
      updatedAt: new Date(),
    },
  })

  console.log('✓ Promotions seeded')
  console.log('\n✅ Seed complete!')
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function upsertMenuItem(
  id: string,
  restaurantId: string,
  name: string,
  category: string,
  sortOrder: number,
  description?: string
) {
  return prisma.menuItem.upsert({
    where: { id },
    update: { name, category, sortOrder, description },
    create: { id, restaurantId, name, category, sortOrder, description },
  })
}

async function upsertPrices(
  priceMap: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number; NOON_FOOD: number }>
) {
  const platforms = ['TALABAT', 'DELIVEROO', 'CAREEM', 'KEETA', 'NOON_FOOD'] as const
  for (const [menuItemId, prices] of Object.entries(priceMap)) {
    for (const platform of platforms) {
      await prisma.platformPrice.upsert({
        where: { menuItemId_platform: { menuItemId, platform } },
        update: { price: prices[platform], updatedAt: new Date() },
        create: { menuItemId, platform, price: prices[platform], updatedAt: new Date() },
      })
    }
  }
}

async function upsertPlatformLinks(
  restaurantId: string,
  links: Record<string, { id: string; deep: string; web: string }>
) {
  for (const [platform, link] of Object.entries(links)) {
    await prisma.platformRestaurantLink.upsert({
      where: { restaurantId_platform: { restaurantId, platform: platform as 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA' | 'NOON_FOOD' } },
      update: { deepLinkUrl: link.deep, webUrl: link.web, platformRestaurantId: link.id, updatedAt: new Date() },
      create: {
        restaurantId,
        platform: platform as 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA' | 'NOON_FOOD',
        platformRestaurantId: link.id,
        deepLinkUrl: link.deep,
        webUrl: link.web,
        updatedAt: new Date(),
      },
    })
  }
}

async function upsertDeliveryFees(
  restaurantId: string,
  fees: Record<string, {
    baseFee: number
    serviceFeeFlat: number
    serviceFeePercent: number
    smallOrderThreshold?: number
    smallOrderFee?: number
    estimatedMinutes: number
  }>
) {
  for (const [platform, fee] of Object.entries(fees)) {
    await prisma.deliveryFee.upsert({
      where: { platform_restaurantId: { platform: platform as 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA' | 'NOON_FOOD', restaurantId } },
      update: { ...fee, updatedAt: new Date() },
      create: { platform: platform as 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA' | 'NOON_FOOD', restaurantId, ...fee, updatedAt: new Date() },
    })
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
