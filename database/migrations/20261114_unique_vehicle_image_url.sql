DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.vehicles
    WHERE image_url IS NOT NULL AND btrim(image_url) <> ''
    GROUP BY btrim(image_url)
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate vehicles.image_url values exist; inspect and resolve them before applying this migration.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS vehicles_image_url_unique_idx
  ON public.vehicles (btrim(image_url))
  WHERE image_url IS NOT NULL AND btrim(image_url) <> '';
