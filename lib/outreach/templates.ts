import type { AppLanguage, Job } from "@/types/job";

export type OutreachTemplateType =
  | "short_application"
  | "recruiter_email"
  | "freelance_proposal"
  | "follow_up"
  | "interview_reply";

export type OutreachDraft = {
  templateType: OutreachTemplateType;
  subject: string;
  body: string;
  language: AppLanguage;
};

export type OutreachCandidateContext = {
  name?: string | null;
  title?: string | null;
  seniority?: string | null;
  skills?: string[];
  languages?: string[];
  locations?: string[];
  workModes?: string[];
  summary?: string | null;
};

export type OutreachLoopContext = {
  name?: string | null;
  role?: string | null;
  keywords?: string[];
  technologies?: string[];
  location?: string | null;
  seniority?: string | null;
  workMode?: string | null;
  contract?: string | null;
  frequency?: string | null;
  minScore?: number | null;
};

export type OutreachBuildInput = {
  job: Job;
  language: AppLanguage;
  templateType?: OutreachTemplateType;
  candidateName?: string;
  candidateContext?: OutreachCandidateContext | null;
  loopContext?: OutreachLoopContext | null;
};

export type OutreachTemplateDefinition = {
  type: OutreachTemplateType;
  labels: Record<AppLanguage, string>;
  description: Record<AppLanguage, string>;
};

const DEFAULT_CANDIDATE_NAME = "Alex";

export const outreachTemplateCatalog: OutreachTemplateDefinition[] = [
  {
    type: "short_application",
    labels: {
      pt: "Candidatura curta",
      en: "Short application",
      es: "Candidatura corta"
    },
    description: {
      pt: "Mensagem direta para candidatura rápida com foco no encaixe técnico.",
      en: "Direct message for a quick application focused on technical fit.",
      es: "Mensaje directo para candidatura rápida con foco en encaje técnico."
    }
  },
  {
    type: "recruiter_email",
    labels: {
      pt: "Email para recrutador",
      en: "Recruiter email",
      es: "Email para recruiter"
    },
    description: {
      pt: "Abordagem profissional para recrutador ou hiring manager.",
      en: "Professional approach for a recruiter or hiring manager.",
      es: "Enfoque profesional para recruiter o hiring manager."
    }
  },
  {
    type: "freelance_proposal",
    labels: {
      pt: "Proposta freelance",
      en: "Freelance proposal",
      es: "Propuesta freelance"
    },
    description: {
      pt: "Proposta objetiva com entrega, valor e próximo passo.",
      en: "Objective proposal with delivery value and next step.",
      es: "Propuesta objetiva con entrega, valor y próximo paso."
    }
  },
  {
    type: "follow_up",
    labels: {
      pt: "Follow-up",
      en: "Follow-up",
      es: "Seguimiento"
    },
    description: {
      pt: "Mensagem curta para retomar contacto após candidatura ou conversa.",
      en: "Short message to reconnect after an application or conversation.",
      es: "Mensaje corto para retomar contacto tras candidatura o conversación."
    }
  },
  {
    type: "interview_reply",
    labels: {
      pt: "Resposta a entrevista",
      en: "Interview reply",
      es: "Respuesta a entrevista"
    },
    description: {
      pt: "Resposta profissional para confirmar interesse e disponibilidade.",
      en: "Professional reply to confirm interest and availability.",
      es: "Respuesta profesional para confirmar interés y disponibilidad."
    }
  }
];

function safeText(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text && text.length > 0 ? text : fallback;
}

function listTop(values: string[] | undefined, fallback: string) {
  const cleaned = values?.map((value) => value.trim()).filter(Boolean).slice(0, 3) ?? [];
  return cleaned.length > 0 ? cleaned.join(", ") : fallback;
}

function listContextValues(values: string[] | undefined, maxItems = 5) {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .join(", ");
}

function joinContextParts(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join("; ");
}

