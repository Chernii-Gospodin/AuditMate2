// Единый markdown-рендерер для чата и панели.
// markdown-it (в default-пресете таблицы GFM включены) + DOMPurify-санитизация.
// Раньше использовался самописный regex без поддержки таблиц — они ломались.
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false,     // сырой HTML из ответа модели не доверяем (плюс DOMPurify сверху)
  linkify: true,   // автоссылки на URL из результатов поиска
  breaks: true,    // одиночный \n → <br> (как в старом рендере), таблицы при этом не ломаются
})

// Ссылки открываем в новой вкладке и безопасно.
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/** Полный markdown → безопасный HTML (заголовки, списки, таблицы, код, ссылки). */
export function renderMarkdown(text: string): string {
  if (!text) return ''
  return DOMPurify.sanitize(md.render(text), { ADD_ATTR: ['target'] })
}
