# Appointment time-zone model

Appointments are entered in the facility's local wall time. Atlas preserves the original local value and IANA zone on `LoadStop`, then derives the UTC instant stored in PostgreSQL `TIMESTAMPTZ(6)`.

The conversion rules are deterministic:

- A normal wall time maps to exactly one instant.
- A spring-forward gap maps to no instant and is rejected as `NONEXISTENT_LOCAL_TIME`.
- A fall-back overlap maps to two instants. Atlas rejects it until the operator explicitly chooses the earlier or later occurrence.
- An invalid or offset-only zone label is rejected; canonical IANA zones such as `America/Chicago` are required.
- The end instant must be after the start instant after conversion.
- Existing ISO 8601 instants with offsets remain readable for backward compatibility.

Displays use the stop snapshot's time zone and include the zone abbreviation. Facility edits do not change historical appointment interpretation. Unit tests cover normal conversion, spring gaps, fall overlaps, and explicit disambiguation.
