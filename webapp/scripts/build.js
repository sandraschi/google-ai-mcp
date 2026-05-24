// Build script that sets build time and runs react-scripts build
const { spawn } = require("child_process");
const buildTime = new Date().toISOString().replace("T", " ").substring(0, 19);

console.log(`Setting build time to: ${buildTime}`);
process.env.REACT_APP_BUILD_TIME = buildTime;
process.env.CI = "false";

// Spawn react-scripts build with the environment variable
const build = spawn("react-scripts", ["build"], {
	stdio: "inherit",
	shell: true,
	env: {
		...process.env,
		REACT_APP_BUILD_TIME: buildTime,
		CI: "false",
		DISABLE_ESLINT_PLUGIN: "true",
	},
});

build.on("close", (code) => {
	process.exit(code);
});
