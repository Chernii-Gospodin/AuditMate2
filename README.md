# auditmate-base

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

Проект AuditMate

Этот форк - тестовый. В нем используется FastAPI на backend, также есть только html файл, где указаны функции (как такого фронта на Vue нет). 

Используется huggingface_hub = Inference, где есть бесплатные доступ к моделям (qwen5-72b, chatgpt4-120b, llama и так далее). Все работает, доступ имееется через токен


Нужно создать файл .env
```
#------------------------------------------------
# Нужно создать токен    Hugging Face Access Token: https://huggingface.co/settings/tokens

HF_TOKEN=your_api_key

# Модель для инференса — любая, доступная через HF Inference API
# Примеры:
#   openai/gpt-oss-120b         (по умолчанию)
#   meta-llama/Llama-3.3-70B-Instruct
#   mistralai/Mistral-7B-Instruct-v0.3
#   Qwen/Qwen2.5-72B-Instruct

HF_MODEL=openai/gpt-oss-120b



# Порт на котором запускается сервер (по умолчанию 8000)

PORT=8000
#------------------------------------------------
```
