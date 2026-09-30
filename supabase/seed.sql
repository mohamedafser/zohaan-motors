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
  ('workshop_manager', 'Workshop Manager', 'Workshop orders and repairs', true),
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
  ('workshop.view', 'View workshop', 'workshop', 'View workshop orders'),
  ('workshop.create', 'Create workshop orders', 'workshop', 'Create workshop orders'),
  ('workshop.edit', 'Edit workshop orders', 'workshop', 'Edit workshop orders'),
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
  'workshop.view',
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
insert into public.inspection_template_items (template_id, name, category, description, sort_order, is_required)
select t.id, item.name, item.category, item.description, item.sort_order, true
from template_id t
cross join (
  values
    ('Body panels', 'Exterior', 'Check dents, scratches, and panel gaps', 10),
    ('Paint condition', 'Exterior', 'Check paint consistency and repairs', 20),
    ('Lights and indicators', 'Exterior', 'Check all exterior lights', 30),
    ('Seats and cabin trim', 'Interior', 'Check wear, stains, and function', 40),
    ('Controls and switches', 'Interior', 'Check cabin controls', 50),
    ('Engine start and idle', 'Mechanical', 'Check cold/hot start and idle quality', 60),
    ('Transmission operation', 'Mechanical', 'Check gear engagement', 70),
    ('Battery and charging', 'Electrical', 'Check battery health and charging system', 80),
    ('Infotainment and sensors', 'Electrical', 'Check electronics and warning lights', 90),
    ('Tyre tread and condition', 'Tyres', 'Check tread depth and sidewall damage', 100),
    ('Brakes and ABS', 'Safety', 'Check braking performance and ABS lights', 110),
    ('Airbags and belts', 'Safety', 'Check restraint systems', 120)
) as item(name, category, description, sort_order)
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
