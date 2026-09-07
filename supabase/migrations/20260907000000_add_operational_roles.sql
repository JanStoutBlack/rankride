-- Add the expanded role vocabulary without invalidating existing accounts.
-- customer and owner remain temporarily supported as legacy aliases in the UI.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rider';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';

-- The legacy profiles.role column still exists in deployed databases and the
-- signup trigger casts through this enum. Keep it compatible until that column
-- can be removed in a dedicated data migration.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'rider';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'superadmin';

