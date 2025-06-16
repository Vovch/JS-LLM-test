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

    // The rest of the parsing logic remains the same!
    if (results.success) {
      return {
        success: true,
        message: `All ${results.numTotalTests} generated tests passed!`,
      };
    } else {
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

      const failureMessages = results.testResults
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