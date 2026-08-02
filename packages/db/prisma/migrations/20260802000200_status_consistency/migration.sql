-- Repair synthetic staging contradictions before the application begins enforcing
-- physical tracking milestones against the authoritative load status.
UPDATE tracking_updates AS tracking
SET
  status = 'MANUAL_CHECK_CALL',
  notes = concat_ws(
    E'\n',
    nullif(tracking.notes, ''),
    'Reclassified by 20260802000200: a draft load cannot be in transit.'
  )
FROM loads
WHERE tracking.load_id = loads.id
  AND loads.status = 'DRAFT'
  AND tracking.status IN ('AT_PICKUP', 'IN_TRANSIT', 'AT_DELIVERY', 'DELIVERED');
