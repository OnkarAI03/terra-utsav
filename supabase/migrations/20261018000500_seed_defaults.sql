-- TERRA UTSAV: default configuration.
-- Mirrors src/lib/settings.ts, src/lib/game/config.ts and src/content/products.ts
-- (tests/db/migrations.test.ts checks they stay identical).
-- Real event details, prices and coupon values are left null until organisers confirm them.

insert into public.site_settings (key, value) values
(
  'event',
  '{
    "festivalName": "Eco-friendly Diwali Mandi 2026",
    "dateText": "Tuesday, 27 October 2026",
    "timeText": "9 am to 3 pm",
    "startsAt": "2026-10-27T09:00:00+05:30",
    "endsAt": "2026-10-27T15:00:00+05:30",
    "venue": "S. B. Patil Institute of Management, Pradhikaran Road, Haveli, Maharashtra 411044",
    "stallLocation": null,
    "mapUrl": "https://www.google.com/maps/search/?api=1&query=S.%20B.%20Patil%20Institute%20of%20Management%2C%20Pradhikaran%20Road%2C%20Haveli%2C%20Maharashtra%20411044",
    "instagramUrl": "https://www.instagram.com/pcet_terra_utsav",
    "contactEmail": null,
    "confirmed": true
  }'::jsonb
),
(
  'rewards',
  '{
    "rewardsEnabled": true,
    "couponLabel": "TERRA UTSAV winner''s coupon",
    "couponValueText": null,
    "maxRedemptions": 1,
    "expiresAfterHours": null,
    "expiresAt": null,
    "maxCouponsTotal": null,
    "confirmed": false,
    "redemptionInstructions": "Show this coupon at the TERRA UTSAV stall. A team member will scan or type the code and redeem it for you."
  }'::jsonb
),
(
  'game',
  '{"version":1,"maxRewardAttempts":2,"practiceEnabled":true,"minReactionMs":140,"minTapGapMs":90,"maxTapsPerLevel":160,"countdownMs":3000,"levels":[{"level":1,"name":"Warm-up Whiskers","blurb":"Koochu Puchu pops out of the Diwali gift boxes. Tap to catch.","durationMs":30000,"targetCatches":8,"lives":3,"spawnGapMs":[850,1250],"visibleMs":[1300,1700],"dashMs":[1800,2200],"decoyChance":0,"dashChance":0,"maxActive":2,"catRadius":0.11,"decoyRadius":0.09},{"level":2,"name":"Decoy Drama","blurb":"Snacks pop up too. Tapping a snack costs a heart.","durationMs":30000,"targetCatches":12,"lives":3,"spawnGapMs":[700,1050],"visibleMs":[940,1240],"dashMs":[1700,2100],"decoyChance":0.3,"dashChance":0,"maxActive":3,"catRadius":0.1,"decoyRadius":0.09},{"level":3,"name":"Diya Dash","blurb":"Now the kitten sprints between the diyas. Catch it mid-run.","durationMs":30000,"targetCatches":15,"lives":3,"spawnGapMs":[620,950],"visibleMs":[840,1100],"dashMs":[1450,1800],"decoyChance":0.32,"dashChance":0.34,"maxActive":3,"catRadius":0.095,"decoyRadius":0.09},{"level":4,"name":"Chocolate Rush","blurb":"Faster, busier, sneakier. Two hearts only.","durationMs":30000,"targetCatches":16,"lives":2,"spawnGapMs":[520,820],"visibleMs":[720,940],"dashMs":[1250,1600],"decoyChance":0.4,"dashChance":0.36,"maxActive":4,"catRadius":0.09,"decoyRadius":0.09},{"level":5,"name":"Diwali Finale","blurb":"Koochu Puchu at full Diwali speed. Catch 18 to win.","durationMs":30000,"targetCatches":18,"lives":2,"spawnGapMs":[440,720],"visibleMs":[620,830],"dashMs":[1050,1350],"decoyChance":0.4,"dashChance":0.4,"maxActive":4,"catRadius":0.085,"decoyRadius":0.09}]}'::jsonb
)
on conflict (key) do nothing;

insert into public.products
  (slug, name, category, tagline, description, price_paise, price_note, availability, featured, featured_label, image_url, image_alt, image_is_illustrative, sort_order)
values
  (
    'chocolate-bomb',
    'Chocolate Bomb',
    'food',
    'Crack it. Pour it. Devour it.',
    'Our signature chocolate dessert, served at the TERRA UTSAV stall.',
    null,
    null,
    'coming_soon',
    true,
    'Signature',
    '/images/food/chocolate-bomb.webp',
    'A glossy chocolate dome dessert dripping with melted chocolate',
    true,
    1
  ),
  (
    'chat-papdi',
    'Chat Papdi',
    'food',
    'Crunchy. Tangy. Addictive.',
    'The street-food classic, served at the TERRA UTSAV stall.',
    null,
    null,
    'coming_soon',
    false,
    null,
    '/images/food/chat-papdi.webp',
    'A plate of chat papdi topped with yogurt, chutneys, sev and pomegranate',
    true,
    2
  ),
  (
    'diwali-diyas',
    'Homemade Diwali Diyas',
    'diyas',
    'Light one. Gift one. Glow on.',
    'Homemade diyas to light up your Diwali, on sale at the TERRA UTSAV stall.',
    null,
    null,
    'coming_soon',
    true,
    'Homemade',
    null,
    'Homemade Diwali diyas',
    false,
    3
  )
on conflict (slug) do nothing;
