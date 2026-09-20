# Baton

AI-powered music production suite — song writing, vocals, mastering, and stems.

**Repo:** https://github.com/tritonSama/Baton

---

## Quick start (clone → run)

**Requirements:** [Node.js 20 LTS+](https://nodejs.org/) (includes npm)

### Windows

```bat
git clone https://github.com/tritonSama/Baton.git
cd Baton
setup.cmd
start-baton.cmd
```

Or with npm only:

```bat
git clone https://github.com/tritonSama/Baton.git
cd Baton
npm install
npm run dev
```

### macOS / Linux

```bash
git clone https://github.com/tritonSama/Baton.git
cd Baton
chmod +x setup.sh start-baton.sh
./setup.sh
./start-baton.sh
```

Or:

```bash
git clone https://github.com/tritonSama/Baton.git
cd Baton
npm install
npm run dev
```

After `npm run dev`, the desktop window opens and the UI is also at http://localhost:5173/

---

## One-command install scripts

| Script | What it does |
|--------|----------------|
| `setup.cmd` / `setup.sh` | Checks Node, runs `npm install`, runs tests |
| `start-baton.cmd` / `start-baton.sh` | Starts the app (`npm run dev`) |
| `build-installer.cmd` | Builds Windows `.exe` installers into `release/` |

```bat
npm run setup    rem same as setup.cmd (install + test)
npm run dev      rem launch app
npm test         rem engine diagnostics
npm run dist     rem Windows installer + portable exe
```

---

## Install without Node (Windows only)

On a machine that already built the project:

```bat
npm run dist
```

Then copy from `release/`:

- `Baton-*-win-x64.exe` — installer  
- `Baton-*-portable.exe` — no install, double-click to run  

GitHub Actions also builds these on each Release tag (see **Releases** on the repo).

---

## First things to try in the app

1. **Song Creator** — generate chords, lyrics, melody, full form  
2. **AI Assistant** — connect Ollama (CPU) or a cloud API  
3. **Diagnostics** — if something breaks, run checks (each failure has a fix hint)

```bat
npm test
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm` not found | Install Node 20+ from nodejs.org, reopen the terminal |
| `ENOENT package.json` | `cd` into the cloned `Baton` folder first |
| Electron window closes / blank | Run `npm install` again, then `npm run dev` |
| Tests fail | Open **Diagnostics** in the app, or read the failing test name |

More detail: [INSTALL.md](./INSTALL.md)

---

## Development Roadmap (Agent Guide)

The project is structured into phases to establish a fully working app and expand it over time. **For detailed agent instructions, see [AGENTS.md](./AGENTS.md).** Future AI agents should consult `AGENTS.md` and `Baton.md` to identify missing pieces and build out features according to this roadmap:

*   **Phase 1: Foundation:** Core C++ DSP framework, I/O, and the first real-time plugin (Autotune).
*   **Phase 2: AI Core:** Integrating AI models (Mastering, Stem Separation) using ONNX with GPU support.
*   **Phase 3: Vocal Engine:** Complex vocal synthesis, voice cloning (RVC, SO-VITS), and speech synthesis APIs.
*   **Phase 4: Deep FL Integration:** Tight coupling with DAW workflows (ARA2, advanced routing, MIDI scripting).
*   **Phase 5: Polish & Scale:** Expanding the standalone app to a full DAW and adding cloud collaboration.

---

## Spec

Product design notes live in [Baton.md](./Baton.md).
