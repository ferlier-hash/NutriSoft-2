CREATE FUNCTION app.validate_library_recipe_links() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_recipe jsonb; v_owner uuid;
BEGIN
 SELECT owner_nutritionist_user_id INTO v_owner FROM app.meal_plans WHERE id=NEW.meal_plan_id;
 FOR v_recipe IN SELECT jsonb_path_query(NEW.content,'$.days[*].meals[*].items[*].recipe_id') LOOP
   IF NOT EXISTS(SELECT 1 FROM app.content_library c WHERE c.id::text=v_recipe#>>'{}' AND c.organization_id=NEW.organization_id AND c.owner_user_id=v_owner AND c.kind='recipe' AND c.status='published') THEN
     RAISE EXCEPTION 'El plan enlaza una receta no disponible. Quitá o reemplazá ese vínculo.';
   END IF;
 END LOOP;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION app.validate_library_recipe_links() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_library_recipe_links BEFORE INSERT OR UPDATE OF content ON app.meal_plan_versions FOR EACH ROW EXECUTE FUNCTION app.validate_library_recipe_links();
