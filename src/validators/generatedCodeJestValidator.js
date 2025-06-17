// src/validators/generatedCodeJestValidator.js
const jest = require('jest');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ts = require('typescript'); // For transpiling the generated code

/**
 * Runs predefined Jest tests against LLM-generated code.
 * @param {string} generatedCode The LLM-generated code (TypeScript/TSX).
 * @param {string} predefinedTestFilePath Path to the predefined Jest test file.
 * @param {boolean} [isReactCode=false] Indicates if the generated code is React/TSX.
 * @returns {Promise<{success: boolean, message: string, details?: string}>}
 */
async function runJestAgainstGeneratedCode(generatedCode, predefinedTestFilePath, isReactCode = false) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-code-jest-"));
  let generatedCodeFileName = isReactCode ? "codeUnderTest.tsx" : "codeUnderTest.ts";
  // The test file will assume the generated code becomes a .js file after transpilation for imports.
  const generatedCodeModuleName = "./codeUnderTest"; // Used in test file import path adjustments
  const transpiledGeneratedCodeFileName = generatedCodeFileName.replace(/\.(ts|tsx)$/, ".js");


  try {
    // Transpile the generated TypeScript/TSX code to JavaScript
    const compilerOptions = {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ESNext,
      esModuleInterop: true,
    };
    if (isReactCode) {
      compilerOptions.jsx = ts.JsxEmit.ReactJSX;
    }
    const transpileResult = ts.transpileModule(generatedCode, { compilerOptions });
    if (transpileResult.diagnostics && transpileResult.diagnostics.length > 0) {
        const criticalDiagnostics = transpileResult.diagnostics.filter(
          (d) => d.code !== 2792 && d.code !== 2686 // Example: Missing 'jsx-runtime' or 'React'
        );
        if (criticalDiagnostics.length > 0) {
          const errors = criticalDiagnostics.map(d => typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText).join("\n");
          return { success: false, message: `TypeScript compilation of generated code failed:\n${errors}` };
        }
    }
    const jsGeneratedCode = transpileResult.outputText;
    const generatedCodeFilePath = path.join(tempDir, transpiledGeneratedCodeFileName);
    fs.writeFileSync(generatedCodeFilePath, jsGeneratedCode);

    // Read the predefined test file
    let testCode = fs.readFileSync(predefinedTestFilePath, 'utf8');

    const importRegex = /(require\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;
    testCode = testCode.replace(importRegex, (match, prefix, importPath, suffix) => {
      // This logic specifically targets placeholders like './generatedDebounce' or '../anything/generatedDebounce'
      if (importPath.endsWith('generatedDebounce')) { // Check if the original path ends with the placeholder name
        return `${prefix}${generatedCodeModuleName}${suffix}`; // Replace with the actual module path
      }
      return match; // Return original if not the one we want to replace
    });

    const testFileName = `testSuite.test.js`;
    const testFilePath = path.join(tempDir, testFileName);
    fs.writeFileSync(testFilePath, testCode);

    const resultsFilePath = path.join(tempDir, "jest-results.json");

    // Resolve paths relative to this file's location for .babelrc and node_modules
    // __dirname is src/validators
    const projectRoot = path.resolve(__dirname, '../../'); // Adjust if structure is different
    const babelConfigPath = path.join(projectRoot, ".babelrc");
    const nodeModulesPath = path.join(projectRoot, "node_modules");


    const jestConfig = {
      rootDir: tempDir,
      testEnvironment: "jest-environment-jsdom", // Or 'node' if appropriate for the util
      testMatch: [`**/${testFileName}`],
      transform: {
        "^.+\\.(t|j)sx?$": [
          "babel-jest",
          { configFile: babelConfigPath },
        ],
      },
      modulePaths: [nodeModulesPath], // Helps Jest resolve modules like 'react' if not in tempDir's node_modules
      moduleDirectories: [ // Standard directories Jest searches
        "node_modules",
        nodeModulesPath // Ensure it checks project's node_modules too
      ],
      // setupFilesAfterEnv: [path.resolve(projectRoot, "jest.setup.js")], // Uncomment if you have a global setup
    };

    await jest.runCLI(
      {
        config: JSON.stringify(jestConfig),
        runInBand: true, // Crucial for predictable execution in temp env
        silent: true,    // Suppress console output from Jest itself
        json: true,      // Output results as JSON
        outputFile: resultsFilePath,
      },
      [tempDir] // Project roots for Jest
    );

    if (!fs.existsSync(resultsFilePath)) {
      return { success: false, message: "Jest did not create an output results file. This often indicates a critical Jest setup error or an unhandled exception within Jest." };
    }
    const resultsJson = fs.readFileSync(resultsFilePath, "utf-8");
    const results = JSON.parse(resultsJson);

    if (results.numTotalTests === 0) {
        return { success: false, message: "Jest ran 0 tests. Ensure test files are correctly picked up and tests are defined."};
    }

    if (results.success) {
      return {
        success: true,
        message: `All ${results.numTotalTests} predefined tests passed against the generated code.`,
      };
    } else {
      const failureMessages = results.testResults
        .reduce((acc, testSuite) => {
          if (!testSuite.assertionResults) return acc;
          const suiteFailures = testSuite.assertionResults
            .filter((assertion) => assertion.status === "failed")
            .map((assertion) => {
                // Strip ANSI escape codes (color codes) from failure messages
                const cleanMessage = assertion.failureMessages.join("\n").replace(/[\u001b\u009b][[()#;?]*.?[0-9]{1,4}(?:;[0-9]{0,4})*.?[0-9A-ORZcf-nqry=><]/g, "");
                return `Test: ${assertion.ancestorTitles.join(" > ")} > ${assertion.title}\n${cleanMessage}`;
            });
          return acc.concat(suiteFailures);
        }, [])
        .join("\n\n---\n\n");
      const summary = `Jest tests failed. ${results.numFailedTests}/${results.numTotalTests} predefined tests failed.`;
      return {
        success: false,
        message: summary,
        details: failureMessages || "No specific failure messages reported by Jest. Check for critical errors in test suite or generated code.",
      };
    }
  } catch (error) {
    // Log the full error for server-side debugging if possible
    console.error("Critical error in runJestAgainstGeneratedCode:", error);
    return {
      success: false,
      message: `A critical error occurred during Jest execution: ${error.message}`,
      details: error.stack,
    };
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

module.exports = { runJestAgainstGeneratedCode };
