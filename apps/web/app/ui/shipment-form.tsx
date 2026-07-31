type Values = Record<string, unknown>;
const textFields = [
  ["customerName", "Customer or shipper name"],
  ["originFacilityName", "Origin facility name"],
  ["originCity", "Origin city"],
  ["originState", "Origin state"],
  ["originPostalCode", "Origin postal code"],
  ["destinationFacilityName", "Destination facility name"],
  ["destinationCity", "Destination city"],
  ["destinationState", "Destination state"],
  ["destinationPostalCode", "Destination postal code"],
  ["commodity", "Commodity"],
  ["dimensions", "Dimensions"],
  ["temperatureRequirements", "Temperature requirements"],
  ["customerReferences", "Customer reference numbers"],
] as const;
export function ShipmentForm({ values = {} }: { values?: Values }) {
  const v = (key: string) => String(values[key] ?? "");
  return (
    <>
      <h2 className="section-title">Reviewed shipment facts</h2>
      <div className="grid">
        {textFields.map(([name, label]) => (
          <label key={name}>
            {label}
            <input name={name} defaultValue={v(name)} />
          </label>
        ))}
        <label>
          Pickup date
          <input type="date" name="pickupDate" defaultValue={v("pickupDate")} />
        </label>
        <label>
          Delivery date
          <input
            type="date"
            name="deliveryDate"
            defaultValue={v("deliveryDate")}
          />
        </label>
        <label>
          Weight (lb)
          <input
            type="number"
            min="1"
            max="80000"
            name="weightPounds"
            defaultValue={v("weightPounds")}
          />
        </label>
        <label>
          Equipment
          <select
            name="equipmentType"
            defaultValue={v("equipmentType") || "DRY_VAN"}
          >
            <option value="DRY_VAN">Dry van</option>
          </select>
        </label>
        <label>
          Pickup appointment start
          <input
            type="datetime-local"
            name="pickupAppointmentStart"
            defaultValue={local(v("pickupAppointmentStart"))}
          />
        </label>
        <label>
          Pickup appointment end
          <input
            type="datetime-local"
            name="pickupAppointmentEnd"
            defaultValue={local(v("pickupAppointmentEnd"))}
          />
        </label>
        <label>
          Delivery appointment start
          <input
            type="datetime-local"
            name="deliveryAppointmentStart"
            defaultValue={local(v("deliveryAppointmentStart"))}
          />
        </label>
        <label>
          Delivery appointment end
          <input
            type="datetime-local"
            name="deliveryAppointmentEnd"
            defaultValue={local(v("deliveryAppointmentEnd"))}
          />
        </label>
        <label>
          Pallet count
          <input
            type="number"
            min="1"
            max="100"
            name="palletCount"
            defaultValue={v("palletCount")}
          />
        </label>
        <label>
          Declared value (cents)
          <input
            type="number"
            min="0"
            name="declaredValueCents"
            defaultValue={v("declaredValueCents")}
          />
        </label>
      </div>
      <label className="check">
        <input
          type="checkbox"
          name="hazmat"
          defaultChecked={values.hazmat === true}
        />{" "}
        Hazmat
      </label>
      <label>
        Special instructions
        <textarea
          name="specialInstructions"
          defaultValue={v("specialInstructions")}
        />
      </label>
      <label>
        Internal notes
        <textarea name="internalNotes" defaultValue={v("internalNotes")} />
      </label>
    </>
  );
}
function local(value: string) {
  return value ? value.slice(0, 16) : "";
}
