"use client";

/**
 * Extrai automaticamente uma flag no formato CTF{...} caso o aluno tenha copiado
 * uma linha inteira (ex.: comentário HTML, linha do CSV, JSON da API ou frase do bot).
 */
export function extractCtfFlag(raw: string): string {
  if (!raw) return "";
  const match = raw.match(/CTF\{[^}\s"']+\}/i);
  if (match) {
    return match[0].trim();
  }
  return raw.trim();
}

/**
 * Verifica se um texto contém uma flag no padrão CTF{...}
 */
export function findFlagsInText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/CTF\{[^}\s"']+\}/gi);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.trim())));
}

/**
 * Copia qualquer texto para a área de transferência do sistema operacional,
 * funcionando tanto em localhost/HTTPS quanto em rede local HTTP (ex.: http://192.168.x.x:3000)
 * usando fallback via textarea sem armazenar flags visíveis no storage.
 */
export async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Limpa qualquer flag antiga que eventualmente estivesse salva no storage
  try {
    localStorage.removeItem("proz_last_copied_flag");
  } catch {
    // ignore
  }

  // 1. Tenta Clipboard API moderna (disponível em localhost ou HTTPS)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continua para o fallback abaixo (comum em HTTP na rede local 192.168.x.x)
    }
  }

  // 2. Fallback compatível com HTTP em rede local (LAN)
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Lê da área de transferência do navegador caso permitido pelo contexto.
 */
export async function pasteFlagSafe(): Promise<string> {
  if (typeof window === "undefined") return "";

  if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && clipText.trim()) {
        return extractCtfFlag(clipText);
      }
    } catch {
      // Em HTTP sem permissão de leitura programática, o aluno usa Ctrl+V normal no input
    }
  }

  return "";
}
