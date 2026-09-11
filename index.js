/**
 * dsh-locale-ru — host half.
 *
 * The pack is browser-only. This Node half exists so the host loader can mount
 * the package (via cordis.patch.yml) and the client-modules scanner can find
 * its `dsh.client` declaration and serve `lib/client.js` to the browser, where
 * the Russian language and its dictionaries register against the official
 * locale registry of @deepseek-ai/dsh-client-locale.
 *
 * Nothing on the host is patched: no upstream file, no node_modules of the
 * installation. Keys this pack does not cover fall back to English through the
 * registry's own `ru -> en` chain.
 *
 * @module dsh-locale-ru
 */

/** Stable plugin name used by the cordis loader row. */
export const name = 'dsh-locale-ru'

/**
 * Host-side body. There is nothing to do on the host: the locale registry and
 * the dictionaries live in the browser client half, and the durable preference
 * is owned by @deepseek-ai/dsh-client-locale.
 */
export function apply() {
  // Intentionally empty on the host side.
}
