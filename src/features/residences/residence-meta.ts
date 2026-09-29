import { Building, Factory, House, MapPin, Store, Tractor, type LucideIcon } from "lucide-react-native";
import type { Residence, ResidenceType } from "@/types/domain";

export const RESIDENCE_TYPE_ICON: Record<ResidenceType, LucideIcon> = {
  CASA: House,
  APARTAMENTO: Building,
  EMPRESA: Building,
  COMERCIAL: Store,
  INDUSTRIA: Factory,
  RURAL: Tractor,
  OUTRO: MapPin
};

/** Main line for a unit: street + number, or the UC for billing-only units (no registered address). */
export function residenceAddressLine(residence: Residence): string {
  const { street, number, complement } = residence.address;
  if (!street) return `UC ${residence.ucNumber}`;
  return `${street}${number ? `, ${number}` : ""}${complement ? ` · ${complement}` : ""}`;
}

/** District · City/UF with whatever parts are known. */
export function residenceLocality(residence: Residence): string {
  const { district, city, uf } = residence.address;
  const place = [city, uf].filter(Boolean).join("/");
  return [district, place].filter(Boolean).join(" · ") || "Endereço não informado";
}
