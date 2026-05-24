// Set build time environment variable and export it
const buildTime = new Date().toISOString().replace("T", " ").substring(0, 19);
process.env.REACT_APP_BUILD_TIME = buildTime;
console.log(`Build time set to: ${buildTime}`);
// Export for child processes
if (process.platform === "win32") {
	// On Windows, we need to set it in the current process
	// The build script will read it
	require("child_process").spawn("set", ["REACT_APP_BUILD_TIME=" + buildTime], {
		shell: true,
		stdio: "inherit",
	});
}
