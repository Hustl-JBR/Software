ALTER TABLE loads
  DROP CONSTRAINT IF EXISTS loads_equipment_type_check;

ALTER TABLE loads
  ADD COLUMN equipment_detail TEXT,
  ADD CONSTRAINT loads_equipment_type_check CHECK (
    equipment_type IN (
      'DRY_VAN', 'REEFER', 'FLATBED', 'STEP_DECK', 'CONESTOGA', 'LOWBOY',
      'RGN', 'POWER_ONLY', 'BOX_TRUCK', 'SPRINTER', 'HOTSHOT', 'TANKER'
    )
  );
