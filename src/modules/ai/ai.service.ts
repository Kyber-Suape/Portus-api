import type { RdoTextSuggestionInput } from "./ai.schemas";

const SUGGESTIONS_BY_CATEGORY: Record<string, string> = {
  Terraplenagem: "Durante o período, foi realizada a escavação e movimentação de terra no setor indicado, sem intercorrências.",
  Fundação: "Executada a escavação para as sapatas da fundação, com conferência topográfica de cotas e alinhamento.",
  Concretagem: "Realizado o lançamento de concreto na estrutura prevista, com retirada de corpos de prova para controle tecnológico.",
  Alvenaria: "Executado o levantamento de alvenaria conforme projeto, com verificação de prumo e nível.",
};

const GENERIC_SUGGESTION =
  "Durante o período, a equipe executou as atividades programadas no cronograma, sem ocorrências que comprometessem o andamento da obra.";

const GENERIC_TRANSCRIPT =
  "Transcrição de exemplo: equipe concluiu a etapa prevista para o turno, sem ocorrências de segurança a registrar.";

/**
 * Stub real (não é mock só de front) — endpoints de verdade, gated por permissão, sem
 * integração externa ainda. Retorna texto canned.
 * TODO: integrar com um provedor de IA real (ex.: Anthropic/OpenAI).
 */
function generateRdoTextSuggestion(input: RdoTextSuggestionInput): { suggestion: string } {
  const byCategory = input.category ? SUGGESTIONS_BY_CATEGORY[input.category] : undefined;
  return { suggestion: byCategory ?? GENERIC_SUGGESTION };
}

function transcribeAudio(): { transcript: string } {
  return { transcript: GENERIC_TRANSCRIPT };
}

export const aiService = {
  generateRdoTextSuggestion,
  transcribeAudio,
};
