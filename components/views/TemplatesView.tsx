"use client";

import { FileText } from "lucide-react";

import { outreachTemplateCatalog } from "@/lib/outreach";
import type { AppLanguage } from "@/types/job";

type TemplatesViewProps = {
  t: Record<string, string>;
  uiLanguage: AppLanguage;
  viewLabels: Record<AppLanguage, Record<string, string>>;
};

export function TemplatesView({ t, uiLanguage, viewLabels }: TemplatesViewProps) {
  return (
    <section className="panel p-4" data-devradar="templates-catalog-view">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black">{viewLabels[uiLanguage].templates}</h2>
          <p className="mt-1 text-sm muted">{t.templatesDescription}</p>
        </div>

        <span className="badge w-fit">
          {outreachTemplateCatalog.length} templates
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {outreachTemplateCatalog.map((template) => (
          <article key={template.type} className="surface p-4" data-devradar="outreach-template-card">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10">
                <FileText size={16} />
              </span>

              <div className="min-w-0">
                <div className="font-black">{template.labels[uiLanguage]}</div>
                <p className="mt-2 text-sm leading-6 muted">
                  {template.description[uiLanguage]}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="badge max-w-full break-words text-left">
                {template.type.replaceAll("_", " ")}
              </span>

              <button type="button" className="btn btn-soft ml-auto">
                <FileText size={15} />
                {t.useTemplate}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}