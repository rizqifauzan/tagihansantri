const { execSync } = require("node:child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  const args = new Set(process.argv.slice(2));
  const withSeed = args.has("--seed");

  if (process.env.NODE_ENV === "production") {
    console.error("Refuse to reset DB in production environment.");
    process.exit(1);
  }

  console.log("Resetting database schema...");
  run("npx prisma db push --force-reset --skip-generate");

  console.log("Generating Prisma client...");
  run("npx prisma generate");

  if (withSeed) {
    console.log("Running seed...");
    run("npm run db:seed");
  }

  console.log("DB reset completed.");
}

main();
