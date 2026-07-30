"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { SMEProfile, ScoreEngineResult, FinancingApplication } from "@/types";
import { calculateCashPulseScore } from "@/lib/engine";
import { DEMO_SME_PROFILES } from "@/lib/sme-data";
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
  const [selectedSme, setSelectedSme] = useState<SMEProfile>(DEMO_SME_PROFILES[0]);
  const [askedLoan, setAskedLoan] = useState<number>(selectedSme.defaultAskedLoan ?? 1500000);
  const [tenureMonths, setTenureMonths] = useState<number>(selectedSme.defaultAskedTenure ?? 12);
  const [purpose, setPurpose] = useState<string>("Inventory Stocking");

  const [scoreResult, setScoreResult] = useState<ScoreEngineResult>(() =>
    calculateCashPulseScore(selectedSme, selectedSme.defaultAskedLoan ?? 1500000, selectedSme.defaultAskedTenure ?? 12)
  );
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const [applications, setApplications] = useState<FinancingApplication[]>([]);
  const [selectedRmApp, setSelectedRmApp] = useState<FinancingApplication | null>(null);

  // When SME selection changes, update defaults
  useEffect(() => {
    const loan = selectedSme.defaultAskedLoan ?? 1500000;
    const tenure = selectedSme.defaultAskedTenure ?? 12;
    setAskedLoan(loan);
    setTenureMonths(tenure);
    const initialScore = calculateCashPulseScore(selectedSme, loan, tenure);
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
