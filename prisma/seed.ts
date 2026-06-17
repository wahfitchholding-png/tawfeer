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
  const mcPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number }> = {
    'item_mc_bigmacmeal':    { TALABAT: 38, DELIVEROO: 40, CAREEM: 39, KEETA: 35 },
    'item_mc_mcchickenmeal': { TALABAT: 33, DELIVEROO: 35, CAREEM: 34, KEETA: 30 },
    'item_mc_quartermeal':   { TALABAT: 42, DELIVEROO: 44, CAREEM: 43, KEETA: 39 },
    'item_mc_filetofish':    { TALABAT: 36, DELIVEROO: 38, CAREEM: 37, KEETA: 33 },
    'item_mc_nuggets6':      { TALABAT: 22, DELIVEROO: 23, CAREEM: 22, KEETA: 20 },
    'item_mc_nuggets9':      { TALABAT: 30, DELIVEROO: 32, CAREEM: 31, KEETA: 28 },
    'item_mc_mcflurry':      { TALABAT: 18, DELIVEROO: 19, CAREEM: 18, KEETA: 16 },
    'item_mc_applepie':      { TALABAT: 10, DELIVEROO: 11, CAREEM: 10, KEETA: 9  },
    'item_mc_bigmac':        { TALABAT: 26, DELIVEROO: 27, CAREEM: 26, KEETA: 24 },
    'item_mc_fries_large':   { TALABAT: 12, DELIVEROO: 13, CAREEM: 12, KEETA: 11 },
  }

  await upsertPrices(mcPrices)

  // ─── McDONALD'S PLATFORM LINKS & FEES ──────────────────────────────────────

  await upsertPlatformLinks(mcdonalds.id, {
    TALABAT:   { id: 'mc-talabat',   deep: 'https://www.talabat.com/uae/mcdonalds-dubai-marina-1',                           web: 'https://www.talabat.com/uae/mcdonalds-dubai-marina-1' },
    DELIVEROO: { id: 'mc-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/dubai-marina/mcdonald-s-marina',                 web: 'https://deliveroo.ae/menu/dubai/dubai-marina/mcdonald-s-marina' },
    CAREEM:    { id: 'mc-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/mcdonalds-dubai-marina',            web: 'https://www.careem.com/en-ae/food/restaurant/mcdonalds-dubai-marina' },
    KEETA:     { id: 'mc-keeta',     deep: 'https://www.keeta.com/ae/restaurant/mcdonalds-dubai-marina',                    web: 'https://www.keeta.com/ae/restaurant/mcdonalds-dubai-marina' },
  })

  await upsertDeliveryFees(mcdonalds.id, {
    TALABAT:   { baseFee: 7, serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 25 },
    DELIVEROO: { baseFee: 8, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 20 },
    CAREEM:    { baseFee: 6, serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 28 },
    KEETA:     { baseFee: 4, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 35 },
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

  const kfcPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number }> = {
    'item_kfc_zingermeal':  { TALABAT: 38, DELIVEROO: 40, CAREEM: 39, KEETA: 36 },
    'item_kfc_crunchmeal':  { TALABAT: 34, DELIVEROO: 36, CAREEM: 35, KEETA: 32 },
    'item_kfc_hotshots':    { TALABAT: 20, DELIVEROO: 22, CAREEM: 21, KEETA: 18 },
    'item_kfc_wings6':      { TALABAT: 25, DELIVEROO: 27, CAREEM: 26, KEETA: 23 },
    'item_kfc_bucket9':     { TALABAT: 62, DELIVEROO: 65, CAREEM: 63, KEETA: 58 },
    'item_kfc_twister':     { TALABAT: 28, DELIVEROO: 30, CAREEM: 29, KEETA: 26 },
    'item_kfc_coleslaw':    { TALABAT: 11, DELIVEROO: 12, CAREEM: 11, KEETA: 10 },
    'item_kfc_cheesemelt':  { TALABAT: 32, DELIVEROO: 34, CAREEM: 33, KEETA: 30 },
  }

  await upsertPrices(kfcPrices)

  await upsertPlatformLinks(kfc.id, {
    TALABAT:   { id: 'kfc-talabat',   deep: 'https://www.talabat.com/uae/kfc-the-walk-jbr',               web: 'https://www.talabat.com/uae/kfc-the-walk-jbr' },
    DELIVEROO: { id: 'kfc-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/jbr/kfc-jbr',                 web: 'https://deliveroo.ae/menu/dubai/jbr/kfc-jbr' },
    CAREEM:    { id: 'kfc-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/kfc-dubai-marina', web: 'https://www.careem.com/en-ae/food/restaurant/kfc-dubai-marina' },
    KEETA:     { id: 'kfc-keeta',     deep: 'https://www.keeta.com/ae/restaurant/kfc-dubai-marina',         web: 'https://www.keeta.com/ae/restaurant/kfc-dubai-marina' },
  })

  await upsertDeliveryFees(kfc.id, {
    TALABAT:   { baseFee: 7,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 22 },
    DELIVEROO: { baseFee: 9,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 19 },
    CAREEM:    { baseFee: 6,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 26 },
    KEETA:     { baseFee: 4,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 32 },
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

  const bkPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number }> = {
    'item_bk_whoppermeal':    { TALABAT: 40, DELIVEROO: 42, CAREEM: 41, KEETA: 37 },
    'item_bk_dblwhoppermeal': { TALABAT: 51, DELIVEROO: 53, CAREEM: 52, KEETA: 47 },
    'item_bk_royalemeal':     { TALABAT: 37, DELIVEROO: 39, CAREEM: 38, KEETA: 34 },
    'item_bk_whopper':        { TALABAT: 27, DELIVEROO: 29, CAREEM: 28, KEETA: 25 },
    'item_bk_onionrings':     { TALABAT: 16, DELIVEROO: 17, CAREEM: 16, KEETA: 14 },
    'item_bk_cheesytots':     { TALABAT: 13, DELIVEROO: 14, CAREEM: 13, KEETA: 12 },
    'item_bk_milkshake':      { TALABAT: 18, DELIVEROO: 19, CAREEM: 18, KEETA: 16 },
  }

  await upsertPrices(bkPrices)

  await upsertPlatformLinks(burgerKing.id, {
    TALABAT:   { id: 'bk-talabat',   deep: 'https://www.talabat.com/uae/burger-king-dubai-marina',             web: 'https://www.talabat.com/uae/burger-king-dubai-marina' },
    DELIVEROO: { id: 'bk-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/dubai-marina/burger-king-marina',  web: 'https://deliveroo.ae/menu/dubai/dubai-marina/burger-king-marina' },
    CAREEM:    { id: 'bk-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/burger-king-marina',  web: 'https://www.careem.com/en-ae/food/restaurant/burger-king-marina' },
    KEETA:     { id: 'bk-keeta',     deep: 'https://www.keeta.com/ae/restaurant/burger-king-marina',           web: 'https://www.keeta.com/ae/restaurant/burger-king-marina' },
  })

  await upsertDeliveryFees(burgerKing.id, {
    TALABAT:   { baseFee: 6,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 24 },
    DELIVEROO: { baseFee: 8,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 18 },
    CAREEM:    { baseFee: 7,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 27 },
    KEETA:     { baseFee: 3,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 33 },
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

  const hdPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number }> = {
    'item_hd_thickburgermeal': { TALABAT: 42, DELIVEROO: 44, CAREEM: 43, KEETA: 39 },
    'item_hd_chickenmeal':     { TALABAT: 36, DELIVEROO: 38, CAREEM: 37, KEETA: 33 },
    'item_hd_mushroom':        { TALABAT: 29, DELIVEROO: 31, CAREEM: 30, KEETA: 27 },
    'item_hd_naturalscut':     { TALABAT: 13, DELIVEROO: 14, CAREEM: 13, KEETA: 12 },
    'item_hd_onionrings':      { TALABAT: 15, DELIVEROO: 16, CAREEM: 15, KEETA: 13 },
    'item_hd_milkshake':       { TALABAT: 22, DELIVEROO: 24, CAREEM: 23, KEETA: 20 },
  }

  await upsertPrices(hdPrices)

  await upsertPlatformLinks(hardees.id, {
    TALABAT:   { id: 'hd-talabat',   deep: 'https://www.talabat.com/uae/hardees-dubai-marina',             web: 'https://www.talabat.com/uae/hardees-dubai-marina' },
    DELIVEROO: { id: 'hd-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/dubai-marina/hardees-marina',  web: 'https://deliveroo.ae/menu/dubai/dubai-marina/hardees-marina' },
    CAREEM:    { id: 'hd-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/hardees-marina',  web: 'https://www.careem.com/en-ae/food/restaurant/hardees-marina' },
    KEETA:     { id: 'hd-keeta',     deep: 'https://www.keeta.com/ae/restaurant/hardees-marina',           web: 'https://www.keeta.com/ae/restaurant/hardees-marina' },
  })

  await upsertDeliveryFees(hardees.id, {
    TALABAT:   { baseFee: 7,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 26 },
    DELIVEROO: { baseFee: 9,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 35, smallOrderFee: 6, estimatedMinutes: 21 },
    CAREEM:    { baseFee: 6,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 30, smallOrderFee: 5, estimatedMinutes: 29 },
    KEETA:     { baseFee: 4,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 25, smallOrderFee: 3, estimatedMinutes: 36 },
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

  const phPrices: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number }> = {
    'item_ph_pepperoni_m':  { TALABAT: 55,  DELIVEROO: 58,  CAREEM: 56,  KEETA: 52  },
    'item_ph_pepperoni_l':  { TALABAT: 75,  DELIVEROO: 79,  CAREEM: 77,  KEETA: 70  },
    'item_ph_bbqchicken_m': { TALABAT: 57,  DELIVEROO: 60,  CAREEM: 58,  KEETA: 53  },
    'item_ph_bbqchicken_l': { TALABAT: 78,  DELIVEROO: 82,  CAREEM: 80,  KEETA: 73  },
    'item_ph_stuffedcrust': { TALABAT: 85,  DELIVEROO: 89,  CAREEM: 87,  KEETA: 80  },
    'item_ph_garlic':       { TALABAT: 18,  DELIVEROO: 19,  CAREEM: 18,  KEETA: 16  },
    'item_ph_wings6':       { TALABAT: 28,  DELIVEROO: 30,  CAREEM: 29,  KEETA: 26  },
    'item_ph_pasta':        { TALABAT: 32,  DELIVEROO: 34,  CAREEM: 33,  KEETA: 30  },
  }

  await upsertPrices(phPrices)

  await upsertPlatformLinks(pizzaHut.id, {
    TALABAT:   { id: 'ph-talabat',   deep: 'https://www.talabat.com/uae/pizza-hut-jbr',                    web: 'https://www.talabat.com/uae/pizza-hut-jbr' },
    DELIVEROO: { id: 'ph-deliveroo', deep: 'https://deliveroo.ae/menu/dubai/jbr/pizza-hut-jbr',            web: 'https://deliveroo.ae/menu/dubai/jbr/pizza-hut-jbr' },
    CAREEM:    { id: 'ph-careem',    deep: 'https://www.careem.com/en-ae/food/restaurant/pizza-hut-jbr',   web: 'https://www.careem.com/en-ae/food/restaurant/pizza-hut-jbr' },
    KEETA:     { id: 'ph-keeta',     deep: 'https://www.keeta.com/ae/restaurant/pizza-hut-jbr',            web: 'https://www.keeta.com/ae/restaurant/pizza-hut-jbr' },
  })

  await upsertDeliveryFees(pizzaHut.id, {
    TALABAT:   { baseFee: 8,  serviceFeeFlat: 3, serviceFeePercent: 0, smallOrderThreshold: 50, smallOrderFee: 8, estimatedMinutes: 35 },
    DELIVEROO: { baseFee: 10, serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 55, smallOrderFee: 8, estimatedMinutes: 30 },
    CAREEM:    { baseFee: 7,  serviceFeeFlat: 4, serviceFeePercent: 0, smallOrderThreshold: 50, smallOrderFee: 7, estimatedMinutes: 38 },
    KEETA:     { baseFee: 5,  serviceFeeFlat: 2, serviceFeePercent: 0, smallOrderThreshold: 40, smallOrderFee: 5, estimatedMinutes: 42 },
  })

  console.log('✓ Pizza Hut done')

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
  priceMap: Record<string, { TALABAT: number; DELIVEROO: number; CAREEM: number; KEETA: number }>
) {
  const platforms = ['TALABAT', 'DELIVEROO', 'CAREEM', 'KEETA'] as const
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
      where: { restaurantId_platform: { restaurantId, platform: platform as 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA' } },
      update: { deepLinkUrl: link.deep, webUrl: link.web, platformRestaurantId: link.id, updatedAt: new Date() },
      create: {
        restaurantId,
        platform: platform as 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA',
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
      where: { platform_restaurantId: { platform: platform as 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA', restaurantId } },
      update: { ...fee, updatedAt: new Date() },
      create: { platform: platform as 'TALABAT' | 'DELIVEROO' | 'CAREEM' | 'KEETA', restaurantId, ...fee, updatedAt: new Date() },
    })
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
