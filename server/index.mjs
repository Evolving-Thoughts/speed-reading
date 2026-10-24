import { createApp } from "./app.mjs";
const preview = process.argv.includes("--preview");
const port = Number(
  preview ? process.env.PORT || 4173 : process.env.API_PORT || 4174,
);
const server = createApp({ serveDist: preview });
server.listen(port, "127.0.0.1", () => {
  console.log(
    `Speed Reading ${preview ? "App" : "Import-API"}: http://127.0.0.1:${port}`,
  );
  process.send?.("ready");
});
server.on("error", (err) => {
  console.error(`Server konnte nicht starten: ${err.code || "Fehler"}`);
  process.exit(1);
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)));
