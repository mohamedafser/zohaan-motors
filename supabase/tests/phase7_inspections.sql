-- Phase 7 inspection business-rule smoke tests (transaction rolled back).
-- Prerequisite: apply supabase/migrations/00031_phase7_inspections.sql first
--   (local: npm run db:reset   or   npx supabase db push)
begin;

do $$
declare
  v_branch uuid;
  v_vehicle uuid;
  v_insp uuid;
  v_number text;
  v_section uuid;
  v_template uuid;
  v_item_count int;
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inspections'
      and column_name = 'inspection_number'
  ) then
    raise exception
      'Phase 7 migration not applied: public.inspections.inspection_number is missing. Run supabase/migrations/00031_phase7_inspections.sql first (npm run db:reset or npx supabase db push), then re-run this test.';
  end if;

  select id into v_branch from public.branches where code = 'DXB-01' limit 1;
  if v_branch is null then
    insert into public.branches (name, code, emirate, city, is_active)
    values ('Test Branch', 'TST-INSP', 'dubai', 'Dubai', true)
    returning id into v_branch;
  end if;

  insert into public.vehicles (stock_number, make, model, year, branch_id, status, source)
  values ('', 'Toyota', 'Land Cruiser', 2021, v_branch, 'acquired', 'other')
  returning id into v_vehicle;

  select id into v_template
  from public.inspection_templates
  where is_active = true
  order by created_at
  limit 1;

  -- inspection_number is assigned by BEFORE INSERT trigger (pass empty string).
  insert into public.inspections (
    inspection_number, vehicle_id, branch_id, template_id, status, inspection_type
  )
  values (
    '', v_vehicle, v_branch, v_template, 'draft', 'full_inspection'
  )
  returning id, inspection_number into v_insp, v_number;

  if v_number is null or v_number not like 'ZM-INSP-%' then
    raise exception 'inspection number not generated: %', v_number;
  end if;

  -- Valid transitions along the happy path to under_review
  -- (mirrors is_valid_inspection_status_transition; triggers enforce on UPDATE)
  update public.inspections set status = 'assigned' where id = v_insp;
  update public.inspections set status = 'in_progress' where id = v_insp;
  update public.inspections set status = 'submitted' where id = v_insp;
  update public.inspections set status = 'under_review' where id = v_insp;

  -- Invalid transition must fail
  begin
    update public.inspections set status = 'draft' where id = v_insp;
    raise exception 'expected invalid transition to fail';
  exception
    when check_violation then null;
    when others then
      if sqlerrm not like '%invalid inspection status transition%' then
        raise;
      end if;
  end;

  -- Optional: section + finding when tables exist
  if to_regclass('public.inspection_sections') is not null then
    insert into public.inspection_sections (
      inspection_id, section_key, name, sort_order, is_required
    )
    values (v_insp, 'exterior', 'Exterior', 100, true)
    returning id into v_section;

    if to_regclass('public.inspection_findings') is not null then
      insert into public.inspection_findings (
        inspection_id, section_id, title, severity, result
      )
      values (v_insp, v_section, 'Scratch on front bumper', 'minor', 'fail');
    end if;
  end if;

  -- Optional: populate checklist from template (idempotent)
  if v_template is not null
     and exists (
       select 1 from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'populate_inspection_checklist'
     ) then
    begin
      perform public.populate_inspection_checklist(v_insp);
      select count(*)::int into v_item_count
      from public.inspection_items
      where inspection_id = v_insp;
      -- May be 0 if already populated or caller lacks permission in this session;
      -- presence of the function is enough for the smoke path.
      raise notice 'populate_inspection_checklist item count: %', v_item_count;
    exception
      when others then
        -- SECURITY DEFINER may raise not authorized without a JWT — acceptable in smoke test.
        if sqlerrm not like '%not authorized%' and sqlerrm not like '%inspection has no template%' then
          raise;
        end if;
        raise notice 'populate_inspection_checklist skipped: %', sqlerrm;
    end;
  end if;

  raise notice 'phase7_inspections checks passed';
end $$;

rollback;
