import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useFormScroll } from "@/components/forms/FormScroll";
import { useUpload } from "@/hooks/useUpload";
import type { BillExtraction, LocalFile, NewResidenceInput, Residence } from "@/types/domain";
import { formatCep, formatCpfCnpj, onlyDigits } from "@/utils/format";
import { BRAZIL_UFS } from "@/utils/validation";
import { useProfile } from "../../profile/hooks/useAccount";
import {
  BILL_REQUIRED_MESSAGE,
  NEW_RESIDENCE_DEFAULTS,
  newResidenceSchema,
  STEP_FIELDS,
  type NewResidenceField,
  type NewResidenceFormInput,
  type NewResidenceFormOutput
} from "../schemas";
import { uploadBill, useBillExtraction, useCepLookup, useCreateResidence, useCreationAvailability, useResidence, useUpdateResidence } from "./useResidences";

export const WIZARD_STEPS = ["Dados básicos", "Conta de luz", "Revisão", "Confirmação"] as const;
const LAST_INPUT_STEP = 2;

/** Extraction keys → form fields. */
const EXTRACTION_FIELD: Partial<Record<string, NewResidenceField>> = {
  holderName: "holderName",
  holderDocument: "holderDocument",
  ucNumber: "ucNumber",
  utilityCode: "utilityCode",
  cep: "cep",
  street: "street",
  addressNumber: "number",
  district: "district",
  city: "city",
  uf: "uf",
  averageConsumptionKwh: "averageConsumptionKwh"
};

function isUf(value: string): value is NewResidenceFormInput["uf"] {
  return (BRAZIL_UFS as readonly string[]).includes(value);
}

/** Form values for correcting an existing registration. */
function formFromResidence(residence: Residence): NewResidenceFormInput {
  return {
    ...NEW_RESIDENCE_DEFAULTS,
    type: residence.type,
    holderName: residence.holderName,
    holderDocument: formatCpfCnpj(residence.holderDocument),
    ucNumber: residence.ucNumber,
    utilityCode: residence.utilityCode ?? "",
    cep: residence.address.cep ? formatCep(residence.address.cep) : "",
    street: residence.address.street,
    number: residence.address.number,
    complement: residence.address.complement ?? "",
    district: residence.address.district,
    city: residence.address.city,
    uf: isUf(residence.address.uf) ? residence.address.uf : NEW_RESIDENCE_DEFAULTS.uf,
    averageConsumptionKwh: residence.averageConsumptionKwh ? String(residence.averageConsumptionKwh) : ""
  };
}

/**
 * State machine for "Nova unidade" / "Corrigir cadastro": 4 steps over one RHF
 * form, per-step validation with scroll-to-error, bill upload with progress
 * (presign → upload → confirm), AI reading pre-filling the review step, CEP
 * lookup and final submission (create or update).
 */
