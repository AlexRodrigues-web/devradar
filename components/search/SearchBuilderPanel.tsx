"use client";

import { CalendarClock, Play, RotateCcw, Save } from "lucide-react";

import { Field } from "@/components/shared";
import type {
  ContractType,
  ExperienceLevel,
  JobSource,
  OpportunityLanguage,
  WorkMode
} from "@/types/job";

type SelectOption = {
  value: string;
  label: string;
  country?: string;
  hint?: string;
};

type SearchBuilderPanelProps = {
  t: Record<string, string>;

  keywords: string;
  setKeywords: (value: string) => void;

  locationCountry: string;
  setLocationCountry: (value: string) => void;

  location: string;
  setLocation: (value: string) => void;

  workMode: WorkMode;
  setWorkMode: (value: WorkMode) => void;

  level: ExperienceLevel;
  setLevel: (value: ExperienceLevel) => void;

  category: string;
  setCategory: (value: string) => void;

  contractType: ContractType;
  setContractType: (value: ContractType) => void;

  jobLanguage: OpportunityLanguage;
  setJobLanguage: (value: OpportunityLanguage) => void;

  minBudget: string;
  setMinBudget: (value: string) => void;

  excludedTerms: string;
  setExcludedTerms: (value: string) => void;

  dateRange: string;
  setDateRange: (value: string) => void;

  scheduleEvery: string;
  setScheduleEvery: (value: string) => void;

  selectedSources: JobSource[];
  toggleSource: (source: JobSource) => void;

  categoryOptions: readonly string[];
  locationCountryOptions: readonly SelectOption[];
  getLocationOptions: (country: string) => readonly SelectOption[];
  getLocationHint: (value: string) => string;
  sourceOptions: readonly JobSource[];
  dateOptions: readonly string[];
  scheduleOptions: readonly string[];

  clearFilters: () => void;
  saveSearch: () => void;
  scheduleSearch: () => void;
  runRadar: () => void;
  isRunning: boolean;
};

