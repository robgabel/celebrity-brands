/*
  # Create exec_sql function

  1. New Functions
    - `exec_sql` - Utility function to execute arbitrary SQL commands
      - Required by the migration script to apply SQL migrations
      - Takes a SQL text parameter and executes it

  2. Security
    - Function is created in public schema
    - Uses plpgsql language for execution
*/

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
 RETURNS VOID
 LANGUAGE plpgsql
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$;