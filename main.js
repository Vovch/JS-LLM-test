// main.js
const yargs = require('yargs/yargs');
const { hideBin } = require("yargs/helpers");
const Table = require("cli-table3");
const OllamaClient = require("./src/llm/OllamaClient");
const LMStudioClient = require("./src/llm/LMStudioClient");
const { allTests } = require("./src/tests");
const { extractCode } = require("./src/utils/codeExtractor");

let chalk;
try {
  chalk = require("chalk");
} catch (error) {
  // This block will run if chalk is v5+
}

const argv = yargs(hideBin(process.argv))
  .option("type", {
    alias: "t",
    describe: "LLM server type",
    choices: ["ollama", "lmstudio"],
    demandOption: true,
  })
  .option("address", {
    alias: "a",
    describe: "Address of the LLM server (e.g., http://localhost:11434)",
    demandOption: true,
  })
  .option("model", {
    alias: "m",
    describe: "The model name to use",
    demandOption: true,
  })
  .option("key", {
    alias: "k",
    describe: "API key (optional, for LMStudio)",
    default: "lm-studio",
  })
  .option("test", {
    describe: "Run a specific test by its ID (e.g., jest-util-test)",
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    description: "Log the full, raw response from the LLM after generation",
    default: false,
  })
  .help().argv;

function createClient(config) {
  if (config.type === "ollama") {
    return new OllamaClient(config.address);
  }
  if (config.type === "lmstudio") {
    return new LMStudioClient(config.address, config.key);
  }
  throw new Error("Invalid client type specified.");
}

async function runTest(test, client, model, argv, chalkInstance) {
  // --- UPDATED: Print test info at the start ---
  console.log(
    chalkInstance.bgYellow.black.bold(`\n\n--- Running Test: ${test.id} ---`)
  );
  console.log(chalkInstance.yellow(`Description: ${test.description}\n`));

  const result = {
    id: test.id,
    description: test.description,
    status: "ERROR", // Default status
    message: "An unknown error occurred.",
  };

  try {
    process.stdout.write(chalkInstance.cyan("🤖 Generating response... "));

    // --- UPDATED: Handle real-time streaming ---
    const onChunk = (chunk) => {
      process.stdout.write(chalkInstance.cyan(chunk));
    };

    const rawResponse = await client.generate(test.prompt, model, onChunk);
    process.stdout.write("\n"); // Newline after stream finishes

    if (argv.verbose) {
      console.log(chalkInstance.gray("\n--- Full LLM Response ---"));
      console.log(chalkInstance.gray(rawResponse));
      console.log(chalkInstance.gray("---------------------------\n"));
    }

    const code = extractCode(rawResponse);

    if (!code) {
      result.status = "FAILED";
      result.message =
        "LLM returned an empty response or no code block was found.";
      console.log(
        chalkInstance.red.bold(`\n❌ ${result.status}: ${result.message}`)
      );
      return result;
    }

    console.log(chalkInstance.blue("\n--- Extracted Code for Validation ---"));
    console.log(chalkInstance.blue(code));
    console.log(chalkInstance.blue("-------------------------------------"));

    process.stdout.write(
      chalkInstance.cyan("\n🔍 Validating generated code... ")
    );
    const validationResult = await test.validate(code);

    if (validationResult.success) {
      result.status = "PASSED";
      result.message = validationResult.message;
      console.log(chalkInstance.green.bold("PASSED"));
    } else {
      result.status = "FAILED";
      result.message = validationResult.message;
      console.log(chalkInstance.red.bold("FAILED"));
    }
    console.log(chalkInstance.gray(`   -> ${result.message}`));
  } catch (error) {
    result.status = "ERROR";
    result.message = error.message;
    console.log(
      chalkInstance.red.bold(`\n❌ ${result.status}: ${error.message}`)
    );
  }

  return result;
}

// --- NEW: Function to print the summary table ---
function printSummary(results, chalkInstance) {
  const table = new Table({
    head: [
      chalkInstance.bold("Test ID"),
      chalkInstance.bold("Status"),
      chalkInstance.bold("Details"),
    ],
    colWidths: [30, 12, 80],
    wordWrap: true,
  });

  let passedCount = 0;
  let failedCount = 0;
  let errorCount = 0;

  results.forEach((res) => {
    let status;
    switch (res.status) {
      case "PASSED":
        status = chalkInstance.green.bold(res.status);
        passedCount++;
        break;
      case "FAILED":
        status = chalkInstance.red.bold(res.status);
        failedCount++;
        break;
      case "ERROR":
        status = chalkInstance.bgRed.white.bold(res.status);
        errorCount++;
        break;
    }
    table.push([res.id, status, res.message]);
  });

  console.log("\n\n" + chalkInstance.inverse("--- Test Run Summary ---"));
  console.log(table.toString());

  const summaryLine = `\nTotal: ${results.length} | ${chalkInstance.green.bold(
    "Passed: " + passedCount
  )} | ${chalkInstance.red.bold(
    "Failed: " + failedCount
  )} | ${chalkInstance.bgRed.white.bold("Errors: " + errorCount)}`;
  console.log(summaryLine);
}

async function main() {
  if (!chalk) {
    chalk = (await import("chalk")).default;
  }

  console.log(chalk.inverse(` LLM Frontend Development Test Suite `));
  console.log(
    `\nUsing ${chalk.bold(argv.type)} at ${chalk.bold(
      argv.address
    )} with model ${chalk.bold(argv.model)}`
  );

  const client = createClient(argv);

  let testsToRun = allTests;
  if (argv.test) {
    testsToRun = allTests.filter((t) => t.id === argv.test);
    if (testsToRun.length === 0) {
      console.error(chalk.red(`Error: Test with ID "${argv.test}" not found.`));
      const availableIds = allTests.map((t) => t.id).join(", ");
      console.log(chalk.yellow(`Available test IDs: ${availableIds}`));
      return;
    }
  }

  // --- NEW: Collect results ---
  const allResults = [];
  for (const test of testsToRun) {
    const result = await runTest(test, client, argv.model, argv, chalk);
    allResults.push(result);
  }

  // --- NEW: Print the summary ---
  printSummary(allResults, chalk);

  console.log(chalk.inverse("\n Test run complete. "));
}

main().catch((err) => {
  console.error("An unhandled error occurred in main:", err);
});