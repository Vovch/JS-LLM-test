// src/validators/tsValidator.js
const ts = require('typescript');

/**
 * Validates a string of TypeScript code.
 * @param {string} code The code to validate.
 * @param {object} [options]
 * @param {boolean} [options.isJsx=false] - Set to true to allow JSX syntax.
 * @param {string} [options.context=''] - Optional preceding code (e.g. interfaces) for context.
 * @returns {{success: boolean, message: string}}
 */
function validateTypeScript(code, { isJsx = false, context = '' } = {}) {
  const fullCode = context + "\n" + code;

  // --- THE DEFINITIVE FIX ---
  // Create the base compiler options.
  const compilerOptions = {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ESNext,
    esModuleInterop: true, // Good practice to include
  };

  // Conditionally add the JSX property using the required STRING LITERAL.
  if (isJsx) {
    compilerOptions.jsx = "react-jsx";
  }
  // --- END FIX ---

  const result = ts.transpileModule(fullCode, {
    compilerOptions, // Use the dynamically created options object.
    reportDiagnostics: true,
  });

  if (result.diagnostics && result.diagnostics.length > 0) {
    // Filter out a common but non-blocking diagnostic about missing 'jsx-runtime' or 'React'
    // which we don't expect to be available in this isolated context.
    const criticalDiagnostics = result.diagnostics.filter(
      (d) => d.code !== 2792 && d.code !== 2686
    );

    if (criticalDiagnostics.length > 0) {
      const errors = criticalDiagnostics
        .map((d) => {
          // Diagnostic messages can be nested, so we'll flatten them.
          let message = d.messageText;
          while (typeof message === "object" && message.messageText) {
            message = message.messageText;
          }
          return message;
        })
        .join("\n");
      return {
        success: false,
        message: `TypeScript compilation failed:\n${errors}`,
      };
    }
  }

  return { success: true, message: "Code is valid TypeScript." };
}

module.exports = { validateTypeScript };