export function SearchBuilderPanel({
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
  isRunning
}: SearchBuilderPanelProps) {
  return (
                <div className="panel search-builder-panel">
                  <div className="jobboard-search-head">
  <div>
    <p className="jobboard-eyebrow">{t.professionalSearchEyebrow}</p>
    <h2>{t.findOpportunities}</h2>
    <p>{t.findOpportunitiesDescription}</p>
  </div>

  <div className="jobboard-trust-row">
    <span>{t.verifiedSources}</span>
    <span>{t.updatedData}</span>
    <span>{selectedSources.length} {t.activeSources}</span>
  </div>
</div>

                  <div className="builder-stack">
                    <section className="builder-card builder-card-main">
                      <div className="builder-card-head">
                        <h3>{t.whatToFind}</h3>
                        <p>{t.whatToFindDescription}</p>
                      </div>

                      <div className="builder-tags-box">
                        {keywords
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              className="builder-chip"
                              onClick={() => {
                                const nextSkills = keywords
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean)
                                  .filter((item) => item.toLowerCase() !== skill.toLowerCase());

                                setKeywords(nextSkills.join(", "));
                              }}
                            >
                              {skill}
                              <span>×</span>
                            </button>
                          ))}

                        <input
                          className="builder-chip-input"
                          placeholder={t.addSkillPlaceholder}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();

                            const value = event.currentTarget.value.trim();
                            if (!value) return;

                            const currentSkills = keywords
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean);

                            const exists = currentSkills.some((item) => item.toLowerCase() === value.toLowerCase());

                            if (!exists) {
                              setKeywords([...currentSkills, value].join(", "));
                            }

                            event.currentTarget.value = "";
                          }}
                        />
                      </div>

                      <div className="builder-quick">
                        <span>{t.quickSuggestions}</span>

                        <div className="builder-quick-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setWorkMode("remote");
                              setLocation("pt-remote-europe");
                              setExcludedTerms("senior, staff, lead, principal, manager, german c1, deutsch, hybrid, onsite, brazil");
                            }}
                            className={workMode === "remote" ? "builder-quick-btn active" : "builder-quick-btn"}
                          >
                            {t.realRemote}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setLevel("junior");
                              setExcludedTerms("senior, staff, lead, principal, manager, architect, german c1, deutsch, hybrid, onsite, brazil");
                            }}
                            className={level === "junior" ? "builder-quick-btn active" : "builder-quick-btn"}
                          >
                            {t.safeJunior}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setKeywords("react, next.js");
                              setCategory("frontend");
                            }}
                            className={category === "frontend" ? "builder-quick-btn active" : "builder-quick-btn"}
                          >
                            Frontend React
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setKeywords("wordpress, react, next.js");
                              setCategory("wordpress");
                            }}
                            className={category === "wordpress" ? "builder-quick-btn active" : "builder-quick-btn"}
                          >
                            WordPress
                          </button>
                        </div>
                      </div>
                    </section>

                    <section className="builder-card">
                      <div className="builder-card-head">
                        <h3>{t.refineResults}</h3>
                        <p>{t.refineResultsDescription}</p>
                      </div>

                      <div className="job-filter-grid">
                        <Field label={t.location}>
                          <div className="location-console">
                            <div className="location-console-field">
                              <span>{t.countryRegion}</span>
                              <select
                                value={locationCountry}
                                onChange={(event) => {
                                  const nextCountry = event.target.value;
                                  const firstOption = getLocationOptions(nextCountry);

                                  setLocationCountry(nextCountry);
                                  setLocation(firstOption[0]?.value ?? "any");
                                }}
                                className="input-field"
                              >
                                {locationCountryOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="location-console-field">
                              <span>{t.areaLocation}</span>
                              <select
                                value={location}
                                onChange={(event) => setLocation(event.target.value)}
                                className="input-field"
                              >
                                {getLocationOptions(locationCountry).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <p className="location-console-help">{getLocationHint(location)}</p>
                          </div>
                        </Field>

                        <Field label={t.workMode}>
                          <select value={workMode} onChange={(event) => setWorkMode(event.target.value as WorkMode)} className="input-field">
                            <option value="any">{t.all}</option>
                            <option value="remote">{t.remote}</option>
                            <option value="hybrid">{t.hybrid}</option>
                            <option value="onsite">{t.onsite}</option>
                          </select>
                        </Field>

                        <Field label={t.level}>
                          <select value={level} onChange={(event) => setLevel(event.target.value as ExperienceLevel)} className="input-field">
                            <option value="any">{t.all}</option>
                            <option value="junior">{t.junior}</option>
                            <option value="mid">{t.mid}</option>
                            <option value="senior">{t.senior}</option>
                          </select>
                        </Field>

                        <Field label={t.category}>
                          <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-field">
                            <option value="any">{t.all}</option>
                            {categoryOptions.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                    </section>

                    <section className="builder-card">
                      <div className="builder-card-head">
                        <h3>{t.excludeTerms}</h3>
                        <p>{t.excludeTermsDescription}</p>
                      </div>

                      <div className="builder-tags-box builder-rules-box">
                        {excludedTerms
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean)
                          .map((term) => (
                            <button
                              key={term}
                              type="button"
                              className="builder-chip builder-chip-danger"
                              onClick={() => {
                                const nextTerms = excludedTerms
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean)
                                  .filter((item) => item.toLowerCase() !== term.toLowerCase());

                                setExcludedTerms(nextTerms.join(", "));
                              }}
                            >
                              {term}
                              <span>×</span>
                            </button>
                          ))}

                        <input
                          className="builder-chip-input"
                          placeholder={t.blockTermPlaceholder}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();

                            const value = event.currentTarget.value.trim();
                            if (!value) return;

                            const currentTerms = excludedTerms
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean);

                            const exists = currentTerms.some((item) => item.toLowerCase() === value.toLowerCase());

                            if (!exists) {
                              setExcludedTerms([...currentTerms, value].join(", "));
                            }

                            event.currentTarget.value = "";
                          }}
                        />
                      </div>
                    </section>

                    <details className="builder-card builder-details">
                      <summary>
                        <span>{t.moreFilters}</span>
                        <span>{t.moreFiltersDescription}</span>
                      </summary>

                      <div className="builder-details-content">
                        <div className="builder-form-grid">
                          <Field label={t.contract}>
                            <select value={contractType} onChange={(event) => setContractType(event.target.value as ContractType)} className="input-field">
                              <option value="any">{t.all}</option>
                              <option value="freelance">Freelance</option>
                              <option value="contract">Contract</option>
                              <option value="part-time">Part-time</option>
                              <option value="full-time">Full-time</option>
                            </select>
                          </Field>

                          <Field label={t.language}>
                            <select value={jobLanguage} onChange={(event) => setJobLanguage(event.target.value as OpportunityLanguage)} className="input-field">
                              <option value="any">{t.all}</option>
                              <option value="pt">Português</option>
                              <option value="en">English</option>
                              <option value="es">Español</option>
                            </select>
                          </Field>

                          <Field label={t.minBudget}>
                            <input
                              value={minBudget}
                              onChange={(event) => setMinBudget(event.target.value)}
                              className="input-field"
                              placeholder="Ex: 1200"
                              inputMode="numeric"
                            />
                          </Field>

                          <Field label={t.dateRange}>
                            <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="input-field">
                              {dateOptions.map((item) => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                            </select>
                          </Field>
                        </div>

                        <div className="builder-source-row">
                          <div>
                            <h4>{t.sourcesTitle}</h4>
                            <p>{t.sourcesDescription}</p>
                          </div>

                          <div className="builder-source-actions">
                            {sourceOptions.map((source) => {
                              const active = selectedSources.includes(source);

                              return (
                                <button
                                  key={source}
                                  type="button"
                                  onClick={() => toggleSource(source)}
                                  className={active ? "builder-source active" : "builder-source"}
                                >
                                  {source}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </details>

                    <div className="builder-action-bar">
                      <Field label={t.schedule}>
                        <select value={scheduleEvery} onChange={(event) => setScheduleEvery(event.target.value)} className="input-field min-w-44">
                          {scheduleOptions.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </Field>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="button" onClick={clearFilters} className="btn btn-soft">
                          <RotateCcw size={16} />
                          {t.clearFilters}
                        </button>

                        <button type="button" onClick={saveSearch} className="btn btn-soft">
                          <Save size={16} />
                          {t.saveSearch}
                        </button>

                        <button type="button" onClick={scheduleSearch} className="btn btn-soft">
                          <CalendarClock size={16} />
                          {t.scheduleSearch}
                        </button>

                        <button type="button" onClick={runRadar} disabled={isRunning} className="btn btn-primary">
                          <Play size={17} />
                          {t.runRadar}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
);
}
