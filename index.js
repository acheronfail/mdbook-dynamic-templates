(async function () {
  const TEMPLATES = await getTemplates();
  const CACHE_KEY = "dynamic-templates.store";
  const SHORTCUT_KEY = "T";

  async function getTemplates() {
    try {
      const res = await fetch("/dynamic-templates.json");
      return res.json();
    } catch (_) {
      console.warn(
        `Failed to load dynamic templates! Please ensure you have a "dynamic-templates.json" file in the root of your source directory!`
      );
      return [];
    }
  }

  function createAndAddForm() {
    const form = document.body.appendChild(document.createElement("form"));
    form.id = "dynamic-templates-prompt";
    form.className = "hidden";
    form.innerHTML = `
      <h2>Enter values</h2>
      <div>
        ${TEMPLATES.map(
          ({ template, fallback }) => `
          <div>
            <label><code>${template}</code>:</label>
            <input type="text" placeholder="${fallback}" name="${template}" />
          </div>
        `
        ).join("")}
      </div>
      <p>
        Press <code>${SHORTCUT_KEY}</code> to open this form. Press <code>Shift + ${SHORTCUT_KEY}</code> to
        reset all values.
        <br />
        Press <code>Enter</code> to save and <code>Escape</code> to cancel.
      </p>
    `;

    // Add Highlight.js styling to the code sections.
    form.querySelectorAll("code").forEach((el) => (el.className = "hljs"));

    return form;
  }

  function setupDynamicHosts() {
    const promptContainer = createAndAddForm(TEMPLATES);

    // Open the prompt dialog to configure the templates.
    function promptForValues() {
      // Update form values.
      const templateValues = getCachedValues();
      for (const { template, fallback } of TEMPLATES) {
        if (templateValues[template]) {
          getInput(template).value = templateValues[template];
        }
      }

      showPromptOverlay(true);
      promptContainer.querySelector("input").focus();
    }

    function isPromptOverlayActive() {
      return !promptContainer.classList.contains("hidden");
    }

    function showPromptOverlay(show) {
      if (show) {
        promptContainer.classList.remove("hidden");
      } else {
        promptContainer.classList.add("hidden");
      }
    }

    function getInput(template) {
      return promptContainer.querySelector(`input[name="${template}"]`);
    }

    function applyTemplates(reset) {
      const templateValues = getCachedValues();
      for (const { template, fallback } of TEMPLATES) {
        const input = getInput(template);

        let value;
        if (reset) {
          value = fallback;
          input.value = "";
        } else {
          value = templateValues[template] = input.value;
        }

        document
          .querySelectorAll(`.dynamic-templates.${template}`)
          .forEach((span) => {
            span.textContent = value;
            if (value !== fallback) {
              span.classList.add("changed");
            } else {
              span.classList.remove("changed");
            }
          });
      }

      if (reset) {
        localStorage.removeItem(CACHE_KEY);
      } else {
        localStorage.setItem(CACHE_KEY, JSON.stringify(templateValues));
      }
    }

    function onKeyDown(event) {
      const shouldOpenForm = event.key.toUpperCase() === SHORTCUT_KEY;
      const shouldClear = shouldOpenForm && event.shiftKey;
      const promptOverlayVisible = isPromptOverlayActive();

      if (shouldClear) {
        event.preventDefault();
        applyTemplates(true);
        if (promptOverlayVisible) {
          showPromptOverlay(false);
        }
      } else if (shouldOpenForm) {
        event.preventDefault();
        promptForValues();
      } else if (promptOverlayVisible) {
        // Stop the event from being caught by other listeners (like the search shortcut).
        event.stopPropagation();
        const shouldSubmit = event.key === "Enter";
        if (event.key == "Escape" || shouldSubmit) {
          showPromptOverlay(false);
        }

        if (shouldSubmit) {
          applyTemplates();
        }
      }
    }

    function getCachedValues() {
      try {
        return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
      } catch (_) {
        return {};
      }
    }

    // Since we can't "post-process" with `mdbook` we have to do the processing here.
    function walkTextNodes(node, initialValueMap) {
      if (node.nodeType == 1 && node.nodeName !== "SCRIPT") {
        if (node.id === "dynamic-templates-prompt") {
          return;
        }

        console.log("walking");

        // Replace template inside code blocks.
        // Be careful since `innerHTML` recreates all child nodes with new nodes, so if there are
        // any event listeners attached to the child nodes than this will break them.
        for (const { template, fallback } of TEMPLATES) {
          const initialValue = initialValueMap[template] || fallback;
          if (node.nodeName === "CODE" && node.textContent.includes(template)) {
            const classes = [
              "dynamic-templates",
              template,
              initialValue !== fallback ? " changed" : "",
            ];

            node.innerHTML = node.innerHTML.replace(
              new RegExp(template, "g"),
              `<span class="${classes.join(" ")}">${initialValue}</span>`
            );
          }
        }

        for (const childNode of node.childNodes) {
          walkTextNodes(childNode, initialValueMap);
        }
      }
    }

    walkTextNodes(document.body, getCachedValues());

    window.addEventListener("keydown", onKeyDown, false);
  }

  try {
    setupDynamicHosts();
  } catch (_) {
    // Try again after clearing local storage.
    localStorage.removeItem(CACHE_KEY);
    document
      .querySelectorAll("#dynamic-templates-prompt")
      .forEach((e) => e.remove());
    window.removeEventListener("keydown", onKeyDown, false);
    setupDynamicHosts();
  }
})();
