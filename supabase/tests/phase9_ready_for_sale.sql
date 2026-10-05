-- Ready for Sale eligibility and transition smoke tests (transaction rolled back).
begin;

do $$
declare
  v_branch uuid;
  v_loc uuid;
  v_vehicle uuid;
  v_inspection uuid;
  v_eval jsonb;
  v_user uuid;
begin
  select id into v_branch from public.branches where code = 'DXB-01' limit 1;
  if v_branch is null then
    insert into public.branches (name, code, emirate, city, is_active)
    values ('Test Branch RFS', 'TST-RFS', 'dubai', 'Dubai', true)
    returning id into v_branch;
  end if;

  insert into public.branch_locations (branch_id, name, location_type)
  values (v_branch, 'RFS Yard', 'yard')
  returning id into v_loc;

  insert into public.vehicles (stock_number, make, model, year, branch_id, location_id, status)
  values ('', 'Toyota', 'Camry', 2022, v_branch, v_loc, 'under_inspection')
  returning id into v_vehicle;

  -- Case 5: no inspection → blocked
  v_eval := public.evaluate_vehicle_ready_for_sale(v_vehicle);
  if coalesce((v_eval ->> 'eligible')::boolean, true) then
    raise exception 'expected blocked without inspection';
  end if;

  -- Create approved PASS inspection
  insert into public.inspections (
    vehicle_id, branch_id, status, result, inspection_type, approved_at, completed_at
  )
  values (
    v_vehicle, v_branch, 'approved', 'pass', 'full_inspection',
    timezone('utc', now()), timezone('utc', now())
  )
  returning id into v_inspection;

  -- Case 1: pass, no workshop → eligible
  v_eval := public.evaluate_vehicle_ready_for_sale(v_vehicle);
  if coalesce((v_eval ->> 'eligible')::boolean, false) is not true then
    raise exception 'expected eligible for pass without workshop: %', v_eval;
  end if;

  -- acquired → ready_for_sale is a valid transition map entry
  if not public.is_valid_vehicle_status_transition('acquired', 'ready_for_sale') then
    raise exception 'acquired → ready_for_sale should be valid';
  end if;

  if public.is_valid_vehicle_status_transition('sold', 'ready_for_sale') then
    raise exception 'sold → ready_for_sale must remain invalid';
  end if;

  -- Case 2: repair_required without workshop → blocked
  update public.inspections
  set result = 'repair_required'
  where id = v_inspection;

  v_eval := public.evaluate_vehicle_ready_for_sale(v_vehicle);
  if coalesce((v_eval ->> 'eligible')::boolean, true) then
    raise exception 'expected blocked for repair_required without workshop: %', v_eval;
  end if;

  -- Case 6: expired inspection
  update public.inspections
  set result = 'pass',
      approved_at = timezone('utc', now()) - interval '400 days',
      completed_at = timezone('utc', now()) - interval '400 days'
  where id = v_inspection;

  insert into public.system_settings (key, value, description)
  values ('inspection.validity_days', '30'::jsonb, 'test validity')
  on conflict (key) do update set value = excluded.value;

  v_eval := public.evaluate_vehicle_ready_for_sale(v_vehicle);
  if coalesce((v_eval ->> 'eligible')::boolean, true) then
    raise exception 'expected blocked for expired inspection: %', v_eval;
  end if;

  -- reset validity
  update public.system_settings
  set value = 'null'::jsonb
  where key = 'inspection.validity_days';

  update public.inspections
  set approved_at = timezone('utc', now()),
      completed_at = timezone('utc', now())
  where id = v_inspection;

  raise notice 'ready_for_sale checks passed';
end $$;

rollback;
