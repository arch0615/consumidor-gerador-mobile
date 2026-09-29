import type { BillExtraction, Residence, Utility } from "@/types/domain";
import { demoProfile } from "./consumer";
import { daysAgo } from "./calendar";

export const utilities: readonly Utility[] = [
  { code: "ENEL_SP", name: "Enel São Paulo", ufs: ["SP"] },
  { code: "CPFL_PAULISTA", name: "CPFL Paulista", ufs: ["SP"] },
  { code: "EDP_SP", name: "EDP São Paulo", ufs: ["SP"] },
  { code: "ELEKTRO", name: "Neoenergia Elektro", ufs: ["SP", "MS"] },
  { code: "CEMIG", name: "Cemig", ufs: ["MG"] },
  { code: "LIGHT", name: "Light", ufs: ["RJ"] },
  { code: "ENEL_RJ", name: "Enel Rio", ufs: ["RJ"] },
  { code: "COPEL", name: "Copel", ufs: ["PR"] },
  { code: "CELESC", name: "Celesc", ufs: ["SC"] },
  { code: "RGE", name: "RGE Sul", ufs: ["RS"] },
  { code: "COELBA", name: "Neoenergia Coelba", ufs: ["BA"] },
  { code: "EQUATORIAL_GO", name: "Equatorial Goiás", ufs: ["GO"] },
  { code: "ENERGISA_MT", name: "Energisa Mato Grosso", ufs: ["MT"] }
];

export const PRIMARY_RESIDENCE_ID = "res_001";

export const residences: Residence[] = [
  {
    id: PRIMARY_RESIDENCE_ID,
    type: "CASA",
    ucNumber: "3012456789",
    utility: "Enel São Paulo",
    utilityCode: "ENEL_SP",
    holderName: demoProfile.displayName,
    holderDocument: demoProfile.document,
    address: { cep: "04538133", street: "Rua Funchal", number: "418", complement: null, district: "Vila Olímpia", city: "São Paulo", uf: "SP" },
    status: "ATIVA_COMPENSANDO",
    submittedAt: daysAgo(330),
    averageConsumptionKwh: 305,
    billingMode: "UNIFICADA",
    rejectionReason: null,
    contractSigningUrl: null,
    editable: true
  },
  {
    id: "res_002",
    type: "APARTAMENTO",
    ucNumber: "3098812004",
    utility: "Enel São Paulo",
    utilityCode: "ENEL_SP",
    holderName: demoProfile.displayName,
    holderDocument: demoProfile.document,
    address: { cep: "01310100", street: "Avenida Paulista", number: "1578", complement: "Apto 142", district: "Bela Vista", city: "São Paulo", uf: "SP" },
    status: "AGUARDANDO_ASSINATURA",
    submittedAt: daysAgo(6),
    averageConsumptionKwh: 180,
    billingMode: "UNIFICADA",
    rejectionReason: null,
    contractSigningUrl: "https://example.com/assinatura/demo",
    editable: true
  }
];

/** What the "AI" reads from an uploaded bill in the add-unit wizard. */
export const billExtractionSample: BillExtraction = {
  holderName: demoProfile.displayName,
  holderDocument: demoProfile.document,
  ucNumber: "3104477120",
  utilityCode: "ENEL_SP",
  cep: "05426100",
  street: "Rua Cardeal Arcoverde",
  addressNumber: "95",
  district: "Pinheiros",
  city: "São Paulo",
  uf: "SP",
  tariffClass: "B1 Residencial",
  averageConsumptionKwh: 240,
  confidence: "MEDIA",
  lowConfidenceFields: ["addressNumber"],
  faturaDistribuidoraId: null
};

/** Mock CEP lookup (the real app calls the backend's CEP proxy). */
export const cepDirectory: Record<string, { street: string; district: string; city: string; uf: string }> = {
  "05426100": { street: "Rua Cardeal Arcoverde", district: "Pinheiros", city: "São Paulo", uf: "SP" },
  "04538133": { street: "Rua Funchal", district: "Vila Olímpia", city: "São Paulo", uf: "SP" },
  "01310100": { street: "Avenida Paulista", district: "Bela Vista", city: "São Paulo", uf: "SP" },
  "30130010": { street: "Praça Sete de Setembro", district: "Centro", city: "Belo Horizonte", uf: "MG" },
  "22021001": { street: "Avenida Atlântica", district: "Copacabana", city: "Rio de Janeiro", uf: "RJ" }
};
