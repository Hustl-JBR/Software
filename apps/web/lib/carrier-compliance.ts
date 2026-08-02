export type CarrierComplianceInput = {
  authority: string;
  insuranceStatus: string;
  insuranceExpires?: string;
  cargoLimit: number;
  doNotUse?: boolean;
};

export function carrierSelectionBlockReason(
  carrier: CarrierComplianceInput,
  declaredCargoValue: number,
  today = new Date().toISOString().slice(0, 10),
) {
  if (carrier.doNotUse) return "Carrier is marked do not use";
  if (carrier.authority !== "Active") return "Operating authority is inactive";
  if (carrier.insuranceStatus !== "Verified")
    return "Insurance requires review";
  if (carrier.insuranceExpires && carrier.insuranceExpires < today)
    return "Insurance is expired";
  if (carrier.cargoLimit < declaredCargoValue)
    return "Cargo value exceeds verified coverage";
  return null;
}
