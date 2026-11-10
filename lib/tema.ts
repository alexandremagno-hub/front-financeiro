export type Tema = "light" | "dark";

export const TEMA_STORAGE_KEY = "tema";

/**
 * Roda no <head>, antes da primeira pintura: aplica o tema salvo ou, sem
 * escolha salva, o do sistema. Evita o "flash" de tema claro ao carregar.
 */
export const TEMA_SCRIPT = `(function(){try{var t=localStorage.getItem("${TEMA_STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
