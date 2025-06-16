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

    const importRegex = /(from\s+)(['"])(\.\/.*?)(['"])/g;
    const finalTestCode = testCode.replace(
      importRegex,
      `$1$2./${path.parse(codeFileName).name}$4`
    );

    fs.writeFileSync(testFilePath, finalTestCode);

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
    };

    const { results } = await jest.runCLI(
      {
        config: JSON.stringify(jestConfig),
        runInBand: true,
        silent: true,
        json: true,
      },
      [tempDir]
    );

    if (results.success) {
      return { success: true, message: `All ${results.numTotalTests} generated tests passed!` };
    } else {
      // --- THE DEFINITIVE FIX FOR THE CRASH ---
      // This logic now safely handles all known Jest failure modes.

      // First, check if the entire suite failed without running any tests.
      if (results.numTotalTests === 0 && results.testResults[0]) {
        const testSuite = results.testResults[0];
        const suiteFailureMessage = (
          testSuite.failureMessage ||
          testSuite.testExecError?.message ||
          "Unknown suite error"
        ).replace(
          /[\u001b\u009b][[()#;?]*.?[0-9]{1,4}(?:;[0-9]{0,4})*.?[0-9A-ORZcf-nqry=><]/g,
          ""
        );

        return {
          success: false,
          message: `Jest test suite failed to run due to a critical error (e.g., syntax or import error).\n\nDetails:\n${suiteFailureMessage}`,
        };
      }

      // If tests did run, parse the assertion failures safely.
      // We use .reduce() for a robust way to collect failures.
      const failureMessages = results.testResults
        .reduce((acc, testSuite) => {
          // IMPORTANT: Check if assertionResults exists before trying to access it.
          if (!testSuite.assertionResults) {
            return acc;
          }
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

      return {
        success: false,
        message: `${summary}\n\n${failureMessages}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `A critical error occurred during Jest execution: ${error.message}`,
    };
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

module.exports = { validateWithJest };