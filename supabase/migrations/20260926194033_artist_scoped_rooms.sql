-- Reconstructed from the production schema on 2026-09-27. The original SQL
-- was not committed; this version preserves the deployed artist-scoping model.
ALTER TABLE public.gallery_artworks
  ADD COLUMN owner_user_id uuid,
  ADD COLUMN room_slug text,
  ADD CONSTRAINT gallery_artworks_owner_user_id_fkey
    FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT gallery_artworks_location_check
    CHECK (
      (room_slug IS NULL AND (hall_index IS NULL OR hall_index BETWEEN 0 AND 9))
      OR (room_slug = 'simone-plozzer' AND hall_index IS NULL)
    );

CREATE INDEX gallery_artworks_owner_idx ON public.gallery_artworks(owner_user_id);
CREATE INDEX gallery_artworks_room_idx ON public.gallery_artworks(room_slug);

CREATE TABLE public.gallery_artists (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_slug text NOT NULL UNIQUE CHECK (artist_slug ~ '^[a-z0-9-]+$'),
  display_name text NOT NULL,
  email text NOT NULL,
  room_slug text NOT NULL UNIQUE,
  capacity integer NOT NULL DEFAULT 75 CHECK (capacity BETWEEN 1 AND 500),
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.gallery_artists ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gallery_artists FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.gallery_artists TO authenticated;
CREATE POLICY "Administrators read artist memberships"
  ON public.gallery_artists FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gallery_admins a WHERE a.user_id = (SELECT auth.uid())
  ));
CREATE POLICY "Artists read own membership"
  ON public.gallery_artists FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.ua_artist_can_manage_work(p_owner uuid, p_room text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gallery_artists ga
    WHERE ga.user_id = (SELECT auth.uid())
      AND ga.active AND ga.user_id = p_owner AND ga.room_slug = p_room
  )
$$;

CREATE OR REPLACE FUNCTION public.ua_artist_capacity_ok(p_owner uuid, p_room text, p_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gallery_artists ga
    WHERE ga.user_id = (SELECT auth.uid())
      AND ga.active AND ga.user_id = p_owner AND ga.room_slug = p_room
      AND (
        SELECT count(*) FROM public.gallery_artworks w
        WHERE w.owner_user_id = p_owner AND w.room_slug = p_room AND w.id <> p_id
      ) < ga.capacity
  )
$$;

CREATE POLICY "Artists read own works"
  ON public.gallery_artworks FOR SELECT TO authenticated
  USING (public.ua_artist_can_manage_work(owner_user_id, room_slug));
CREATE POLICY "Artists create own drafts"
  ON public.gallery_artworks FOR INSERT TO authenticated
  WITH CHECK (
    NOT published
    AND owner_user_id = (SELECT auth.uid())
    AND public.ua_artist_can_manage_work(owner_user_id, room_slug)
    AND public.ua_artist_capacity_ok(owner_user_id, room_slug, id)
  );
CREATE POLICY "Artists edit own works"
  ON public.gallery_artworks FOR UPDATE TO authenticated
  USING (public.ua_artist_can_manage_work(owner_user_id, room_slug))
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    AND public.ua_artist_can_manage_work(owner_user_id, room_slug)
    AND public.ua_artist_capacity_ok(owner_user_id, room_slug, id)
  );

CREATE POLICY "Artists read own image files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id IN ('gallery-originals', 'gallery-previews')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.gallery_artists ga
      WHERE ga.user_id = (SELECT auth.uid()) AND ga.active
    )
  );
CREATE POLICY "Artists upload own image files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('gallery-originals', 'gallery-previews')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.gallery_artists ga
      WHERE ga.user_id = (SELECT auth.uid()) AND ga.active
    )
  );
CREATE POLICY "Artists clean own incomplete uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('gallery-originals', 'gallery-previews')
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM public.gallery_artists ga
      WHERE ga.user_id = (SELECT auth.uid()) AND ga.active
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.gallery_artworks w
      WHERE w.original_path = storage.objects.name OR w.preview_path = storage.objects.name
    )
  );

GRANT ALL ON public.gallery_artists TO service_role;
