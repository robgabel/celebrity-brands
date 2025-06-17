@@ .. @@
 CREATE OR REPLACE FUNCTION queue_brand_embedding(p_brand_id bigint)
 RETURNS json
 LANGUAGE plpgsql
-SECURITY DEFINER
+SECURITY INVOKER
 SET search_path = public
 AS $$
 DECLARE
@@ .. @@