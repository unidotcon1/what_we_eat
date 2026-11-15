-- Optional picture, menu link and menu for each restaurant. Run once in the Supabase SQL editor, after 001 to 006.
-- The app works without it (places just show the drawn placeholder and "Menu not added yet"), so run it
-- when real restaurant data is ready. Safe to run twice. It changes no existing data.
--
-- image_url  a picture file of ours, kept in the repo under public/restaurants/ (the page may only load images from its own address)
-- menu_url   the restaurant's own menu page, https only
-- menu       dishes grouped in sections: [{"section": "Drinks", "items": [{"name": "Kopi", "price": "$2.20"}]}]
--
-- Readable by everyone like the rest of the table; only the owner can change it (dashboard or service key).

alter table restaurants
  add column if not exists image_url text
    check (image_url is null or (char_length(image_url) <= 120 and image_url ~* '^/restaurants/[a-z0-9_./-]+\.(webp|jpe?g|png|avif)$' and image_url not like '%..%')),
  add column if not exists menu_url text
    check (menu_url is null or (char_length(menu_url) <= 300 and menu_url ~* '^https://[^[:space:]]+$')),
  add column if not exists menu jsonb
    check (menu is null or (jsonb_typeof(menu) = 'array' and pg_column_size(menu) <= 20000));
