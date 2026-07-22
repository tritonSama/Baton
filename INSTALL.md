# Install guide

## From GitHub (recommended)

```bat
git clone https://github.com/tritonSama/Baton.git
cd Baton
setup.cmd
start-baton.cmd
```

macOS / Linux: use `./setup.sh` and `./start-baton.sh` instead.

You need **Node.js 20+**. Nothing else.

---

## Windows installer (no Node on the target PC)

1. On a build machine: `npm run dist` (or download from GitHub **Releases**)
2. Copy `release\Baton-*-win-x64.exe` or `Baton-*-portable.exe`
3. Run it on the other PC

---

## Useful npm scripts

| Command | Purpose |
|---------|---------|
| `npm run setup` | `npm install` + `npm test` |
| `npm run dev` | Launch Electron + Vite |
| `npm test` | Engine / Song Creator tests |
| `npm run dist` | Build Windows installers |

---

## Folder check

After cloning you should see `package.json` **in the same folder** as `README.md` and `setup.cmd`.

```
Baton/
  package.json
  setup.cmd
  start-baton.cmd
  README.md
  src/
  electron/
```

If `npm run dev` says it cannot find `package.json`, you are in the wrong directory.
