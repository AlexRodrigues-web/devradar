"use client";

import type { ComponentProps } from "react";

import { SearchBuilderPanel } from "@/components/search";
import { ResultsAndDetail } from "@/components/opportunities";
import { RunnerPanel } from "@/components/radar";
import { LogsPanel, MetricCard } from "@/components/shared";

type SearchBuilderPanelProps = ComponentProps<typeof SearchBuilderPanel>;
type ResultsAndDetailProps = ComponentProps<typeof ResultsAndDetail>;
type RunnerPanelProps = ComponentProps<typeof RunnerPanel>;

type RunViewStats = {
  newToday: number;
  highMatch: number;
  applications: number;
  pending: number;
};

type RunViewProps = SearchBuilderPanelProps & {
  stats: RunViewStats;
  progress: number;
  runStats: RunnerPanelProps["runStats"];
  cancelRadar: RunnerPanelProps["onCancel"];
  logs: string[];
  filteredOpportunities: ResultsAndDetailProps["jobs"];
  selectedOpportunity: ResultsAndDetailProps["selectedOpportunity"];
  opportunityEvents?: ResultsAndDetailProps["opportunityEvents"];
  isLoadingOpportunityEvents?: ResultsAndDetailProps["isLoadingOpportunityEvents"];
  uiLanguage: ResultsAndDetailProps["uiLanguage"];
  selectedStatus: ResultsAndDetailProps["selectedStatus"];
  listSearch: ResultsAndDetailProps["listSearch"];
  setListSearch: ResultsAndDetailProps["setListSearch"];
  setSelectedStatus: ResultsAndDetailProps["setSelectedStatus"];
  setSelectedOpportunityId: ResultsAndDetailProps["setSelectedOpportunityId"];
  updateOpportunityStatus: ResultsAndDetailProps["updateOpportunityStatus"];
  generateProposal: ResultsAndDetailProps["generateProposal"];
  generateFollowUp?: ResultsAndDetailProps["generateFollowUp"];
};

export function RunView({
  t,
  keywords,
  setKeywords,
  locationCountry,
  setLocationCountry,
  location,
  setLocation,
  workMode,
  setWorkMode,
  level,
  setLevel,
  category,
  setCategory,
  contractType,
  setContractType,
  jobLanguage,
  setJobLanguage,
  minBudget,
  setMinBudget,
  excludedTerms,
  setExcludedTerms,
  dateRange,
  setDateRange,
  scheduleEvery,
  setScheduleEvery,
  selectedSources,
  toggleSource,
  categoryOptions,
  locationCountryOptions,
  getLocationOptions,
  getLocationHint,
  sourceOptions,
  dateOptions,
  scheduleOptions,
  clearFilters,
  saveSearch,
  scheduleSearch,
  runRadar,
  isRunning,
  stats,
  progress,
  runStats,
  cancelRadar,
  logs,
  filteredOpportunities,
  selectedOpportunity,
  opportunityEvents = [],
  isLoadingOpportunityEvents = false,
  uiLanguage,
  selectedStatus,
  listSearch,
  setListSearch,
  setSelectedStatus,
  setSelectedOpportunityId,
  updateOpportunityStatus,
  generateProposal,
  generateFollowUp
}: RunViewProps) {
  return (
    <section className="grid gap-4">
      <section className="jobboard-run-layout">
        <SearchBuilderPanel
          t={t}
          keywords={keywords}
          setKeywords={setKeywords}
          locationCountry={locationCountry}
          setLocationCountry={setLocationCountry}
          location={location}
          setLocation={setLocation}
          workMode={workMode}
          setWorkMode={setWorkMode}
          level={level}
          setLevel={setLevel}
          category={category}
          setCategory={setCategory}
          contractType={contractType}
          setContractType={setContractType}
          jobLanguage={jobLanguage}
          setJobLanguage={setJobLanguage}
          minBudget={minBudget}
          setMinBudget={setMinBudget}
          excludedTerms={excludedTerms}
          setExcludedTerms={setExcludedTerms}
          dateRange={dateRange}
          setDateRange={setDateRange}
          scheduleEvery={scheduleEvery}
          setScheduleEvery={setScheduleEvery}
          selectedSources={selectedSources}
          toggleSource={toggleSource}
          categoryOptions={categoryOptions}
          locationCountryOptions={locationCountryOptions}
          getLocationOptions={getLocationOptions}
          getLocationHint={getLocationHint}
          sourceOptions={sourceOptions}
          dateOptions={dateOptions}
          scheduleOptions={scheduleOptions}
          clearFilters={clearFilters}
          saveSearch={saveSearch}
          scheduleSearch={scheduleSearch}
          runRadar={runRadar}
          isRunning={isRunning}
        />

        <div className="grid gap-4">
          <RunnerPanel
            t={t}
            isRunning={isRunning}
            progress={progress}
            runStats={runStats}
            onRun={runRadar}
            onCancel={cancelRadar}
          />

          <LogsPanel title={t.logs} logs={logs} />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label={t.newToday} value={stats.newToday.toString()} />
        <MetricCard label={t.highMatch} value={stats.highMatch.toString()} />
        <MetricCard label={t.applications} value={stats.applications.toString()} />
        <MetricCard label={t.pending} value={stats.pending.toString()} />
      </section>

      <ResultsAndDetail
        jobs={filteredOpportunities}
        selectedOpportunity={selectedOpportunity}
        opportunityEvents={opportunityEvents}
        isLoadingOpportunityEvents={isLoadingOpportunityEvents}
        uiLanguage={uiLanguage}
        t={t}
        selectedStatus={selectedStatus}
        listSearch={listSearch}
        setListSearch={setListSearch}
        setSelectedStatus={setSelectedStatus}
        setSelectedOpportunityId={setSelectedOpportunityId}
        updateOpportunityStatus={updateOpportunityStatus}
        generateProposal={generateProposal}
        generateFollowUp={generateFollowUp}
      />
    </section>
  );
}
