type Values = Record<string, unknown>;

export function ShipmentForm({
  values = {},
  compact = false,
}: {
  values?: Values;
  compact?: boolean;
}) {
  const v = (key: string) => String(values[key] ?? "");
  return (
    <div className={`shipment-fields ${compact ? "compact-fields" : ""}`}>
      <section className="form-section">
        <div className="form-section-heading">
          <span className="section-icon">↗</span>
          <div>
            <h3>Route</h3>
            <p>Origin and destination facilities</p>
          </div>
        </div>
        <div className="stop-form-grid">
          <fieldset>
            <legend>
              <span>1</span> Pickup
            </legend>
            <label>
              Facility name
              <input
                name="originFacilityName"
                defaultValue={v("originFacilityName")}
                placeholder="Origin facility"
              />
            </label>
            <div className="field-row">
              <label>
                City
                <input name="originCity" defaultValue={v("originCity")} />
              </label>
              <label className="state-field">
                State
                <input
                  name="originState"
                  defaultValue={v("originState")}
                  maxLength={2}
                />
              </label>
              <label className="zip-field">
                ZIP code
                <input
                  name="originPostalCode"
                  defaultValue={v("originPostalCode")}
                />
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>
              <span>2</span> Delivery
            </legend>
            <label>
              Facility name
              <input
                name="destinationFacilityName"
                defaultValue={v("destinationFacilityName")}
                placeholder="Destination facility"
              />
            </label>
            <div className="field-row">
              <label>
                City
                <input
                  name="destinationCity"
                  defaultValue={v("destinationCity")}
                />
              </label>
              <label className="state-field">
                State
                <input
                  name="destinationState"
                  defaultValue={v("destinationState")}
                  maxLength={2}
                />
              </label>
              <label className="zip-field">
                ZIP code
                <input
                  name="destinationPostalCode"
                  defaultValue={v("destinationPostalCode")}
                />
              </label>
            </div>
          </fieldset>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-heading">
          <span className="section-icon">▣</span>
          <div>
            <h3>Shipment</h3>
            <p>Freight profile and equipment</p>
          </div>
        </div>
        <div className="fields-grid four-col">
          <label className="span-2">
            Customer or shipper
            <input name="customerName" defaultValue={v("customerName")} />
          </label>
          <label className="span-2">
            Commodity
            <input name="commodity" defaultValue={v("commodity")} />
          </label>
          <label>
            Weight <span className="unit">lb</span>
            <input
              type="number"
              min="1"
              max="80000"
              name="weightPounds"
              defaultValue={v("weightPounds")}
            />
          </label>
          <label>
            Pallets
            <input
              type="number"
              min="1"
              max="100"
              name="palletCount"
              defaultValue={v("palletCount")}
            />
          </label>
          <label>
            Equipment
            <select name="equipmentType" defaultValue={v("equipmentType")}>
              <option value="">Select equipment</option>
              <option value="DRY_VAN">Dry van</option>
              <option value="REEFER">Reefer</option>
              <option value="FLATBED">Flatbed</option>
              <option value="STEP_DECK">Step deck</option>
              <option value="CONESTOGA">Conestoga</option>
              <option value="LOWBOY">Lowboy</option>
              <option value="RGN">RGN</option>
              <option value="POWER_ONLY">Power only</option>
              <option value="BOX_TRUCK">Box truck</option>
              <option value="SPRINTER">Sprinter</option>
              <option value="HOTSHOT">Hotshot</option>
              <option value="TANKER">Tanker</option>
            </select>
          </label>
          <label>
            Equipment detail
            <input
              name="equipmentDetail"
              defaultValue={v("equipmentDetail")}
              placeholder="Optional requirements"
            />
          </label>
          <label>
            Dimensions
            <input
              name="dimensions"
              defaultValue={v("dimensions")}
              placeholder="Optional"
            />
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="form-section-heading">
          <span className="section-icon">◷</span>
          <div>
            <h3>Schedule</h3>
            <p>Dates and appointment windows</p>
          </div>
        </div>
        <div className="fields-grid four-col">
          <label>
            Pickup date
            <input
              type="date"
              name="pickupDate"
              defaultValue={v("pickupDate")}
            />
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
            Pickup window start
            <input
              type="datetime-local"
              name="pickupAppointmentStart"
              defaultValue={local(v("pickupAppointmentStart"))}
            />
          </label>
          <label>
            Pickup window end
            <input
              type="datetime-local"
              name="pickupAppointmentEnd"
              defaultValue={local(v("pickupAppointmentEnd"))}
            />
          </label>
          <label>
            Delivery window start
            <input
              type="datetime-local"
              name="deliveryAppointmentStart"
              defaultValue={local(v("deliveryAppointmentStart"))}
            />
          </label>
          <label>
            Delivery window end
            <input
              type="datetime-local"
              name="deliveryAppointmentEnd"
              defaultValue={local(v("deliveryAppointmentEnd"))}
            />
          </label>
        </div>
      </section>

      <details className="optional-fields">
        <summary>
          <span>＋</span> Additional shipment details <small>Optional</small>
        </summary>
        <div className="fields-grid two-col optional-fields-body">
          <label>
            Temperature requirements
            <input
              name="temperatureRequirements"
              defaultValue={v("temperatureRequirements")}
            />
          </label>
          <label>
            Customer references
            <input
              name="customerReferences"
              defaultValue={v("customerReferences")}
            />
          </label>
          <label>
            Declared value <span className="unit">cents</span>
            <input
              type="number"
              min="0"
              name="declaredValueCents"
              defaultValue={v("declaredValueCents")}
            />
          </label>
          <label className="check-card">
            <input
              type="checkbox"
              name="hazmat"
              defaultChecked={values.hazmat === true}
            />
            <span>
              <b>Hazardous materials</b>
              <small>Shipment requires hazmat handling</small>
            </span>
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
        </div>
      </details>
    </div>
  );
}

function local(value: string) {
  return value ? value.slice(0, 16) : "";
}
