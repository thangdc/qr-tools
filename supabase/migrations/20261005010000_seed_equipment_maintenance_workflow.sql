insert into public.workflow_definitions (
  id, version, name, input_fields, mappings
)
values (
  'equipment-maintenance',
  1,
  'Equipment Maintenance',
  '["assetId","assetName","location","maintenanceDate","maintenanceNote"]'::jsonb,
  '[{"source":"Asset ID","target":"assetId","required":true},{"source":"Asset Name","target":"assetName","required":true},{"source":"Location","target":"location","required":true},{"source":"Maintenance Date","target":"maintenanceDate"},{"source":"Maintenance Note","target":"maintenanceNote"}]'::jsonb
)
on conflict (id, version) do update set
  name = excluded.name,
  input_fields = excluded.input_fields,
  mappings = excluded.mappings,
  updated_at = now();
