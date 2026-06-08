import { useState } from "react";
import { commands } from "@/lib/bindings";
import reactLogo from "./assets/react.svg";
import "./index.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { logError, logger } from "./lib/logger";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    logger.debug(`Calling greet command with name: ${name}`);
    const result = await commands.greet(name);

    if (result.status === "ok") {
      setGreetMsg(result.data);
      logger.info("Greet successful");
    } else {
      logError(new Error(result.error), { command: "greet", input: name });
      setGreetMsg(`Error: ${result.error}`);
    }
  }

  return (
    <main className="m-0 flex flex-col justify-center pt-[10vh] text-center">
      <h1 className="mb-4 text-center font-bold text-3xl">
        Welcome to Tauri + React
      </h1>

      <div className="flex justify-center gap-4">
        <a
          className="font-medium text-primary no-underline transition-colors hover:text-primary/80"
          href="https://vite.dev"
          rel="noopener"
          target="_blank"
        >
          <img
            alt="Vite logo"
            className="h-24 p-6 transition-all duration-700 hover:drop-shadow-[0_0_2em_#747bff]"
            height="144"
            src="/vite.svg"
            width="144"
          />
        </a>
        <a
          className="font-medium text-primary no-underline transition-colors hover:text-primary/80"
          href="https://tauri.app"
          rel="noopener"
          target="_blank"
        >
          <img
            alt="Tauri logo"
            className="h-24 p-6 transition-all duration-700 hover:drop-shadow-[0_0_2em_#24c8db]"
            height="144"
            src="/tauri.svg"
            width="144"
          />
        </a>
        <a
          className="font-medium text-primary no-underline transition-colors hover:text-primary/80"
          href="https://react.dev"
          rel="noopener"
          target="_blank"
        >
          <img
            alt="React logo"
            className="h-24 p-6 transition-all duration-700 hover:drop-shadow-[0_0_2em_#61dafb]"
            height="144"
            src={reactLogo}
            width="144"
          />
        </a>
      </div>
      <p className="my-4 text-muted-foreground">
        Click on the Tauri, Vite, and React logos to learn more.
      </p>

      <form
        className="mx-auto flex w-full max-w-md justify-center gap-2 px-4"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <Input
          className="flex-1"
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
          value={name}
        />
        <Button type="submit">Greet</Button>
      </form>
      <p className="mt-4 font-medium">{greetMsg}</p>
    </main>
  );
}

export default App;
