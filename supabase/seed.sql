-- Development / reference seed only.
-- Do NOT insert fake customers, sales, payments, or financial transactions.

-- Roles
insert into public.roles (key, name, description, is_system)
values
  ('super_admin', 'Super Admin', 'Full platform access', true),
  ('admin', 'Admin', 'Administrative access across branches', true),
  ('general_manager', 'General Manager', 'Branch and operations oversight', true),
  ('inventory_manager', 'Inventory Manager', 'Vehicle inventory and acquisitions', true),
  ('sales_manager', 'Sales Manager', 'Sales team and pipeline oversight', true),
  ('sales_executive', 'Sales Executive', 'Leads, reservations, and sales', true),
  ('inspector', 'Inspector', 'Vehicle inspections', true),
  ('accountant', 'Accountant', 'Payments, invoices, and financial views', true),
  ('document_officer', 'Document Officer', 'Document uploads and tracking', true),
  ('viewer', 'Viewer', 'Read-only access', true)
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  updated_at = timezone('utc', now());

-- Permissions
insert into public.permissions (key, name, module, description)
values
  ('dashboard.view', 'View dashboard', 'dashboard', 'View operational dashboard'),
  ('vehicle.view', 'View vehicles', 'vehicle', 'View inventory vehicles'),
  ('vehicle.create', 'Create vehicles', 'vehicle', 'Create inventory vehicles'),
  ('vehicle.edit', 'Edit vehicles', 'vehicle', 'Edit inventory vehicles'),
  ('vehicle.delete', 'Delete vehicles', 'vehicle', 'Soft-delete inventory vehicles'),
  ('vehicle.cost.view', 'View vehicle costs', 'vehicle', 'View vehicle expense totals'),
  ('vehicle.cost.edit', 'Edit vehicle costs', 'vehicle', 'Create or edit vehicle expenses'),
  ('vehicle.price.view', 'View vehicle prices', 'vehicle', 'View selling prices'),
  ('vehicle.price.edit', 'Edit vehicle prices', 'vehicle', 'Change selling prices'),
  ('acquisition.view', 'View acquisitions', 'acquisition', 'View acquisition records'),
  ('acquisition.create', 'Create acquisitions', 'acquisition', 'Create acquisition records'),
  ('acquisition.edit', 'Edit acquisitions', 'acquisition', 'Edit acquisition records'),
  ('inspection.view', 'View inspections', 'inspection', 'View inspections'),
  ('inspection.create', 'Create inspections', 'inspection', 'Create inspections'),
  ('inspection.edit', 'Edit inspections', 'inspection', 'Edit inspections'),
  ('inspection.approve', 'Approve inspections', 'inspection', 'Finalize inspection results'),
  ('inspection.submit', 'Submit inspections', 'inspection', 'Submit completed inspections for review'),
  ('inspection.review', 'Review inspections', 'inspection', 'Move inspections into review'),
  ('inspection.reject', 'Reject inspections', 'inspection', 'Reject inspections under review'),
  ('inspection.reinspect', 'Request reinspection', 'inspection', 'Create a follow-up reinspection'),
  ('inspection.finding.view', 'View inspection findings', 'inspection', 'View inspection findings'),
  ('inspection.finding.create', 'Create inspection findings', 'inspection', 'Create inspection findings'),
  ('inspection.finding.edit', 'Edit inspection findings', 'inspection', 'Edit inspection findings'),
  ('inspection.photo.view', 'View inspection photos', 'inspection', 'View inspection photos'),
  ('inspection.photo.create', 'Upload inspection photos', 'inspection', 'Upload inspection photos'),
  ('inspection.photo.delete', 'Delete inspection photos', 'inspection', 'Delete inspection photos'),
  ('inspection.cost.view', 'View inspection costs', 'inspection', 'View estimated repair costs'),
  ('inspection.override', 'Override inspection gates', 'inspection', 'Override incomplete or critical gates'),
  ('customer.view', 'View customers', 'customer', 'View customers'),
  ('customer.create', 'Create customers', 'customer', 'Create customers'),
  ('customer.edit', 'Edit customers', 'customer', 'Edit customers'),
  ('lead.view', 'View leads', 'lead', 'View leads'),
  ('lead.create', 'Create leads', 'lead', 'Create leads'),
  ('lead.edit', 'Edit leads', 'lead', 'Edit leads'),
  ('reservation.view', 'View reservations', 'reservation', 'View reservations'),
  ('reservation.create', 'Create reservations', 'reservation', 'Create reservations'),
  ('reservation.cancel', 'Cancel reservations', 'reservation', 'Cancel reservations'),
  ('sale.view', 'View sales', 'sale', 'View sales'),
  ('sale.create', 'Create sales', 'sale', 'Create sales'),
  ('sale.edit', 'Edit sales', 'sale', 'Edit sales'),
  ('sale.cancel', 'Cancel sales', 'sale', 'Cancel sales'),
  ('payment.view', 'View payments', 'payment', 'View payments'),
  ('payment.create', 'Create payments', 'payment', 'Create payments'),
  ('payment.refund', 'Refund payments', 'payment', 'Refund payments'),
  ('invoice.view', 'View invoices', 'invoice', 'View invoices'),
  ('invoice.create', 'Create invoices', 'invoice', 'Create invoices'),
  ('invoice.edit', 'Edit invoices', 'invoice', 'Edit invoices'),
  ('document.view', 'View documents', 'document', 'View documents'),
  ('document.create', 'Create documents', 'document', 'Upload documents'),
  ('document.edit', 'Edit documents', 'document', 'Edit document metadata'),
  ('report.view', 'View reports', 'report', 'View reports'),
  ('branch.view', 'View branches', 'branch', 'View branches'),
  ('branch.manage', 'Manage branches', 'branch', 'Create or edit branches'),
  ('user.manage', 'Manage users', 'user', 'Invite and manage users'),
  ('role.manage', 'Manage roles', 'role', 'Assign roles and permissions'),
  ('audit.view', 'View audit logs', 'audit', 'View audit logs'),
  ('notification.view', 'View notifications', 'notification', 'View notifications'),
  ('settings.view', 'View settings', 'settings', 'View settings'),
  ('settings.manage', 'Manage settings', 'settings', 'Change settings')