function buildCandidateContextLine(context: OutreachCandidateContext | null | undefined, language: AppLanguage) {
  if (!context) return null;

  const role = safeText(context.title, "");
  const seniority = safeText(context.seniority, "");
  const skills = listContextValues(context.skills, 6);
  const languages = listContextValues(context.languages, 4);
  const locations = listContextValues(context.locations, 4);
  const workModes = listContextValues(context.workModes, 4);
  const summary = safeText(context.summary, "");
  const profile = [role, seniority].filter(Boolean).join(" · ");
  const preferences = [locations, workModes].filter(Boolean).join(" / ");

  if (!profile && !skills && !languages && !preferences && !summary) {
    return null;
  }

  if (language === "en") {
    return joinContextParts([
      profile ? `DevRadar profile: ${profile}` : "DevRadar profile: active developer profile",
      skills ? `core skills: ${skills}` : null,
      languages ? `languages: ${languages}` : null,
      preferences ? `preferences: ${preferences}` : null,
      summary ? `summary: ${summary}` : null
    ]);
  }

  if (language === "es") {
    return joinContextParts([
      profile ? `Perfil DevRadar: ${profile}` : "Perfil DevRadar: perfil dev activo",
      skills ? `skills principales: ${skills}` : null,
      languages ? `idiomas: ${languages}` : null,
      preferences ? `preferencias: ${preferences}` : null,
      summary ? `resumen: ${summary}` : null
    ]);
  }

  return joinContextParts([
    profile ? `Perfil DevRadar: ${profile}` : "Perfil DevRadar: perfil dev ativo",
    skills ? `skills principais: ${skills}` : null,
    languages ? `idiomas: ${languages}` : null,
    preferences ? `preferências: ${preferences}` : null,
    summary ? `resumo: ${summary}` : null
  ]);
}

function buildLoopContextLine(context: OutreachLoopContext | null | undefined, language: AppLanguage) {
  if (!context) return null;

  const target = safeText(context.role ?? context.name, "");
  const keywords = listContextValues(context.keywords, 6);
  const technologies = listContextValues(context.technologies, 6);
  const location = safeText(context.location, "");
  const seniority = safeText(context.seniority, "");
  const workMode = safeText(context.workMode, "");
  const contract = safeText(context.contract, "");
  const frequency = safeText(context.frequency, "");
  const minScore = typeof context.minScore === "number" && Number.isFinite(context.minScore) ? `${context.minScore}` : "";

  const filters = joinContextParts([
    keywords ? `keywords: ${keywords}` : null,
    technologies ? `stack: ${technologies}` : null,
    location ? `location: ${location}` : null,
    seniority ? `seniority: ${seniority}` : null,
    workMode ? `work mode: ${workMode}` : null,
    contract ? `contract: ${contract}` : null,
    frequency ? `frequency: ${frequency}` : null,
    minScore ? `min score: ${minScore}` : null
  ]);

  if (!target && !filters) {
    return null;
  }

  if (language === "en") {
    return joinContextParts([
      target ? `Search loop: ${target}` : "Search loop: active search loop",
      filters
    ]);
  }

  if (language === "es") {
    return joinContextParts([
      target ? `Loop de búsqueda: ${target}` : "Loop de búsqueda: loop activo",
      filters
    ]);
  }

  return joinContextParts([
    target ? `Loop de busca: ${target}` : "Loop de busca: loop ativo",
    filters
  ]);
}

function getContextIntro(language: AppLanguage) {
  if (language === "en") return "Additional DevRadar context used for this draft:";
  if (language === "es") return "Contexto adicional de DevRadar usado para este borrador:";
  return "Contexto adicional do DevRadar usado para este rascunho:";
}

function appendContextToDraft(draft: OutreachDraft, input: OutreachBuildInput, candidateName: string) {
  const contextLines = [
    buildCandidateContextLine(input.candidateContext, input.language),
    buildLoopContextLine(input.loopContext, input.language)
  ].filter((line): line is string => Boolean(line));

  if (contextLines.length === 0) {
    return draft;
  }

  const contextBlock = [
    getContextIntro(input.language),
    ...contextLines.map((line) => `- ${line}`)
  ].join("\n");

  if (draft.body.includes(contextBlock)) {
    return draft;
  }

  const signature = getCandidateSignature(input.language, candidateName);

  if (draft.body.endsWith(signature)) {
    const bodyBeforeSignature = draft.body.slice(0, -signature.length).trimEnd();

    return {
      ...draft,
      body: [bodyBeforeSignature, contextBlock, signature].join("\n\n")
    };
  }

  return {
    ...draft,
    body: [draft.body, contextBlock].join("\n\n")
  };
}

function getFitLine(job: Job, language: AppLanguage) {
  const strengths = listTop(job.strengths, language === "en" ? "relevant product delivery experience" : language === "es" ? "experiencia relevante en entrega de producto" : "experiência relevante em entrega de produto");
  const score = Number.isFinite(job.matchScore) ? `${job.matchScore}%` : null;

  if (language === "en") {
    return score ? `The opportunity has a ${score} match in DevRadar, mainly because of: ${strengths}.` : `The opportunity looks aligned with my profile, mainly because of: ${strengths}.`;
  }

  if (language === "es") {
    return score ? `La oportunidad tiene un match de ${score} en DevRadar, principalmente por: ${strengths}.` : `La oportunidad parece alineada con mi perfil, principalmente por: ${strengths}.`;
  }

  return score ? `A oportunidade tem ${score} de match no DevRadar, principalmente por: ${strengths}.` : `A oportunidade parece alinhada com o meu perfil, principalmente por: ${strengths}.`;
}

