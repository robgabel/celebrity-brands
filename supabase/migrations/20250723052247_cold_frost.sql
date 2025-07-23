-- Create the exec_sql function that the migration script needs
-- Run this directly in your Supabase SQL Editor first

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    EXECUTE sql;
END;
$function$;