on conflict (key) do update
set
  name = excluded.name,
  module = excluded.module,
  description = excluded.description;

-- Super Admin receives every permission.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.key = 'super_admin'
on conflict do nothing;

-- Viewer: read-only subset.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key in (
  'dashboard.view',
  'vehicle.view',
  'vehicle.price.view',
  'acquisition.view',
  'inspection.view',
  'customer.view',
  'lead.view',
  'reservation.view',
  'sale.view',
  'payment.view',
  'invoice.view',
  'document.view',
  'report.view',
  'branch.view',
  'notification.view',
  'settings.view'
)
where r.key = 'viewer'
on conflict do nothing;

-- Admin: broad operational + management permissions (not every financial refund nuance).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.key not in ('payment.refund')
where r.key = 'admin'
on conflict do nothing;

-- Lead sources
insert into public.lead_sources (key, name, sort_order)
values
  ('website', 'Website', 10),
  ('whatsapp', 'WhatsApp', 20),
  ('instagram', 'Instagram', 30),
  ('facebook', 'Facebook', 40),
  ('dubizzle', 'Dubizzle', 50),
  ('yallamotor', 'YallaMotor', 60),
  ('walk_in', 'Walk-in', 70),
  ('phone', 'Phone', 80),
  ('referral', 'Referral', 90),
  ('other', 'Other', 100)
on conflict (key) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

-- Document types
insert into public.document_types (key, name, description)
values
  ('purchase_invoice', 'Purchase Invoice', 'Vehicle purchase invoice'),
  ('auction_invoice', 'Auction Invoice', 'Auction sale invoice'),
  ('seller_invoice', 'Seller Invoice', 'Seller-issued invoice'),
  ('purchase_agreement', 'Purchase Agreement', 'Acquisition purchase agreement'),
  ('payment_receipt', 'Payment Receipt', 'Payment receipt for acquisition'),
  ('transport_document', 'Transport Document', 'Transport / shipping document'),
  ('customs_document', 'Customs Document', 'Customs paperwork'),
  ('import_document', 'Import Document', 'Import paperwork'),
  ('registration_document', 'Registration Document', 'Registration / mulkiya documents'),
  ('inspection_document', 'Inspection Document', 'Inspection reports and attachments'),
  ('ownership_document', 'Ownership Document', 'Ownership / title documents'),
  ('registration', 'Registration', 'Vehicle registration documents'),
  ('customs', 'Customs', 'Customs and import paperwork'),
  ('inspection', 'Inspection', 'Inspection reports and attachments'),
  ('insurance', 'Insurance', 'Insurance documents'),
  ('export', 'Export', 'Export paperwork'),
  ('sales_invoice', 'Sales Invoice', 'Customer sales invoice'),
  ('customer_document', 'Customer Document', 'Customer identity or supporting documents'),
  ('warranty', 'Warranty', 'Warranty documents'),
  ('other', 'Other', 'Uncategorized document')
on conflict (key) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  updated_at = timezone('utc', now());

-- UAE VAT development rate (5%). Not a production tax engine.
insert into public.tax_rates (name, rate, country, is_active, effective_from)
select 'UAE VAT 5%', 0.0500, 'AE', true, date '2018-01-01'
where not exists (
  select 1 from public.tax_rates where name = 'UAE VAT 5%' and country = 'AE'
);