function getCandidateSignature(language: AppLanguage, candidateName: string) {
  if (language === "en") return `Best regards,\n${candidateName}`;
  if (language === "es") return `Saludos,\n${candidateName}`;
  return `Cumprimentos,\n${candidateName}`;
}

function buildShortApplication(job: Job, language: AppLanguage, candidateName: string): OutreachDraft {
  const title = safeText(job.title, "role");
  const company = safeText(job.company, "the team");

  if (language === "en") {
    return {
      templateType: "short_application",
      subject: `Application for ${title}`,
      body: [
        `Hi ${company} team,`,
        `I found the ${title} opportunity and believe my profile can be a strong fit.`,
        getFitLine(job, language),
        "I work with modern web development and product-focused delivery, and I would be happy to share more context about relevant projects.",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  if (language === "es") {
    return {
      templateType: "short_application",
      subject: `Candidatura para ${title}`,
      body: [
        `Hola equipo de ${company},`,
        `He encontrado la oportunidad ${title} y creo que mi perfil puede encajar bien.`,
        getFitLine(job, language),
        "Trabajo con desarrollo web moderno y entrega orientada a producto, y me gustaría compartir más contexto sobre proyectos relevantes.",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  return {
    templateType: "short_application",
    subject: `Candidatura para ${title}`,
    body: [
      `Olá equipa da ${company},`,
      `Encontrei a oportunidade ${title} e acredito que o meu perfil pode encaixar bem.`,
      getFitLine(job, language),
      "Trabalho com desenvolvimento web moderno e entrega orientada a produto, e terei gosto em partilhar mais contexto sobre projetos relevantes.",
      getCandidateSignature(language, candidateName)
    ].join("\n\n"),
    language
  };
}

function buildRecruiterEmail(job: Job, language: AppLanguage, candidateName: string): OutreachDraft {
  const title = safeText(job.title, "role");
  const company = safeText(job.company, "your team");
  const source = safeText(job.source, "DevRadar");

  if (language === "en") {
    return {
      templateType: "recruiter_email",
      subject: `Interest in ${title} at ${company}`,
      body: [
        "Hi,",
        `I saw the ${title} opportunity at ${company} through ${source} and wanted to reach out directly.`,
        getFitLine(job, language),
        "I am especially interested in roles where I can combine frontend quality, backend understanding and practical product delivery.",
        "Would it make sense to schedule a short conversation to validate the fit?",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  if (language === "es") {
    return {
      templateType: "recruiter_email",
      subject: `Interés en ${title} en ${company}`,
      body: [
        "Hola,",
        `Vi la oportunidad ${title} en ${company} a través de ${source} y quería contactar directamente.`,
        getFitLine(job, language),
        "Me interesan especialmente roles donde pueda combinar calidad frontend, comprensión backend y entrega práctica de producto.",
        "¿Tendría sentido agendar una conversación corta para validar el encaje?",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  return {
    templateType: "recruiter_email",
    subject: `Interesse em ${title} na ${company}`,
    body: [
      "Olá,",
      `Vi a oportunidade ${title} na ${company} através de ${source} e queria entrar em contacto diretamente.`,
      getFitLine(job, language),
      "Interesso-me especialmente por funções onde possa combinar qualidade frontend, entendimento backend e entrega prática de produto.",
      "Faria sentido marcarmos uma conversa curta para validar o encaixe?",
      getCandidateSignature(language, candidateName)
    ].join("\n\n"),
    language
  };
}

function buildFreelanceProposal(job: Job, language: AppLanguage, candidateName: string): OutreachDraft {
  const title = safeText(job.title, "project");
  const company = safeText(job.company, "your team");
  const tags = listTop(job.tags, language === "en" ? "web development" : language === "es" ? "desarrollo web" : "desenvolvimento web");

  if (language === "en") {
    return {
      templateType: "freelance_proposal",
      subject: `Proposal for ${title}`,
      body: [
        `Hi ${company} team,`,
        `I can help with ${title}, especially around ${tags}.`,
        "My approach would be to first clarify the goal, define a small deliverable, implement it cleanly, and keep communication simple with visible progress.",
        getFitLine(job, language),
        "I would be happy to review the scope and suggest a practical first milestone.",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  if (language === "es") {
    return {
      templateType: "freelance_proposal",
      subject: `Propuesta para ${title}`,
      body: [
        `Hola equipo de ${company},`,
        `Puedo ayudar con ${title}, especialmente en ${tags}.`,
        "Mi enfoque sería aclarar primero el objetivo, definir una entrega pequeña, implementarla de forma limpia y mantener una comunicación simple con progreso visible.",
        getFitLine(job, language),
        "Me gustaría revisar el alcance y sugerir un primer milestone práctico.",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  return {
    templateType: "freelance_proposal",
    subject: `Proposta para ${title}`,
    body: [
      `Olá equipa da ${company},`,
      `Posso ajudar com ${title}, especialmente em ${tags}.`,
      "A minha abordagem seria clarificar primeiro o objetivo, definir uma entrega pequena, implementar de forma limpa e manter comunicação simples com progresso visível.",
      getFitLine(job, language),
      "Terei gosto em rever o escopo e sugerir um primeiro milestone prático.",
      getCandidateSignature(language, candidateName)
    ].join("\n\n"),
    language
  };
}

function buildFollowUp(job: Job, language: AppLanguage, candidateName: string): OutreachDraft {
  const title = safeText(job.title, "role");

  if (language === "en") {
    return {
      templateType: "follow_up",
      subject: `Follow-up on ${title}`,
      body: [
        "Hi,",
        `I wanted to follow up on my interest in the ${title} opportunity.`,
        "I remain interested and would be happy to share more details about my experience, projects or availability.",
        "Thanks again for your time.",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  if (language === "es") {
    return {
      templateType: "follow_up",
      subject: `Seguimiento sobre ${title}`,
      body: [
        "Hola,",
        `Quería hacer seguimiento sobre mi interés en la oportunidad ${title}.`,
        "Sigo interesado y puedo compartir más detalles sobre mi experiencia, proyectos o disponibilidad.",
        "Gracias de nuevo por su tiempo.",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  return {
    templateType: "follow_up",
    subject: `Follow-up sobre ${title}`,
    body: [
      "Olá,",
      `Queria fazer follow-up sobre o meu interesse na oportunidade ${title}.`,
      "Continuo interessado e posso partilhar mais detalhes sobre a minha experiência, projetos ou disponibilidade.",
      "Obrigado novamente pelo vosso tempo.",
      getCandidateSignature(language, candidateName)
    ].join("\n\n"),
    language
  };
}

function buildInterviewReply(job: Job, language: AppLanguage, candidateName: string): OutreachDraft {
  const title = safeText(job.title, "role");

  if (language === "en") {
    return {
      templateType: "interview_reply",
      subject: `Re: ${title}`,
      body: [
        "Hi,",
        `Thank you for the update regarding the ${title} opportunity.`,
        "I am still interested and available to continue the process. Please let me know which time slots work best for the next step.",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  if (language === "es") {
    return {
      templateType: "interview_reply",
      subject: `Re: ${title}`,
      body: [
        "Hola,",
        `Gracias por la actualización sobre la oportunidad ${title}.`,
        "Sigo interesado y disponible para continuar el proceso. Por favor, indíqueme qué horarios funcionan mejor para el siguiente paso.",
        getCandidateSignature(language, candidateName)
      ].join("\n\n"),
      language
    };
  }

  return {
    templateType: "interview_reply",
    subject: `Re: ${title}`,
    body: [
      "Olá,",
      `Obrigado pela atualização sobre a oportunidade ${title}.`,
      "Continuo interessado e disponível para avançar no processo. Por favor, indiquem-me que horários funcionam melhor para o próximo passo.",
      getCandidateSignature(language, candidateName)
    ].join("\n\n"),
    language
  };
}

export function buildOutreachMessage(input: OutreachBuildInput): OutreachDraft {
  const templateType = input.templateType ?? "short_application";
  const candidateName = safeText(input.candidateName ?? input.candidateContext?.name, DEFAULT_CANDIDATE_NAME);

  let draft: OutreachDraft;

  if (templateType === "recruiter_email") {
    draft = buildRecruiterEmail(input.job, input.language, candidateName);
  } else if (templateType === "freelance_proposal") {
    draft = buildFreelanceProposal(input.job, input.language, candidateName);
  } else if (templateType === "follow_up") {
    draft = buildFollowUp(input.job, input.language, candidateName);
  } else if (templateType === "interview_reply") {
    draft = buildInterviewReply(input.job, input.language, candidateName);
  } else {
    draft = buildShortApplication(input.job, input.language, candidateName);
  }

  return appendContextToDraft(draft, input, candidateName);
}

export function buildOutreachPreviewMessages(job: Job, language: AppLanguage) {
  return outreachTemplateCatalog.map((template) => buildOutreachMessage({
    job,
    language,
    templateType: template.type
  }));
}