// Ruído que não é erro do sistema: extensões, rede, scripts de terceiros sem detalhe ("Script error.")
// e a ponte do navegador embutido do Instagram/Facebook com o app (Android: "Java object is gone"; iPhone: webkit.messageHandlers).
export const RUIDO = /ResizeObserver loop|^Script error\.?|chrome-extension:|moz-extension:|safari-(web-)?extension:|Load failed|Failed to fetch|NetworkError|AbortError|cancelad|Java object is gone|Error invoking postMessage|webkit\.messageHandlers|_AutofillCallbackHandler|__gCrWeb|instantSearchSDKJSBridgeClearHighlight/i;