-- Default inspection template
with template as (
  insert into public.inspection_templates (name, description, is_active)
  select 'Standard Pre-Sale Inspection', 'Default checklist for used vehicles', true
  where not exists (
    select 1 from public.inspection_templates where name = 'Standard Pre-Sale Inspection'
  )
  returning id
),
existing as (
  select id from public.inspection_templates where name = 'Standard Pre-Sale Inspection'
),
template_id as (
  select id from template
  union all
  select id from existing
  limit 1
)
insert into public.inspection_template_items (template_id, section_key, name, category, description, sort_order, is_required)
select t.id, item.section_key, item.name, item.category, item.description, item.sort_order, true
from template_id t
cross join (
  values
    ('exterior', 'Body panels', 'Exterior', 'Check dents, scratches, and panel gaps', 10),
    ('exterior', 'Paint condition', 'Exterior', 'Check paint consistency and repairs', 20),
    ('exterior', 'Lights and indicators', 'Exterior', 'Check all exterior lights', 30),
    ('interior', 'Seats and cabin trim', 'Interior', 'Check wear, stains, and function', 40),
    ('interior', 'Controls and switches', 'Interior', 'Check cabin controls', 50),
    ('engine', 'Engine start and idle', 'Mechanical', 'Check cold/hot start and idle quality', 60),
    ('transmission', 'Transmission operation', 'Mechanical', 'Check gear engagement', 70),
    ('electrical', 'Battery and charging', 'Electrical', 'Check battery health and charging system', 80),
    ('electrical', 'Infotainment and sensors', 'Electrical', 'Check electronics and warning lights', 90),
    ('tyres_wheels', 'Tyre tread and condition', 'Tyres', 'Check tread depth and sidewall damage', 100),
    ('brakes', 'Brakes and ABS', 'Safety', 'Check braking performance and ABS lights', 110),
    ('safety', 'Airbags and belts', 'Safety', 'Check restraint systems', 120)
) as item(section_key, name, category, description, sort_order)
where not exists (
  select 1
  from public.inspection_template_items i
  where i.template_id = t.id
    and i.name = item.name
    and i.category = item.category
);

-- Optional demo branch (no financial records).
insert into public.branches (
  name,
  code,
  emirate,
  address_line_1,
  city,
  phone,
  email,
  is_active
)
select
  'Zohaan Motors Dubai',
  'DXB-01',
  'dubai',
  'Showroom Road',
  'Dubai',
  '+971400000000',
  'dubai@zohaan.local',
  true
where not exists (select 1 from public.branches where code = 'DXB-01');

-- Phase 5: vehicle master data + demo inventory (no customers/sales/payments).
insert into public.vehicle_makes (name, sort_order)
values
  ('Toyota', 10),
  ('Nissan', 20),
  ('Lexus', 30),
  ('Mercedes-Benz', 40),
  ('BMW', 50),
  ('Audi', 60),
  ('Ford', 70),
  ('Honda', 80),
  ('Hyundai', 90),
  ('Kia', 100),
  ('Land Rover', 110),
  ('Porsche', 120)
on conflict (name) do update set sort_order = excluded.sort_order, is_active = true;

insert into public.vehicle_models (make_id, name)
select m.id, x.model
from public.vehicle_makes m
join (
  values
    ('Toyota', 'Land Cruiser'),
    ('Toyota', 'Camry'),
    ('Toyota', 'Prado'),
    ('Nissan', 'Patrol'),
    ('Nissan', 'Altima'),
    ('Lexus', 'ES'),
    ('Lexus', 'LX'),
    ('Mercedes-Benz', 'GLC'),
    ('Mercedes-Benz', 'E-Class'),
    ('BMW', 'X5'),
    ('BMW', '5 Series'),
    ('Audi', 'Q7'),
    ('Land Rover', 'Range Rover Sport'),
    ('Porsche', 'Cayenne'),
    ('Hyundai', 'Tucson'),
    ('Kia', 'Sportage')
) as x(make, model) on x.make = m.name
on conflict (make_id, name) do nothing;

insert into public.branch_locations (branch_id, name, location_type)
select b.id, loc.name, loc.location_type::public.branch_location_type
from public.branches b
cross join (
  values
    ('Main Showroom', 'showroom'),
    ('Main Yard', 'yard'),
    ('Workshop', 'workshop'),
    ('Storage', 'storage'),
    ('Delivery Area', 'delivery')
) as loc(name, location_type)
where b.code = 'DXB-01'
  and not exists (
    select 1 from public.branch_locations bl
    where bl.branch_id = b.id and bl.name = loc.name
  );

-- Sample vehicles for local/dev demos (stock numbers assigned by trigger if blank).
do $$
declare
  v_branch uuid;
  v_showroom uuid;
  v_yard uuid;
  v_workshop uuid;
  v_toyota uuid;
  v_nissan uuid;
  v_lexus uuid;
  v_mb uuid;
  v_bmw uuid;
