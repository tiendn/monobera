const { execSync } = require("child_process");
const path = require("path");

try {
  const scriptPath = path.resolve(__dirname, "vercel-local-install.sh");
  console.log("Running local installation script...");

  execSync(`bash ${scriptPath}`, {
    stdio: "inherit",
  });

  console.log("Local installation completed successfully");
} catch (error) {
  console.error("Error during local installation:", error.message);
  process.exit(1);
}
