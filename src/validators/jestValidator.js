// src/validators/jestValidator.js
const jest = require('jest');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Runs Jest tests programmatically on generated code.
 * @param {string} testCode The LLM-generated test code.
 * @param {string} codeToTest The original code that the test targets.
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function validateWithJest(testCode, codeToTest) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "jest-run-"));

  try {
    const isReactCode =
      testCode.includes("React") || testCode.includes("@testing-library/react");
    const codeFileExt = isReactCode ? ".tsx" : ".ts";
    const codeFileName = `codeToTest${codeFileExt}`;
    const testFileName = `codeToTest.test${codeFileExt}`;

    const codeFilePath = path.join(tempDir, codeFileName);
    const testFilePath = path.join(tempDir, testFileName);

    fs.writeFileSync(codeFilePath, codeToTest);

    // Ensure the import path correctly resolves to the code file name without extension for JS/TS module resolution.
    // e.g., if codeFileName is 'codeToTest.ts', test should import './codeToTest'
    const importPathName = `./${path.parse(codeFileName).name}`;
    const importRegex = /(from\s+)(['"])(\.\/.*?)(['"])/g;
    const finalTestCode = testCode.replace(importRegex, `$1$2${importPathName}$4`);

    fs.writeFileSync(testFilePath, finalTestCode);

    // --- NEW: Define a path for the results file ---
    const resultsFilePath = path.join(tempDir, "jest-results.json");

    const jestConfig = {
      rootDir: tempDir,
      testEnvironment: "jest-environment-jsdom",
      testMatch: [`**/${testFileName}`],
      transform: {
        "^.+\\.(t|j)sx?$": [
          "babel-jest",
          { configFile: path.resolve(__dirname, "../../.babelrc") },
        ],
      },
      moduleDirectories: [
        "node_modules",
        path.resolve(__dirname, "../../node_modules"),
      ],
      setupFilesAfterEnv: [path.resolve(__dirname, "../../jest.setup.js")],
      // Coverage configuration
      collectCoverage: true,
      coverageDirectory: path.join(tempDir, "coverage"),
      coverageReporters: ["json-summary", "text"], // text reporter for console during debugging if needed
      collectCoverageFrom: [path.basename(codeFilePath)], // Collect coverage from the specific code file
    };

    // This call will now be silent and write its output to the specified file.
    await jest.runCLI(
      {
        config: JSON.stringify(jestConfig),
        runInBand: true,
        silent: true,
        json: true, // Keep this: it tells Jest to use JSON format for the output file
        outputFile: resultsFilePath, // --- NEW: Tell Jest where to write the JSON ---
      },
      [tempDir]
    );

    // --- NEW: Read the results from the file instead of the returned object ---
    if (!fs.existsSync(resultsFilePath)) {
      throw new Error("Jest did not create an output file.");
    }
    const resultsJson = fs.readFileSync(resultsFilePath, "utf-8");
    const results = JSON.parse(resultsJson);

    let coverageData = null;
    const coverageSummaryPath = path.join(tempDir, "coverage", "coverage-summary.json");
    if (fs.existsSync(coverageSummaryPath)) {
      try {
        const coverageJson = fs.readFileSync(coverageSummaryPath, "utf-8");
        const coverageSummary = JSON.parse(coverageJson);
        if (coverageSummary && coverageSummary.total) {
          coverageData = coverageSummary.total;
        }
      } catch (covError) {
        console.error("Error reading or parsing coverage summary:", covError);
        // Don't fail the whole validation if only coverage parsing fails
      }
    }

    if (results.success) {
      let message = `All ${results.numTotalTests} generated tests passed!`;
      if (coverageData && coverageData.lines) {
        message += ` Coverage: ${coverageData.lines.pct}% lines.`;
      }
      return {
        success: true,
        message: message,
        coverage: coverageData, // Return full total coverage data
      };
    } else {
      let failureMessage = "";
      if (results.numTotalTests === 0 && results.testResults[0]) {
        failureMessage = (
          testSuite.failureMessage ||
          testSuite.testExecError?.message ||
          "Unknown suite error"
        ).replace(
          /[\u001b\u009b][[()#;?]*.?[0-9]{1,4}(?:;[0-9]{0,4})*.?[0-9A-ORZcf-nqry=><]/g,
          ""
        );
        failureMessage = `Jest test suite failed to run due to a critical error (e.g., syntax or import error).\n\nDetails:\n${failureMessage}`;
      } else {
        const individualFailureMessages = results.testResults
          .reduce((acc, testSuite) => {
            if (!testSuite.assertionResults) return acc;
            const suiteFailures = testSuite.assertionResults
              .filter((assertion) => assertion.status === "failed")
              .map((assertion) =>
                assertion.failureMessages
                  .join("\n")
                  .replace(
                    /[\u001b\u009b][[()#;?]*.?[0-9]{1,4}(?:;[0-9]{0,4})*.?[0-9A-ORZcf-nqry=><]/g,
                    ""
                  )
              );
            return acc.concat(suiteFailures);
          }, [])
          .join("\n\n---\n\n");
        const summary = `Jest tests failed. ${results.numFailedTests}/${results.numTotalTests} failed.`;
        failureMessage = `${summary}\n\n${individualFailureMessages}`;
      }

      if (coverageData && coverageData.lines) {
        failureMessage += `\n(Coverage was ${coverageData.lines.pct}% lines.)`;
      } else {
        failureMessage += `\n(Coverage data not available.)`;
      }

      return {
        success: false,
        message: failureMessage,
        coverage: coverageData,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `A critical error occurred during Jest execution: ${error.message}`,
      coverage: null, // Ensure coverage is null in case of critical error before coverage step
    };
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

module.exports = { validateWithJest };