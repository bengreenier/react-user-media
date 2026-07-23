# react-user-media

[![CI/CD](https://github.com/bengreenier/react-user-media/actions/workflows/ci_cd.yml/badge.svg)](https://github.com/bengreenier/react-user-media/actions/workflows/ci_cd.yml)
![NPM Version](https://img.shields.io/npm/v/%40bengreenier%2Freact-user-media)
![NPM Downloads](https://img.shields.io/npm/dw/%40bengreenier%2Freact-user-media)


A collection of hooks and components for easier access to [`getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [`getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia), and [`enumerateDevices`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices) in [React](https://react.dev).

Library consumers need React 19+ and a secure browser context for media APIs. Developing this monorepo requires Node.js 22.12+.

This repository is a monorepo, you're probably looking for one of it's child packages:

- [react-user-media](./packages/react-user-media/)
- [examples](./packages/examples/)

## Development

```bash
pnpm install
pnpm lint               # Biome
pnpm format             # Biome --write
pnpm openspec:validate  # OpenSpec change/spec structure
pnpm build
pnpm test               # Vitest 3 + Playwright
pnpm dev                # examples via Vite 7
```

Spec-driven changes live under `openspec/` (Cursor: `/opsx:propose`, `/opsx:apply`, `/opsx:archive`). CI runs `pnpm openspec:validate` on every PR.

## License

Dual-licensed under Apache 2.0 + MIT.
