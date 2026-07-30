"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SMEProfile, ScoreEngineResult, FinancingApplication } from "@/types";
import { SAMPLE_SME_PROFILES, calculateCashPulseScore } from "@/lib/engine";
import { fetchScoreResult, submitFinancingApplication } from "@/lib/api";

interface ApplicationContextType {
  activeView: "SME" | "RM";
  setActiveView: (view: "SME" | "RM") => void;
  selectedSme: SMEProfile;
  setSelectedSme: (sme: SMEProfile) => void;
  askedLoan: number;
  setAskedLoan: (val: number) => void;
  tenureMonths: number;
  setTenureMonths: (val: number) => void;
  purpose: string;
  setPurpose: (val: string) => void;
  scoreResult: ScoreEngineResult;
  isCalculating: boolean;
  recalculateScore: () => Promise<void>;
  applications: FinancingApplication[];
  submitCurrentApplication: () => Promise<FinancingApplication>;
  updateApplicationStatus: (id: string, status: FinancingApplication["status"]) => void;
  selectedRmApp: FinancingApplication | null;
  setSelectedRmApp: (app: FinancingApplication | null) => void;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<"SME" | "RM">("SME");
  const [selectedSme, setSelectedSme] = useState<SMEProfile>(SAMPLE_SME_PROFILES[0]);
  const [askedLoan, setAskedLoan] = useState<number>(SAMPLE_SME_PROFILES[0].defaultAskedLoan);
  const [tenureMonths, setTenureMonths] = useState<number>(SAMPLE_SME_PROFILES[0].defaultAskedTenure);
  const [purpose, setPurpose] = useState<string>("Inventory Stocking");

  const [scoreResult, setScoreResult] = useState<ScoreEngineResult>(() =>
    calculateCashPulseScore(SAMPLE_SME_PROFILES[0], SAMPLE_SME_PROFILES[0].defaultAskedLoan, SAMPLE_SME_PROFILES[0].defaultAskedTenure)
  );
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const [applications, setApplications] = useState<FinancingApplication[]>([]);
  const [selectedRmApp, setSelectedRmApp] = useState<FinancingApplication | null>(null);

  // When SME selection changes, update defaults
  useEffect(() => {
    setAskedLoan(selectedSme.defaultAskedLoan);
    setTenureMonths(selectedSme.defaultAskedTenure);
    const initialScore = calculateCashPulseScore(
      selectedSme,
      selectedSme.defaultAskedLoan,
      selectedSme.defaultAskedTenure
    );
    setScoreResult(initialScore);
  }, [selectedSme]);

  const recalculateScore = async () => {
    setIsCalculating(true);
    const result = await fetchScoreResult(selectedSme, askedLoan, tenureMonths);
    setScoreResult(result);
    setIsCalculating(false);
  };

  const submitCurrentApplication = async (): Promise<FinancingApplication> => {
    const appData: Omit<FinancingApplication, "id" | "submittedAt"> = {
      smeId: selectedSme.id,
      smeName: selectedSme.name,
      sector: selectedSme.sector,
      city: selectedSme.city,
      iban: selectedSme.iban,
      requestedAmount: askedLoan,
      tenureMonths,
      purpose,
      readinessScore: scoreResult.readinessScore,
      recommendedLimit: scoreResult.recommendedLimit,
      monthlyInstallment: scoreResult.monthlyInstallment,
      status: scoreResult.loanStatus === "APPROVED" ? "APPROVED_DISBURSED" : "COUNTER_OFFER_ISSUED",
      scoreResult,
    };

    const savedApp = await submitFinancingApplication(appData);
    setApplications((prev) => [savedApp, ...prev.filter((a) => a.id !== savedApp.id)]);
    return savedApp;
  };

  const updateApplicationStatus = (id: string, status: FinancingApplication["status"]) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status } : app))
    );
    if (selectedRmApp && selectedRmApp.id === id) {
      setSelectedRmApp((prev) => (prev ? { ...prev, status } : null));
    }
  };

  return (
    <ApplicationContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedSme,
        setSelectedSme,
        askedLoan,
        setAskedLoan,
        tenureMonths,
        setTenureMonths,
        purpose,
        setPurpose,
        scoreResult,
        isCalculating,
        recalculateScore,
        applications,
        submitCurrentApplication,
        updateApplicationStatus,
        selectedRmApp,
        setSelectedRmApp,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplication() {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error("useApplication must be used within an ApplicationProvider");
  }
  return context;
}
