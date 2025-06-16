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
      // --- FIX #1: Tell Jest where to find node_modules ---
      // This maps non-relative imports to our main project's node_modules.
      moduleDirectories: [
        "node_modules",
        path.resolve(__dirname, "../../node_modules"),
      ],
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
      return {
        success: true,
        message: `All ${results.numTotalTests} generated tests passed!`,
      };
    } else {
      // --- FIX #2: Handle both assertion failures and suite setup failures ---
      // Check if the entire test suite failed to run.
      if (results.numTotalTests === 0 && results.numFailedTestSuites === 1) {
        const testSuite = results.testResults[0];
        // Clean the error message from ANSI color codes.
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
          message: `Jest test suite failed to run. This is often a module import or configuration error.\n\nDetails:\n${suiteFailureMessage}`,
        };
      }

      // Handle standard assertion failures.
      const failureMessages = results.testResults
        .flatMap((testSuite) => testSuite.assertionResults)
        .filter((assertion) => assertion.status === "failed")
        .map((assertion) => {
          return assertion.failureMessages
            .map((msg) =>
              msg.replace(
                /[\u001b\u009b][[()#;?]*.?[0-9]{1,4}(?:;[0-9]{0,4})*.?[0-9A-ORZcf-nqry=><]/g,
                ""
              )
            )
            .join("\n");
        })
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