export function useNewResidenceWizard(editResidenceId: string | null = null) {
  const editing = editResidenceId !== null;
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState<Residence | null>(null);
  const [lowConfidence, setLowConfidence] = useState<readonly NewResidenceField[]>([]);
  const [extracted, setExtracted] = useState<BillExtraction | null>(null);
  const formScroll = useFormScroll<NewResidenceFormInput>();
  const form = useForm<NewResidenceFormInput, unknown, NewResidenceFormOutput>({
    resolver: zodResolver(newResidenceSchema),
    defaultValues: NEW_RESIDENCE_DEFAULTS,
    mode: "onTouched"
  });
  const profile = useProfile();
  const existing = useResidence(editResidenceId ?? "", { enabled: editing });
  const availability = useCreationAvailability(!editing);
  const upload = useUpload(uploadBill);
  const extraction = useBillExtraction();
  const cepLookup = useCepLookup();
  const createResidence = useCreateResidence();
  const updateResidence = useUpdateResidence();
  const submitMutation = editing ? updateResidence : createResidence;

  // Load the registration being corrected once.
  const loadedFor = useRef<string | null>(null);
  const existingData = existing.data;
  useEffect(() => {
    if (!existingData || loadedFor.current === existingData.id) return;
    loadedFor.current = existingData.id;
    form.reset(formFromResidence(existingData));
  }, [existingData, form]);

  const scrollTop = () => formScroll.scrollRef.current?.scrollTo({ y: 0, animated: false });

  const fillIfEmpty = (field: NewResidenceField, value: string) => {
    if (value && !form.getValues(field)) form.setValue(field, value, { shouldDirty: true });
  };

  const lookupCep = (cep: string) => {
    if (onlyDigits(cep).length !== 8) return;
    cepLookup.mutate(cep, {
      onSuccess: (address) => {
        fillIfEmpty("street", address.street);
        fillIfEmpty("district", address.district);
        form.setValue("city", address.city, { shouldValidate: true });
        if (isUf(address.uf)) form.setValue("uf", address.uf, { shouldValidate: true });
      }
    });
  };

  const applyExtraction = (data: BillExtraction) => {
    setExtracted(data);
    fillIfEmpty("holderName", data.holderName ?? "");
    fillIfEmpty("holderDocument", data.holderDocument ? formatCpfCnpj(data.holderDocument) : "");
    fillIfEmpty("ucNumber", data.ucNumber ?? "");
    fillIfEmpty("utilityCode", data.utilityCode ?? "");
    fillIfEmpty("street", data.street ?? "");
    fillIfEmpty("number", data.addressNumber ?? "");
    fillIfEmpty("district", data.district ?? "");
    fillIfEmpty("city", data.city ?? "");
    if (data.uf && isUf(data.uf)) form.setValue("uf", data.uf, { shouldDirty: true });
    fillIfEmpty("averageConsumptionKwh", data.averageConsumptionKwh ? String(data.averageConsumptionKwh) : "");
    if (data.cep && !form.getValues("cep")) {
      form.setValue("cep", formatCep(data.cep), { shouldDirty: true });
      if (!data.street) lookupCep(data.cep);
    }
    setLowConfidence(data.lowConfidenceFields.map((key) => EXTRACTION_FIELD[key]).filter((field): field is NewResidenceField => field !== undefined));
  };

  const selectBill = async (file: LocalFile) => {
    form.setValue("billDocumentId", "", { shouldDirty: true });
    form.clearErrors("billDocumentId");
    extraction.reset();
    setExtracted(null);
    // Reading and storing the bill run in parallel: the OCR endpoint receives the file itself.
    extraction.mutate(file, { onSuccess: applyExtraction });
    const document = await upload.start(file);
    if (document) form.setValue("billDocumentId", document.documentId, { shouldValidate: true, shouldDirty: true });
  };

  const removeBill = () => {
    upload.remove();
    extraction.reset();
    setExtracted(null);
    form.setValue("billDocumentId", "", { shouldDirty: true });
  };

  const prefillHolderFromProfile = () => {
    const me = profile.data;
    if (form.getValues("holder") !== "SELF" || !me) return;
    fillIfEmpty("holderName", me.displayName);
    if (me.document) fillIfEmpty("holderDocument", formatCpfCnpj(me.document));
  };

  const next = async () => {
    if (step === 1 && !editing && !form.getValues("billDocumentId")) {
      form.setError("billDocumentId", { type: "required", message: BILL_REQUIRED_MESSAGE });
      formScroll.onInvalid(form.formState.errors);
      return;
    }
    const fields = STEP_FIELDS[step] ?? [];
    const valid = await form.trigger([...fields], { shouldFocus: false });
    if (!valid) {
      formScroll.onInvalid(form.formState.errors);
      return;
    }
    if (step === 1) prefillHolderFromProfile();
    setStep((current) => Math.min(current + 1, LAST_INPUT_STEP));
    scrollTop();
  };

  const back = () => {
    setStep((current) => Math.max(current - 1, 0));
    scrollTop();
  };

  const toInput = (values: NewResidenceFormOutput): NewResidenceInput => ({
    type: values.type,
    ucNumber: values.ucNumber,
    utilityCode: values.utilityCode,
    holderName: values.holderName,
    holderDocument: values.holderDocument,
    address: {
      cep: values.cep,
      street: values.street,
      number: values.number,
      complement: values.complement === "" ? null : values.complement,
      district: values.district,
      city: values.city,
      uf: values.uf
    },
    billDocumentId: values.billDocumentId === "" ? null : values.billDocumentId,
    averageConsumptionKwh: values.averageConsumptionKwh,
    tariffClass: extracted?.tariffClass ?? null,
    faturaDistribuidoraId: extracted?.faturaDistribuidoraId ?? null
  });

  const onSaved = (residence: Residence) => {
    setSaved(residence);
    setStep(WIZARD_STEPS.length - 1);
    scrollTop();
  };

  const submit = form.handleSubmit((values) => {
    const input = toInput(values);
    if (editResidenceId) updateResidence.mutate({ residenceId: editResidenceId, input }, { onSuccess: onSaved });
    else createResidence.mutate(input, { onSuccess: onSaved });
  }, formScroll.onInvalid);

  return {
    step,
    editing,
    form,
    formScroll,
    upload,
    extraction,
    cepLookup,
    submitMutation,
    existing,
    availability,
    created: saved,
    lowConfidence,
    selectBill,
    removeBill,
    retryExtraction: () => {
      if (upload.file) extraction.mutate(upload.file, { onSuccess: applyExtraction });
    },
    lookupCep,
    next,
    back,
    submit,
    isReviewStep: step === LAST_INPUT_STEP,
    isDone: saved !== null,
    /** Unsaved input that leaving the screen would discard. */
    hasUnsavedInput: saved === null && (form.formState.isDirty || upload.file !== null)
  };
}

export type NewResidenceWizard = ReturnType<typeof useNewResidenceWizard>;
