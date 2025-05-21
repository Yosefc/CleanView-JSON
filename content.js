document.addEventListener("DOMContentLoaded", () => {
  const contentType = document.contentType;

  if (contentType.includes("application/json") || contentType.includes("text/json")) {
    try {
      const rawText = document.body.innerText;
      const json = JSON.parse(rawText);
      const pretty = JSON.stringify(json, null, 2);

      const lines = syntaxHighlight(pretty).split("\n");

      const styledLines = lines
        .map((line, i) => {
          return `
          <div class="line" data-line="${i + 1}">
            <div class="line-number">${i + 1}</div>
            <div class="code">${line}</div>
          </div>
        `;
        })
        .join("");

      document.head.innerHTML = `
        <style>
          body {
            background: #1e1e1e;
            color: #ffffff;
            font-family: monospace;
            margin: 0;
            padding: 1rem;
            padding-left: 0;
          }
          .line {
            display: flex;
            min-width: 0;
          }
          .line-number {
            width: 3em;
            min-width: 3em;
            max-width: 3em;
            color: #888;
            text-align: right;
            padding-right: 1em;
            user-select: none;
            flex-shrink: 0;
           }
          .code {
            word-wrap: break-word;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .code:hover {
            background: rgba(255, 255, 255, 0.1);
          }
          .collapsible {
            cursor: pointer;
            color: #61dafb;
          }
          .key { color: #c678dd; }
          .string { color: #98c379; }
          .number { color: #d19a66; }
          .boolean { color: #56b6c2; }
          .null { color: #5c6370; }
        </style>
      `;

      document.body.innerHTML = `<div id="json">${styledLines}</div>`;
      addCollapsing();

      //style scrollbar
      const style = document.createElement("style");
      style.textContent = `
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background-color: #a6a6a6;
          border-radius: 6px;
          border: 2px solid transparent;
          background-clip: content-box;
        }

        ::-webkit-scrollbar-thumb:hover {
          background-color:rgb(131, 130, 130);
        }

        body {
          scrollbar-width: thin;             /* Firefox */
          scrollbar-color: #bbb transparent; /* Firefox */
        }

        a {
          cursor: pointer;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      `;
      document.head.appendChild(style);

      //Download Button
      const downloadBtn = document.createElement("button");
      downloadBtn.textContent = "⬇ Download JSON";
      downloadBtn.style.cssText = `
        padding: 8px 12px;
        background: #61dafb;
        color: #000;
        border: none;
        border-radius: 6px;
        font-family: monospace;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      `;

      downloadBtn.addEventListener("click", () => {
        const blob = new Blob([pretty], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "data.json";
        downloadLink.click();
        URL.revokeObjectURL(url);
      });

      // Create Copy Button
      const copyBtn = document.createElement("button");
      copyBtn.textContent = "📋 Copy JSON";
      copyBtn.style.cssText = `
        padding: 8px 12px;
        background: #98c379;
        color: #000;
        border: none;
        border-radius: 6px;
        font-family: monospace;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      `;

      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pretty);
          copyBtn.textContent = "✅ Copied!";
          setTimeout(() => (copyBtn.textContent = "📋 Copy JSON"), 1500);
        } catch (err) {
          console.error("Copy failed:", err);
          copyBtn.textContent = "❌ Copy failed";
        }
      });

      // Slide out button container
      const buttonContainer = document.createElement("div");
      buttonContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 0;
        transform: translateX(80%);
        transition: transform 0.3s ease-in-out;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        border-top-left-radius: 8px;
        border-bottom-left-radius: 8px;
        background: rgba(255, 255, 255, 0.85);
        box-shadow: -2px 2px 6px rgba(0,0,0,0.1);
      `;

      // Slide in on hover
      buttonContainer.addEventListener("mouseenter", () => {
        buttonContainer.style.transform = "translateX(0)";
      });
      buttonContainer.addEventListener("mouseleave", () => {
        buttonContainer.style.transform = "translateX(80%)";
      });

      // Add buttons to container
      buttonContainer.appendChild(downloadBtn);
      buttonContainer.appendChild(copyBtn);

      // Add container to body
      document.body.appendChild(buttonContainer);
    } catch (e) {
      console.error("Invalid JSON", e);
    }
  }
});

function syntaxHighlight(json) {
  return json.replace(/("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, (match, p1, p2, p3) => {
    let cls = "number";
    // Key or string detection
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = "key";
      } else {
        cls = "string";
        // Detect URLs in string values
        const urlMatch = match.match(/^"(https?:\/\/[^\s"]+)"$/);
        if (urlMatch) {
          return `<a href="${urlMatch[1]}" target="_blank" class="link ${cls}">${match}</a>`;
        }
      }
    } else if (/true|false/.test(match)) {
      cls = "boolean";
    } else if (/null/.test(match)) {
      cls = "null";
    }
    return `<span class="${cls}">${match}</span>`;
  });
}

function addCollapsing() {
  const codeLines = document.querySelectorAll(".code");

  const stack = [];
  const collapsibles = [];

  codeLines.forEach((lineEl, idx) => {
    const text = lineEl.textContent.trim();

    if (text.endsWith("{") || text.endsWith("[")) {
      stack.push({ openIdx: idx, char: text.endsWith("{") ? "}" : "]" });
    } else if ((text === "}" || text === "}," || text === "]" || text === "],") && stack.length) {
      const { openIdx, char } = stack.pop();
      const openLine = codeLines[openIdx];
      const closeLine = lineEl;

      const button = document.createElement("span");
      button.textContent = "▾ ";
      button.className = "collapsible";
      button.dataset.collapsed = "false"; // store collapsed state

      const toggleBlock = () => {
        const isCollapsed = button.dataset.collapsed === "true";
        button.dataset.collapsed = isCollapsed ? "false" : "true";
        button.textContent = isCollapsed ? "▾ " : "▸ ";

        for (let i = openIdx + 1; i < idx; i++) {
          codeLines[i].parentElement.style.display = isCollapsed ? "flex" : "none";
        }

        // Also update nested buttons inside the collapsed region
        for (let i = openIdx + 1; i < idx; i++) {
          const nestedBtn = codeLines[i].querySelector(".collapsible");
          if (nestedBtn?.dataset?.collapsed === "true") {
            nestedBtn.textContent = "▾ ";
          }
        }
      };

      button.addEventListener("click", toggleBlock);

      openLine.prepend(button);
      collapsibles.push({ button, openIdx, closeIdx: idx });
    }
  });
}
