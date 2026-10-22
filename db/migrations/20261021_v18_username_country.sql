-- Public usernames for moderator appointment; country code for creator monetization eligibility.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code text;
UPDATE public.profiles p
   SET username = lower(regexp_replace(split_part(coalesce(p.email,''),'@',1),'[^a-zA-Z0-9_]+','_','g')) || '_' || left(p.id::text,6)
 WHERE username IS NULL OR btrim(username)='';
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_uq ON public.profiles (lower(username)) WHERE username IS NOT NULL;
