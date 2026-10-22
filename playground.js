(() => {
  const starterCode = {
    html: `<main class="card">
  <span class="tag">MY FIRST WEB PAGE</span>
  <h1>Hello, world! 👋</h1>
  <p>Edit the HTML, CSS, or JavaScript and see your changes here.</p>
  <button id="hello-button">Click me</button>
  <p id="message" aria-live="polite"></p>
</main>`,
    css: `* {
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  margin: 0;
  display: grid;
  place-items: center;
  background: #f1f5f9;
  color: #172033;
  font-family: system-ui, sans-serif;
}

.card {
  width: min(420px, calc(100% - 32px));
  padding: 32px;
  border-radius: 18px;
  background: white;
  box-shadow: 0 18px 50px #1720331a;
}

.tag {
  color: #4f46e5;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
}

h1 { margin: 12px 0; }
p { color: #64748b; line-height: 1.6; }

button {
  padding: 10px 16px;
  border: 0;
  border-radius: 8px;
  background: #4f46e5;
  color: white;
  font: inherit;
  cursor: pointer;
}`,
    js: `document.querySelector("#hello-button").addEventListener("click", () => {
  document.querySelector("#message").textContent = "It works! Keep creating.";
});`,
  };
  const storageKey = "web-playground-code-v1";
  const editors = {
    html: document.getElementById("code-html"),
    css: document.getElementById("code-css"),
    js: document.getElementById("code-js"),
  };
  const tabs = [...document.querySelectorAll(".file-tab")];
  const preview = document.getElementById("preview");
  const saveStatus = document.getElementById("save-status");
  const previewStatus = document.getElementById("preview-status");
  const lineCount = document.getElementById("line-count");
  const highlightLayers = {};
  let activeLanguage = "html";
  let renderTimer;

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function highlightCode(code, language) {
    const patterns = {
      html: /<!--[\s\S]*?-->|<!DOCTYPE\b[^>]*>|<\/?[\w:-]+|\/?>|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\w:-]+(?=\s*=)|[<>=/]|[^<>"'\s=]+|\s+|./gi,
      css: /\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[\da-f]{3,8}\b|@[a-z_-][\w-]*|\b\d*\.?\d+(?:%|[a-z]+)?\b|[a-z_-][\w-]*(?=\s*:)|\b(?:important|inherit|initial|unset|revert|auto|none|transparent|currentcolor)\b|[a-z_-][\w-]*|[{}()[\].,:;>+~*=/#%-]|\s+|./gi,
      js: /\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|if|else|for|while|of|in|new|class|extends|import|from|export|default|async|await|try|catch|throw|typeof|instanceof|this|switch|case|break|continue|true|false|null|undefined)\b|\b\d*\.?\d+(?:e[+-]?\d+)?\b|\b[A-Z_][A-Z\d_]+\b|[a-z_$][\w$]*(?=\s*\()|[a-z_$][\w$]*|=>|===?|!==?|<=?|>=?|\+\+|--|&&|\|\||\?\.|[{}()[\].,:;=+\-*/%!<>?&|]|\s+|./gi,
    };
    const tokens = code.match(patterns[language]) || [];
    let position = 0;
    return tokens.map((token) => {
      const tokenStart = position;
      position += token.length;
      let type = "";
      if (language === "html") {
        if (token.startsWith("<!--")) type = "comment";
        else if (/^<!DOCTYPE/i.test(token)) type = "keyword";
        else if (/^<\/?[\w:-]+$/i.test(token)) type = "tag";
        else if (/^["']/.test(token)) type = "string";
        else if (/^[\w:-]+$/.test(token)) type = "attribute";
        else if (/^[<>=/]+$/.test(token)) type = "punctuation";
      } else if (language === "css") {
        if (token.startsWith("/*")) type = "comment";
        else if (/^["']/.test(token)) type = "string";
        else if (/^#[\da-f]/i.test(token)) type = "number";
        else if (token.startsWith("@")) type = "keyword";
        else if (/^\d/.test(token)) type = "number";
        else if (/^[{}()[\].,:;>+~*=/#%-]+$/.test(token)) type = "punctuation";
        else if (/^(important|inherit|initial|unset|revert|auto|none|transparent|currentcolor)$/i.test(token)) type = "keyword";
        else if (/^[a-z_-][\w-]*$/i.test(token)) {
          type = /^\s*:/.test(code.slice(tokenStart + token.length)) ? "property" : "selector";
        }
      } else if (token.startsWith("//") || token.startsWith("/*")) {
        type = "comment";
      } else if (/^["'`]/.test(token)) {
        type = "string";
      } else if (/^\d/.test(token)) {
        type = "number";
      } else if (/^(?:const|let|var|function|return|if|else|for|while|of|in|new|class|extends|import|from|export|default|async|await|try|catch|throw|typeof|instanceof|this|switch|case|break|continue|true|false|null|undefined)$/.test(token)) {
        type = "keyword";
      } else if (/^[A-Z_][A-Z\d_]+$/.test(token)) {
        type = "constant";
      } else if (/^[a-z_$][\w$]*$/i.test(token) && /^\s*\(/.test(code.slice(tokenStart + token.length))) {
        type = "function";
      } else if (/^(?:console|document|window|Math|JSON|Array|Object|Promise)$/.test(token)) {
        type = "builtin";
      } else if (/^(?:=>|===?|!==?|<=?|>=?|\+\+|--|&&|\|\||\?\.|[{}()[\].,:;=+\-*/%!<>?&|])$/.test(token)) {
        type = "punctuation";
      }

      const escaped = escapeHtml(token);
      return type ? `<span class="syntax-${type}">${escaped}</span>` : escaped;
    }).join("") + "\n";
  }

  function updateHighlight(language) {
    const editor = editors[language];
    const layer = highlightLayers[language];
    if (layer) layer.innerHTML = highlightCode(editor.value, language);
  }

  for (const [language, editor] of Object.entries(editors)) {
    const layer = document.createElement("pre");
    layer.className = "syntax-layer";
    layer.setAttribute("aria-hidden", "true");
    editor.parentElement.insertBefore(layer, editor);
    highlightLayers[language] = layer;
    editor.addEventListener("scroll", () => {
      layer.scrollTop = editor.scrollTop;
      layer.scrollLeft = editor.scrollLeft;
    });
  }

  function loadCode() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return { ...starterCode };
      const parsed = JSON.parse(saved);
      return Object.fromEntries(
        Object.keys(starterCode).map((language) => [
          language,
          typeof parsed[language] === "string" ? parsed[language] : starterCode[language],
        ]),
      );
    } catch (error) {
      console.error("Could not load saved playground code.", error);
      saveStatus.textContent = "Could not load saved code";
      return { ...starterCode };
    }
  }

  function updateLineCount() {
    const editor = editors[activeLanguage];
    const lines = editor.value.split("\n").length;
    const name = activeLanguage === "js" ? "JavaScript" : activeLanguage.toUpperCase();
    lineCount.textContent = `${name}  ·  ${lines} lines`;
  }

  function selectLanguage(language) {
    activeLanguage = language;
    for (const [name, editor] of Object.entries(editors)) {
      const selected = name === language;
      editor.hidden = !selected;
      editor.classList.toggle("active", selected);
      highlightLayers[name].hidden = !selected;
    }
    for (const tab of tabs) {
      const selected = tab.dataset.language === language;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    updateLineCount();
    updateHighlight(language);
    editors[language].focus();
  }

  function reportPreviewError(message) {
    previewStatus.textContent = `Error: ${message}`;
    previewStatus.classList.add("error");
  }

  function runCode() {
    clearTimeout(renderTimer);
    const documentToRender = new DOMParser().parseFromString(editors.html.value, "text/html");
    const styles = documentToRender.createElement("style");
    styles.dataset.playgroundStyle = "true";
    styles.textContent = editors.css.value;
    documentToRender.head.append(styles);

    const reporter = documentToRender.createElement("script");
    reporter.textContent = `window.addEventListener("error", event => {
      window.parent.postMessage({ type: "playground-error", message: event.message || "JavaScript error" }, "*");
    });
    window.addEventListener("unhandledrejection", event => {
      const reason = event.reason;
      window.parent.postMessage({ type: "playground-error", message: reason && reason.message ? reason.message : String(reason) }, "*");
    });`;
    documentToRender.body.append(reporter);

    const userScript = documentToRender.createElement("script");
    userScript.textContent = editors.js.value.replace(/<\/script/gi, "<\\/script");
    documentToRender.body.append(userScript);

    previewStatus.textContent = "Running…";
    previewStatus.classList.remove("error");
    preview.srcdoc = `<!doctype html>\n${documentToRender.documentElement.outerHTML}`;
    updateLineCount();
  }

  function scheduleRun() {
    saveStatus.textContent = "Saving…";
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        html: editors.html.value,
        css: editors.css.value,
        js: editors.js.value,
      }));
      saveStatus.textContent = "Saved in this browser";
    } catch (error) {
      console.error("Could not save playground code.", error);
      saveStatus.textContent = "Could not save code";
    }
    updateHighlight(activeLanguage);
    updateLineCount();
    clearTimeout(renderTimer);
    previewStatus.textContent = "Updating…";
    previewStatus.classList.remove("error");
    renderTimer = setTimeout(runCode, 350);
  }

  const initialCode = loadCode();
  for (const [language, editor] of Object.entries(editors)) {
    editor.value = initialCode[language];
    updateHighlight(language);
    editor.addEventListener("input", scheduleRun);
    editor.addEventListener("keydown", (event) => {
      if (event.key === "Tab") {
        event.preventDefault();
        editor.setRangeText("  ", editor.selectionStart, editor.selectionEnd, "end");
        editor.dispatchEvent(new Event("input", { bubbles: true }));
      } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runCode();
      }
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => selectLanguage(tab.dataset.language));
  });
  document.getElementById("run-button").addEventListener("click", runCode);
  document.getElementById("reset-button").addEventListener("click", () => {
    for (const [language, editor] of Object.entries(editors)) {
      editor.value = starterCode[language];
    }
    scheduleRun();
  });

  preview.addEventListener("load", () => {
    previewStatus.textContent = "Preview updated";
    previewStatus.classList.remove("error");
  });
  window.addEventListener("message", (event) => {
    if (event.source !== preview.contentWindow || event.data?.type !== "playground-error") return;
    reportPreviewError(String(event.data.message).slice(0, 120));
  });

  selectLanguage(activeLanguage);
  runCode();
})();