begin
  select id into v_branch from public.branches where code = 'DXB-01' limit 1;
  if v_branch is null then
    return;
  end if;

  select id into v_showroom from public.branch_locations where branch_id = v_branch and name = 'Main Showroom';
  select id into v_yard from public.branch_locations where branch_id = v_branch and name = 'Main Yard';
  select id into v_workshop from public.branch_locations where branch_id = v_branch and name = 'Workshop';
  select id into v_toyota from public.vehicle_makes where name = 'Toyota';
  select id into v_nissan from public.vehicle_makes where name = 'Nissan';
  select id into v_lexus from public.vehicle_makes where name = 'Lexus';
  select id into v_mb from public.vehicle_makes where name = 'Mercedes-Benz';
  select id into v_bmw from public.vehicle_makes where name = 'BMW';

  if exists (select 1 from public.vehicles where stock_number like 'ZM-%' limit 1) then
    return;
  end if;

  insert into public.vehicles (
    stock_number, vin, make, model, variant, year, mileage, mileage_unit, body_type,
    transmission, fuel_type, drive_type, exterior_color, interior_color, origin_type,
    country_of_origin, branch_id, location_id, status, purchase_date, description,
    make_id, model_id, seats, doors, engine_size, engine_cylinders, current_selling_price
  ) values
  (
    'ZM-000001', 'JTMCY7AJ0P4123456', 'Toyota', 'Land Cruiser', 'GXR', 2022, 28000, 'km', 'SUV',
    'automatic', 'petrol', 'four_wd', 'White', 'Beige', 'gcc',
    'United Arab Emirates', v_branch, v_showroom, 'ready_for_sale', current_date - 40,
    'Demo Land Cruiser for inventory layout.',
    v_toyota, (select id from public.vehicle_models where make_id = v_toyota and name = 'Land Cruiser'),
    7, 5, '4.0L', 6, 285000
  ),
  (
    'ZM-000002', 'JN8AY2NE5P5123456', 'Nissan', 'Patrol', 'Titanium', 2021, 41000, 'km', 'SUV',
    'automatic', 'petrol', 'four_wd', 'Black', 'Black', 'gcc',
    'United Arab Emirates', v_branch, v_yard, 'under_inspection', current_date - 12,
    'Demo Patrol awaiting inspection.',
    v_nissan, (select id from public.vehicle_models where make_id = v_nissan and name = 'Patrol'),
    7, 5, '5.6L', 8, null
  ),
  (
    'ZM-000003', 'JTHB31B20P5123456', 'Lexus', 'ES', '350', 2020, 52000, 'km', 'Sedan',
    'automatic', 'petrol', 'fwd', 'Silver', 'Black', 'gcc',
    'United Arab Emirates', v_branch, v_showroom, 'reserved', current_date - 55,
    'Demo Lexus ES reserved sample.',
    v_lexus, (select id from public.vehicle_models where make_id = v_lexus and name = 'ES'),
    5, 4, '3.5L', 6, 145000
  ),
  (
    'ZM-000004', 'WDC0G4KB5PF123456', 'Mercedes-Benz', 'GLC', '300', 2023, 18000, 'km', 'SUV',
    'automatic', 'petrol', 'awd', 'Grey', 'Black', 'imported',
    'Germany', v_branch, v_workshop, 'under_repair', current_date - 20,
    'Demo GLC in reconditioning.',
    v_mb, (select id from public.vehicle_models where make_id = v_mb and name = 'GLC'),
    5, 5, '2.0L', 4, null
  ),
  (
    'ZM-000005', '5UXCR6C05P9A12345', 'BMW', 'X5', 'xDrive40i', 2021, 36000, 'km', 'SUV',
    'automatic', 'petrol', 'awd', 'Blue', 'Cognac', 'imported',
    'United States', v_branch, v_yard, 'acquired', current_date - 3,
    'Demo BMW X5 newly acquired.',
    v_bmw, (select id from public.vehicle_models where make_id = v_bmw and name = 'X5'),
    5, 5, '3.0L', 6, null
  ),
  (
    'ZM-000006', '4T1B11HK5PU123456', 'Toyota', 'Camry', 'SE', 2019, 78000, 'km', 'Sedan',
    'automatic', 'petrol', 'fwd', 'White', 'Black', 'gcc',
    'United Arab Emirates', v_branch, v_showroom, 'sold', current_date - 90,
    'Demo Camry sold sample (kept for history).',
    v_toyota, (select id from public.vehicle_models where make_id = v_toyota and name = 'Camry'),
    5, 4, '2.5L', 4, 78000
  );

  perform setval('public.vehicle_stock_number_seq', 6, true);
end $$;
